// src/modules/subscriptions/subscription-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(private sqlService: SqlServerService) {}

  /**
   * Check and expire trials - runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkExpiredTrials() {
    this.logger.log('Checking expired trials...');
    
    try {
      const result: any = await this.sqlService.query(
        `UPDATE tenants
         SET subscription_status = 'expired',
             updated_at = GETUTCDATE()
         OUTPUT INSERTED.id, INSERTED.name
         WHERE is_trial = 1
           AND trial_ends_at < GETUTCDATE()
           AND subscription_status = 'trial'`
      );

      if (result && result.length > 0) {
        this.logger.log(`Expired ${result.length} trial subscriptions`);
        
        // TODO: Send expiration emails
        for (const tenant of result) {
          this.logger.log(`Trial expired for tenant ${tenant.id}: ${tenant.name}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check expired trials:', error);
    }
  }

  /**
   * Check and expire subscriptions - runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async checkExpiredSubscriptions() {
    this.logger.log('Checking expired subscriptions...');
    
    try {
      const result: any = await this.sqlService.query(
        `UPDATE tenants
         SET subscription_status = 'expired',
             updated_at = GETUTCDATE()
         OUTPUT INSERTED.id, INSERTED.name
         WHERE subscription_expires_at < GETUTCDATE()
           AND subscription_status = 'active'
           AND auto_renew = 0`
      );

      if (result && result.length > 0) {
        this.logger.log(`Expired ${result.length} subscriptions`);
        
        // TODO: Send expiration emails
        for (const tenant of result) {
          this.logger.log(`Subscription expired for tenant ${tenant.id}: ${tenant.name}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check expired subscriptions:', error);
    }
  }

  /**
   * Process pending cancellations - runs daily at 4 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async processPendingCancellations() {
    this.logger.log('Processing pending cancellations...');
    
    try {
      const result: any = await this.sqlService.query(
        `UPDATE tenants
         SET subscription_status = 'cancelled',
             updated_at = GETUTCDATE()
         OUTPUT INSERTED.id, INSERTED.name
         WHERE cancellation_effective_at <= GETUTCDATE()
           AND cancellation_requested_at IS NOT NULL
           AND subscription_status != 'cancelled'`
      );

      if (result && result.length > 0) {
        this.logger.log(`Cancelled ${result.length} subscriptions`);
        
        for (const tenant of result) {
          this.logger.log(`Subscription cancelled for tenant ${tenant.id}: ${tenant.name}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process pending cancellations:', error);
    }
  }

  /**
   * Send renewal reminders - runs daily at 10 AM
   */
  @Cron('0 10 * * *')
  async sendRenewalReminders() {
    this.logger.log('Sending renewal reminders...');
    
    try {
      // Get subscriptions expiring in 7 days
      const result: any = await this.sqlService.query(
        `SELECT 
          t.id, t.name, t.subscription_expires_at,
          u.email, u.first_name, u.last_name,
          sp.plan_name, sp.price_monthly, sp.price_yearly
         FROM tenants t
         JOIN users u ON t.owner_user_id = u.id
         LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
         WHERE t.subscription_expires_at BETWEEN GETUTCDATE() AND DATEADD(day, 7, GETUTCDATE())
           AND t.subscription_status = 'active'
           AND t.auto_renew = 0`
      );

      if (result && result.length > 0) {
        this.logger.log(`Found ${result.length} subscriptions expiring soon`);
        
        // TODO: Send reminder emails
        for (const tenant of result) {
          this.logger.log(
            `Reminder needed for tenant ${tenant.id}: ${tenant.name} (expires ${tenant.subscription_expires_at})`
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send renewal reminders:', error);
    }
  }
}