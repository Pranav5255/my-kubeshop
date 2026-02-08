import { IStoreProvisioner, StoreStatus } from '../types';
import execa from 'execa';
import * as k8s from '@kubernetes/client-node';

export class WooCommerceProvisioner implements IStoreProvisioner {
  private k8sApi: k8s.CoreV1Api;

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  async provision(name: string): Promise<void> {
    console.log(`Provisioning WooCommerce store: ${name}`);
    
    try {
      // 1. Helm Install
      await execa('helm', [
        'install',
        name,
        '../charts/woocommerce', // Correct path relative to backend root
        '--create-namespace',
        '--namespace',
        name,
        '--set',
        `wordpress.ingress.enabled=true`,
        '--set',
        `wordpress.ingress.hostname=${name}.store.127.0.0.1.nip.io`,
        '--set',
        `wordpress.externalDatabase.host=${name}-mariadb`
      ]);
      console.log(`Helm install triggered for ${name}`);

      // 2. Label Namespace for discovery
      await execa('kubectl', ['label', 'namespace', name, 'app=urumi-store', '--overwrite']);

    } catch (error) {
      console.error(`Provisioning failed for ${name}:`, error);
      throw error;
    }
  }

  async listStores(): Promise<StoreStatus[]> {
    try {
      // List namespaces with label app=urumi-store
      const namespaces = await this.k8sApi.listNamespace(
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        'app=urumi-store'
      );
      
      const stores: StoreStatus[] = [];
      for (const ns of namespaces.body.items) {
        const name = ns.metadata?.name;
        if (!name) continue;

        // Get status for each (could be slow, but fine for MVP)
        const status = await this.getStatus(name);
        stores.push(status);
      }
      return stores;
    } catch (error) {
      console.error('Error listing stores:', error);
      return [];
    }
  }

  async getStatus(name: string): Promise<StoreStatus> {
    try {
      const ns = await this.k8sApi.readNamespace(name);
      
      const pods = await this.k8sApi.listNamespacedPod(name);
      const isReady = pods.body.items.length > 0 && pods.body.items.every(pod => 
        pod.status?.phase === 'Running' && 
        pod.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
      );

      return {
        name,
        status: isReady ? 'Ready' : 'Provisioning',
        url: `http://${name}.store.127.0.0.1.nip.io`,
        createdAt: ns.body.metadata?.creationTimestamp?.toISOString() || new Date().toISOString()
      };
    } catch (error) {
      return {
        name,
        status: 'Failed',
        url: '',
        createdAt: ''
      };
    }
  }

  async deprovision(name: string): Promise<void> {
    console.log(`Deprovisioning store: ${name}`);
    try {
      await execa('helm', ['uninstall', name, '--namespace', name]);
      await execa('kubectl', ['delete', 'pvc', '--all', '--namespace', name]);
      await execa('kubectl', ['delete', 'namespace', name]);
      console.log(`Store ${name} resources cleaned up.`);
    } catch (error) {
      console.error(`Deprovisioning failed for ${name}:`, error);
    }
  }
}

