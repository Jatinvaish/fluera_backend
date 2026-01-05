import { IsEmail, IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsIn } from 'class-validator';

// ============================================
// AGENCY DTOs
// ============================================

export class BulkInviteCreatorsDto {
  @IsNotEmpty()
  @IsString()
  emails: string; // Comma-separated emails

  @IsNotEmpty()
  @IsNumber()
  roleId: number;

  @IsOptional()
  @IsString()
  message?: string;
}

export class GetAgencyCreatorsDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'all'])
  status?: string;
}

// ============================================
// CREATOR DTOs
// ============================================

export class AcceptCreatorInvitationDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class RejectCreatorInvitationDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

// ============================================
// BRAND DTOs
// ============================================

export class SendBrandCollaborationDto {
  @IsNotEmpty()
  @IsNumber()
  agencyTenantId: number;

  @IsNotEmpty()
  @IsArray()
  @IsNumber({}, { each: true })
  creatorTenantIds: number[]; // Multiple creators

  @IsOptional()
  @IsString()
  message?: string;
}