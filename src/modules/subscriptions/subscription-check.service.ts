// src/modules/subscriptions/subscription-check.service.ts
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class SubscriptionCheckService {
  private readonly logger = new Logger(SubscriptionCheckService.name);

  constructor(private sqlService: SqlServerService) {}

  /**
   * Check if tenant can add more of a resource
   */
  async checkLimit(
    tenantId: number,
    limitType: 'staff' | 'storage' | 'campaigns' | 'invitations' | 'creators' | 'brands',
  ): Promise<{ canAdd: boolean; currentUsage: number; maxLimit: number; remaining: number }> {
    try {
      const result: any = await this.sqlService.execute('sp_CheckUsageLimit', {
        tenantId,
        limitType,
      });

      if (!result || result.length === 0) {
        throw new Error('Failed to check usage limit');
      }

      const data = result[0];
      return {
        canAdd: data.can_add === 1,
        currentUsage: data.current_usage || 0,
        maxLimit: data.max_limit || 0,
        remaining: data.remaining || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to check limit for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Enforce limit - throw error if limit exceeded
   */
  async enforceLimit(
    tenantId: number,
    limitType: 'staff' | 'storage' | 'campaigns' | 'invitations' | 'creators' | 'brands',
  ): Promise<void> {
    const check = await this.checkLimit(tenantId, limitType);
    
    if (!check.canAdd) {
      throw new ForbiddenException(
        `You have reached your ${limitType} limit (${check.maxLimit}). Please upgrade your plan.`,
      );
    }
  }

  /**
   * Check if tenant has access to a feature
   */
  async checkFeatureAccess(tenantId: number, featureName: string): Promise<boolean> {
    try {
      const result: any = await this.sqlService.execute('sp_CheckFeatureAccess', {
        tenantId,
        featureName,
      });

      if (!result || result.length === 0) {
        return false;
      }

      return result[0].has_access === 1;
    } catch (error) {
      this.logger.error(`Failed to check feature access for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Enforce feature access - throw error if not allowed
   */
  async enforceFeatureAccess(tenantId: number, featureName: string): Promise<void> {
    const hasAccess = await this.checkFeatureAccess(tenantId, featureName);
    
    if (!hasAccess) {
      throw new ForbiddenException(
        `Your plan does not include access to ${featureName}. Please upgrade.`,
      );
    }
  }

  /**
   * Check subscription status
   */
  async checkSubscriptionStatus(tenantId: number): Promise<{
    isActive: boolean;
    status: string;
    isTrial: boolean;
    daysRemaining: number | null;
  }> {
    try {
      const result: any = await this.sqlService.query(
        `SELECT 
          subscription_status,
          is_trial,
          trial_ends_at,
          subscription_expires_at,
          CASE 
            WHEN is_trial = 1 THEN DATEDIFF(day, GETUTCDATE(), trial_ends_at)
            ELSE DATEDIFF(day, GETUTCDATE(), subscription_expires_at)
          END as days_remaining
        FROM tenants
        WHERE id = @tenantId`,
        { tenantId },
      );

      if (!result || result.length === 0) {
        throw new Error('Tenant not found');
      }

      const data = result[0];
      return {
        isActive: data.subscription_status === 'active',
        status: data.subscription_status,
        isTrial: data.is_trial === 1,
        daysRemaining: data.days_remaining,
      };
    } catch (error) {
      this.logger.error(`Failed to check subscription status for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Enforce active subscription
   */
  async enforceActiveSubscription(tenantId: number): Promise<void> {
    const status = await this.checkSubscriptionStatus(tenantId);
    
    if (!status.isActive) {
      throw new ForbiddenException(
        `Your subscription is ${status.status}. Please renew to continue.`,
      );
    }
  }
}