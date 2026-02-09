import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Store, Plus, Trash2, ExternalLink, Loader2, Activity, BarChart3, AlertCircle } from 'lucide-react';

interface StoreStatus {
  name: string;
  status: 'Provisioning' | 'Ready' | 'Failed';
  url: string;
  createdAt: string;
  type: 'woocommerce' | 'medusa';
  error?: string;
  duration?: number;
}

interface QuotaInfo {
  userId: string;
  storesCreated: number;
  storesLimit: number;
  canCreate: boolean;
}

interface Metrics {
  totalStoresCreated: number;
  totalStoresFailed: number;
  totalStoresDeleted: number;
  averageProvisioningTime: number;
  successRate: number;
  activeStores: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: 'create' | 'delete' | 'status_change';
  storeName: string;
  storeType: string;
  userId: string;
  status: 'success' | 'failed';
  error?: string;
}

const api = axios.create({
  baseURL: '/api'
});

function App() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreType, setNewStoreType] = useState<'woocommerce' | 'medusa'>('woocommerce');
  const [activeTab, setActiveTab] = useState<'stores' | 'metrics' | 'activity'>('stores');

  const { data: stores, isLoading } = useQuery<StoreStatus[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await api.get('/stores');
      return data;
    },
    refetchInterval: 3000,
  });

  const { data: quota } = useQuery<QuotaInfo>({
    queryKey: ['quota'],
    queryFn: async () => {
      const { data } = await api.get('/quota');
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: metrics } = useQuery<Metrics>({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get('/metrics');
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: activityLogs } = useQuery<AuditLog[]>({
    queryKey: ['audit'],
    queryFn: async () => {
      const { data } = await api.get('/audit/logs?limit=20');
      return data;
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      await api.post('/stores', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      setIsModalOpen(false);
      setNewStoreName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      await api.delete(`/stores/${name}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name: newStoreName, type: newStoreType });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Store className="w-10 h-10 text-indigo-400" />
              Urumi Provisioner
            </h1>
            <p className="text-gray-400 mt-2">Enterprise Store Orchestration Platform</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!quota?.canCreate}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            New Store
          </button>
        </header>

        {/* Quota & Metrics Bar */}
        {quota && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Stores Created</p>
              <p className="text-2xl font-bold text-white">{quota.storesCreated}/{quota.storesLimit}</p>
            </div>
            {metrics && (
              <>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Active Stores</p>
                  <p className="text-2xl font-bold text-green-400">{metrics.activeStores}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-blue-400">{metrics.successRate.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Avg Provision Time</p>
                  <p className="text-2xl font-bold text-purple-400">{formatDuration(metrics.averageProvisioningTime * 1000)}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'stores'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Stores ({stores?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'metrics'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            Activity
          </button>
        </div>

        {/* Stores Tab */}
        {activeTab === 'stores' && (
          <>
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            ) : stores && stores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map((store) => (
                  <div key={store.name} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{store.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">{store.type}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2
                          ${store.status === 'Ready' ? 'bg-green-900 text-green-200' : 
                            store.status === 'Failed' ? 'bg-red-900 text-red-200' : 
                            'bg-yellow-900 text-yellow-200'}`}>
                          {store.status === 'Provisioning' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                          {store.status}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Delete store ${store.name}?`)) {
                            deleteMutation.mutate(store.name);
                          }
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>Created: {new Date(store.createdAt).toLocaleDateString()}</p>
                      {store.duration && <p>Duration: {formatDuration(store.duration)}</p>}
                      {store.error && (
                        <div className="flex gap-2 text-red-400 mt-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p className="text-xs">{store.error}</p>
                        </div>
                      )}
                      {store.status === 'Ready' && (
                        <a
                          href={store.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 mt-4"
                        >
                          Open Store <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No stores yet. Create one to get started!</p>
              </div>
            )}
          </>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Provisioning Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Created</span>
                  <span className="text-white font-semibold">{metrics.totalStoresCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Failed</span>
                  <span className="text-red-400 font-semibold">{metrics.totalStoresFailed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Deleted</span>
                  <span className="text-gray-400 font-semibold">{metrics.totalStoresDeleted}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-green-400 font-semibold">{metrics.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Provision Time</span>
                  <span className="text-blue-400 font-semibold">{formatDuration(metrics.averageProvisioningTime * 1000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Stores</span>
                  <span className="text-purple-400 font-semibold">{metrics.activeStores}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            {activityLogs && activityLogs.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-gray-700 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      log.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-semibold">{log.action.replace('_', ' ').toUpperCase()}</span>
                        {' '}{log.storeName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.error && <p className="text-xs text-red-400 mt-1">{log.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No activity yet</p>
            )}
          </div>
        )}

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Create New Store</h2>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Store Name</label>
                    <input
                      type="text"
                      required
                      pattern="[a-z0-9-]+"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. my-shop-1"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      value={newStoreType}
                      onChange={(e) => setNewStoreType(e.target.value as any)}
                    >
                      <option value="woocommerce">WooCommerce</option>
                      <option value="medusa">MedusaJS (Stub)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Store'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
