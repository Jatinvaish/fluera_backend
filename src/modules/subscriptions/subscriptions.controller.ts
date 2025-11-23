// src/modules/subscriptions/subscriptions.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionCheckService } from './subscription-check.service';
import { CurrentUser, TenantId, Unencrypted } from '../../core/decorators';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreateCustomPlanDto,
  ChangeSubscriptionDto,
  CancelSubscriptionDto,
  CheckLimitDto,
  CheckFeatureDto,
  ListPlansQueryDto,
} from './dto/subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private subscriptionCheckService: SubscriptionCheckService,
  ) {}

  // ============================================
  // PLANS MANAGEMENT (Admin)
  // ============================================

  @Get('plans')
  @Unencrypted()
  async listPlans(@Query() query: ListPlansQueryDto) {
    return this.subscriptionsService.listPlans(query);
  }

  @Get('plans/:id')
  @Unencrypted()
  async getPlan(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.getPlanById(id);
  }

  @Post('plans')
  async createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionsService.createPlan(dto, userId, userType);
  }

  @Put('plans/:id')
  async updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionsService.updatePlan(id, dto, userId, userType);
  }

  @Delete('plans/:id')
  async deletePlan(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionsService.deletePlan(id, userId, userType);
  }

  // ============================================
  // CUSTOM PLANS (Admin)
  // ============================================

  @Post('custom-plans')
  async createCustomPlan(
    @Body() dto: CreateCustomPlanDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionsService.createCustomPlan(dto, userId, userType);
  }

  @Get('custom-plans/tenant/:tenantId')
  async getCustomPlan(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.subscriptionsService.getCustomPlan(tenantId);
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  @Get('my-subscription')
  @Unencrypted()
  async getMySubscription(@TenantId() tenantId: number) {
    return this.subscriptionsService.getTenantSubscription(tenantId);
  }

  @Get('tenant/:tenantId')
  @Unencrypted()
  async getTenantSubscription(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.subscriptionsService.getTenantSubscription(tenantId);
  }

  @Post('change')
  async changeSubscription(
    @Body() dto: ChangeSubscriptionDto,
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.subscriptionsService.changeSubscription(tenantId, dto, userId);
  }

  @Post('cancel')
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.subscriptionsService.cancelSubscription(tenantId, dto, userId);
  }

  @Post('reactivate')
  async reactivateSubscription(
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.subscriptionsService.reactivateSubscription(tenantId, userId);
  }

  @Get('history')
  @Unencrypted()
  async getSubscriptionHistory(@TenantId() tenantId: number) {
    return this.subscriptionsService.getSubscriptionHistory(tenantId);
  }

  // ============================================
  // LIMITS & FEATURES CHECKING
  // ============================================

  @Post('check-limit')
  @Unencrypted()
  async checkLimit(
    @Body() dto: CheckLimitDto,
    @TenantId() tenantId: number,
  ) {
    const result = await this.subscriptionCheckService.checkLimit(
      tenantId,
      dto.limitType as any,
    );
    return { success: true, data: result };
  }

  @Post('check-feature')
  @Unencrypted()
  async checkFeature(
    @Body() dto: CheckFeatureDto,
    @TenantId() tenantId: number,
  ) {
    const hasAccess = await this.subscriptionCheckService.checkFeatureAccess(
      tenantId,
      dto.featureName,
    );
    return { success: true, data: { hasAccess } };
  }

  @Get('status')
  @Unencrypted()
  async getSubscriptionStatus(@TenantId() tenantId: number) {
    const status = await this.subscriptionCheckService.checkSubscriptionStatus(
      tenantId,
    );
    return { success: true, data: status };
  }
}