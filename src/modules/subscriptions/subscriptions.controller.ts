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
import { SubscriptionOffersService } from './subscription-offers.service';
import { SubscriptionPermissionService } from './subscription-permission.service';
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
  CreateOfferDto,
  UpdateOfferDto,
  CreateSubscriptionFeatureDto,
  CreateSubscriptionFeaturePermissionDto,
  ListSubscriptionFeaturePermissionsDto,
  ListSubscriptionFeaturesDto,
  UpdateSubscriptionFeatureDto,
  UpdateSubscriptionFeaturePermissionDto,
} from './dto/subscription.dto';

@Controller('subscriptions')
@Unencrypted()
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private subscriptionCheckService: SubscriptionCheckService,
    private subscriptionOffersService: SubscriptionOffersService,
    private subscriptionPermissionService: SubscriptionPermissionService,
  ) { }

  // ============================================
  // PLANS MANAGEMENT (Admin)
  // ============================================

  @Get('plans')
  @Unencrypted()
  async listPlans(
    @Query() query: ListPlansQueryDto,
    @TenantId() tenantId: number,
  ) {
    console.log('User Type:', tenantId);
    return this.subscriptionsService.listPlans(query, tenantId);
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

  @Put('plans/:id/toggle-status')
  async togglePlanStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { isActive: boolean },
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionsService.updatePlan(id, { isActive: dto.isActive }, userId, userType);
  }

  @Post('plans/get-all-active-for-select')
  @Unencrypted()
  async getAllActiveSubscriptionsForSelect() {
    return this.subscriptionsService.getAllActiveSubscriptionsForSelect();
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
  async getTenantSubscription(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.subscriptionsService.getTenantSubscription(tenantId);
  }

  @Post('change')
  async changeSubscription(
    @Body() dto: ChangeSubscriptionDto & { paymentData?: any },
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.subscriptionsService.changeSubscription(
      tenantId,
      dto,
      userId,
      dto.paymentData,
    );
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
  async checkLimit(@Body() dto: CheckLimitDto, @TenantId() tenantId: number) {
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
    const status =
      await this.subscriptionCheckService.checkSubscriptionStatus(tenantId);
    return { success: true, data: status };
  }

  // ============================================
  // SUBSCRIPTION OFFERS
  // ============================================

  @Get('offers')
  @Unencrypted()
  async getAvailableOffers(
    @TenantId() tenantId: number,
    @Query('planId') planId?: number,
    @Query('billingCycle') billingCycle?: string,
    @Query('festivalOnly') festivalOnly?: boolean,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.subscriptionOffersService.getAvailableOffers(
      tenantId,
      planId,
      billingCycle,
      festivalOnly || false,
      page || 1,
      pageSize || 10,
      sortBy,
      sortOrder || 'asc',
    );
  }

  @Post('offers/validate')
  @Unencrypted()
  async validateOfferCode(
    @Body() dto: { offerCode: string; planId: number; billingCycle: string; amount: number },
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.subscriptionOffersService.applyOfferCode(
      dto.offerCode,
      tenantId,
      userId,
      dto.planId,
      dto.billingCycle,
      dto.amount,
    );
  }

  @Post('offers')
  async createOffer(
    @Body() dto: CreateOfferDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionOffersService.createOffer(dto, userId, userType);
  }

  @Put('offers/:id')
  async updateOffer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOfferDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionOffersService.updateOffer(id, dto, userId, userType);
  }

  @Get('offers/:code')
  @Unencrypted()
  async getOfferByCode(@Param('code') code: string) {
    return this.subscriptionOffersService.getOfferByCode(code);
  }

  @Delete('offers/:id')
  async deleteOffer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
  ) {
    return this.subscriptionOffersService.deleteOffer(id, userId, userType);
  }

  @Get('offers/:id/usage')
  async getOfferUsageHistory(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionOffersService.getOfferUsageHistory(id);
  }

  // ============================================
  // SUBSCRIPTION PERMISSIONS
  // ============================================

  @Get('permissions')
  @Unencrypted()
  async getSubscriptionPermissions(@TenantId() tenantId: number) {
    return this.subscriptionPermissionService.getSubscriptionPermissions(tenantId);
  }


  @Get('history/:id/permissions-diff')
  @Unencrypted()
  async getPermissionsDiff(@Param('id', ParseIntPipe) historyId: number) {
    return this.subscriptionsService.getPermissionsDiff(historyId);
  }

  // ============================================
  // PAYMENT METHODS
  // ============================================

  @Post('payment-methods')
  async savePaymentMethod(
    @Body() dto: any,
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.subscriptionsService.savePaymentMethod(tenantId, userId, dto);
  }

  @Get('payment-methods')
  @Unencrypted()
  async getPaymentMethods(@TenantId() tenantId: number) {
    return this.subscriptionsService.getPaymentMethods(tenantId);
  }

  @Delete('payment-methods/:id')
  async deletePaymentMethod(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.subscriptionsService.deletePaymentMethod(tenantId, id, userId);
  }
  @Post('features/create')
  @Unencrypted()
  async createSubscriptionFeature(
    @Body() dto: CreateSubscriptionFeatureDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionPermissionService.createSubscriptionFeature(dto, user.id);
  }

  @Post('features/update')
  @Unencrypted()
  async updateSubscriptionFeature(
    @Body() dto: UpdateSubscriptionFeatureDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionPermissionService.updateSubscriptionFeature(dto, user.id);
  }

  @Post('features/list')
  @Unencrypted()
  async listSubscriptionFeatures(@Body() dto: ListSubscriptionFeaturesDto) {
    return this.subscriptionPermissionService.listSubscriptionFeatures(dto);
  }

  @Post('features/get-by-id')
  @Unencrypted()
  async getSubscriptionFeatureById(@Body() body: { id: number }) {
    return this.subscriptionPermissionService.getSubscriptionFeatureById(body.id);
  }

  @Post('features/delete')
  @Unencrypted()
  async deleteSubscriptionFeature(
    @Body() body: { id: number },
    @CurrentUser() user: any,
  ) {
    return this.subscriptionPermissionService.deleteSubscriptionFeature(body.id, user.id);
  }

  // ==================== Subscription Feature Permissions APIs ====================

  @Post('feature-permissions/create')
  @Unencrypted()
  async createSubscriptionFeaturePermission(
    @Body() dto: CreateSubscriptionFeaturePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionPermissionService.createSubscriptionFeaturePermission(dto, user.id);
  }

  @Post('feature-permissions/update')
  @Unencrypted()
  async updateSubscriptionFeaturePermission(
    @Body() dto: UpdateSubscriptionFeaturePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionPermissionService.updateSubscriptionFeaturePermission(dto, user.id);
  }

  @Post('feature-permissions/list')
  @Unencrypted()
  async listSubscriptionFeaturePermissions(@Body() dto: ListSubscriptionFeaturePermissionsDto) {
    return this.subscriptionPermissionService.listSubscriptionFeaturePermissions(dto);
  }

  @Post('feature-permissions/get-by-id')
  @Unencrypted()
  async getSubscriptionFeaturePermissionById(@Body() body: { id: number }) {
    return this.subscriptionPermissionService.getSubscriptionFeaturePermissionById(body.id);
  }

  @Post('feature-permissions/delete')
  @Unencrypted()
  async deleteSubscriptionFeaturePermission(
    @Body() body: { id: number },
    @CurrentUser() user: any,
  ) {
    return this.subscriptionPermissionService.deleteSubscriptionFeaturePermission(body.id, user.id);
  }
  @Post('features/get-all-active-for-select')
  @Unencrypted()
  async getAllActiveFeaturesForSelect() {
    return this.subscriptionPermissionService.getAllActiveFeaturesForSelect();
  }
}
