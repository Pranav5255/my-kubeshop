
import { motion } from 'framer-motion';
import {

  XCircle,
  RefreshCw,
  Trash2,
  PlusCircle,
  Clock,
  Terminal
} from 'lucide-react';
import { AuditLog } from '../../types';

interface ActivityListProps {
  logs?: AuditLog[];
}

const LogIcon = ({ action, status }: { action: string, status: string }) => {
  if (status === 'failed') return <XCircle size={14} className="text-rose-500" />;

  switch (action) {
    case 'create': return <PlusCircle size={14} className="text-indigo-400" />;
    case 'delete': return <Trash2 size={14} className="text-amber-500" />;
    case 'status_change': return <RefreshCw size={14} className="text-emerald-400" />;
    default: return <Terminal size={14} className="text-zinc-500" />;
  }
};

export const ActivityList = ({ logs }: ActivityListProps) => {
  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <Terminal size={14} className="text-zinc-500" />
          Event Stream
        </h3>
        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded uppercase tracking-tighter">Live Feed</span>
      </div>

      <div className="divide-y divide-zinc-900 max-h-[600px] overflow-y-auto custom-scrollbar">
        {!logs || logs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-zinc-600 text-xs font-medium italic">No infrastructure events recorded.</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="p-4 hover:bg-zinc-900/30 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1.5 rounded-md bg-zinc-900 border border-zinc-800">
                  <LogIcon action={log.action} status={log.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-[13px] font-bold text-zinc-100 truncate">
                      {log.action.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 whitespace-nowrap">
                      <Clock size={10} />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>Store:</span>
                    <span className="font-mono text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800/50">
                      {log.storeName}
                    </span>
                  </div>
                  {log.error && (
                    <div className="mt-2 p-2 rounded-md bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-400 font-medium leading-relaxed">
                      {log.error}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
