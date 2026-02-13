import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingCart,
  Rocket,
  Check,
  Info,
  Loader2,
  Box,
  Terminal,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface CreateStoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; type: 'woocommerce' | 'medusa' }) => void;
  isPending: boolean;
}

export const CreateStoreDrawer = ({ isOpen, onClose, onSubmit, isPending }: CreateStoreDrawerProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'woocommerce' | 'medusa'>('woocommerce');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length < 3) {
      toast.error('Identifier too short');
      return;
    }
    onSubmit({ name, type });
  };

  const platforms = [
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      desc: 'PHP-based monolith ecosystem',
      icon: <ShoppingCart size={18} />,
    },
    {
      id: 'medusa',
      name: 'MedusaJS',
      desc: 'Node.js headless commerce engine',
      icon: <Rocket size={18} />,
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[500px] bg-background border-l border-border z-[101] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Deploy Infrastructure</h2>
                <p className="text-muted-foreground text-xs mt-1 font-medium uppercase tracking-widest">New Store Instance</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Platform Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  <Box size={14} />
                  Select Platform
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {platforms.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setType(p.id as any)}
                      className={cn(
                        "relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
                        type === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-lg border",
                        type === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                      )}>
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.desc}</div>
                      </div>
                      {type === p.id && (
                        <div className="absolute top-4 right-4">
                          <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
                            <Check size={10} />
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  <Terminal size={14} />
                  Store Configuration
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Unique Identifier</label>
                    <Input
                      autoFocus
                      required
                      type="text"
                      placeholder="e.g. production-unit-01"
                      className="font-mono bg-background"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={14} className="text-emerald-500 mt-0.5" />
                      <div>
                        <div className="text-[11px] font-bold">Isolated Namespace</div>
                        <div className="text-[10px] text-muted-foreground">Resource quotas and network policies applied automatically.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap size={14} className="text-amber-500 mt-0.5" />
                      <div>
                        <div className="text-[11px] font-bold">Automated Setup</div>
                        <div className="text-[10px] text-muted-foreground">Database provisioning and WordPress optimization included.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Preview */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  <Info size={14} />
                  Technical Preview
                </div>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-[10px] text-muted-foreground space-y-1">
                  <p><span className="text-foreground">domain:</span> {name || 'name'}.store.127.0.0.1.nip.io</p>
                  <p><span className="text-foreground">stack:</span> {type === 'woocommerce' ? 'k8s-woo-v1' : 'k8s-medusa-v1'}</p>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-background/50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-[2]"
                disabled={isPending || !name}
                onClick={handleSubmit}
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Launching...
                  </>
                ) : (
                  'Confirm & Launch'
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
