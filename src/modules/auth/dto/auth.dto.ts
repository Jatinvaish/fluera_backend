
// ============================================
// src/modules/auth/dto/auth.dto.ts
// ============================================
import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsEnum, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class VerifyRegistrationDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  code: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}
export class CreateAgencyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateBrandDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateCreatorDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  stageName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ResetPasswordRequestDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ReSendInvitationDto {
  @IsNotEmpty()
  invitationId: any;
}

export class CancelInvitationDto {
  @IsNotEmpty()
  invitationId: any;
}