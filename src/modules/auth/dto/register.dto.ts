import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsOptional()
  organizationName?: string;

  // @IsEnum(['agency', 'creator', 'brand'])
  // @IsOptional()
  // organizationType?: 'agency' | 'creator' | 'brand';

  @IsEnum(['agency_admin', 'creator', 'brand_admin'])
  @IsOptional()
  organizationType?: 'agency_admin' | 'creator' | 'brand_admin';
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

