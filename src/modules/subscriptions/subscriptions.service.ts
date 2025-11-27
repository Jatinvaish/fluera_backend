// src/modules/subscriptions/subscriptions.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { AuditLoggerService } from '../global-modules/audit-logs/audit-logs.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreateCustomPlanDto,
  ChangeSubscriptionDto,
  CancelSubscriptionDto,
  ListPlansQueryDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private sqlService: SqlServerService,
    private auditLogger: AuditLoggerService,
  ) {}

  // ============================================
  // SUBSCRIPTION PLANS MANAGEMENT
  // ============================================

  /**
   * List all subscription plans
   */
  async listPlans(query: ListPlansQueryDto, tenantId: number) {
    try {
      // Get tenant type from tenantId
      const tenant = await this.sqlService.query(
        'SELECT tenant_type FROM tenants WHERE id = @tenantId',
        { tenantId },
      );

      const planType = tenant?.[0]?.tenant_type || null;

      const result: any = await this.sqlService.execute(
        'sp_ListSubscriptionPlans',
        {
          planType: planType,
          planTier: query.planTier || null,
          includeInactive: query.includeInactive || false,
        },
      );

      return {
        success: true,
        data: result || [],
      };
    } catch (error) {
      this.logger.error('Failed to list plans:', error);
      throw error;
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: number) {
    try {
      const result: any = await this.sqlService.execute(
        'sp_GetSubscriptionPlan',
        {
          planId,
        },
      );

      if (!result || result.length === 0) {
        throw new NotFoundException('Plan not found');
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      this.logger.error(`Failed to get plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Create new plan (Admin only)
   */
  async createPlan(dto: CreatePlanDto, userId: number, userType: string) {
    if (userType !== 'super_admin' && userType !== 'owner') {
      throw new ForbiddenException('Only super admins can create plans');
    }

    try {
      // Prepare features JSON
      const featuresJson = dto.features ? JSON.stringify(dto.features) : null;

      const result: any = await this.sqlService.query(
        `INSERT INTO subscription_plans (
          plan_name, plan_slug, plan_type, plan_tier, is_free, is_default,
          price_monthly, price_yearly, currency, billing_cycle, trial_days,
          max_staff, max_storage_gb, max_campaigns, max_invitations, max_integrations,
          max_creators, max_brands, max_file_size_mb, max_api_calls_per_day,
          features, priority_support, custom_branding, white_label, sso_enabled,
          is_active, sort_order, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @planName, @planSlug, @planType, @planTier, @isFree, @isDefault,
          @priceMonthly, @priceYearly, @currency, @billingCycle, @trialDays,
          @maxStaff, @maxStorageGb, @maxCampaigns, @maxInvitations, @maxIntegrations,
          @maxCreators, @maxBrands, @maxFileSizeMb, @maxApiCallsPerDay,
          @features, @prioritySupport, @customBranding, @whiteLabel, @ssoEnabled,
          1, @sortOrder, @userId, GETUTCDATE()
        )`,
        {
          planName: dto.planName,
          planSlug: dto.planSlug,
          planType: dto.planType,
          planTier: dto.planTier || null,
          isFree: dto.isFree || false,
          isDefault: dto.isDefault || false,
          priceMonthly: dto.priceMonthly || null,
          priceYearly: dto.priceYearly || null,
          currency: dto.currency || 'USD',
          billingCycle: dto.billingCycle || null,
          trialDays: dto.trialDays || 0,
          maxStaff: dto.maxStaff || null,
          maxStorageGb: dto.maxStorageGb || null,
          maxCampaigns: dto.maxCampaigns || null,
          maxInvitations: dto.maxInvitations || null,
          maxIntegrations: dto.maxIntegrations || null,
          maxCreators: dto.maxCreators || null,
          maxBrands: dto.maxBrands || null,
          maxFileSizeMb: dto.maxFileSizeMb || null,
          maxApiCallsPerDay: dto.maxApiCallsPerDay || null,
          features: featuresJson,
          prioritySupport: dto.prioritySupport || false,
          customBranding: dto.customBranding || false,
          whiteLabel: dto.whiteLabel || false,
          ssoEnabled: dto.ssoEnabled || false,
          sortOrder: dto.sortOrder || 0,
          userId,
        },
      );

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_plans',
        entityId: result[0].id,
        actionType: 'CREATE',
        newValues: result[0],
        severity: 'high',
      });

      return {
        success: true,
        data: result[0],
        message: 'Plan created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create plan:', error);
      throw error;
    }
  }

  /**
   * Update plan (Admin only)
   */
  async updatePlan(
    planId: number,
    dto: UpdatePlanDto,
    userId: number,
    userType: string,
  ) {
    if (userType !== 'super_admin' && userType !== 'owner') {
      throw new ForbiddenException('Only super admins can update plans');
    }

    try {
      // Get current plan
      const currentPlan = await this.getPlanById(planId);

      const updates: string[] = [];
      const params: any = { planId, userId };

      if (dto.planName !== undefined) {
        updates.push('plan_name = @planName');
        params.planName = dto.planName;
      }
      if (dto.isActive !== undefined) {
        updates.push('is_active = @isActive');
        params.isActive = dto.isActive;
      }
      if (dto.priceMonthly !== undefined) {
        updates.push('price_monthly = @priceMonthly');
        params.priceMonthly = dto.priceMonthly;
      }
      if (dto.priceYearly !== undefined) {
        updates.push('price_yearly = @priceYearly');
        params.priceYearly = dto.priceYearly;
      }
      if (dto.maxStaff !== undefined) {
        updates.push('max_staff = @maxStaff');
        params.maxStaff = dto.maxStaff;
      }
      if (dto.maxStorageGb !== undefined) {
        updates.push('max_storage_gb = @maxStorageGb');
        params.maxStorageGb = dto.maxStorageGb;
      }
      if (dto.maxCampaigns !== undefined) {
        updates.push('max_campaigns = @maxCampaigns');
        params.maxCampaigns = dto.maxCampaigns;
      }
      if (dto.maxInvitations !== undefined) {
        updates.push('max_invitations = @maxInvitations');
        params.maxInvitations = dto.maxInvitations;
      }
      if (dto.features !== undefined) {
        updates.push('features = @features');
        params.features = JSON.stringify(dto.features);
      }
      if (dto.prioritySupport !== undefined) {
        updates.push('priority_support = @prioritySupport');
        params.prioritySupport = dto.prioritySupport;
      }
      if (dto.customBranding !== undefined) {
        updates.push('custom_branding = @customBranding');
        params.customBranding = dto.customBranding;
      }
      if (dto.whiteLabel !== undefined) {
        updates.push('white_label = @whiteLabel');
        params.whiteLabel = dto.whiteLabel;
      }
      if (dto.ssoEnabled !== undefined) {
        updates.push('sso_enabled = @ssoEnabled');
        params.ssoEnabled = dto.ssoEnabled;
      }

      if (updates.length === 0) {
        throw new BadRequestException('No fields to update');
      }

      updates.push('updated_at = GETUTCDATE()');
      updates.push('updated_by = @userId');

      const result: any = await this.sqlService.query(
        `UPDATE subscription_plans 
         SET ${updates.join(', ')}
         OUTPUT INSERTED.*
         WHERE id = @planId`,
        params,
      );

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_plans',
        entityId: planId,
        actionType: 'UPDATE',
        oldValues: currentPlan.data,
        newValues: result[0],
        severity: 'high',
      });

      return {
        success: true,
        data: result[0],
        message: 'Plan updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Delete plan (Admin only)
   */
  async deletePlan(planId: number, userId: number, userType: string) {
    if (userType !== 'super_admin' && userType !== 'owner') {
      throw new ForbiddenException('Only super admins can delete plans');
    }

    try {
      // Check if any tenants are using this plan
      const tenantCheck: any = await this.sqlService.query(
        `SELECT COUNT(*) as count FROM tenants WHERE subscription_plan_id = @planId`,
        { planId },
      );

      if (tenantCheck[0].count > 0) {
        throw new BadRequestException(
          'Cannot delete plan that is currently in use by tenants',
        );
      }

      await this.sqlService.query(
        `UPDATE subscription_plans SET is_active = 0, updated_at = GETUTCDATE(), updated_by = @userId WHERE id = @planId`,
        { planId, userId },
      );

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_plans',
        entityId: planId,
        actionType: 'DELETE',
        severity: 'high',
      });

      return {
        success: true,
        message: 'Plan deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete plan ${planId}:`, error);
      throw error;
    }
  }

  // ============================================
  // CUSTOM PLANS
  // ============================================

  /**
   * Create custom plan for tenant (Admin only)
   */
  async createCustomPlan(
    dto: CreateCustomPlanDto,
    userId: number,
    userType: string,
  ) {
    if (userType !== 'super_admin' && userType !== 'owner') {
      throw new ForbiddenException('Only super admins can create custom plans');
    }

    try {
      const customFeaturesJson = dto.customFeatures
        ? JSON.stringify(dto.customFeatures)
        : null;

      const result: any = await this.sqlService.execute('sp_CreateCustomPlan', {
        tenantId: dto.tenantId,
        basePlanId: dto.basePlanId || null,
        customPlanName: dto.customPlanName || null,
        maxStaff: dto.maxStaff || null,
        maxStorageGb: dto.maxStorageGb || null,
        maxCampaigns: dto.maxCampaigns || null,
        maxInvitations: dto.maxInvitations || null,
        maxCreators: dto.maxCreators || null,
        maxBrands: dto.maxBrands || null,
        maxIntegrations: dto.maxIntegrations || null,
        maxFileSizeMb: dto.maxFileSizeMb || null,
        maxApiCallsPerDay: dto.maxApiCallsPerDay || null,
        customPriceMonthly: dto.customPriceMonthly || null,
        customPriceYearly: dto.customPriceYearly || null,
        currency: dto.currency || null,
        customFeatures: customFeaturesJson,
        prioritySupport: dto.prioritySupport || null,
        customBranding: dto.customBranding || null,
        whiteLabel: dto.whiteLabel || null,
        ssoEnabled: dto.ssoEnabled || null,
        expiresAt: dto.expiresAt || null,
        notes: dto.notes || null,
        createdBy: userId,
      });

      await this.auditLogger.log({
        tenantId: dto.tenantId,
        userId,
        entityType: 'tenant_custom_plans',
        entityId: result[0].id,
        actionType: 'CREATE',
        newValues: result[0],
        severity: 'high',
      });

      return {
        success: true,
        data: result[0],
        message: 'Custom plan created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create custom plan:', error);
      throw error;
    }
  }

  /**
   * Get custom plan for tenant
   */
  async getCustomPlan(tenantId: number) {
    try {
      const result: any = await this.sqlService.query(
        `SELECT tcp.*, sp.plan_name as base_plan_name
         FROM tenant_custom_plans tcp
         LEFT JOIN subscription_plans sp ON tcp.base_plan_id = sp.id
         WHERE tcp.tenant_id = @tenantId AND tcp.is_active = 1`,
        { tenantId },
      );

      if (!result || result.length === 0) {
        return {
          success: true,
          data: null,
          message: 'No custom plan found',
        };
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      this.logger.error(
        `Failed to get custom plan for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Get tenant subscription details
   */
  async getTenantSubscription(tenantId: number) {
    try {
      const result: any = await this.sqlService.execute(
        'sp_GetTenantSubscription',
        {
          tenantId,
        },
      );

      if (!result || result.length === 0) {
        throw new NotFoundException('Tenant subscription not found');
      }

      const subscription = result[0];

      // Parse JSON fields
      if (subscription.plan_features) {
        try {
          subscription.plan_features = JSON.parse(subscription.plan_features);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }

      if (subscription.custom_features) {
        try {
          subscription.custom_features = JSON.parse(
            subscription.custom_features,
          );
        } catch (e) {
          // Keep as string if parsing fails
        }
      }

      return {
        success: true,
        data: subscription,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subscription for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Change subscription plan with payment confirmation email
   */
  async changeSubscription(
    tenantId: number,
    dto: ChangeSubscriptionDto,
    userId: number,
  ) {
    try {
      await this.getPlanById(dto.planId);

      const currentSub = await this.getTenantSubscription(tenantId);
      const currentPlanId = currentSub.data.subscription_plan_id;

      let changeType = 'change';
      if (currentPlanId) {
        const currentPlan = await this.getPlanById(currentPlanId);
        const newPlan = await this.getPlanById(dto.planId);

        const currentPrice =
          dto.billingCycle === 'yearly'
            ? currentPlan.data.price_yearly
            : currentPlan.data.price_monthly;
        const newPrice =
          dto.billingCycle === 'yearly'
            ? newPlan.data.price_yearly
            : newPlan.data.price_monthly;

        if (newPrice > currentPrice) changeType = 'upgrade';
        else if (newPrice < currentPrice) changeType = 'downgrade';
      }

      const result: any = await this.sqlService.execute(
        'sp_ChangeSubscriptionPlan',
        {
          tenantId,
          newPlanId: dto.planId,
          billingCycle: dto.billingCycle,
          changeType,
          changeReason: dto.changeReason || null,
          changedBy: userId,
          effectiveDate: dto.effectiveDate || null,
        },
      );

      // ✅ Send payment success email
      try {
        const newPlan = await this.getPlanById(dto.planId);
        const amount =
          dto.billingCycle === 'yearly'
            ? newPlan.data.price_yearly
            : newPlan.data.price_monthly;

        // Import SubscriptionSchedulerService if not already imported
        // this.schedulerService.sendPaymentSuccessEmail(
        //   tenantId,
        //   newPlan.data.plan_name,
        //   amount,
        //   dto.billingCycle
        // );
      } catch (emailError) {
        this.logger.error(
          'Failed to send payment confirmation email:',
          emailError,
        );
        // Don't fail the subscription change if email fails
      }

      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'tenants',
        entityId: tenantId,
        actionType: 'SUBSCRIPTION_CHANGE',
        newValues: {
          newPlanId: dto.planId,
          billingCycle: dto.billingCycle,
          changeType,
        },
        severity: 'high',
      });

      return {
        success: true,
        message: `Subscription ${changeType}d successfully`,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to change subscription for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    tenantId: number,
    dto: CancelSubscriptionDto,
    userId: number,
  ) {
    try {
      const result: any = await this.sqlService.execute(
        'sp_CancelSubscription',
        {
          tenantId,
          cancelReason: dto.cancelReason,
          cancelImmediately: dto.cancelImmediately || false,
          cancelledBy: userId,
        },
      );

      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'tenants',
        entityId: tenantId,
        actionType: 'SUBSCRIPTION_CANCEL',
        newValues: {
          cancelReason: dto.cancelReason,
          cancelImmediately: dto.cancelImmediately,
        },
        severity: 'high',
      });

      return {
        success: true,
        message: dto.cancelImmediately
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at the end of billing period',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(tenantId: number, userId: number) {
    try {
      const currentSub = await this.getTenantSubscription(tenantId);

      if (
        currentSub.data.subscription_status !== 'cancelled' &&
        !currentSub.data.cancellation_requested_at
      ) {
        throw new BadRequestException('Subscription is not cancelled');
      }

      await this.sqlService.query(
        `UPDATE tenants
         SET 
           subscription_status = 'active',
           cancellation_requested_at = NULL,
           cancellation_effective_at = NULL,
           cancellation_reason = NULL,
           cancelled_by = NULL,
           auto_renew = 1,
           updated_at = GETUTCDATE(),
           updated_by = @userId
         WHERE id = @tenantId`,
        { tenantId, userId },
      );

      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'tenants',
        entityId: tenantId,
        actionType: 'SUBSCRIPTION_REACTIVATE',
        severity: 'medium',
      });

      return {
        success: true,
        message: 'Subscription reactivated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to reactivate subscription for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get subscription history
   */
  async getSubscriptionHistory(tenantId: number) {
    try {
      const result: any = await this.sqlService.query(
        `SELECT 
          sh.*,
          sp_from.plan_name as from_plan_name,
          sp_to.plan_name as to_plan_name,
          u.email as changed_by_email,
          u.first_name as changed_by_first_name,
          u.last_name as changed_by_last_name
         FROM subscription_history sh
         LEFT JOIN subscription_plans sp_from ON sh.from_plan_id = sp_from.id
         LEFT JOIN subscription_plans sp_to ON sh.to_plan_id = sp_to.id
         LEFT JOIN users u ON sh.created_by = u.id
         WHERE sh.tenant_id = @tenantId
         ORDER BY sh.created_at DESC`,
        { tenantId },
      );

      return {
        success: true,
        data: result || [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subscription history for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }
}
