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
        await execa('kubectl', ['label', 'namespace', name, 'app=urumi-store', '--overwrite']);
        console.log(`Store ${name} already exists, skipping provisioning`);
        return;
      } catch (e) {
        // Namespace doesn't exist, proceed with provisioning
      }

      // 1. Create namespace with label FIRST (ensures store appears in list immediately)
      await execa('kubectl', ['create', 'namespace', name]);
      await execa('kubectl', ['label', 'namespace', name, 'app=urumi-store', '--overwrite']);

      // 2. Helm Install with environment-based domain
      const hostname = `${name}.store.${this.baseDomain}.nip.io`;
      const chartPath = path.resolve(process.cwd(), '../charts/woocommerce');

      await execa('helm', [
        'install',
        name,
        chartPath,
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

      // Get all pods and filter by app type
      const pods = await this.k8sApi.listNamespacedPod(name);
      const wordpressPods = pods.body.items.filter(
        p => p.metadata?.labels?.['app.kubernetes.io/name'] === 'wordpress'
      );
      const mariadbPods = pods.body.items.filter(
        p => p.metadata?.labels?.['app.kubernetes.io/name'] === 'mariadb'
      );
      
      // Store is ready when:
      // 1. WordPress pod is Running and Ready
      // 2. MariaDB pod is Running and Ready
      // 3. No setup job needed anymore (handled by postStart hook)
      const wordpressReady = wordpressPods.length > 0 && wordpressPods.every(pod =>
        pod.status?.phase === 'Running' &&
        pod.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
      );
      
      const mariadbReady = mariadbPods.length > 0 && mariadbPods.every(pod =>
        pod.status?.phase === 'Running' &&
        pod.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
      );
      
      const isReady = wordpressReady && mariadbReady;

      const createdAt = metadata?.createdAt || ns.body.metadata?.creationTimestamp?.toISOString() || new Date().toISOString();
      const duration = metadata ? Date.now() - metadata.startTime : undefined;

      return {
        name,
        status: isReady ? 'Ready' : 'Provisioning',
        url: `http://${name}.store.${this.baseDomain}.nip.io`,
        adminUrl: `http://${name}.store.${this.baseDomain}.nip.io/wp-admin/`,
        shopUrl: `http://${name}.store.${this.baseDomain}.nip.io/`,
        adminUsername: 'user',
        adminPassword: 'password',
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
        adminUrl: '',
        shopUrl: '',
        adminUsername: '',
        adminPassword: '',
        createdAt: new Date().toISOString(),
        type: 'woocommerce',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deprovision(name: string): Promise<void> {
    console.log(`Deprovisioning store: ${name}`);

    // Check if namespace exists first
    try {
      await this.k8sApi.readNamespace(name);
    } catch (e) {
      console.log(`Namespace ${name} does not exist, skipping deprovision`);
      this.storeMetadata.delete(name);
      return;
    }

    try {
      // 1. Helm uninstall (best effort)
      console.log(`[${name}] Attempting Helm uninstall...`);
      try {
        await execa('helm', ['uninstall', name, '--namespace', name]);
      } catch (e) {
        console.warn(`[${name}] Helm uninstall failed or not found, continuing with cleanup.`);
      }

      // 2. Scale down workloads to release PVCs
      console.log(`[${name}] Scaling down workloads...`);
      const resourceTypes = ['deployment', 'statefulset'];
      for (const type of resourceTypes) {
        try {
          await execa('kubectl', [
            'scale', type, '--all',
            '--replicas=0',
            '-n', name,
            '--timeout=30s'
          ]);
        } catch (e: any) {
          // Ignore "no objects passed to scale" error
          if (e.stderr && e.stderr.includes('no objects passed to scale')) {
             // harmless
          } else {
             console.warn(`[${name}] Failed to scale down ${type}s:`, e.message);
          }
        }
      }

      // Give pods time to terminate and release PVCs
      console.log(`[${name}] Waiting for pods to terminate...`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Force delete workloads and other resources (excluding PVCs initially)
      console.log(`[${name}] Deleting workloads...`);
      const workloadsToDelete = [
        'deployment', 'statefulset', 'job', 'service', 'ingress',
        'secret', 'configmap'
      ];

      for (const resource of workloadsToDelete) {
        try {
          await execa('kubectl', [
            'delete', resource,
            '--all',
            '-n', name,
            '--force',
            '--grace-period=0',
            '--ignore-not-found'
          ]);
        } catch (e) {
             console.warn(`[${name}] Failed to delete ${resource}s:`, e);
        }
      }

      // 4. Delete PVCs explicitly with timeout
      console.log(`[${name}] Deleting PVCs...`);
      try {
        await execa('kubectl', [
          'delete', 'pvc',
          '--all',
          '-n', name,
          '--force',
          '--grace-period=0',
          '--ignore-not-found',
          '--timeout=30s'
        ]);
      } catch (e) {
        console.warn(`[${name}] PVC deletion timed out or failed:`, e);
      }

      // 4b. Wait and verify PVCs are actually deleted (with timeout)
      console.log(`[${name}] Verifying PVCs are deleted...`);
      const maxPvcWait = 30; // seconds
      const pvcCheckInterval = 2; // seconds
      let pvcWaitTime = 0;
      while (pvcWaitTime < maxPvcWait) {
        try {
          const result = await execa('kubectl', [
            'get', 'pvc',
            '-n', name,
            '--no-headers',
            '--ignore-not-found'
          ]);
          if (!result.stdout || result.stdout.trim() === '') {
            console.log(`[${name}] All PVCs deleted successfully.`);
            break;
          }
        } catch (e) {
          // If get fails, assume PVCs are gone
          break;
        }
        await new Promise(resolve => setTimeout(resolve, pvcCheckInterval * 1000));
        pvcWaitTime += pvcCheckInterval;
      }

      if (pvcWaitTime >= maxPvcWait) {
        console.warn(`[${name}] Some PVCs may still be terminating after ${maxPvcWait}s. Proceeding with namespace deletion.`);
      }

      // 5. Delete namespace
      console.log(`[${name}] Deleting namespace...`);
      let namespaceDeleted = false;
      try {
        await execa('kubectl', ['delete', 'namespace', name, '--timeout=60s', '--ignore-not-found']);
        namespaceDeleted = true;
      } catch (e) {
        console.warn(`[${name}] Namespace deletion timed out or failed. Attempting fallback force deletion...`);
      }

      // 6. FALLBACK: Force delete stuck resources if namespace deletion failed
      if (!namespaceDeleted) {
        console.log(`[${name}] Starting fallback force deletion mechanism...`);
        
        // 6a. Force delete any pods stuck in Terminating state
        try {
          const podsResult = await execa('kubectl', [
            'get', 'pods',
            '-n', name,
            '--no-headers',
            '--ignore-not-found',
            '-o', 'jsonpath={.items[*].metadata.name}'
          ]);
          if (podsResult.stdout && podsResult.stdout.trim()) {
            const podNames = podsResult.stdout.trim().split(/\s+/);
            console.log(`[${name}] Found ${podNames.length} pod(s) to force delete: ${podNames.join(', ')}`);
            for (const podName of podNames) {
              try {
                await execa('kubectl', [
                  'delete', 'pod', podName,
                  '-n', name,
                  '--force',
                  '--grace-period=0',
                  '--ignore-not-found'
                ]);
                console.log(`[${name}] Force deleted pod: ${podName}`);
              } catch (e) {
                console.warn(`[${name}] Failed to force delete pod ${podName}:`, e);
              }
            }
            // Wait a moment for pods to be removed
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (e) {
          // No pods found or error checking - continue
        }

        // 6b. Force delete stuck PVCs by removing finalizers
        try {
          const pvcResult = await execa('kubectl', [
            'get', 'pvc',
            '-n', name,
            '--no-headers',
            '--ignore-not-found',
            '-o', 'jsonpath={.items[*].metadata.name}'
          ]);
          if (pvcResult.stdout && pvcResult.stdout.trim()) {
            const pvcNames = pvcResult.stdout.trim().split(/\s+/);
            console.log(`[${name}] Found ${pvcNames.length} PVC(s) to force delete: ${pvcNames.join(', ')}`);
            for (const pvcName of pvcNames) {
              try {
                // Remove finalizers to allow deletion
                await execa('kubectl', [
                  'patch', 'pvc', pvcName,
                  '-n', name,
                  '-p', '{"metadata":{"finalizers":[]}}',
                  '--type=merge',
                  '--ignore-not-found'
                ]);
                console.log(`[${name}] Removed finalizers from PVC: ${pvcName}`);
                // Then delete it
                await execa('kubectl', [
                  'delete', 'pvc', pvcName,
                  '-n', name,
                  '--force',
                  '--grace-period=0',
                  '--ignore-not-found'
                ]);
                console.log(`[${name}] Force deleted PVC: ${pvcName}`);
              } catch (e) {
                console.warn(`[${name}] Failed to force delete PVC ${pvcName}:`, e);
              }
            }
            // Wait a moment for PVCs to be removed
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (e) {
          // No PVCs found or error checking - continue
        }

        // 6c. Force delete namespace
        try {
          console.log(`[${name}] Force deleting namespace...`);
          await execa('kubectl', [
            'delete', 'namespace', name,
            '--force',
            '--grace-period=0',
            '--ignore-not-found'
          ]);
          console.log(`[${name}] Namespace force deleted successfully.`);
        } catch (e) {
          console.warn(`[${name}] Force namespace deletion also failed:`, e);
        }
      }

      // 7. Clean up metadata
      this.storeMetadata.delete(name);
      console.log(`Store ${name} resources cleanup sequence completed.`);
    } catch (error) {
      console.error(`Deprovisioning failed for ${name}:`, error);
      throw error;
    }
  }
}

