import { QuotaInfo } from './types';

interface UserQuota {
  userId: string;
  storesCreated: number;
  lastCreatedAt: string[];
}

class QuotaManager {
  private userQuotas: Map<string, UserQuota> = new Map();
  private readonly STORES_PER_USER = 10;
  private readonly PROVISIONING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  getUserId(req: any): string {
    // Simple user identification: use X-User-Id header or IP address
    return req.headers['x-user-id'] || req.ip || 'anonymous';
  }

  canCreateStore(userId: string): boolean {
    const quota = this.userQuotas.get(userId);
    if (!quota) return true;
    return quota.storesCreated < this.STORES_PER_USER;
  }

  recordStoreCreation(userId: string): void {
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
    quota.lastCreatedAt = quota.lastCreatedAt.filter(
      ts => new Date(ts).getTime() > cutoff
    );
  }

  recordStoreDeletion(userId: string): void {
    const quota = this.userQuotas.get(userId);
    if (quota && quota.storesCreated > 0) {
      quota.storesCreated -= 1;
    }
  }

  getQuotaInfo(userId: string): QuotaInfo {
    const quota = this.userQuotas.get(userId);
    const storesCreated = quota?.storesCreated || 0;

    return {
      userId,
      storesCreated,
      storesLimit: this.STORES_PER_USER,
      canCreate: storesCreated < this.STORES_PER_USER,
    };
  }

  getProvisioningTimeout(): number {
    return this.PROVISIONING_TIMEOUT_MS;
  }
}

export const quotaManager = new QuotaManager();
