export interface StoreStatus {
  name: string;
  status: 'Provisioning' | 'Ready' | 'Failed';
  url: string;
  createdAt: string;
  error?: string;
  duration?: number; // milliseconds
  type: 'woocommerce' | 'medusa';
}

export interface IStoreProvisioner {
  provision(name: string): Promise<void>;
  getStatus(name: string): Promise<StoreStatus>;
  deprovision(name: string): Promise<void>;
  listStores(): Promise<StoreStatus[]>;
}

export interface QuotaInfo {
  userId: string;
  storesCreated: number;
  storesLimit: number;
  canCreate: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'create' | 'delete' | 'status_change';
  storeName: string;
  storeType: string;
  userId: string;
  details: Record<string, any>;
  status: 'success' | 'failed';
  error?: string;
}

export interface Metrics {
  totalStoresCreated: number;
  totalStoresFailed: number;
  totalStoresDeleted: number;
  averageProvisioningTime: number;
  successRate: number;
  activeStores: number;
}

