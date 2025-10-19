import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  // @IsString()
  // @IsOptional()
  // firstName?: string;
  
  // @IsString()
  // @IsOptional()
  // lastName?: string;

  // @IsString()
  // @IsOptional()
  // organizationName?: string;

  // @IsEnum(['agency_admin', 'creator', 'brand_admin'])
  // @IsOptional()
  // organizationType?: 'agency_admin' | 'creator' | 'brand_admin';
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}


export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
export class VerifyRegistrationDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}

// NEW: Onboarding DTO - used after email verification
export class CompleteOnboardingDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEnum(['agency_admin', 'creator', 'brand_admin'])
  organizationType: 'agency_admin' | 'creator' | 'brand_admin';

  @IsString()
  @MinLength(3)
  organizationName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
