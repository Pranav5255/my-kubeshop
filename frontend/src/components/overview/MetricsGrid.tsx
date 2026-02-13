
import {
  Activity,
  Clock,
  Zap,
  Server
} from 'lucide-react';
import { Metrics, QuotaInfo } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Sparkline } from "../ui/sparkline";
import { Progress } from "../ui/progress";

interface MetricsGridProps {
  metrics?: Metrics;
  quota?: QuotaInfo;
}

export const MetricsGrid = ({ metrics, quota }: MetricsGridProps) => {
  const generateSparklineData = () => {
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 100));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Quota Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quota Usage</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{quota ? `${quota.storesCreated}/${quota.storesLimit}` : '...'}</div>
          <Progress value={quota ? (quota.storesCreated / quota.storesLimit) * 100 : 0} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {quota ? `${Math.round((quota.storesCreated / quota.storesLimit) * 100)}%` : 0}% used
          </p>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics ? `${metrics.successRate.toFixed(1)}%` : '...'}</div>
          <div className="mt-2">
            <Sparkline data={generateSparklineData()} color="#10b981" />
          </div>
        </CardContent>
      </Card>

      {/* Avg Provisioning */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Provisioning</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics ? `${Math.round(metrics.averageProvisioningTime)}s` : '...'}</div>
          <p className="text-xs text-muted-foreground mt-2">
            +2.1% from last week
          </p>
        </CardContent>
      </Card>

      {/* Active Clusters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Clusters</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics ? metrics.activeStores : '...'}</div>
          <div className="mt-2">
            <Sparkline data={generateSparklineData()} color="#6366f1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
