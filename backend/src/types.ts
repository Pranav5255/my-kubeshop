export interface StoreStatus {
  name: string;
  status: 'Provisioning' | 'Ready' | 'Failed';
  url: string;
  createdAt: string;
}

export interface IStoreProvisioner {
  provision(name: string): Promise<void>;
  getStatus(name: string): Promise<StoreStatus>;
  deprovision(name: string): Promise<void>;
  listStores(): Promise<StoreStatus[]>;
}

