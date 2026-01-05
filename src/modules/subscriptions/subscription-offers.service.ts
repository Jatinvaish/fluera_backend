// src/modules/subscriptions/subscription-offers.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { AuditLoggerService } from '../global-modules/audit-logs/audit-logs.service';

@Injectable()
export class SubscriptionOffersService {
  private readonly logger = new Logger(SubscriptionOffersService.name);

  constructor(
    private sqlService: SqlServerService,
    private auditLogger: AuditLoggerService,
  ) {}

  /**
   * Get all available offers
   */
  async getAvailableOffers(
    tenantId?: number,
    planId?: number,
    billingCycle?: string,
    isFestivalOnly: boolean = false,
    page: number = 1,
    pageSize: number = 10,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    try {
      // Build WHERE clause
      const conditions: string[] = ['is_active = 1', 'GETUTCDATE() BETWEEN start_date AND end_date'];
      const params: any = {};

      if (isFestivalOnly) {
        conditions.push('is_festival_offer = 1');
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Build ORDER BY clause
      const allowedSortFields = ['offer_code', 'offer_name', 'offer_type', 'end_date', 'is_active', 'created_at'];
      const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

      // Get total count
      const countResult: any = await this.sqlService.query(
        `SELECT COUNT(*) as total FROM subscription_offers ${whereClause}`,
        params,
      );
      const total = countResult[0]?.total || 0;

      // Calculate pagination
      const offset = (page - 1) * pageSize;

      // Get paginated data
      const result: any = await this.sqlService.query(
        `SELECT * FROM subscription_offers 
         ${whereClause}
         ORDER BY ${sortField} ${sortDirection}
         OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
        { ...params, offset, pageSize },
      );

      return {
        success: true,
        data: result || [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get available offers:', error);
      throw error;
    }
  }

  /**
   * Validate and apply offer code
   */
  async applyOfferCode(
    offerCode: string,
    tenantId: number,
    userId: number,
    planId: number,
    billingCycle: string,
    originalAmount: number,
  ) {
    try {
      const result: any = await this.sqlService.execute(
        'sp_ApplySubscriptionOffer',
        {
          offerCode,
          tenantId,
          userId,
          planId,
          billingCycle,
          originalAmount,
        },
      );

      if (!result || result.length === 0) {
        throw new BadRequestException('Failed to apply offer');
      }

      const offerResult = result[0];

      if (offerResult.error_code) {
        throw new BadRequestException(offerResult.error_message);
      }

      return {
        success: true,
        data: {
          offerId: offerResult.offer_id,
          offerType: offerResult.offer_type,
          originalAmount: offerResult.original_amount,
          discountAmount: offerResult.discount_amount,
          finalAmount: offerResult.final_amount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to apply offer code:', error);
      throw error;
    }
  }

  /**
   * Record offer usage after successful payment
   */
  async recordOfferUsage(
    offerId: number,
    tenantId: number,
    userId: number,
    planId: number,
    billingCycle: string,
    originalAmount: number,
    discountAmount: number,
    finalAmount: number,
    paymentId?: number,
  ) {
    try {
      const result: any = await this.sqlService.execute('sp_RecordOfferUsage', {
        offerId,
        tenantId,
        userId,
        planId,
        billingCycle,
        originalAmount,
        discountAmount,
        finalAmount,
        paymentId: paymentId || null,
      });

      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'subscription_offer_usage',
        entityId: result[0].usage_id,
        actionType: 'CREATE',
        newValues: {
          offerId,
          planId,
          billingCycle,
          discountAmount,
          finalAmount,
        },
        severity: 'medium',
      });

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      this.logger.error('Failed to record offer usage:', error);
      throw error;
    }
  }

  /**
   * Create new offer (Admin only)
   */
  async createOffer(dto: any, userId: number, userType: string) {
    if (userType !== 'super_admin' && userType !== 'owner') {
      throw new BadRequestException('Only super admins can create offers');
    }

    // Date validation
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate offer type specific fields
    if (dto.offerType === 'percentage' && !dto.discountPercent) {
      throw new BadRequestException('Discount percent is required for percentage offers');
    }
    if (dto.offerType === 'fixed_amount' && !dto.discountAmount) {
      throw new BadRequestException('Discount amount is required for fixed amount offers');
    }
    if (dto.offerType === 'trial_extension' && !dto.trialExtensionDays) {
      throw new BadRequestException('Trial extension days is required for trial extension offers');
    }

    try {
      // Insert offer with is_active = 1
      const result: any = await this.sqlService.query(
        `INSERT INTO subscription_offers (
          offer_code, offer_name, offer_type, discount_percent, discount_amount,
          trial_extension_days, min_purchase_amount, max_discount_amount, 
          usage_limit, usage_per_user_limit, is_festival_offer, festival_name, 
          start_date, end_date, is_active, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @offerCode, @offerName, @offerType, @discountPercent, @discountAmount,
          @trialExtensionDays, @minPurchaseAmount, @maxDiscountAmount, 
          @usageLimit, @usagePerUserLimit, @isFestivalOffer, @festivalName, 
          @startDate, @endDate, 1, @userId, GETUTCDATE()
        )`,
        {
          offerCode: dto.offerCode,
          offerName: dto.offerName,
          offerType: dto.offerType,
          discountPercent: dto.discountPercent || null,
          discountAmount: dto.discountAmount || null,
          trialExtensionDays: dto.trialExtensionDays || null,
          minPurchaseAmount: dto.minPurchaseAmount || null,
          maxDiscountAmount: dto.maxDiscountAmount || null,
          usageLimit: dto.usageLimit || null,
          usagePerUserLimit: dto.usagePerUserLimit || null,
          isFestivalOffer: dto.isFestivalOffer || false,
          festivalName: dto.festivalName || null,
          startDate: dto.startDate,
          endDate: dto.endDate,
          userId,
        },
      );

      const offerId = result[0].id;

      // Insert applicable plans
      if (dto.applicablePlans && dto.applicablePlans.length > 0) {
        for (const planId of dto.applicablePlans) {
          await this.sqlService.query(
            `INSERT INTO subscription_offer_plans (offer_id, plan_id) VALUES (@offerId, @planId)`,
            { offerId, planId },
          );
        }
      }

      // Insert applicable billing cycles
      if (dto.applicableBillingCycles && dto.applicableBillingCycles.length > 0) {
        for (const cycle of dto.applicableBillingCycles) {
          await this.sqlService.query(
            `INSERT INTO subscription_offer_billing_cycles (offer_id, billing_cycle) VALUES (@offerId, @cycle)`,
            { offerId, cycle },
          );
        }
      }

      // Handle applicableCycles as alias for applicableBillingCycles
      if (dto.applicableCycles && dto.applicableCycles.length > 0) {
        for (const cycle of dto.applicableCycles) {
          await this.sqlService.query(
            `INSERT INTO subscription_offer_billing_cycles (offer_id, billing_cycle) VALUES (@offerId, @cycle)`,
            { offerId, cycle },
          );
        }
      }

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_offers',
        entityId: offerId,
        actionType: 'CREATE',
        newValues: result[0],
        severity: 'high',
      });

      return {
        success: true,
        data: result[0],
        message: 'Offer created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Update offer (Admin only)
   */
  async updateOffer(
    offerId: number,
    dto: any,
    userId: number,
    userType: string,
  ) {
    if (userType !== 'super_admin' && userType !== 'owner') {
      throw new BadRequestException('Only super admins can update offers');
    }

    // Date validation if both dates are provided
    if (dto.startDate && dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    try {
      const updates: string[] = [];
      const params: any = { offerId, userId };

      if (dto.offerName !== undefined) {
        updates.push('offer_name = @offerName');
        params.offerName = dto.offerName;
      }
      if (dto.discountPercent !== undefined) {
        updates.push('discount_percent = @discountPercent');
        params.discountPercent = dto.discountPercent;
      }
      if (dto.discountAmount !== undefined) {
        updates.push('discount_amount = @discountAmount');
        params.discountAmount = dto.discountAmount;
      }
      if (dto.usageLimit !== undefined) {
        updates.push('usage_limit = @usageLimit');
        params.usageLimit = dto.usageLimit;
      }
      if (dto.isActive !== undefined) {
        updates.push('is_active = @isActive');
        params.isActive = dto.isActive;
      }
      if (dto.startDate !== undefined) {
        updates.push('start_date = @startDate');
        params.startDate = dto.startDate;
      }
      if (dto.endDate !== undefined) {
        updates.push('end_date = @endDate');
        params.endDate = dto.endDate;
      }

      if (updates.length === 0) {
        throw new BadRequestException('No fields to update');
      }

      updates.push('updated_at = GETUTCDATE()');
      updates.push('updated_by = @userId');

      const result: any = await this.sqlService.query(
        `UPDATE subscription_offers 
         SET ${updates.join(', ')}
         OUTPUT INSERTED.*
         WHERE id = @offerId`,
        params,
      );

      if (result.length === 0) {
        throw new NotFoundException('Offer not found');
      }

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_offers',
        entityId: offerId,
        actionType: 'UPDATE',
        newValues: result[0],
        severity: 'high',
      });

      return {
        success: true,
        data: result[0],
        message: 'Offer updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update offer:', error);
      throw error;
    }
  }

  /**
   * Get offer by code
   */
  async getOfferByCode(offerCode: string) {
    try {
      const result: any = await this.sqlService.query(
        `SELECT * FROM subscription_offers 
         WHERE offer_code = @offerCode AND is_active = 1`,
        { offerCode },
      );

      if (result.length === 0) {
        throw new NotFoundException('Offer not found');
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      this.logger.error('Failed to get offer:', error);
      throw error;
    }
  }

  /**
   * Get offer usage history
   */
  async getOfferUsageHistory(offerId: number) {
    try {
      const result: any = await this.sqlService.query(
        `SELECT 
          sou.*,
          t.name as tenant_name,
          u.email as user_email,
          sp.plan_name
         FROM subscription_offer_usage sou
         INNER JOIN tenants t ON sou.tenant_id = t.id
         INNER JOIN users u ON sou.user_id = u.id
         INNER JOIN subscription_plans sp ON sou.subscription_plan_id = sp.id
         WHERE sou.offer_id = @offerId
         ORDER BY sou.used_at DESC`,
        { offerId },
      );

      return {
        success: true,
        data: result || [],
      };
    } catch (error) {
      this.logger.error('Failed to get offer usage history:', error);
      throw error;
    }
  }

  /**
   * Calculate price with billing cycle discount
   */
  calculatePriceWithCycleDiscount(
    basePrice: number,
    billingCycle: string,
    plan: any,
  ): number {
    let finalPrice = basePrice;

    if (billingCycle === 'yearly' && plan.discount_annual_percent) {
      finalPrice = basePrice * (1 - plan.discount_annual_percent / 100);
    } else if (billingCycle === 'quarterly' && plan.discount_quarterly_percent) {
      finalPrice = basePrice * (1 - plan.discount_quarterly_percent / 100);
    }

    return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Delete offer (Admin only)
   */
  async deleteOffer(offerId: number, userId: number, userType: string) {
    if (userType !== 'super_admin' && userType !== 'owner') {
      throw new BadRequestException('Only super admins can delete offers');
    }

    try {
      // Check if offer has been used
      const usageCheck: any = await this.sqlService.query(
        `SELECT COUNT(*) as count FROM subscription_offer_usage WHERE offer_id = @offerId`,
        { offerId },
      );

      if (usageCheck[0].count > 0) {
        // Soft delete - set inactive
        await this.sqlService.query(
          `UPDATE subscription_offers SET is_active = 0, updated_at = GETUTCDATE(), updated_by = @userId WHERE id = @offerId`,
          { offerId, userId },
        );
      } else {
        // Hard delete if never used
        await this.sqlService.query(
          `DELETE FROM subscription_offer_billing_cycles WHERE offer_id = @offerId;
           DELETE FROM subscription_offer_plans WHERE offer_id = @offerId;
           DELETE FROM subscription_offers WHERE id = @offerId`,
          { offerId },
        );
      }

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_offers',
        entityId: offerId,
        actionType: 'DELETE',
        severity: 'high',
      });

      return {
        success: true,
        message: 'Offer deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete offer:', error);
      throw error;
    }
  }
}
