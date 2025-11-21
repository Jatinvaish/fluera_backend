// ============================================
// src/modules/global-modules/dto/chat.dto.ts
// SIMPLIFIED - NO ENCRYPTION
// ============================================
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsEnum, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000) // ✅ Plain text message (max 10k chars)
  content: string;

  @IsString()
  @IsOptional()
  @IsEnum(['text', 'file', 'image', 'video', 'audio'])
  messageType?: string;

  @IsArray()
  @IsOptional()
  attachments?: number[];

  @IsArray()
  @IsOptional()
  mentions?: number[];

  @IsNumber()
  @IsOptional()
  replyToMessageId?: number;

  @IsNumber()
  @IsOptional()
  threadId?: number;
}

export class CreateChannelDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['direct', 'group', 'campaign'])
  channelType?: string;

  @IsArray()
  @IsNotEmpty()
  participantIds: number[];

  @IsString()
  @IsOptional()
  relatedType?: string;

  @IsNumber()
  @IsOptional()
  relatedId?: number;
}

export class GetMessagesDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  beforeId?: number;
}

export class MarkAsReadDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsNumber()
  @IsNotEmpty()
  messageId: number;
}

export class AddParticipantDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsOptional()
  @IsEnum(['admin', 'member'])
  role?: string;
}

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  settings?: any;
}