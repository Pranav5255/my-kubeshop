"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WooCommerceProvisioner = void 0;
const execa_1 = __importDefault(require("execa"));
const k8s = __importStar(require("@kubernetes/client-node"));
const path = __importStar(require("path"));
class WooCommerceProvisioner {
    k8sApi;
    baseDomain;
    storeMetadata = new Map();
    constructor() {
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        this.baseDomain = process.env.BASE_DOMAIN || '127.0.0.1';
    }
    async provision(name) {
        console.log(`Provisioning WooCommerce store: ${name}`);
        const startTime = Date.now();
        try {
            // Check if store already exists (idempotency)
            try {
                await this.k8sApi.readNamespace(name);
                await (0, execa_1.default)('kubectl', ['label', 'namespace', name, 'app=urumi-store', '--overwrite']);
                console.log(`Store ${name} already exists, skipping provisioning`);
                return;
            }
            catch (e) {
                // Namespace doesn't exist, proceed with provisioning
            }
            // 1. Create namespace with label FIRST (ensures store appears in list immediately)
            await (0, execa_1.default)('kubectl', ['create', 'namespace', name]);
            await (0, execa_1.default)('kubectl', ['label', 'namespace', name, 'app=urumi-store', '--overwrite']);
            // 2. Helm Install with environment-based domain
            const hostname = `${name}.store.${this.baseDomain}.nip.io`;
            const chartPath = path.resolve(process.cwd(), '../charts/woocommerce');
            await (0, execa_1.default)('helm', [
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
        }
        catch (error) {
            console.error(`Provisioning failed for ${name}:`, error);
            throw error;
        }
    }
    async listStores() {
        try {
            // List namespaces with label app=urumi-store
            const namespaces = await this.k8sApi.listNamespace(undefined, undefined, undefined, undefined, 'app=urumi-store');
            const stores = [];
            for (const ns of namespaces.body.items) {
                const name = ns.metadata?.name;
                if (!name)
                    continue;
                // Get status for each
                const status = await this.getStatus(name);
                stores.push(status);
            }
            return stores;
        }
        catch (error) {
            console.error('Error listing stores:', error);
            return [];
        }
    }
    async getStatus(name) {
        try {
            const ns = await this.k8sApi.readNamespace(name);
            const metadata = this.storeMetadata.get(name);
            const pods = await this.k8sApi.listNamespacedPod(name);
            const jobPods = pods.body.items.filter(p => p.metadata?.ownerReferences?.some(ref => ref.kind === 'Job'));
            const workloadPods = pods.body.items.filter(p => !p.metadata?.ownerReferences?.some(ref => ref.kind === 'Job'));
            // Setup job must be complete (Succeeded or deleted); WordPress + MariaDB must be Running+Ready
            const setupComplete = !jobPods.some(p => p.status?.phase === 'Running');
            const workloadsReady = workloadPods.length > 0 && workloadPods.every(pod => pod.status?.phase === 'Running' &&
                pod.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True'));
            const isReady = setupComplete && workloadsReady;
            const createdAt = metadata?.createdAt || ns.body.metadata?.creationTimestamp?.toISOString() || new Date().toISOString();
            const duration = metadata ? Date.now() - metadata.startTime : undefined;
            return {
                name,
                status: isReady ? 'Ready' : 'Provisioning',
                url: `http://${name}.store.${this.baseDomain}.nip.io`,
                adminUrl: `http://${name}.store.${this.baseDomain}.nip.io/wp-admin/admin.php?page=woocommerce`,
                shopUrl: `http://${name}.store.${this.baseDomain}.nip.io`,
                adminUsername: 'user',
                adminPassword: 'password',
                createdAt,
                type: 'woocommerce',
                duration,
            };
        }
        catch (error) {
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
    async deprovision(name) {
        console.log(`Deprovisioning store: ${name}`);
        // Check if namespace exists first
        try {
            await this.k8sApi.readNamespace(name);
        }
        catch (e) {
            console.log(`Namespace ${name} does not exist, skipping deprovision`);
            this.storeMetadata.delete(name);
            return;
        }
        try {
            // 1. Helm uninstall (best effort)
            console.log(`[${name}] Attempting Helm uninstall...`);
            try {
                await (0, execa_1.default)('helm', ['uninstall', name, '--namespace', name]);
            }
            catch (e) {
                console.warn(`[${name}] Helm uninstall failed or not found, continuing with cleanup.`);
            }
            // 2. Scale down workloads to release PVCs
            console.log(`[${name}] Scaling down workloads...`);
            const resourceTypes = ['deployment', 'statefulset'];
            for (const type of resourceTypes) {
                try {
                    await (0, execa_1.default)('kubectl', [
                        'scale', type, '--all',
                        '--replicas=0',
                        '-n', name,
                        '--timeout=30s'
                    ]);
                }
                catch (e) {
                    // Ignore "no objects passed to scale" error
                    if (e.stderr && e.stderr.includes('no objects passed to scale')) {
                        // harmless
                    }
                    else {
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
                    await (0, execa_1.default)('kubectl', [
                        'delete', resource,
                        '--all',
                        '-n', name,
                        '--force',
                        '--grace-period=0',
                        '--ignore-not-found'
                    ]);
                }
                catch (e) {
                    console.warn(`[${name}] Failed to delete ${resource}s:`, e);
                }
            }
            // 4. Delete PVCs explicitly with timeout
            console.log(`[${name}] Deleting PVCs...`);
            try {
                await (0, execa_1.default)('kubectl', [
                    'delete', 'pvc',
                    '--all',
                    '-n', name,
                    '--force',
                    '--grace-period=0',
                    '--ignore-not-found',
                    '--timeout=30s'
                ]);
            }
            catch (e) {
                console.warn(`[${name}] PVC deletion timed out or failed:`, e);
            }
            // 4b. Wait and verify PVCs are actually deleted (with timeout)
            console.log(`[${name}] Verifying PVCs are deleted...`);
            const maxPvcWait = 30; // seconds
            const pvcCheckInterval = 2; // seconds
            let pvcWaitTime = 0;
            while (pvcWaitTime < maxPvcWait) {
                try {
                    const result = await (0, execa_1.default)('kubectl', [
                        'get', 'pvc',
                        '-n', name,
                        '--no-headers',
                        '--ignore-not-found'
                    ]);
                    if (!result.stdout || result.stdout.trim() === '') {
                        console.log(`[${name}] All PVCs deleted successfully.`);
                        break;
                    }
                }
                catch (e) {
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
                await (0, execa_1.default)('kubectl', ['delete', 'namespace', name, '--timeout=60s', '--ignore-not-found']);
                namespaceDeleted = true;
            }
            catch (e) {
                console.warn(`[${name}] Namespace deletion timed out or failed. Attempting fallback force deletion...`);
            }
            // 6. FALLBACK: Force delete stuck resources if namespace deletion failed
            if (!namespaceDeleted) {
                console.log(`[${name}] Starting fallback force deletion mechanism...`);
                // 6a. Force delete any pods stuck in Terminating state
                try {
                    const podsResult = await (0, execa_1.default)('kubectl', [
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
                                await (0, execa_1.default)('kubectl', [
                                    'delete', 'pod', podName,
                                    '-n', name,
                                    '--force',
                                    '--grace-period=0',
                                    '--ignore-not-found'
                                ]);
                                console.log(`[${name}] Force deleted pod: ${podName}`);
                            }
                            catch (e) {
                                console.warn(`[${name}] Failed to force delete pod ${podName}:`, e);
                            }
                        }
                        // Wait a moment for pods to be removed
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
                catch (e) {
                    // No pods found or error checking - continue
                }
                // 6b. Force delete stuck PVCs by removing finalizers
                try {
                    const pvcResult = await (0, execa_1.default)('kubectl', [
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
                                await (0, execa_1.default)('kubectl', [
                                    'patch', 'pvc', pvcName,
                                    '-n', name,
                                    '-p', '{"metadata":{"finalizers":[]}}',
                                    '--type=merge',
                                    '--ignore-not-found'
                                ]);
                                console.log(`[${name}] Removed finalizers from PVC: ${pvcName}`);
                                // Then delete it
                                await (0, execa_1.default)('kubectl', [
                                    'delete', 'pvc', pvcName,
                                    '-n', name,
                                    '--force',
                                    '--grace-period=0',
                                    '--ignore-not-found'
                                ]);
                                console.log(`[${name}] Force deleted PVC: ${pvcName}`);
                            }
                            catch (e) {
                                console.warn(`[${name}] Failed to force delete PVC ${pvcName}:`, e);
                            }
                        }
                        // Wait a moment for PVCs to be removed
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
                catch (e) {
                    // No PVCs found or error checking - continue
                }
                // 6c. Force delete namespace
                try {
                    console.log(`[${name}] Force deleting namespace...`);
                    await (0, execa_1.default)('kubectl', [
                        'delete', 'namespace', name,
                        '--force',
                        '--grace-period=0',
                        '--ignore-not-found'
                    ]);
                    console.log(`[${name}] Namespace force deleted successfully.`);
                }
                catch (e) {
                    console.warn(`[${name}] Force namespace deletion also failed:`, e);
                }
            }
            // 7. Clean up metadata
            this.storeMetadata.delete(name);
            console.log(`Store ${name} resources cleanup sequence completed.`);
        }
        catch (error) {
            console.error(`Deprovisioning failed for ${name}:`, error);
            throw error;
        }
    }
}
exports.WooCommerceProvisioner = WooCommerceProvisioner;
