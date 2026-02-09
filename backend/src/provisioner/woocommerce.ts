import { IStoreProvisioner, StoreStatus } from '../types';
import execa from 'execa';
import * as k8s from '@kubernetes/client-node';
import * as path from 'path';

export class WooCommerceProvisioner implements IStoreProvisioner {
  private k8sApi: k8s.CoreV1Api;
  private baseDomain: string;
  private storeMetadata: Map<string, { createdAt: string; type: string; startTime: number }> = new Map();

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.baseDomain = process.env.BASE_DOMAIN || '127.0.0.1';
  }

  async provision(name: string): Promise<void> {
    console.log(`Provisioning WooCommerce store: ${name}`);
    const startTime = Date.now();
    
    try {
      // Check if store already exists (idempotency)
      try {
        await this.k8sApi.readNamespace(name);
        console.log(`Store ${name} already exists, skipping provisioning`);
        return;
      } catch (e) {
        // Namespace doesn't exist, proceed with provisioning
      }

      // 1. Helm Install with environment-based domain
      const hostname = `${name}.store.${this.baseDomain}.nip.io`;
      const chartPath = path.resolve(__dirname, '../../charts/woocommerce');
      
      await execa('helm', [
        'install',
        name,
        chartPath,
        '--create-namespace',
        '--namespace',
        name,
        '--set',
        `wordpress.ingress.enabled=true`,
        '--set',
        `wordpress.ingress.hostname=${hostname}`,
        '--set',
        `wordpress.externalDatabase.host=${name}-mariadb`,
        '--set',
        `wordpress.wordpressUsername=user`,
        '--set',
        `wordpress.wordpressPassword=password`,
      ]);
      console.log(`Helm install triggered for ${name}`);

      // 2. Label Namespace for discovery
      await execa('kubectl', ['label', 'namespace', name, 'app=urumi-store', '--overwrite']);

      // 3. Store metadata
      this.storeMetadata.set(name, {
        createdAt: new Date().toISOString(),
        type: 'woocommerce',
        startTime,
      });

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

        // Get status for each
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
      const metadata = this.storeMetadata.get(name);
      
      const pods = await this.k8sApi.listNamespacedPod(name);
      const isReady = pods.body.items.length > 0 && pods.body.items.every(pod => 
        pod.status?.phase === 'Running' && 
        pod.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
      );

      const createdAt = metadata?.createdAt || ns.body.metadata?.creationTimestamp?.toISOString() || new Date().toISOString();
      const duration = metadata ? Date.now() - metadata.startTime : undefined;

      return {
        name,
        status: isReady ? 'Ready' : 'Provisioning',
        url: `http://${name}.store.${this.baseDomain}.nip.io`,
        createdAt,
        type: 'woocommerce',
        duration,
      };
    } catch (error) {
      console.error(`Error getting status for ${name}:`, error);
      return {
        name,
        status: 'Failed',
        url: '',
        createdAt: new Date().toISOString(),
        type: 'woocommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deprovision(name: string): Promise<void> {
    console.log(`Deprovisioning store: ${name}`);
    try {
      // Check if namespace exists first
      try {
        await this.k8sApi.readNamespace(name);
      } catch (e) {
        console.log(`Namespace ${name} does not exist, skipping deprovision`);
        return;
      }

      // 1. Helm uninstall
      try {
        await execa('helm', ['uninstall', name, '--namespace', name]);
      } catch (e) {
        console.warn(`Helm uninstall failed for ${name}, continuing with cleanup:`, e);
      }

      // 2. Delete PVCs
      try {
        await execa('kubectl', ['delete', 'pvc', '--all', '--namespace', name, '--ignore-not-found']);
      } catch (e) {
        console.warn(`PVC deletion failed for ${name}:`, e);
      }

      // 3. Delete namespace
      try {
        await execa('kubectl', ['delete', 'namespace', name, '--ignore-not-found']);
      } catch (e) {
        console.warn(`Namespace deletion failed for ${name}:`, e);
      }

      // 4. Clean up metadata
      this.storeMetadata.delete(name);
      console.log(`Store ${name} resources cleaned up.`);
    } catch (error) {
      console.error(`Deprovisioning failed for ${name}:`, error);
      throw error;
    }
  }
}

