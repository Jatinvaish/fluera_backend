// ============================================
// email-template.dto.ts
// ============================================
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsNumber } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsNumber()
  @IsNotEmpty()
  organizationId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  bodyHtml: string;

  @IsString()
  @IsOptional()
  bodyText?: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  bodyHtml?: string;

  @IsString()
  @IsOptional()
  bodyText?: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class PreviewTemplateDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsObject()
  @IsNotEmpty()
  variables: Record<string, any>;

  @IsNumber()
  @IsOptional()
  organizationId?: number;
}

export class SendTestEmailDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  testEmail: string;

  @IsObject()
  @IsNotEmpty()
  variables: Record<string, any>;

  @IsNumber()
  @IsOptional()
  organizationId?: number;
}
