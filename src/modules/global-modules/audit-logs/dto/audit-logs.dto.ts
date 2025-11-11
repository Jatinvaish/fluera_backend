import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  entityType: string;

  @IsNumber()
  @IsOptional()
  entityId?: number | null;

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
  userId?: number | null;

  @IsNumber()
  @IsOptional()
  sessionId?: number | null;

  @IsString()
  @IsOptional()
  ipAddress?: string | null;

  @IsString()
  @IsOptional()
  userAgent?: string | null;

  @IsNumber()
  @IsOptional()
  organizationId?: number | null;

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
  userId?: number;

  @IsNumber()
  @IsOptional()
  organizationId?: number;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}