import React from 'react';
import {
  MoreHorizontal,
  Box,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  ShoppingCart,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { StoreStatus } from '../../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

interface DeploymentListProps {
  stores: StoreStatus[];
  onDelete: (name: string) => void;
  isDeleting: (name: string) => boolean;
}

const StatusBadge = ({ status }: { status: StoreStatus['status'] }) => {
  const variants = {
    Ready: 'default',
    Provisioning: 'secondary',
    Failed: 'destructive',
  } as const;

  const icons = {
    Ready: <CheckCircle2 className="mr-1 h-3 w-3" />,
    Provisioning: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
    Failed: <XCircle className="mr-1 h-3 w-3" />,
  };

  return (
    <Badge variant={variants[status] || 'outline'} className="uppercase text-[10px]">
      {icons[status] || <AlertCircle className="mr-1 h-3 w-3" />}
      {status}
    </Badge>
  );
};

export const DeploymentList = ({ stores, onDelete, isDeleting }: DeploymentListProps) => {
  const [showPassword, setShowPassword] = React.useState<Record<string, boolean>>({});

  const formatAge = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const togglePasswordVisibility = (storeName: string) => {
    setShowPassword(prev => ({ ...prev, [storeName]: !prev[storeName] }));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Deployment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead className="w-[200px]">Credentials</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => (
            <TableRow key={store.name}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground border border-border">
                    <Box className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {store.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {store.url.replace('http://', '')}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={store.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {store.type === 'woocommerce' ? 'WooCommerce' : 'MedusaJS'}
                </div>
              </TableCell>
              <TableCell>
                {store.status === 'Ready' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">User:</span>
                      <code className="font-mono text-[10px] bg-secondary px-1 rounded">{store.adminUsername}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => copyToClipboard(store.adminUsername)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">Pass:</span>
                      <code className="font-mono text-[10px] bg-secondary px-1 rounded">
                        {showPassword[store.name] ? store.adminPassword : '••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => togglePasswordVisibility(store.name)}
                      >
                        {showPassword[store.name] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => copyToClipboard(store.adminPassword)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatAge(store.createdAt)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {store.status === 'Ready' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(store.adminUrl, '_blank')}
                      >
                        <Settings className="mr-1 h-3 w-3" />
                        Admin
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(store.shopUrl, '_blank')}
                      >
                        <ShoppingCart className="mr-1 h-3 w-3" />
                        Shop
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => copyToClipboard(store.url)}
                      >
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={isDeleting(store.name)}
                        onClick={() => onDelete(store.name)}
                      >
                        {isDeleting(store.name) ? "Deleting..." : "Delete Deployment"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {stores.length === 0 && (
        <div className="py-24 text-center">
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Box className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold">No active deployments</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">You haven't created any stores yet.</p>
        </div>
      )}
    </div>
  );
};
