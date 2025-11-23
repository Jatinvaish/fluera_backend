// ============================================
// src/modules/tenants/dto/tenant.dto.ts - Enhanced
// ============================================
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsEnum, 
  Min, 
  Max,
  IsIn 
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class SwitchTenantDto {
  @IsNumber()
  tenantId: number;
}

// ============================================
// NEW: Query DTOs for Tenant Members
// ============================================

/**
 * Valid sort fields for tenant members
 */
export enum TenantMemberSortBy {
  EMAIL = 'email',
  FIRST_NAME = 'first_name',
  ROLE_NAME = 'role_name',
  MEMBER_TYPE = 'member_type',
  STATUS = 'status',
  JOINED_AT = 'joined_at'
}

/**
 * Valid sort orders
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

/**
 * DTO for querying tenant members with pagination, sorting, and search
 */
export class GetTenantMembersDto {
  /**
   * Page number (1-based)
   * @default 1
   * @min 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  /**
   * Number of records per page
   * @default 10
   * @min 1
   * @max 100
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  /**
   * Search query to filter by email, name, or role
   * @optional
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  /**
   * Field to sort by
   * @default 'joined_at'
   */
  @IsOptional()
  @IsEnum(TenantMemberSortBy)
  sortBy?: TenantMemberSortBy = TenantMemberSortBy.JOINED_AT;

  /**
   * Sort order (ASC or DESC)
   * @default 'DESC'
   */
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

/**
 * Alternative DTO with string-based validation (more flexible for query params)
 */
export class GetTenantMembersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim() || undefined)
  search?: string;

  @IsOptional()
  @IsIn(['email', 'first_name', 'role_name', 'member_type', 'status', 'joined_at'])
  sortBy?: 'email' | 'first_name' | 'role_name' | 'member_type' | 'status' | 'joined_at';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}