"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const execa_1 = __importDefault(require("execa"));
const dotenv_1 = __importDefault(require("dotenv"));
const woocommerce_1 = require("./provisioner/woocommerce");
const medusa_1 = require("./provisioner/medusa");
const audit_1 = require("./audit");
const quota_1 = require("./quota");
const metrics_1 = require("./metrics");
const queue_1 = require("./queue");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3001;
// Store Provisioner instances
const provisioners = {
    woocommerce: new woocommerce_1.WooCommerceProvisioner(),
    medusa: new medusa_1.MedusaProvisioner(),
};
// Validation Schemas
const createStoreSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(20).regex(/^[a-z0-9-]+$/),
    type: zod_1.z.enum(['woocommerce', 'medusa']),
});
// Middleware to extract user ID
app.use((req, res, next) => {
    req.userId = quota_1.quotaManager.getUserId(req);
    next();
});
// Routes
// GET /stores - List all stores
app.get('/stores', async (req, res) => {
    try {
        const wooStores = await provisioners.woocommerce.listStores();
        const medusaStores = await provisioners.medusa.listStores();
        const allStores = [...wooStores, ...medusaStores].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(allStores);
    }
    catch (error) {
        console.error('Error listing stores:', error);
        res.status(500).json({ error: 'Failed to list stores' });
    }
});
// POST /stores - Create a new store
app.post('/stores', async (req, res) => {
    try {
        const { name, type } = createStoreSchema.parse(req.body);
        const userId = req.userId;
        // Check quota
        const quotaInfo = quota_1.quotaManager.getQuotaInfo(userId);
        if (!quotaInfo.canCreate) {
            audit_1.auditLogger.log('create', name, type, userId, 'failed', {}, `Quota exceeded: ${quotaInfo.storesCreated}/${quotaInfo.storesLimit}`);
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
        const task = queue_1.provisioningQueue.enqueue(name, type);
        quota_1.quotaManager.recordStoreCreation(userId);
        metrics_1.metricsCollector.recordProvisioningStart(name);
        audit_1.auditLogger.log('create', name, type, userId, 'success', { queueId: task.id });
        // Start provisioning in background
        provisioner.provision(name)
            .then(() => {
            metrics_1.metricsCollector.recordProvisioningSuccess(name);
            audit_1.auditLogger.log('status_change', name, type, userId, 'success', { newStatus: 'Ready' });
        })
            .catch(err => {
            metrics_1.metricsCollector.recordProvisioningFailure(name);
            audit_1.auditLogger.log('status_change', name, type, userId, 'failed', { newStatus: 'Failed' }, err.message);
            console.error(`Provisioning failed for ${name}:`, err);
        });
        res.status(202).json({
            message: `Store ${name} provisioning started`,
            status: 'provisioning',
            storeUrl: `http://${name}.store.${process.env.BASE_DOMAIN || '127.0.0.1'}.nip.io`,
            queuePosition: queue_1.provisioningQueue.getQueue().length,
            quota: quotaInfo
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: error.errors });
        }
        else {
            console.error('Error creating store:', error);
            res.status(500).json({ error: 'Failed to create store' });
        }
    }
});
// DELETE /stores/:name - Delete a store
app.delete('/stores/:name', async (req, res) => {
    const { name } = req.params;
    const userId = req.userId;
    try {
        // Try to delete from both
        await Promise.all([
            provisioners.woocommerce.deprovision(name),
            provisioners.medusa.deprovision(name)
        ]);
        quota_1.quotaManager.recordStoreDeletion(userId);
        metrics_1.metricsCollector.recordStoreDeletion();
        audit_1.auditLogger.log('delete', name, 'unknown', userId, 'success');
        res.json({ message: `Store ${name} deleted` });
    }
    catch (error) {
        console.error(`Error deleting store ${name}:`, error);
        audit_1.auditLogger.log('delete', name, 'unknown', userId, 'failed', {}, error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({ error: 'Failed to delete store' });
    }
});
// GET /stores/:name/events - Get store events
app.get('/stores/:name/events', async (req, res) => {
    const { name } = req.params;
    try {
        const { stdout } = await (0, execa_1.default)('kubectl', [
            'get', 'events',
            '-n', name,
            '--sort-by=.lastTimestamp',
            '-o', 'json'
        ]);
        const events = JSON.parse(stdout).items?.map((e) => ({
            message: e.message,
            reason: e.reason,
            type: e.type,
            time: e.lastTimestamp || e.eventTime
        })) || [];
        res.json(events);
    }
    catch (error) {
        console.error(`Error fetching events for ${name}:`, error);
        res.json([]);
    }
});
// GET /stores/:name/activity - Get store activity log
app.get('/stores/:name/activity', (req, res) => {
    const { name } = req.params;
    const logs = audit_1.auditLogger.getLogsForStore(name);
    res.json(logs);
});
// GET /audit/logs - Get all audit logs (recent)
app.get('/audit/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const logs = audit_1.auditLogger.getRecentLogs(limit);
    res.json(logs);
});
// GET /quota - Get current user's quota
app.get('/quota', (req, res) => {
    const userId = req.userId;
    const quotaInfo = quota_1.quotaManager.getQuotaInfo(userId);
    res.json(quotaInfo);
});
// GET /metrics - Get system metrics
app.get('/metrics', async (req, res) => {
    try {
        const wooStores = await provisioners.woocommerce.listStores();
        const medusaStores = await provisioners.medusa.listStores();
        const activeStores = [...wooStores, ...medusaStores].filter(s => s.status === 'Ready').length;
        const metrics = metrics_1.metricsCollector.getMetrics(activeStores);
        res.json(metrics);
    }
    catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});
// GET /queue - Get provisioning queue status
app.get('/queue', (req, res) => {
    const queue = queue_1.provisioningQueue.getQueue();
    const runningCount = queue_1.provisioningQueue.getRunningCount();
    res.json({
        queue,
        runningCount,
        maxConcurrent: 3,
        canAcceptMore: queue_1.provisioningQueue.canAcceptMore()
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
