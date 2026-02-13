"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaManager = void 0;
class QuotaManager {
    userQuotas = new Map();
    STORES_PER_USER = 10;
    PROVISIONING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    getUserId(req) {
        // Simple user identification: use X-User-Id header or IP address
        return req.headers['x-user-id'] || req.ip || 'anonymous';
    }
    canCreateStore(userId) {
        const quota = this.userQuotas.get(userId);
        if (!quota)
            return true;
        return quota.storesCreated < this.STORES_PER_USER;
    }
    recordStoreCreation(userId) {
        let quota = this.userQuotas.get(userId);
        if (!quota) {
            quota = {
                userId,
                storesCreated: 0,
                lastCreatedAt: [],
            };
            this.userQuotas.set(userId, quota);
        }
        quota.storesCreated += 1;
        quota.lastCreatedAt.push(new Date().toISOString());
        // Keep only recent timestamps
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        quota.lastCreatedAt = quota.lastCreatedAt.filter(ts => new Date(ts).getTime() > cutoff);
    }
    recordStoreDeletion(userId) {
        const quota = this.userQuotas.get(userId);
        if (quota && quota.storesCreated > 0) {
            quota.storesCreated -= 1;
        }
    }
    getQuotaInfo(userId) {
        const quota = this.userQuotas.get(userId);
        const storesCreated = quota?.storesCreated || 0;
        return {
            userId,
            storesCreated,
            storesLimit: this.STORES_PER_USER,
            canCreate: storesCreated < this.STORES_PER_USER,
        };
    }
    getProvisioningTimeout() {
        return this.PROVISIONING_TIMEOUT_MS;
    }
}
exports.quotaManager = new QuotaManager();
