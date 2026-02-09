interface QueuedTask {
  id: string;
  storeName: string;
  type: 'woocommerce' | 'medusa';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

class ProvisioningQueue {
  private queue: QueuedTask[] = [];
  private running: Set<string> = new Set();
  private readonly MAX_CONCURRENT = 3;
  private taskMap: Map<string, QueuedTask> = new Map();

  enqueue(storeName: string, type: 'woocommerce' | 'medusa'): QueuedTask {
    const task: QueuedTask = {
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

  async executeNext(executor: (storeName: string, type: string) => Promise<void>): Promise<boolean> {
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
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date().toISOString();
    } finally {
      this.running.delete(task.id);
    }

    return true;
  }

  getStatus(storeName: string): QueuedTask | undefined {
    return Array.from(this.taskMap.values()).find(t => t.storeName === storeName);
  }

  getQueue(): QueuedTask[] {
    return [...this.queue];
  }

  getRunningCount(): number {
    return this.running.size;
  }

  canAcceptMore(): boolean {
    return this.running.size < this.MAX_CONCURRENT;
  }
}

export const provisioningQueue = new ProvisioningQueue();
