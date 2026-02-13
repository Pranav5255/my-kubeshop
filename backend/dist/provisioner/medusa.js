"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedusaProvisioner = void 0;
class MedusaProvisioner {
    stores = new Map();
    baseDomain;
    constructor() {
        this.baseDomain = process.env.BASE_DOMAIN || '127.0.0.1';
    }
    async provision(name) {
        console.log(`Provisioning Medusa store (Mock): ${name}`);
        this.stores.set(name, {
            name,
            status: 'Provisioning',
            url: `http://${name}.medusa.${this.baseDomain}.nip.io`,
            adminUrl: `http://${name}.medusa.${this.baseDomain}.nip.io/app`,
            shopUrl: `http://${name}.medusa.${this.baseDomain}.nip.io`,
            adminUsername: 'admin',
            adminPassword: 'admin',
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
    async getStatus(name) {
        const store = this.stores.get(name);
        if (!store) {
            throw new Error('Store not found');
        }
        return store;
    }
    async deprovision(name) {
        console.log(`Deprovisioning Medusa store: ${name}`);
        this.stores.delete(name);
    }
    async listStores() {
        return Array.from(this.stores.values());
    }
}
exports.MedusaProvisioner = MedusaProvisioner;
