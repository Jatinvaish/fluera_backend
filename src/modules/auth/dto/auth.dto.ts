
// ============================================
// 4. UPDATED AUTH DTOs (Add to existing)
// ============================================
// modules/auth/dto/auth.dto.ts
import { IsEmail, IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

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
