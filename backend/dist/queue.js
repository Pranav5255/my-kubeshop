"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisioningQueue = void 0;
class ProvisioningQueue {
    queue = [];
    running = new Set();
    MAX_CONCURRENT = 3;
    taskMap = new Map();
    enqueue(storeName, type) {
        const task = {
            id: `${storeName}-${Date.now()}`,
            storeName,
            type,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        this.queue.push(task);
        this.taskMap.set(task.id, task);
        return task;
    }
    async executeNext(executor) {
        if (this.running.size >= this.MAX_CONCURRENT) {
            return false;
        }
        const task = this.queue.find(t => t.status === 'pending');
        if (!task) {
            return false;
        }
        task.status = 'running';
        task.startedAt = new Date().toISOString();
        this.running.add(task.id);
        try {
            await executor(task.storeName, task.type);
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
        }
        catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : String(error);
            task.completedAt = new Date().toISOString();
        }
        finally {
            this.running.delete(task.id);
        }
        return true;
    }
    getStatus(storeName) {
        return Array.from(this.taskMap.values()).find(t => t.storeName === storeName);
    }
    getQueue() {
        return [...this.queue];
    }
    getRunningCount() {
        return this.running.size;
    }
    canAcceptMore() {
        return this.running.size < this.MAX_CONCURRENT;
    }
}
exports.provisioningQueue = new ProvisioningQueue();
