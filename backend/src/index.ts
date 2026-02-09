import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import execa from 'execa';
import dotenv from 'dotenv';
import { WooCommerceProvisioner } from './provisioner/woocommerce';
import { MedusaProvisioner } from './provisioner/medusa';
import { auditLogger } from './audit';
import { quotaManager } from './quota';
import { metricsCollector } from './metrics';
import { provisioningQueue } from './queue';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Store Provisioner instances
const provisioners = {
  woocommerce: new WooCommerceProvisioner(),
  medusa: new MedusaProvisioner(),
};

// Validation Schemas
const createStoreSchema = z.object({
  name: z.string().min(3).max(20).regex(/^[a-z0-9-]+$/),
  type: z.enum(['woocommerce', 'medusa']),
});

// Middleware to extract user ID
app.use((req, res, next) => {
  (req as any).userId = quotaManager.getUserId(req);
  next();
});

// Routes

// GET /stores - List all stores
app.get('/stores', async (req, res) => {
  try {
    const wooStores = await provisioners.woocommerce.listStores();
    const medusaStores = await provisioners.medusa.listStores();
    const allStores = [...wooStores, ...medusaStores].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(allStores);
  } catch (error) {
    console.error('Error listing stores:', error);
    res.status(500).json({ error: 'Failed to list stores' });
  }
});

// POST /stores - Create a new store
app.post('/stores', async (req, res) => {
  try {
    const { name, type } = createStoreSchema.parse(req.body);
    const userId = (req as any).userId;

    // Check quota
    const quotaInfo = quotaManager.getQuotaInfo(userId);
    if (!quotaInfo.canCreate) {
      auditLogger.log('create', name, type, userId, 'failed', {}, `Quota exceeded: ${quotaInfo.storesCreated}/${quotaInfo.storesLimit}`);
      return res.status(429).json({ 
        error: `Quota exceeded. You have ${quotaInfo.storesCreated}/${quotaInfo.storesLimit} stores.`,
        quota: quotaInfo
      });
    }

    const provisioner = provisioners[type];
    if (!provisioner) {
      return res.status(400).json({ error: 'Invalid store type' });
    }

    // Enqueue provisioning
    const task = provisioningQueue.enqueue(name, type);
    quotaManager.recordStoreCreation(userId);
    metricsCollector.recordProvisioningStart(name);

    auditLogger.log('create', name, type, userId, 'success', { queueId: task.id });

    // Start provisioning in background
    provisioner.provision(name)
      .then(() => {
        metricsCollector.recordProvisioningSuccess(name);
        auditLogger.log('status_change', name, type, userId, 'success', { newStatus: 'Ready' });
      })
      .catch(err => {
        metricsCollector.recordProvisioningFailure(name);
        auditLogger.log('status_change', name, type, userId, 'failed', { newStatus: 'Failed' }, err.message);
        console.error(`Provisioning failed for ${name}:`, err);
      });

    res.status(202).json({ 
      message: `Store ${name} provisioning started`,
      status: 'provisioning',
      storeUrl: `http://${name}.store.${process.env.BASE_DOMAIN || '127.0.0.1'}.nip.io`,
      queuePosition: provisioningQueue.getQueue().length,
      quota: quotaInfo
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error creating store:', error);
      res.status(500).json({ error: 'Failed to create store' });
    }
  }
});

// DELETE /stores/:name - Delete a store
app.delete('/stores/:name', async (req, res) => {
  const { name } = req.params;
  const userId = (req as any).userId;

  try {
    // Try to delete from both
    await Promise.all([
      provisioners.woocommerce.deprovision(name),
      provisioners.medusa.deprovision(name)
    ]);

    quotaManager.recordStoreDeletion(userId);
    metricsCollector.recordStoreDeletion();
    auditLogger.log('delete', name, 'unknown', userId, 'success');

    res.json({ message: `Store ${name} deleted` });
  } catch (error) {
    console.error(`Error deleting store ${name}:`, error);
    auditLogger.log('delete', name, 'unknown', userId, 'failed', {}, error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

// GET /stores/:name/events - Get store events
app.get('/stores/:name/events', async (req, res) => {
  const { name } = req.params;
  try {
    const { stdout } = await execa('kubectl', [
      'get', 'events', 
      '-n', name, 
      '--sort-by=.lastTimestamp', 
      '-o', 'json'
    ]);
    
    const events = JSON.parse(stdout).items?.map((e: any) => ({
      message: e.message,
      reason: e.reason,
      type: e.type,
      time: e.lastTimestamp || e.eventTime
    })) || [];
    
    res.json(events);
  } catch (error) {
    console.error(`Error fetching events for ${name}:`, error);
    res.json([]);
  }
});

// GET /stores/:name/activity - Get store activity log
app.get('/stores/:name/activity', (req, res) => {
  const { name } = req.params;
  const logs = auditLogger.getLogsForStore(name);
  res.json(logs);
});

// GET /audit/logs - Get all audit logs (recent)
app.get('/audit/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = auditLogger.getRecentLogs(limit);
  res.json(logs);
});

// GET /quota - Get current user's quota
app.get('/quota', (req, res) => {
  const userId = (req as any).userId;
  const quotaInfo = quotaManager.getQuotaInfo(userId);
  res.json(quotaInfo);
});

// GET /metrics - Get system metrics
app.get('/metrics', async (req, res) => {
  try {
    const wooStores = await provisioners.woocommerce.listStores();
    const medusaStores = await provisioners.medusa.listStores();
    const activeStores = [...wooStores, ...medusaStores].filter(s => s.status === 'Ready').length;
    
    const metrics = metricsCollector.getMetrics(activeStores);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /queue - Get provisioning queue status
app.get('/queue', (req, res) => {
  const queue = provisioningQueue.getQueue();
  const runningCount = provisioningQueue.getRunningCount();
  res.json({
    queue,
    runningCount,
    maxConcurrent: 3,
    canAcceptMore: provisioningQueue.canAcceptMore()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`BASE_DOMAIN: ${process.env.BASE_DOMAIN || '127.0.0.1'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
