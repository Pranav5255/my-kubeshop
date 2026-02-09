import { IStoreProvisioner, StoreStatus } from '../types';

export class MedusaProvisioner implements IStoreProvisioner {
  private stores: Map<string, StoreStatus> = new Map();
  private baseDomain: string;

  constructor() {
    this.baseDomain = process.env.BASE_DOMAIN || '127.0.0.1';
  }

  async provision(name: string): Promise<void> {
    console.log(`Provisioning Medusa store (Mock): ${name}`);
    this.stores.set(name, {
      name,
      status: 'Provisioning',
      url: `http://${name}.medusa.${this.baseDomain}.nip.io`,
      createdAt: new Date().toISOString(),
      type: 'medusa',
    });

    // Simulate delay
    setTimeout(() => {
      const store = this.stores.get(name);
      if (store) {
        store.status = 'Ready';
        this.stores.set(name, store);
        console.log(`Medusa store ${name} is Ready!`);
      }
    }, 5000);
  }

  async getStatus(name: string): Promise<StoreStatus> {
    const store = this.stores.get(name);
    if (!store) {
        throw new Error('Store not found');
    }
    return store;
  }

  async deprovision(name: string): Promise<void> {
    console.log(`Deprovisioning Medusa store: ${name}`);
    this.stores.delete(name);
  }

  async listStores(): Promise<StoreStatus[]> {
    return Array.from(this.stores.values());
  }
}

