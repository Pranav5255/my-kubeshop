import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Store, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react';

interface StoreStatus {
  name: string;
  status: 'Provisioning' | 'Ready' | 'Failed';
  url: string;
  createdAt: string;
}

const api = axios.create({
  baseURL: '/api' // Proxied to backend
});

function App() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreType, setNewStoreType] = useState<'woocommerce' | 'medusa'>('woocommerce');

  const { data: stores, isLoading } = useQuery<StoreStatus[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await api.get('/stores');
      return data;
    },
    refetchInterval: 3000, // Poll every 3s
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      await api.post('/stores', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
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
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name: newStoreName, type: newStoreType });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-8 h-8 text-indigo-600" />
              Urumi Provisioner
            </h1>
            <p className="text-gray-500 mt-1">Manage your e-commerce stores</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Store
          </button>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores?.map((store) => (
              <div key={store.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2
                      ${store.status === 'Ready' ? 'bg-green-100 text-green-800' : 
                        store.status === 'Failed' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
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
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Created: {new Date(store.createdAt).toLocaleDateString()}</p>
                  {store.status === 'Ready' && (
                    <a
                      href={store.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-600 hover:underline mt-4"
                    >
                      Open Store <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Store</h2>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                    <input
                      type="text"
                      required
                      pattern="[a-z0-9-]+"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. my-shop-1"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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

