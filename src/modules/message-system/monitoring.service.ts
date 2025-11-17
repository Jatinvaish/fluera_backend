// ============================================
// src/modules/message-system/monitoring.service.ts - NEW
// ============================================
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../core/redis/redis.service';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  constructor(private redisService: RedisService) {
    // Report metrics every 60 seconds
    setInterval(() => this.reportMetrics(), 60000);
  }

  /**
   * ✅ Track operation performance
   */
  async trackOperation(
    operation: string,
    fn: () => Promise<any>,
  ): Promise<any> {
    const startTime = Date.now();
    let success = true;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      this.metrics.push({
        operation,
        duration,
        timestamp: startTime,
        success,
      });

      // Trim old metrics
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS);
      }

      // Log slow operations (>1 second)
      if (duration > 1000) {
        this.logger.warn(
          `⚠️  SLOW OPERATION: ${operation} took ${duration}ms`,
        );
      }

      // Store in Redis for aggregation
      this.storeMetric(operation, duration, success).catch(() => {});
    }
  }

  /**
   * ✅ Store metric in Redis for aggregation
   */
  private async storeMetric(
    operation: string,
    duration: number,
    success: boolean,
  ) {
    const key = `metrics:${operation}:${new Date().toISOString().split('T')[0]}`;

    try {
      // Increment counters
      await this.redisService.getClient()?.hincrby(key, 'count', 1);
      await this.redisService.getClient()?.hincrby(key, 'totalDuration', duration);

      if (!success) {
        await this.redisService.getClient()?.hincrby(key, 'errors', 1);
      }

      // Store min/max
      const currentMin = await this.redisService.getClient()?.hget(key, 'minDuration');
      if (!currentMin || duration < parseInt(currentMin)) {
        await this.redisService.getClient()?.hset(key, 'minDuration', duration);
      }

      const currentMax = await this.redisService.getClient()?.hget(key, 'maxDuration');
      if (!currentMax || duration > parseInt(currentMax)) {
        await this.redisService.getClient()?.hset(key, 'maxDuration', duration);
      }

      // Expire after 7 days
      await this.redisService.getClient()?.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      // Silent fail - don't impact performance
    }
  }

  /**
   * ✅ Get performance statistics
   */
  async getStatistics(operation?: string): Promise<any> {
    const last100Metrics = operation
      ? this.metrics.filter((m) => m.operation === operation).slice(-100)
      : this.metrics.slice(-100);

    if (last100Metrics.length === 0) {
      return {
        operation: operation || 'all',
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
      };
    }

    const durations = last100Metrics.map((m) => m.duration);
    const successful = last100Metrics.filter((m) => m.success).length;

    return {
      operation: operation || 'all',
      count: last100Metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successful / last100Metrics.length) * 100,
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * ✅ Get real-time health status
   */
  async getHealthStatus(): Promise<any> {
    const recentMetrics = this.metrics.slice(-100);

    if (recentMetrics.length === 0) {
      return {
        status: 'healthy',
        message: 'No recent activity',
      };
    }

    const avgDuration =
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
    const errorRate =
      (recentMetrics.filter((m) => !m.success).length / recentMetrics.length) * 100;

    let status = 'healthy';
    let message = 'All systems operational';

    if (avgDuration > 1000 || errorRate > 5) {
      status = 'degraded';
      message = `Performance degraded: ${avgDuration.toFixed(0)}ms avg, ${errorRate.toFixed(1)}% errors`;
    }

    if (avgDuration > 5000 || errorRate > 20) {
      status = 'unhealthy';
      message = `System unhealthy: ${avgDuration.toFixed(0)}ms avg, ${errorRate.toFixed(1)}% errors`;
    }

    return {
      status,
      message,
      metrics: {
        avgDuration: avgDuration.toFixed(0),
        errorRate: errorRate.toFixed(1),
        sampleSize: recentMetrics.length,
      },
    };
  }

  /**
   * ✅ Report metrics summary
   */
  private reportMetrics() {
    const operations = [...new Set(this.metrics.map((m) => m.operation))];

    this.logger.log('\n📊 Performance Report (Last 60 seconds):');

    operations.forEach((operation) => {
      const stats:any = this.getStatistics(operation);
      this.logger.log(
        `   ${operation}: ${stats.count} calls, ${stats.avgDuration.toFixed(0)}ms avg, ${stats.successRate.toFixed(1)}% success`,
      );
    });
  }

  /**
   * ✅ Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}