// src/modules/subscriptions/dto/subscription.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsObject,
  IsDateString,
  Min,
  IsInt,
  IsNotEmpty,
  ArrayMinSize,
  IsArray
} from 'class-validator';

export enum PlanType {
  AGENCY = 'agency',
  BRAND = 'brand',
  CREATOR = 'creator',
  ALL = 'all'
}

export enum PlanTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due'
}

// ============================================
// CREATE PLAN
// ============================================
export class CreatePlanDto {
  @IsString()
  planName: string;

  @IsString()
  planSlug: string;

  @IsEnum(PlanType)
  planType: PlanType;

  @IsEnum(PlanTier)
  @IsOptional()
  planTier?: PlanTier;

  @IsBoolean()
  @IsOptional()
  isFree?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;

  @IsNumber()
  @IsOptional()
  priceMonthly?: number;

  @IsNumber()
  @IsOptional()
  priceQuarterly?: number;

  @IsNumber()
  @IsOptional()
  priceYearly?: number;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsInt()
  @IsOptional()
  trialDays?: number = 0;

  // Limits
  @IsInt()
  @IsOptional()
  maxStaff?: number;

  @IsInt()
  @IsOptional()
  maxStorageGb?: number;

  @IsInt()
  @IsOptional()
  maxCampaigns?: number;

  @IsInt()
  @IsOptional()
  maxInvitations?: number;

  @IsInt()
  @IsOptional()
  maxIntegrations?: number;

  @IsInt()
  @IsOptional()
  maxCreators?: number;

  @IsInt()
  @IsOptional()
  maxBrands?: number;

  @IsInt()
  @IsOptional()
  maxFileSizeMb?: number;

  @IsInt()
  @IsOptional()
  maxApiCallsPerDay?: number;

  // Features
  @IsObject()
  @IsOptional()
  features?: any;

  @IsBoolean()
  @IsOptional()
  prioritySupport?: boolean = false;

  @IsBoolean()
  @IsOptional()
  customBranding?: boolean = false;

  @IsBoolean()
  @IsOptional()
  whiteLabel?: boolean = false;

  @IsBoolean()
  @IsOptional()
  ssoEnabled?: boolean = false;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  planName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priceMonthly?: number;

  @IsNumber()
  @IsOptional()
  priceQuarterly?: number;

  @IsNumber()
  @IsOptional()
  priceYearly?: number;

  @IsInt()
  @IsOptional()
  maxStaff?: number;

  @IsInt()
  @IsOptional()
  maxStorageGb?: number;

  @IsInt()
  @IsOptional()
  maxCampaigns?: number;

  @IsInt()
  @IsOptional()
  maxInvitations?: number;

  @IsObject()
  @IsOptional()
  features?: any;

  @IsBoolean()
  @IsOptional()
  prioritySupport?: boolean;

  @IsBoolean()
  @IsOptional()
  customBranding?: boolean;

  @IsBoolean()
  @IsOptional()
  whiteLabel?: boolean;

  @IsBoolean()
  @IsOptional()
  ssoEnabled?: boolean;
}

// ============================================
// CUSTOM PLAN
// ============================================
export class CreateCustomPlanDto {
  @IsInt()
  tenantId: number;

  @IsInt()
  @IsOptional()
  basePlanId?: number;

  @IsString()
  @IsOptional()
  customPlanName?: string;

  // Limits (all optional - use base plan if not provided)
  @IsInt()
  @IsOptional()
  maxStaff?: number;

  @IsInt()
  @IsOptional()
  maxStorageGb?: number;

  @IsInt()
  @IsOptional()
  maxCampaigns?: number;

  @IsInt()
  @IsOptional()
  maxInvitations?: number;

  @IsInt()
  @IsOptional()
  maxCreators?: number;

  @IsInt()
  @IsOptional()
  maxBrands?: number;

  @IsInt()
  @IsOptional()
  maxIntegrations?: number;

  @IsInt()
  @IsOptional()
  maxFileSizeMb?: number;

  @IsInt()
  @IsOptional()
  maxApiCallsPerDay?: number;

  // Custom pricing
  @IsNumber()
  @IsOptional()
  customPriceMonthly?: number;

