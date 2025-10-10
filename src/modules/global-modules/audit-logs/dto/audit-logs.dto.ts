import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  entityType: string;

  @IsNumber()
  @IsOptional()
  entityId?: bigint | null;

  @IsString()
  actionType: string;

  @IsString()
  @IsOptional()
  oldValues?: string | null;

  @IsString()
  @IsOptional()
  newValues?: string | null;

  @IsNumber()
  @IsOptional()
  userId?: bigint | null;

  @IsNumber()
  @IsOptional()
  sessionId?: bigint | null;

  @IsString()
  @IsOptional()
  ipAddress?: string | null;

  @IsString()
  @IsOptional()
  userAgent?: string | null;

  @IsNumber()
  @IsOptional()
  organizationId?: bigint | null;

  @IsString()
  @IsOptional()
  metadata?: string | null;
}

export class QueryAuditLogsDto {
  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  actionType?: string;

  @IsNumber()
  @IsOptional()
  userId?: bigint;

  @IsNumber()
  @IsOptional()
  organizationId?: bigint;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}