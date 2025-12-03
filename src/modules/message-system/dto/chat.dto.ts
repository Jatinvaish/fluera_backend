// ==================== COMPLETE dto/chat.dto.ts ====================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  MaxLength,
  IsBoolean,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
  @Type(() => Number)
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === 'string') return value.split(',').map(Number);
    return [Number(value)];
  })
  attachments?: number[];

  @IsArray()
  @IsOptional()
  @Type(() => Number)
  mentions?: number[];

  @IsNumber()
  @IsOptional()
  replyToMessageId?: number;

  @IsNumber()
  @IsOptional()
  threadId?: number;
}

export class UploadMessageFileDto {
  @IsNumber()
  @IsOptional()
  messageId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsArray()
  @IsOptional()
  @Type(() => Number)
  mentions?: number[];
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
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @Type(() => Number)
  targetChannelIds: number[];
}

export class BulkMarkAsReadDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsNumber()
  @IsNotEmpty()
  upToMessageId: number;
}

export class MessageDeliveryDto {
  @IsNumber()
  @IsNotEmpty()
  messageId: number;

  @IsNumber()
  @IsNotEmpty()
  channelId: number;
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
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @ArrayMinSize(1)
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v));
    }
    return value;
  })
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
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => Number(v)).filter((n) => !isNaN(n));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value)
        .map((v) => Number(v))
        .filter((n) => !isNaN(n));
    }
    return [];
  })
  userIds!: number[];

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

  @IsNumber()
  @IsNotEmpty()
  channelId: number;
}

export class RemoveReactionDto {
  @IsNumber()
  @IsNotEmpty()
  messageId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  emoji: string;

  @IsNumber()
  @IsNotEmpty()
  channelId: number;
}

// ==================== TYPING DTOs ====================

export class TypingDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsBoolean()
  @IsOptional()
  isTyping?: boolean;
}

// ==================== THREAD DTOs ====================

export class ThreadReplyDto {
  @IsNumber()
  @IsNotEmpty()
  parentMessageId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsArray()
  @IsOptional()
  @Type(() => Number)
  mentions?: number[];
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

//
export interface MessageResponse {
  id: number;
  channel_id: number;
  sender_user_id: number;
  sender_tenant_id: number;
  message_type: string;
  content: string;
  sent_at: string;
  has_attachments: boolean;
  has_mentions: boolean;
  mentioned_user_ids?: string; // ✅ NEW: Comma-separated user IDs
  reply_to_message_id?: number;
  thread_id?: number;
  reply_count?: number;
  is_edited?: boolean;
  edited_at?: string;
  is_pinned?: boolean;
  pinned_at?: string;
  sender_first_name?: string;
  sender_last_name?: string;
  sender_avatar_url?: string;
  pinned_by?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: number;
  read_by_user_ids?: string; // ✅ NEW: Comma-separated user IDs who read
  delivered_to_user_ids?: string; // ✅ NEW: Comma-separated user IDs delivered to
  metadata?: string;
}

export interface EnrichedMessageResponse extends MessageResponse {
  reaction_count?: number;
  attachment_count?: number;
  read_count?: number;
  delivered_count?: number;
  is_read_by_me?: boolean;
  am_i_mentioned?: boolean;

  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  mentions?: number[];
}

export interface MessageReaction {
  id: number;
  emoji: string;
  user_id: number;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

export interface MessageAttachment {
  id: number;
  file_name: string;
  file_size: number;
  content_type: string;
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface MessageReadStatus {
  messageId: number;
  readByUserIds: number[];
  deliveredToUserIds: number[];
  readCount: number;
  deliveredCount: number;
  totalRecipients?: number;
}
