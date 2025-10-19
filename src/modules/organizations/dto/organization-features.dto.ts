// modules/organizations/dto/organization-features.dto.ts
import { IsString, IsBoolean, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateOrganizationFeatureDto {
  @IsNumber()
  organizationId: number;

  @IsString()
  featureKey: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  limitValue?: number;

  @IsString()
  @IsEnum(['daily', 'monthly', 'yearly', 'never'])
  @IsOptional()
  resetPeriod?: string;
}

export class UpdateOrganizationFeatureDto {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  limitValue?: number;

  @IsNumber()
  @IsOptional()
  usedValue?: number;
}