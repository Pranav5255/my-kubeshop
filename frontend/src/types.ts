export interface StoreStatus {
  name: string;
  status: 'Provisioning' | 'Ready' | 'Failed';
  url: string;
  adminUrl: string;
  shopUrl: string;
  adminUsername: string;
  adminPassword: string;
  createdAt: string;
  type: 'woocommerce' | 'medusa';
  error?: string;
  duration?: number;
}

export interface QuotaInfo {
  userId: string;
  storesCreated: number;
  storesLimit: number;
  canCreate: boolean;
}

export interface Metrics {
  totalStoresCreated: number;
  totalStoresFailed: number;
  totalStoresDeleted: number;
  averageProvisioningTime: number;
  successRate: number;
  activeStores: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'create' | 'delete' | 'status_change';
  storeName: string;
  storeType: string;
  userId: string;
  status: 'success' | 'failed';
  error?: string;
}
