import { Metrics } from './types';

interface ProvisioningRecord {
  storeName: string;
  startTime: number;
  endTime?: number;
  success: boolean;
}

class MetricsCollector {
  private records: ProvisioningRecord[] = [];
  private totalCreated = 0;
  private totalFailed = 0;
  private totalDeleted = 0;

  recordProvisioningStart(storeName: string): void {
    this.records.push({
      storeName,
      startTime: Date.now(),
      success: false,
    });
  }

  recordProvisioningSuccess(storeName: string): void {
    const record = this.records.find(r => r.storeName === storeName && !r.endTime);
    if (record) {
      record.endTime = Date.now();
      record.success = true;
      this.totalCreated += 1;
    }
  }

  recordProvisioningFailure(storeName: string): void {
    const record = this.records.find(r => r.storeName === storeName && !r.endTime);
    if (record) {
      record.endTime = Date.now();
      record.success = false;
      this.totalFailed += 1;
    }
  }

  recordStoreDeletion(): void {
    this.totalDeleted += 1;
  }

  getMetrics(activeStoresCount: number): Metrics {
    const completedRecords = this.records.filter(r => r.endTime);
    const successfulRecords = completedRecords.filter(r => r.success);

    const durations = successfulRecords.map(r => (r.endTime! - r.startTime) / 1000); // in seconds
    const averageProvisioningTime = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const totalAttempts = this.totalCreated + this.totalFailed;
    const successRate = totalAttempts > 0
      ? (this.totalCreated / totalAttempts) * 100
      : 0;

    return {
      totalStoresCreated: this.totalCreated,
      totalStoresFailed: this.totalFailed,
      totalStoresDeleted: this.totalDeleted,
      averageProvisioningTime,
      successRate,
      activeStores: activeStoresCount,
    };
  }

  getRecentRecords(limit: number = 20): ProvisioningRecord[] {
    return this.records.slice(-limit);
  }
}

export const metricsCollector = new MetricsCollector();
