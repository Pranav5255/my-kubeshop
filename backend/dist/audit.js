"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = void 0;
const uuid_1 = require("uuid");
class AuditLogger {
    logs = [];
    maxLogs = 1000;
    log(action, storeName, storeType, userId, status, details, error) {
        const auditLog = {
            id: (0, uuid_1.v4)(),
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
    getLogsForStore(storeName) {
        return this.logs.filter(log => log.storeName === storeName);
    }
    getLogsForUser(userId) {
        return this.logs.filter(log => log.userId === userId);
    }
    getAllLogs() {
        return [...this.logs];
    }
    getRecentLogs(limit = 50) {
        return this.logs.slice(-limit);
    }
}
exports.auditLogger = new AuditLogger();
