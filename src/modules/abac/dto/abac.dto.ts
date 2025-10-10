
// ============================================
// modules/abac/dto/abac.dto.ts
// ============================================
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateAbacAttributeDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  dataType: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  validationRules?: string;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class CreateAbacPolicyDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  organizationId?: bigint;

  @IsString()
  policyDocument: string;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsString()
  effect: 'PERMIT' | 'DENY';

  @IsString()
  @IsOptional()
  targetConditions?: string;
}

export class EvaluatePolicyDto {
  @IsNumber()
  userId: bigint;

  @IsNumber()
  @IsOptional()
  organizationId?: bigint;

  @IsString()
  action: string;

  @IsString()
  resource: string;

  @IsString()
  @IsOptional()
  context?: any;
}
