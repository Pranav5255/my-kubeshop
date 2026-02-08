import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import execa from 'execa';
import { WooCommerceProvisioner } from './provisioner/woocommerce';
import { MedusaProvisioner } from './provisioner/medusa';

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

// Routes

// GET /stores - List all stores
app.get('/stores', async (req, res) => {
  try {
    const wooStores = await provisioners.woocommerce.listStores();
    const medusaStores = await provisioners.medusa.listStores();
    res.json([...wooStores, ...medusaStores]);
  } catch (error) {
    console.error('Error listing stores:', error);
    res.status(500).json({ error: 'Failed to list stores' });
  }
});

// POST /stores - Create a new store
app.post('/stores', async (req, res) => {
  try {
    const { name, type } = createStoreSchema.parse(req.body);
    
    const provisioner = provisioners[type];
    if (!provisioner) {
      return res.status(400).json({ error: 'Invalid store type' });
    }

    // Start provisioning in background (or return promise if fast)
    // Helm install takes time, so we should return 202 Accepted and let client poll.
    // But for simplicity in this demo, we might await it or fire-and-forget 
    // with status updates via polling the store status.
    
    // We'll start it and return immediate success.
    provisioner.provision(name).catch(err => {
      console.error(`Provisioning failed for ${name}:`, err);
    });

    res.status(202).json({ 
      message: `Store ${name} provisioning started`,
      status: 'provisioning',
      storeUrl: `http://${name}.store.local` // Temporary URL
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
  try {
    // Try to delete from both
    await Promise.all([
      provisioners.woocommerce.deprovision(name),
      provisioners.medusa.deprovision(name)
    ]);
    res.json({ message: `Store ${name} deleted` });
  } catch (error) {
    console.error(`Error deleting store ${name}:`, error);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

