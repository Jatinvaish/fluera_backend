// src/modules/message-system/dto/chat.dto.ts - COMPLETE DTOs
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsEnum, MaxLength, IsBoolean, IsDateString } from 'class-validator';

// ==================== MESSAGE DTOs ====================

export class SendMessageDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsString()
  @IsOptional()
  @IsEnum(['text', 'file', 'image', 'video', 'audio', 'system'])
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

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}

export class MarkAsReadDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsNumber()
  @IsNotEmpty()
  messageId: number;
}

export class PinMessageDto {
  @IsNumber()
  @IsNotEmpty()
  messageId: number;

  @IsBoolean()
  isPinned: boolean;
}

export class ForwardMessageDto {
  @IsNumber()
  @IsNotEmpty()
  messageId: number;

  @IsArray()
  @IsNotEmpty()
  targetChannelIds: number[];
}

// ==================== CHANNEL DTOs ====================

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
  @IsEnum(['direct', 'group', 'campaign', 'project'])
  channelType?: string;

  @IsArray()
  @IsNotEmpty()
  participantIds: number[];

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsString()
  @IsOptional()
  relatedType?: string;

  @IsNumber()
  @IsOptional()
  relatedId?: number;
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

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}

export class MuteChannelDto {
  @IsBoolean()
  isMuted: boolean;

  @IsDateString()
  @IsOptional()
  muteUntil?: string;
}

// ==================== MEMBER DTOs ====================

export class AddMemberDto {
  @IsArray()
  @IsNotEmpty()
  userIds: number[];

  @IsString()
  @IsOptional()
  @IsEnum(['admin', 'member'])
  role?: string;
}

export class UpdateMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['admin', 'member', 'owner'])
  role: string;
}

// ==================== SEARCH DTOs ====================

export class SearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsNumber()
  @IsOptional()
  channelId?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['messages', 'channels', 'members', 'all'])
  type?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

// ==================== REACTION DTOs ====================

export class AddReactionDto {
  @IsNumber()
  @IsNotEmpty()
  messageId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  emoji: string;
}

// ==================== TYPING DTOs ====================

export class TypingDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;
}

// ==================== FILE DTOs ====================

export class UploadFileDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsString()
  @IsOptional()
  description?: string;
}

// ==================== PRESENCE DTOs ====================

export class UpdatePresenceDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['online', 'away', 'busy', 'offline'])
  status: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  statusMessage?: string;
}