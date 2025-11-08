
// ============================================
// src/modules/tenants/dto/tenant.dto.ts
// ============================================
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

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