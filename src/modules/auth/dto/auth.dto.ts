
// ============================================
// 4. UPDATED AUTH DTOs (Add to existing)
// ============================================
// modules/auth/dto/auth.dto.ts
import { IsEmail, IsString, IsOptional, IsEnum, MinLength, IsIn, IsNotEmpty } from 'class-validator';

export class SendVerificationDto {
  @IsEmail()
  email: string;

  @IsEnum(['email_verify', 'login_otp', 'phone_verify', '2fa'])
  codeType: string;
}

export class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;

  @IsEnum(['email_verify', 'login_otp', 'phone_verify', '2fa'])
  codeType: string;
}

export class ResetPasswordRequestDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  newPassword: string;
}

export class SendInvitationDto {
  @IsEmail()
  inviteeEmail: string;

  @IsString()
  @IsOptional()
  inviteeName?: string;

  @IsEnum(['creator', 'brand', 'staff', 'manager', 'accountant'])
  inviteeType: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  invitationMessage?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}


export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

// NEW DTOs for entity creation
export class CreateAgencyDto {
  @IsNotEmpty()
  @IsString()
  organizationName: string;

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
  companySize?: string;
}

export class CreateBrandDto {
  @IsNotEmpty()
  @IsString()
  brandName: string;

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
  primaryCategory?: string;
}

// Keep existing DTOs...
export class VerifyRegistrationDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
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
  password: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}

export class CompleteOnboardingDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsIn(['agency_admin', 'creator', 'brand_admin'])
  organizationType: 'agency_admin' | 'creator' | 'brand_admin';

  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
