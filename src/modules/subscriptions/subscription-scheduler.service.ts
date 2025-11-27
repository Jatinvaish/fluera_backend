// src/modules/subscriptions/subscription-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SqlServerService } from '../../core/database/sql-server.service';
import { EmailService } from '../email-templates/email.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private sqlService: SqlServerService,
    private emailService: EmailService,
  ) {}

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
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.owner_user_id
         WHERE is_trial = 1
           AND trial_ends_at < GETUTCDATE()
           AND subscription_status = 'trial'`
      );

      if (result && result.length > 0) {
        this.logger.log(`Expired ${result.length} trial subscriptions`);
        
        for (const tenant of result) {
          try {
            const userInfo: any = await this.sqlService.query(
              'SELECT email, first_name FROM users WHERE id = @userId',
              { userId: tenant.owner_user_id }
            );

            if (userInfo && userInfo.length > 0) {
              await this.emailService.sendTrialExpiredEmail(
                userInfo[0].email,
                userInfo[0].first_name || 'User',
                tenant.name
              );
            }
          } catch (emailError) {
            this.logger.error(
              `Failed to send trial expiry email for tenant ${tenant.id}:`,
              emailError
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check expired trials:', error);
    }
  }

  /**
   * Send trial expiry warnings - runs daily at 9 AM
   */
  @Cron('0 9 * * *')
  async sendTrialExpiryWarnings() {
    this.logger.log('Sending trial expiry warnings...');
    
    try {
      // Get trials expiring in 3 days
      const result: any = await this.sqlService.query(
        `SELECT 
          t.id, t.name, t.trial_ends_at,
          u.email, u.first_name,
          DATEDIFF(day, GETUTCDATE(), t.trial_ends_at) as days_remaining
         FROM tenants t
         JOIN users u ON t.owner_user_id = u.id
         WHERE t.is_trial = 1
           AND t.subscription_status = 'trial'
           AND t.trial_ends_at BETWEEN GETUTCDATE() AND DATEADD(day, 3, GETUTCDATE())`
      );

      if (result && result.length > 0) {
        this.logger.log(`Found ${result.length} trials expiring soon`);
        
        for (const tenant of result) {
          try {
            await this.emailService.sendTrialExpiryWarningEmail(
              tenant.email,
              tenant.first_name || 'User',
              tenant.name,
              tenant.days_remaining
            );
          } catch (emailError) {
            this.logger.error(
              `Failed to send trial warning email for tenant ${tenant.id}:`,
              emailError
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to send trial expiry warnings:', error);
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
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.owner_user_id
         WHERE subscription_expires_at < GETUTCDATE()
           AND subscription_status = 'active'
           AND auto_renew = 0`
      );

      if (result && result.length > 0) {
        this.logger.log(`Expired ${result.length} subscriptions`);
        
        for (const tenant of result) {
          try {
            const userInfo: any = await this.sqlService.query(
              'SELECT email, first_name FROM users WHERE id = @userId',
              { userId: tenant.owner_user_id }
            );

            if (userInfo && userInfo.length > 0) {
              await this.emailService.sendSubscriptionExpiredEmail(
                userInfo[0].email,
                userInfo[0].first_name || 'User',
                tenant.name
              );
            }
          } catch (emailError) {
            this.logger.error(
              `Failed to send expiry email for tenant ${tenant.id}:`,
              emailError
            );
          }
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
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.owner_user_id
         WHERE cancellation_effective_at <= GETUTCDATE()
           AND cancellation_requested_at IS NOT NULL
           AND subscription_status != 'cancelled'`
      );

      if (result && result.length > 0) {
        this.logger.log(`Cancelled ${result.length} subscriptions`);
        
        for (const tenant of result) {
          try {
            const userInfo: any = await this.sqlService.query(
              'SELECT email, first_name FROM users WHERE id = @userId',
              { userId: tenant.owner_user_id }
            );

            if (userInfo && userInfo.length > 0) {
              await this.emailService.sendSubscriptionCancelledEmail(
                userInfo[0].email,
                userInfo[0].first_name || 'User',
                tenant.name
              );
            }
          } catch (emailError) {
            this.logger.error(
              `Failed to send cancellation email for tenant ${tenant.id}:`,
              emailError
            );
          }
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
      const result: any = await this.sqlService.query(
        `SELECT 
          t.id, t.name, t.subscription_expires_at, t.billing_cycle,
          u.email, u.first_name, u.last_name,
          sp.plan_name, sp.price_monthly, sp.price_yearly,
          DATEDIFF(day, GETUTCDATE(), t.subscription_expires_at) as days_remaining
         FROM tenants t
         JOIN users u ON t.owner_user_id = u.id
         LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
         WHERE t.subscription_expires_at BETWEEN GETUTCDATE() AND DATEADD(day, 7, GETUTCDATE())
           AND t.subscription_status = 'active'
           AND t.auto_renew = 0`
      );

      if (result && result.length > 0) {
        this.logger.log(`Found ${result.length} subscriptions expiring soon`);
        
        for (const tenant of result) {
          try {
            const price = tenant.billing_cycle === 'yearly' 
              ? tenant.price_yearly 
              : tenant.price_monthly;

            await this.emailService.sendRenewalReminderEmail(
              tenant.email,
              tenant.first_name || 'User',
              tenant.name,
              tenant.plan_name,
              tenant.days_remaining,
              price,
              tenant.billing_cycle
            );
          } catch (emailError) {
            this.logger.error(
              `Failed to send renewal reminder for tenant ${tenant.id}:`,
              emailError
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to send renewal reminders:', error);
    }
  }

  /**
   * Send payment success confirmation
   */
  async sendPaymentSuccessEmail(
    tenantId: number,
    planName: string,
    amount: number,
    billingCycle: string
  ) {
    try {
      const userInfo: any = await this.sqlService.query(
        `SELECT u.email, u.first_name, t.name as tenant_name
         FROM users u
         JOIN tenants t ON u.id = t.owner_user_id
         WHERE t.id = @tenantId`,
        { tenantId }
      );

      if (userInfo && userInfo.length > 0) {
        await this.emailService.sendPaymentSuccessEmail(
          userInfo[0].email,
          userInfo[0].first_name || 'User',
          userInfo[0].tenant_name,
          planName,
          amount,
          billingCycle
        );
      }
    } catch (error) {
      this.logger.error('Failed to send payment success email:', error);
    }
  }
}