  @IsNumber()
  @IsOptional()
  customPriceYearly?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  // Custom features
  @IsObject()
  @IsOptional()
  customFeatures?: any;

  @IsBoolean()
  @IsOptional()
  prioritySupport?: boolean;

  @IsBoolean()
  @IsOptional()
  customBranding?: boolean;

  @IsBoolean()
  @IsOptional()
  whiteLabel?: boolean;

  @IsBoolean()
  @IsOptional()
  ssoEnabled?: boolean;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ============================================
// CHANGE SUBSCRIPTION
// ============================================
export class ChangeSubscriptionDto {
  @IsInt()
  planId: number;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsString()
  @IsOptional()
  changeReason?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

// ============================================
// CANCEL SUBSCRIPTION
// ============================================
export class CancelSubscriptionDto {
  @IsString()
  cancelReason: string;

  @IsBoolean()
  @IsOptional()
  cancelImmediately?: boolean = false;
}

// ============================================
// CHECK LIMIT
// ============================================
export class CheckLimitDto {
  @IsString()
  @IsEnum(['staff', 'storage', 'campaigns', 'invitations', 'creators', 'brands'])
  limitType: string;
}

// ============================================
// CHECK FEATURE
// ============================================
export class CheckFeatureDto {
  @IsString()
  featureName: string;
}

// ============================================
// LIST PLANS QUERY
// ============================================
export class ListPlansQueryDto {
  @IsEnum(PlanTier)
  @IsOptional()
  planTier?: PlanTier;

  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean = false;

  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  pageSize?: number = 10;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

// ============================================
// CREATE OFFER
// ============================================
export enum OfferType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  TRIAL_EXTENSION = 'trial_extension'
}

export class CreateOfferDto {
  @IsString()
  offerCode: string;

  @IsString()
  offerName: string;

  @IsEnum(OfferType)
  offerType: OfferType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  trialExtensionDays?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minPurchaseAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  usagePerUserLimit?: number;

  @IsBoolean()
  @IsOptional()
  isFestivalOffer?: boolean = false;

  @IsString()
  @IsOptional()
  festivalName?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  applicablePlans?: number[];

  @IsOptional()
  applicableBillingCycles?: string[];

  @IsOptional()
  applicableCycles?: string[];
}

export class UpdateOfferDto {
  @IsString()
  @IsOptional()
  offerName?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}


// ==================== Subscription Features DTOs ====================

export class CreateSubscriptionFeatureDto {
  @IsNotEmpty()
  @IsInt()
  subscription_id: number;

  @IsOptional()
  @IsNumber()
  feature_price?: number;

  @IsOptional()
  @IsString()
  restricted_to?: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateSubscriptionFeatureDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsOptional()
  @IsInt()
  subscription_id?: number;

  @IsOptional()
  @IsNumber()
  feature_price?: number;

  @IsOptional()
  @IsString()
  restricted_to?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class ListSubscriptionFeaturesDto {
  @IsOptional()
  @IsInt()
  subscription_id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

// ==================== Subscription Feature Permissions DTOs ====================

export class CreateSubscriptionFeaturePermissionDto {
  @IsNotEmpty()
  @IsInt()
  subscription_id: number;

  @IsNotEmpty()
  @IsInt()
  feature_id: number;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  permission_ids: number[];

  @IsOptional()
  @IsNumber()
  permission_price?: number;

  @IsOptional()
  @IsString()
  restricted_to?: string;
 
}

// update-subscription-feature-permission.dto.ts
export class UpdateSubscriptionFeaturePermissionDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsOptional()
  @IsInt()
  subscription_id?: number;

  @IsOptional()
  @IsInt()
  feature_id?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  permission_ids?: number[];

  @IsOptional()
  @IsNumber()
  permission_price?: number;

  @IsOptional()
  @IsString()
  restricted_to?: string;
 
}


export class ListSubscriptionFeaturePermissionsDto {
  @IsOptional()
  @IsInt()
  subscription_id?: number;

  @IsOptional()
  @IsInt()
  feature_id?: number;

  @IsOptional()
  @IsInt()
  permission_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}