import { AuditLog } from './types';
import { v4 as uuidv4 } from 'uuid';

class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs = 1000;

  log(
    action: 'create' | 'delete' | 'status_change',
    storeName: string,
    storeType: string,
    userId: string,
    status: 'success' | 'failed',
    details?: Record<string, any>,
    error?: string
  ): AuditLog {
    const auditLog: AuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      storeName,
      storeType,
      userId,
      details: details || {},
      status,
      error,
    };

    this.logs.push(auditLog);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`[AUDIT] ${action.toUpperCase()} ${storeName} by ${userId}: ${status}`, error ? `(${error})` : '');
    return auditLog;
  }

  getLogsForStore(storeName: string): AuditLog[] {
    return this.logs.filter(log => log.storeName === storeName);
  }

  getLogsForUser(userId: string): AuditLog[] {
    return this.logs.filter(log => log.userId === userId);
  }

  getAllLogs(): AuditLog[] {
    return [...this.logs];
  }

  getRecentLogs(limit: number = 50): AuditLog[] {
    return this.logs.slice(-limit);
  }
}

export const auditLogger = new AuditLogger();
