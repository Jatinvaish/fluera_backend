
// ============================================
// modules/global-modules/system-events/dto/system-events.dto.ts
// ============================================
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateSystemEventDto {
  @IsNumber()
  @IsOptional()
  organizationId?: number;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  eventType: string;

  @IsString()
  eventName: string;

  @IsString()
  @IsOptional()
  eventData?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @IsOptional()
  sessionId?: number;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}
