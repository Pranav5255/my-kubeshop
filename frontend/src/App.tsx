import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Toaster, toast } from 'sonner';

import { DashboardLayout } from './components/layout/DashboardLayout';
import { DeploymentList } from './components/stores/DeploymentList';
import { CreateStoreDrawer } from './components/stores/CreateStoreDrawer';
import { MetricsGrid } from './components/overview/MetricsGrid';
import { ActivityList } from './components/overview/ActivityList';
import { StoreStatus, QuotaInfo, Metrics, AuditLog } from './types';

const api = axios.create({
  baseURL: '/api'
});

function App() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Queries
  const { data: stores, isRefetching: storesRefetching } = useQuery<StoreStatus[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await api.get('/stores');
      return data;
    },
    refetchInterval: 5000,
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
      const { data } = await api.get('/audit/logs?limit=50');
      return data;
    },
    refetchInterval: 5000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      const promise = api.post('/stores', data);
      toast.promise(promise, {
        loading: `Initializing ${data.name} infrastructure...`,
        success: 'Provisioning request accepted.',
        error: (err) => `Failed: ${err.response?.data?.error || err.message}`
      });
      await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      setIsDrawerOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const promise = api.delete(`/stores/${name}`);
      toast.promise(promise, {
        loading: `Deprovisioning ${name}...`,
        success: 'Cleanup process started.',
        error: `Cleanup failed for ${name}`
      });
      await promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
  });

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onNewStore={() => setIsDrawerOpen(true)}
      isRefetching={storesRefetching}
    >
      <Toaster theme="dark" position="bottom-right" richColors />

      {activeTab === 'overview' && (
        <div className="space-y-12">
          <MetricsGrid metrics={metrics} quota={quota} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Active Deployments</h3>
              </div>
              <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-2 min-h-[400px]">
                <DeploymentList
                  stores={stores || []}
                  onDelete={deleteMutation.mutate}
                  isDeleting={(name) => deleteMutation.isPending && deleteMutation.variables === name}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Recent Activity</h3>
              </div>
              <ActivityList logs={activityLogs} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stores' && (
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-2">
          <DeploymentList
            stores={stores || []}
            onDelete={deleteMutation.mutate}
            isDeleting={(name) => deleteMutation.isPending && deleteMutation.variables === name}
          />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="max-w-3xl">
          <ActivityList logs={activityLogs} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-12 text-center">
          <p className="text-zinc-500 font-medium italic">Global infrastructure settings coming soon.</p>
        </div>
      )}

      <CreateStoreDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    </DashboardLayout>
  );
}

export default App;
