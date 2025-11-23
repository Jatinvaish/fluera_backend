// src/core/middlewares/usage-tracking.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SqlServerService } from '../database/sql-server.service';

@Injectable()
export class UsageTrackingMiddleware implements NestMiddleware {
  constructor(private sqlService: SqlServerService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Track API usage for rate limiting
    // ✅ FIX: Access tenantId from authenticated user properly
    const user = req['user'] as any; // Cast to any to access custom properties
    const tenantId = user?.tenantId;
    
    if (tenantId) {
      // Log API call (async, don't wait)
      this.trackApiCall(tenantId).catch(err => {
        console.error('Failed to track API call:', err);
      });
    }
    
    next();
  }

  private async trackApiCall(tenantId: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await this.sqlService.query(
        `MERGE INTO tenant_usage AS target
         USING (SELECT @tenantId AS tenant_id, @date AS measurement_period) AS source
         ON target.tenant_id = source.tenant_id 
            AND target.metric_name = 'api_calls' 
            AND target.measurement_period = source.measurement_period
         WHEN MATCHED THEN
           UPDATE SET metric_value = metric_value + 1, updated_at = GETUTCDATE()
         WHEN NOT MATCHED THEN
           INSERT (tenant_id, metric_name, metric_value, measurement_period, created_at)
           VALUES (@tenantId, 'api_calls', 1, @date, GETUTCDATE());`,
        { tenantId, date: today }
      );
    } catch (error) {
      // Silently fail - don't break requests if usage tracking fails
      console.error('API call tracking error:', error);
    }
  }
}