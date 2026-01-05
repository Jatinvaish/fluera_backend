import { IsString, IsOptional, IsEmail, IsInt, IsDateString, IsBoolean, IsArray, IsUrl } from 'class-validator';

// ============================================
// Creator Profile DTOs
// ============================================
export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  stageName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  languages?: string[];

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsArray()
  contentTypes?: string[];

  @IsOptional()
  @IsString()
  availabilityStatus?: string;

  @IsOptional()
  @IsArray()
  preferredBrands?: string[];

  @IsOptional()
  @IsArray()
  excludedBrands?: string[];
}

// ============================================
// Brand Profile DTOs
// ============================================
export class UpdateBrandProfileDto {
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  brandGuidelinesUrl?: string;

  @IsOptional()
  @IsString()
  targetDemographics?: string;

  @IsOptional()
  @IsString()
  budgetRange?: string;

  @IsOptional()
  @IsString()
  campaignObjectives?: string;

  @IsOptional()
  @IsString()
  brandValues?: string;

  @IsOptional()
  @IsString()
  contentRestrictions?: string;

  @IsOptional()
  @IsString()
  primaryContactName?: string;

  @IsOptional()
  @IsEmail()
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  primaryContactPhone?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsBoolean()
  contentApprovalRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApproveCreators?: boolean;

  @IsOptional()
  @IsArray()
  blacklistedCreators?: string[];

  @IsOptional()
  @IsArray()
  preferredCreators?: string[];

  @IsOptional()
  @IsInt()
  paymentTerms?: number;

  @IsOptional()
  @IsString()
  preferredPaymentMethod?: string;
}

// ============================================
// Agency Profile DTOs
// ============================================
export class UpdateAgencyProfileDto {
  @IsOptional()
  @IsString()
  agencyName?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  industrySpecialization?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  yearEstablished?: number;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsString()
  serviceOfferings?: string;

  @IsOptional()
  @IsString()
  targetMarkets?: string;

  @IsOptional()
  @IsString()
  clientPortfolio?: string;

  @IsOptional()
  @IsUrl()
  caseStudiesUrl?: string;

  @IsOptional()
  @IsString()
  certifications?: string;

  @IsOptional()
  @IsString()
  awards?: string;

  @IsOptional()
  @IsString()
  primaryContactName?: string;

  @IsOptional()
  @IsEmail()
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  primaryContactPhone?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsInt()
  paymentTerms?: number;

  @IsOptional()
  @IsString()
  preferredPaymentMethod?: string;

  @IsOptional()
  @IsInt()
  commissionRate?: number;
}
