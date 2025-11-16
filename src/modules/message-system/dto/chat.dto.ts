// ============================================
// modules/chat/dto/chat.dto.ts - FIXED v3.0
// ============================================
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  IsNotEmpty,
  ValidateNested,
  IsObject,
  isNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== CHANNEL DTOs ====================

export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  CAMPAIGN = 'campaign',
  PROJECT = 'project',
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(ChannelType)
  channelType: ChannelType;

  @IsString()
  @IsOptional()
  relatedType?: string;

  @IsNumber()
  @IsOptional()
  relatedId?: number;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  memberIds?: number[];
}

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsNumber() // ✅ FIXED: Changed from string to number
  channelId: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsObject()
  @IsOptional()
  settings?: any;
}

export class ArchiveChannelDto {
  @IsBoolean()
  isArchived: boolean;

  @IsNumber() // ✅ FIXED: Changed from string to number
  channelId: number;
}

// ==================== CHANNEL MEMBER DTOs ====================

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export class AddChannelMembersDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  userIds: number[];

  @IsNumber() // ✅ FIXED: Changed from string to number
  channelId: number;

  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole = MemberRole.MEMBER;
}

export class RemoveChannelMemberDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  channelId: number;
}

export class UpdateMemberRoleDto {
  @IsNumber()
  userId: number;

  @IsEnum(MemberRole)
  role: MemberRole;

  @IsNumber() // ✅ FIXED: Changed from string to number
  channelId: number;
}

export class UpdateMemberNotificationDto {
  @IsBoolean()
  @IsOptional()
  isMuted?: boolean;

  @IsObject()
  @IsOptional()
  notificationSettings?: any;

  @IsNumber() // ✅ FIXED: Changed from string to number
  channelId: number;
}

// ==================== MESSAGE DTOs ====================

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  SYSTEM = 'system',
  POLL = 'poll',
  CODE = 'code',
}

export class SendMessageDto {
  @IsNumber()
  channelId: number;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  // ✅ E2E Encryption fields (client must encrypt before sending)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  encryptedContent: string; // Base64 encoded encrypted content

  @IsString()
  @IsNotEmpty()
  encryptionIv: string; // Initialization vector for AES-256-GCM

  @IsString()
  @IsNotEmpty()
  encryptionAuthTag: string; // Authentication tag for AES-256-GCM

  @IsNumber()
  @IsOptional()
  replyToMessageId?: number;

  @IsNumber()
  @IsOptional()
  threadId?: number;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentDto[];

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  mentions?: number[];
}

export class AttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  fileUrl: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  // ✅ Encrypted file metadata
  @IsString()
  @IsOptional()
  encryptedFileKey?: string; // File-specific encryption key
}

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  encryptedContent: string;

  @IsString()
  @IsNotEmpty()
  encryptionIv: string;

  @IsString()
  @IsNotEmpty()
  encryptionAuthTag: string;

  @IsNumber() // ✅ FIXED: Changed from string to number
  messageId: number;
}

export class DeleteMessageDto {
  @IsBoolean()
  @IsOptional()
  hardDelete?: boolean = false;

  @IsNumber()
  messageId: number;
}

export class ReactToMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  emoji: string;

  @IsNumber() // ✅ FIXED: Changed from string to number
  messageId: number;
}

export class PinMessageDto {
  @IsBoolean()
  isPinned: boolean;

  @IsNumber() // ✅ FIXED: Changed from string to number
  messageId: number;
}

// ==================== READ RECEIPTS DTOs ====================

export class GetMessageStatusDto {
  @IsNumber() // ✅ FIXED: Changed from string to number
  @IsNotEmpty()
  messageId: number;
}

export class BulkMarkAsReadDto {
  @IsNumber() // ✅ FIXED: Changed from string to number
  @IsNotEmpty()
  channelId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  messageIds: number[];
}

export class MarkAsDeliveredDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  messageIds: number[];
}

// ==================== SEARCH & FILTER DTOs ====================

export class GetMessagesDto {
  @IsNumber()
  @IsOptional()
  limit?: number = 50;

  @IsNumber()
  @IsOptional()
  offset?: number = 0;

  @IsNumber()
  @IsOptional()
  beforeMessageId?: number;

  @IsNumber()
  @IsOptional()
  afterMessageId?: number;

  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean = false;

  @IsNumber() // ✅ FIXED: Changed from string to number
  channelId: number;
}

export class SearchMessagesDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  query: string;

  @IsNumber()
  @IsOptional()
  channelId?: number;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  limit?: number = 50;

  @IsNumber()
  @IsOptional()
  offset?: number = 0;
}

export class GetChannelsDto {
  @IsEnum(ChannelType)
  @IsOptional()
  channelType?: ChannelType;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsBoolean()
  @IsOptional()
  onlyJoined?: boolean = true;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  limit?: number = 50;

  @IsNumber()
  @IsOptional()
  offset?: number = 0;
}

// ==================== THREAD DTOs ====================

export class GetThreadMessagesDto {
  @IsNumber()
  threadId: number;

  @IsNumber()
  @IsOptional()
  limit?: number = 50;

  @IsNumber()
  @IsOptional()
  offset?: number = 0;
}

// ==================== DIRECT MESSAGE DTOs ====================

export class CreateDirectMessageDto {
  @IsNumber()
  @IsNotEmpty()
  recipientUserId: number;

  // ✅ E2E Encryption fields
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  encryptedContent: string;

  @IsString()
  @IsNotEmpty()
  encryptionIv: string;

  @IsString()
  @IsNotEmpty()
  encryptionAuthTag: string;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentDto[];
}

// ==================== TYPING INDICATOR DTOs ====================

export class TypingIndicatorDto {
  @IsNumber()
  channelId: number;

  @IsBoolean()
  isTyping: boolean;
}

// ==================== MARK AS READ DTOs ====================

export class MarkAsReadDto {
  @IsNumber()
  channelId: number;

  @IsNumber()
  @IsOptional()
  messageId?: number;
}

// ==================== FILE UPLOAD DTOs ====================

export class UploadFileDto {
  @IsNumber()
  channelId: number;

  @IsString()
  @IsOptional()
  caption?: string;
}

// ==================== MESSAGE FORWARDING DTO (NEW) ====================

export class ForwardMessageDto {
  @IsNumber()
  @IsNotEmpty()
  messageId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  targetChannelIds: number[];
}

// ==================== CHANNEL KEY ROTATION DTO (NEW) ====================

export class RotateChannelKeyDto {
  @IsNumber()
  @IsNotEmpty()
  channelId: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
