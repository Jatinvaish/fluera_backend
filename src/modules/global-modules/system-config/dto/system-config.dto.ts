 // ============================================
// modules/global-modules/system-config/dto/system-config.dto.ts
// ============================================
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateSystemConfigDto {
  @IsString()
  configKey: string;

  @IsString()
  @IsOptional()
  configValue?: string;

  @IsString()
  @IsOptional()
  configType?: string;

  @IsBoolean()
  @IsOptional()
  isEncrypted?: boolean;

  @IsString()
  @IsOptional()
  environment?: string;
}

export class UpdateSystemConfigDto {
  @IsString()
  @IsOptional()
  configValue?: string;

  @IsString()
  @IsOptional()
  configType?: string;

  @IsBoolean()
  @IsOptional()
  isEncrypted?: boolean;
}