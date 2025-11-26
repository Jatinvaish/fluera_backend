// src/modules/subscriptions/dto/subscription.dto.ts
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsEnum, 
  IsObject,
  IsDateString,
  Min,
  IsInt
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
}