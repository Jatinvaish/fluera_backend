// ============================================
// modules/chat/chat.service.ts - PRODUCTION READY v3.0
// ============================================
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { EncryptionService } from '../../common/encryption.service';
import { RedisService } from '../../core/redis/redis.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  AddChannelMembersDto,
  SendMessageDto,
  EditMessageDto,
  SearchMessagesDto,
  GetMessagesDto,
  GetChannelsDto,
  UpdateMemberRoleDto,
  UpdateMemberNotificationDto,
  CreateDirectMessageDto,
  MarkAsReadDto,
  ChannelType,
  MemberRole,
  MessageType,
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private sqlService: SqlServerService,
    private encryptionService: EncryptionService,
    private redisService: RedisService,
  ) {}

  // ==================== CHANNELS ====================

  async createChannel(
    dto: CreateChannelDto,
    userId: number,
    organizationId: number,
  ) {
    try {
      // ✅ Generate secure channel encryption key
      const channelKey = this.encryptionService.generateChannelKey();
      const encryptedChannelKey = this.encryptionService.encrypt(channelKey);

      const result = await this.sqlService.query(
        `INSERT INTO chat_channels (
          created_by_tenant_id, name, description, channel_type, 
          related_type, related_id, is_private, member_count,
          is_encrypted, encryption_version, encryption_algorithm,
          last_activity_at, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @organizationId, @name, @description, @channelType, 
          @relatedType, @relatedId, @isPrivate, 1,
          1, 'v1', 'AES-256-GCM',
          GETUTCDATE(), @userId, GETUTCDATE()
        )`,
        {
          organizationId,
          name: dto.name,
          description: dto.description || null,
          channelType: dto.channelType,
          relatedType: dto.relatedType || null,
          relatedId: dto.relatedId ? Number(dto.relatedId) : null,
          isPrivate: dto.isPrivate || false,
          userId,
        },
      );

      const channel = result[0];

      // Add creator with encrypted channel key
      await this.addChannelParticipant(
        Number(channel.id),
        userId,
        organizationId,
        userId,
        MemberRole.OWNER,
        encryptedChannelKey,
      );

      // Add additional members
      if (dto.memberIds && dto.memberIds.length > 0) {
        for (const memberId of dto.memberIds) {
          if (Number(memberId) !== userId) {
            await this.addChannelParticipant(
              Number(channel.id),
              Number(memberId),
              organizationId,
              userId,
              MemberRole.MEMBER,
              encryptedChannelKey,
            );
          }
        }
      }

      return {
        ...channel,
        channelKey, // Return unencrypted key to creator for client-side storage
      };
    } catch (error) {
      this.logger.error('Failed to create channel:', error);
      throw new BadRequestException(
        `Failed to create channel: ${error.message}`,
      );
    }
  }

  async getChannelById(channelId: number, userId: number) {
    try {
      const participation = await this.sqlService.query(
        `SELECT encrypted_channel_key FROM chat_participants 
         WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
        { channelId, userId },
      );

      if (participation.length === 0) {
        throw new ForbiddenException(
          'You are not a participant of this channel',
        );
      }

      const result = await this.sqlService.query(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM chat_participants WHERE channel_id = c.id AND is_active = 1) as member_count,
                (SELECT COUNT(*) FROM messages WHERE channel_id = c.id AND is_deleted = 0) as message_count,
                cp.role as user_role,
                cp.is_muted as is_muted,
                cp.last_read_message_id,
                cp.last_read_at,
                cp.encrypted_channel_key
         FROM chat_channels c
         LEFT JOIN chat_participants cp ON c.id = cp.channel_id AND cp.user_id = @userId
         WHERE c.id = @channelId`,
        { channelId, userId },
      );

      if (result.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to get channel: ${error.message}`);
    }
  }

  async getUserChannels(
    userId: number,
    organizationId: number,
    dto: GetChannelsDto,
  ) {
    try {
      const cacheKey = `user:${userId}:channels:${JSON.stringify(dto)}`;
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      let query = `
        SELECT c.*, 
               cp.role as user_role,
               cp.last_read_message_id,
               cp.last_read_at,
               cp.is_muted,
               cp.encrypted_channel_key,
               (SELECT COUNT(*) FROM messages m 
                WHERE m.channel_id = c.id 
                AND m.is_deleted = 0 
                AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)) as unread_count,
               (SELECT TOP 1 encrypted_content FROM messages 
                WHERE channel_id = c.id AND is_deleted = 0 
                ORDER BY sent_at DESC) as last_message_preview,
               (SELECT TOP 1 sent_at FROM messages 
                WHERE channel_id = c.id AND is_deleted = 0 
                ORDER BY sent_at DESC) as last_message_at
        FROM chat_channels c
        INNER JOIN chat_participants cp ON c.id = cp.channel_id
        WHERE cp.user_id = @userId 
        AND cp.is_active = 1
        AND c.created_by_tenant_id = @organizationId
      `;

      const params: any = { userId, organizationId };

      if (dto.channelType) {
        query += ` AND c.channel_type = @channelType`;
        params.channelType = dto.channelType;
      }

      if (dto.isArchived !== undefined) {
        query += ` AND c.is_archived = @isArchived`;
        params.isArchived = dto.isArchived;
      }

      if (dto.search) {
        query += ` AND (c.name LIKE @search OR c.description LIKE @search)`;
        params.search = `%${dto.search}%`;
      }

      query += ` ORDER BY c.last_activity_at DESC`;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

      params.limit = dto.limit || 50;
      params.offset = dto.offset || 0;

      const result = await this.sqlService.query(query, params);

      await this.redisService.set(cacheKey, JSON.stringify(result), 60);

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to get user channels: ${error.message}`,
      );
    }
  }

  async updateChannel(
    channelId: number,
    dto: UpdateChannelDto,
    userId: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      const result = await this.sqlService.query(
        `UPDATE chat_channels 
         SET name = COALESCE(@name, name),
             description = COALESCE(@description, description),
             is_private = COALESCE(@isPrivate, is_private),
             settings = COALESCE(@settings, settings),
             updated_by = @userId,
             updated_at = GETUTCDATE()
         OUTPUT INSERTED.*
         WHERE id = @channelId`,
        {
          channelId,
          name: dto.name,
          description: dto.description,
          isPrivate: dto.isPrivate,
          settings: dto.settings ? JSON.stringify(dto.settings) : null,
          userId,
        },
      );

      if (result.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      await this.redisService.del(`user:*:channels:*`);

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update channel: ${error.message}`,
      );
    }
  }

  async archiveChannel(channelId: number, isArchived: boolean, userId: number) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      await this.sqlService.query(
        `UPDATE chat_channels 
         SET is_archived = @isArchived, updated_by = @userId, updated_at = GETUTCDATE()
         WHERE id = @channelId`,
        { channelId, isArchived, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return {
        message: isArchived ? 'Channel archived' : 'Channel unarchived',
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to archive channel: ${error.message}`,
      );
    }
  }

  async deleteChannel(channelId: number, userId: number) {
    try {
      await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER]);

      await this.sqlService.query(
        `UPDATE chat_channels 
         SET is_archived = 1, updated_by = @userId, updated_at = GETUTCDATE()
         WHERE id = @channelId`,
        { channelId, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return { message: 'Channel deleted successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete channel: ${error.message}`,
      );
    }
  }

  // ==================== CHANNEL PARTICIPANTS ====================

  async addChannelMembers(
    channelId: number,
    dto: AddChannelMembersDto,
    userId: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      const channel = await this.sqlService.query(
        `SELECT created_by_tenant_id, cp.encrypted_channel_key 
         FROM chat_channels c
         LEFT JOIN chat_participants cp ON c.id = cp.channel_id AND cp.user_id = @userId
         WHERE c.id = @channelId`,
        { channelId, userId },
      );

      if (channel.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      const organizationId = channel[0].created_by_tenant_id;
      const encryptedChannelKey = channel[0].encrypted_channel_key;
      const addedMembers: any = [];

      for (const memberId of dto.userIds) {
        try {
          const member: any = await this.addChannelParticipant(
            channelId,
            Number(memberId),
            organizationId,
            userId,
            dto.role || MemberRole.MEMBER,
            encryptedChannelKey,
          );
          addedMembers.push(member);
        } catch (error) {
          this.logger.warn(`Failed to add member ${memberId}:`, error.message);
        }
      }

      await this.updateChannelMemberCount(channelId);
      await this.redisService.del(`user:*:channels:*`);

      return {
        message: 'Members added successfully',
        added: addedMembers.length,
        total: dto.userIds.length,
        members: addedMembers,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to add channel members: ${error.message}`,
      );
    }
  }

  async addChannelParticipant(
    channelId: number,
    memberId: number,
    tenantId: number,
    addedBy: number,
    role: MemberRole = MemberRole.MEMBER,
    encryptedChannelKey: string,
  ) {
    try {
      const result = await this.sqlService.query(
        `INSERT INTO chat_participants (
          channel_id, tenant_id, user_id, role, 
          encrypted_channel_key,
          is_active, joined_at, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @channelId, @tenantId, @memberId, @role, 
          @encryptedChannelKey,
          1, GETUTCDATE(), @addedBy, GETUTCDATE()
        )`,
        { channelId, tenantId, memberId, role, encryptedChannelKey, addedBy },
      );

      return result[0];
    } catch (error) {
      throw new BadRequestException(
        `Failed to add participant: ${error.message}`,
      );
    }
  }

  async removeChannelMember(
    channelId: number,
    memberId: number,
    removedBy: number,
  ) {
    try {
      if (removedBy !== memberId) {
        await this.checkChannelPermission(channelId, removedBy, [
          MemberRole.OWNER,
          MemberRole.ADMIN,
        ]);
      }

      await this.sqlService.query(
        `UPDATE chat_participants 
         SET is_active = 0, left_at = GETUTCDATE(), updated_by = @removedBy, updated_at = GETUTCDATE()
         WHERE channel_id = @channelId AND user_id = @memberId`,
        { channelId, memberId, removedBy },
      );

      await this.updateChannelMemberCount(channelId);
      await this.redisService.del(`user:*:channels:*`);

      return { message: 'Member removed successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to remove member: ${error.message}`,
      );
    }
  }

  async getChannelMembers(channelId: number, userId: number) {
    try {
      await this.checkChannelMembership(channelId, userId);

      return await this.sqlService.query(
        `SELECT cp.*, 
                u.first_name, u.last_name, u.email, u.avatar_url, u.status,
                u.last_active_at
         FROM chat_participants cp
         INNER JOIN users u ON cp.user_id = u.id
         WHERE cp.channel_id = @channelId AND cp.is_active = 1
         ORDER BY cp.role DESC, u.first_name`,
        { channelId },
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get channel members: ${error.message}`,
      );
    }
  }

  async updateMemberRole(
    channelId: number,
    dto: UpdateMemberRoleDto,
    updatedBy: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, updatedBy, [
        MemberRole.OWNER,
      ]);

      await this.sqlService.query(
        `UPDATE chat_participants 
         SET role = @role, updated_by = @updatedBy, updated_at = GETUTCDATE()
         WHERE channel_id = @channelId AND user_id = @userId`,
        { channelId, userId: Number(dto.userId), role: dto.role, updatedBy },
      );

      return { message: 'Member role updated successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update member role: ${error.message}`,
      );
    }
  }

  async updateMemberNotification(
    channelId: number,
    dto: UpdateMemberNotificationDto,
    userId: number,
  ) {
    try {
      await this.sqlService.query(
        `UPDATE chat_participants 
         SET is_muted = COALESCE(@isMuted, is_muted),
             notification_settings = COALESCE(@notificationSettings, notification_settings),
             updated_by = @userId,
             updated_at = GETUTCDATE()
         WHERE channel_id = @channelId AND user_id = @userId`,
        {
          channelId,
          userId,
          isMuted: dto.isMuted,
          notificationSettings: dto.notificationSettings
            ? JSON.stringify(dto.notificationSettings)
            : null,
        },
      );

      return { message: 'Notification settings updated' };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update notification settings: ${error.message}`,
      );
    }
  }

  // ==================== MESSAGES ====================

  async sendMessage(
    dto: SendMessageDto,
    userId: number,
    organizationId: number,
  ) {
    try {
      await this.checkChannelMembership(Number(dto.channelId), userId);

      // ✅ Validate encryption data
      if (
        !dto.encryptedContent ||
        !dto.encryptionIv ||
        !dto.encryptionAuthTag
      ) {
        throw new BadRequestException(
          'Message must be encrypted on client-side',
        );
      }

      // ✅ Generate HMAC for content integrity
      const contentHash = this.encryptionService.generateHMAC(
        dto.encryptedContent,
      );

      const result = await this.sqlService.query(
        `INSERT INTO messages (
          channel_id, sender_tenant_id, sender_user_id, message_type, 
          encrypted_content, encryption_iv, encryption_auth_tag, content_hash,
          has_attachments, has_mentions, reply_to_message_id, thread_id,
          sent_at, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @channelId, @organizationId, @userId, @messageType, 
          @encryptedContent, @encryptionIv, @encryptionAuthTag, @contentHash,
          @hasAttachments, @hasMentions, @replyToMessageId, @threadId,
          GETUTCDATE(), @userId, GETUTCDATE()
        )`,
        {
          channelId: Number(dto.channelId),
          organizationId,
          userId,
          messageType: dto.messageType || 'text',
          encryptedContent: dto.encryptedContent,
          encryptionIv: dto.encryptionIv,
          encryptionAuthTag: dto.encryptionAuthTag,
          contentHash,
          hasAttachments: dto.attachments && dto.attachments.length > 0 ? 1 : 0,
          hasMentions: dto.mentions && dto.mentions.length > 0 ? 1 : 0,
          replyToMessageId: dto.replyToMessageId
            ? Number(dto.replyToMessageId)
            : null,
          threadId: dto.threadId ? Number(dto.threadId) : null,
        },
      );

      const messageId = result[0].id;

      // ✅ Create delivery receipts
      await this.createDeliveryReceipts(
        Number(dto.channelId),
        messageId,
        userId,
      );

      // Update channel activity
      await this.sqlService.query(
        `UPDATE chat_channels 
         SET message_count = message_count + 1, 
             last_message_at = GETUTCDATE(),
             last_activity_at = GETUTCDATE()
         WHERE id = @channelId`,
        { channelId: Number(dto.channelId) },
      );

      await this.redisService.del(`user:*:channels:*`);

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to send message:', error);
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }
  }

  // ✅ FIXED: Corrected SQL syntax
  private async createDeliveryReceipts(
    channelId: number,
    messageId: number,
    senderId: number,
  ) {
    try {
      await this.sqlService.query(
        `INSERT INTO message_read_receipts (message_id, user_id, status, created_at)
         SELECT @messageId, user_id, 'sent', GETUTCDATE()
         FROM chat_participants
         WHERE channel_id = @channelId 
         AND user_id != @senderId 
         AND is_active = 1`,
        { messageId, channelId, senderId },
      );
    } catch (error) {
      this.logger.error('Failed to create delivery receipts', error);
    }
  }

  async getMessages(channelId: number, userId: number, dto: GetMessagesDto) {
    try {
      await this.checkChannelMembership(channelId, userId);

      let query = `
        SELECT m.*,
               u.first_name as sender_first_name,
               u.last_name as sender_last_name,
               u.avatar_url as sender_avatar_url,
               (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count,
               (SELECT COUNT(*) FROM messages WHERE reply_to_message_id = m.id) as reply_count
        FROM messages m
        INNER JOIN users u ON m.sender_user_id = u.id
        WHERE m.channel_id = @channelId
      `;

      const params: any = { channelId };

      if (!dto.includeDeleted) {
        query += ` AND m.is_deleted = 0`;
      }

      if (dto.beforeMessageId) {
        query += ` AND m.id < @beforeMessageId`;
        params.beforeMessageId = Number(dto.beforeMessageId);
      }

      if (dto.afterMessageId) {
        query += ` AND m.id > @afterMessageId`;
        params.afterMessageId = Number(dto.afterMessageId);
      }

      query += ` ORDER BY m.sent_at DESC`;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

      params.limit = dto.limit || 50;
      params.offset = dto.offset || 0;

      return await this.sqlService.query(query, params);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get messages: ${error.message}`);
    }
  }

  async editMessage(messageId: number, dto: EditMessageDto, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT * FROM messages WHERE id = @messageId AND sender_user_id = @userId`,
        { messageId, userId },
      );

      if (message.length === 0) {
        throw new ForbiddenException('You can only edit your own messages');
      }

      if (
        !dto.encryptedContent ||
        !dto.encryptionIv ||
        !dto.encryptionAuthTag
      ) {
        throw new BadRequestException('Edited message must be encrypted');
      }

      const contentHash = this.encryptionService.generateHMAC(
        dto.encryptedContent,
      );

      const result = await this.sqlService.query(
        `UPDATE messages 
         SET encrypted_content = @encryptedContent,
             encryption_iv = @encryptionIv,
             encryption_auth_tag = @encryptionAuthTag,
             content_hash = @contentHash,
             is_edited = 1,
             edited_at = GETUTCDATE(),
             updated_by = @userId,
             updated_at = GETUTCDATE()
         OUTPUT INSERTED.*
         WHERE id = @messageId`,
        {
          messageId,
          encryptedContent: dto.encryptedContent,
          encryptionIv: dto.encryptionIv,
          encryptionAuthTag: dto.encryptionAuthTag,
          contentHash,
          userId,
        },
      );

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to edit message: ${error.message}`);
    }
  }

  async deleteMessage(
    messageId: number,
    userId: number,
    hardDelete: boolean = false,
  ) {
    try {
      const message = await this.sqlService.query(
        `SELECT * FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      if (message[0].sender_user_id !== userId) {
        await this.checkChannelPermission(message[0].channel_id, userId, [
          MemberRole.OWNER,
          MemberRole.ADMIN,
        ]);
      }

      if (hardDelete) {
        await this.sqlService.query(
          `DELETE FROM messages WHERE id = @messageId`,
          { messageId },
        );
      } else {
        await this.sqlService.query(
          `UPDATE messages 
           SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId, updated_at = GETUTCDATE()
           WHERE id = @messageId`,
          { messageId, userId },
        );
      }

      return { message: 'Message deleted successfully' };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete message: ${error.message}`,
      );
    }
  }

  async reactToMessage(
    messageId: number,
    emoji: string,
    userId: number,
    organizationId: number,
  ) {
    try {
      const existing = await this.sqlService.query(
        `SELECT * FROM message_reactions 
         WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
        { messageId, userId, emoji },
      );

      if (existing.length > 0) {
        await this.sqlService.query(
          `DELETE FROM message_reactions 
           WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
          { messageId, userId, emoji },
        );
        return { message: 'Reaction removed', action: 'removed' };
      } else {
        await this.sqlService.query(
          `INSERT INTO message_reactions (message_id, tenant_id, user_id, emoji, created_by, created_at)
           VALUES (@messageId, @organizationId, @userId, @emoji, @userId, GETUTCDATE())`,
          { messageId, organizationId, userId, emoji },
        );
        return { message: 'Reaction added', action: 'added' };
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to react to message: ${error.message}`,
      );
    }
  }

  async pinMessage(messageId: number, isPinned: boolean, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT channel_id FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      await this.checkChannelPermission(message[0].channel_id, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      await this.sqlService.query(
        `UPDATE messages 
         SET is_pinned = @isPinned,
             pinned_at = ${isPinned ? 'GETUTCDATE()' : 'NULL'},
             pinned_by = ${isPinned ? '@userId' : 'NULL'},
             updated_at = GETUTCDATE()
         WHERE id = @messageId`,
        { messageId, isPinned, userId },
      );

      return { message: isPinned ? 'Message pinned' : 'Message unpinned' };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to pin message: ${error.message}`);
    }
  }

  // ==================== READ RECEIPTS ====================

  // ✅ NEW: Missing bulk mark as read implementation
  async bulkMarkAsRead(
    channelId: number,
    messageIds: number[],
    userId: number,
  ) {
    try {
      await this.checkChannelMembership(channelId, userId);

      if (!messageIds || messageIds.length === 0) {
        return { message: 'No messages to mark as read' };
      }

      await this.sqlService.query(
        `UPDATE message_read_receipts
         SET status = 'read', read_at = GETUTCDATE()
         WHERE message_id IN (${messageIds.join(',')})
         AND user_id = @userId
         AND status != 'read'`,
        { userId },
      );

      // Update last read message
      const maxMessageId = Math.max(...messageIds);
      await this.sqlService.query(
        `UPDATE chat_participants 
         SET last_read_message_id = @messageId,
             last_read_at = GETUTCDATE(),
             updated_by = @userId,
             updated_at = GETUTCDATE()
         WHERE channel_id = @channelId AND user_id = @userId`,
        { channelId, messageId: maxMessageId, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return {
        message: 'Messages marked as read',
        count: messageIds.length,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to bulk mark as read: ${error.message}`,
      );
    }
  }

  async markAsRead(dto: MarkAsReadDto, userId: number) {
    try {
      const messageId = dto.messageId
        ? Number(dto.messageId)
        : await this.getLastMessageId(Number(dto.channelId));

      if (!messageId) {
        return { message: 'No messages to mark as read' };
      }

      // Update read receipt
      await this.sqlService.query(
        `UPDATE message_read_receipts
         SET status = 'read', read_at = GETUTCDATE()
         WHERE message_id = @messageId AND user_id = @userId`,
        { messageId, userId },
      );

      // Update participant's last read
      await this.sqlService.query(
        `UPDATE chat_participants 
         SET last_read_message_id = @messageId,
             last_read_at = GETUTCDATE(),
             updated_by = @userId,
             updated_at = GETUTCDATE()
         WHERE channel_id = @channelId AND user_id = @userId`,
        { channelId: Number(dto.channelId), messageId, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return { message: 'Marked as read' };
    } catch (error) {
      throw new BadRequestException(`Failed to mark as read: ${error.message}`);
    }
  }

  async getUnreadCount(userId: number, organizationId: number) {
    try {
      const cacheKey = `user:${userId}:unread_count`;
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.sqlService.query(
        `SELECT 
           COUNT(*) as total_unread,
           COUNT(DISTINCT m.channel_id) as unread_channels
         FROM messages m
         INNER JOIN chat_channels c ON m.channel_id = c.id
         INNER JOIN chat_participants cp ON c.id = cp.channel_id
         WHERE cp.user_id = @userId
         AND cp.is_active = 1
         AND c.created_by_tenant_id = @organizationId
         AND m.is_deleted = 0
         AND m.sender_user_id != @userId
         AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)`,
        { userId, organizationId },
      );

      await this.redisService.set(cacheKey, JSON.stringify(result[0]), 30);

      return result[0];
    } catch (error) {
      throw new BadRequestException(
        `Failed to get unread count: ${error.message}`,
      );
    }
  }

  async getMessageStatus(messageId: number, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT channel_id, sender_user_id FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      await this.checkChannelMembership(message[0].channel_id, userId);

      const receipts = await this.sqlService.query(
        `SELECT mrr.*,
                u.first_name, u.last_name, u.avatar_url
         FROM message_read_receipts mrr
         INNER JOIN users u ON mrr.user_id = u.id
         WHERE mrr.message_id = @messageId
         ORDER BY mrr.read_at DESC`,
        { messageId },
      );

      const totalRecipients = await this.sqlService.query(
        `SELECT COUNT(*) as count FROM chat_participants 
         WHERE channel_id = @channelId 
         AND user_id != @senderId 
         AND is_active = 1`,
        {
          channelId: message[0].channel_id,
          senderId: message[0].sender_user_id,
        },
      );

      const stats = {
        sent: receipts.filter((r) => r.status === 'sent').length,
        delivered: receipts.filter((r) => r.status === 'delivered').length,
        read: receipts.filter((r) => r.status === 'read').length,
        total: totalRecipients[0].count,
      };

      return {
        messageId,
        status: this.calculateMessageStatus(stats),
        stats,
        receipts,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get message status: ${error.message}`,
      );
    }
  }

  private calculateMessageStatus(stats: any): string {
    if (stats.read === stats.total) return 'read';
    if (stats.delivered > 0) return 'delivered';
    if (stats.sent > 0) return 'sent';
    return 'sending';
  }

  async getMessagesDeliveryStatus(messageIds: number[], userId: number) {
    try {
      if (!messageIds || messageIds.length === 0) {
        return [];
      }

      const statuses = await this.sqlService.query(
        `SELECT m.id as message_id,
                COUNT(CASE WHEN mrr.status = 'sent' THEN 1 END) as sent_count,
                COUNT(CASE WHEN mrr.status = 'delivered' THEN 1 END) as delivered_count,
                COUNT(CASE WHEN mrr.status = 'read' THEN 1 END) as read_count,
                (SELECT COUNT(*) FROM chat_participants cp 
                 WHERE cp.channel_id = m.channel_id 
                 AND cp.user_id != m.sender_user_id 
                 AND cp.is_active = 1) as total_recipients
         FROM messages m
         LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id
         WHERE m.id IN (${messageIds.join(',')})
         GROUP BY m.id, m.channel_id, m.sender_user_id`,
        {},
      );

      return statuses.map((s) => ({
        messageId: s.message_id,
        status: this.calculateMessageStatus({
          sent: s.sent_count,
          delivered: s.delivered_count,
          read: s.read_count,
          total: s.total_recipients,
        }),
        stats: {
          sent: s.sent_count,
          delivered: s.delivered_count,
          read: s.read_count,
          total: s.total_recipients,
        },
      }));
    } catch (error) {
      throw new BadRequestException(
        `Failed to get messages delivery status: ${error.message}`,
      );
    }
  }

  // ==================== SEARCH ====================

  async searchMessages(
    userId: number,
    organizationId: number,
    dto: SearchMessagesDto,
  ) {
    try {
      // NOTE: With E2E encryption, search must be done client-side
      // This endpoint can only search by metadata (sender, date, channel)
      let query = `
        SELECT m.*,
               u.first_name as sender_first_name,
               u.last_name as sender_last_name,
               c.name as channel_name
        FROM messages m
        INNER JOIN users u ON m.sender_user_id = u.id
        INNER JOIN chat_channels c ON m.channel_id = c.id
        INNER JOIN chat_participants cp ON c.id = cp.channel_id AND cp.user_id = @userId
        WHERE m.sender_tenant_id = @organizationId
        AND m.is_deleted = 0
        AND cp.is_active = 1
      `;

      const params: any = {
        userId,
        organizationId,
      };

      if (dto.channelId) {
        query += ` AND m.channel_id = @channelId`;
        params.channelId = Number(dto.channelId);
      }

      if (dto.userId) {
        query += ` AND m.sender_user_id = @senderId`;
        params.senderId = Number(dto.userId);
      }

      if (dto.messageType) {
        query += ` AND m.message_type = @messageType`;
        params.messageType = dto.messageType;
      }

      if (dto.startDate) {
        query += ` AND m.sent_at >= @startDate`;
        params.startDate = dto.startDate;
      }

      if (dto.endDate) {
        query += ` AND m.sent_at <= @endDate`;
        params.endDate = dto.endDate;
      }

      query += ` ORDER BY m.sent_at DESC`;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

      params.limit = dto.limit || 50;
      params.offset = dto.offset || 0;

      return await this.sqlService.query(query, params);
    } catch (error) {
      throw new BadRequestException(
        `Failed to search messages: ${error.message}`,
      );
    }
  }

  // ==================== DIRECT MESSAGES ====================

  async createDirectMessage(
    dto: CreateDirectMessageDto,
    userId: number,
    organizationId: number,
  ) {
    try {
      let channel = await this.sqlService.query(
        `SELECT c.* FROM chat_channels c
         INNER JOIN chat_participants cp1 ON c.id = cp1.channel_id AND cp1.user_id = @userId
         INNER JOIN chat_participants cp2 ON c.id = cp2.channel_id AND cp2.user_id = @recipientId
         WHERE c.channel_type = 'direct' 
         AND c.created_by_tenant_id = @organizationId
         AND (SELECT COUNT(*) FROM chat_participants WHERE channel_id = c.id AND is_active = 1) = 2`,
        { userId, recipientId: Number(dto.recipientUserId), organizationId },
      );

      let channelId: number;

      if (channel.length === 0) {
        const channelKey = this.encryptionService.generateChannelKey();
        const encryptedChannelKey = this.encryptionService.encrypt(channelKey);

        const newChannel = await this.sqlService.query(
          `INSERT INTO chat_channels (
            created_by_tenant_id, name, channel_type, is_private, 
            is_encrypted, created_by, created_at
          )
          OUTPUT INSERTED.*
          VALUES (@organizationId, 'Direct Message', 'direct', 1, 1, @userId, GETUTCDATE())`,
          { organizationId, userId },
        );

        channelId = newChannel[0].id;

        await this.addChannelParticipant(
          channelId,
          userId,
          organizationId,
          userId,
          MemberRole.MEMBER,
          encryptedChannelKey,
        );
        await this.addChannelParticipant(
          channelId,
          Number(dto.recipientUserId),
          organizationId,
          userId,
          MemberRole.MEMBER,
          encryptedChannelKey,
        );
      } else {
        channelId = channel[0].id;
      }

      if (
        !dto.encryptedContent ||
        !dto.encryptionIv ||
        !dto.encryptionAuthTag
      ) {
        throw new BadRequestException('Direct message must be encrypted');
      }

      return await this.sendMessage(
        {
          channelId: Number(channelId),
          encryptedContent: dto.encryptedContent,
          encryptionIv: dto.encryptionIv,
          encryptionAuthTag: dto.encryptionAuthTag,
          attachments: dto.attachments,
          messageType: MessageType.TEXT,
        },
        userId,
        organizationId,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create direct message: ${error.message}`,
      );
    }
  }

  // ==================== THREADS ====================

  async getThreadMessages(
    threadId: number,
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      const parentMessage = await this.sqlService.query(
        `SELECT channel_id FROM messages WHERE id = @threadId`,
        { threadId },
      );

      if (parentMessage.length === 0) {
        throw new NotFoundException('Thread not found');
      }

      await this.checkChannelMembership(parentMessage[0].channel_id, userId);

      return await this.sqlService.query(
        `SELECT m.*,
                u.first_name as sender_first_name,
                u.last_name as sender_last_name,
                u.avatar_url as sender_avatar_url,
                (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count
         FROM messages m
         INNER JOIN users u ON m.sender_user_id = u.id
         WHERE (m.thread_id = @threadId OR m.id = @threadId)
         AND m.is_deleted = 0
         ORDER BY m.sent_at ASC
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { threadId, limit, offset },
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get thread messages: ${error.message}`,
      );
    }
  }

  // ==================== FILE ATTACHMENTS ====================

  async getChannelFiles(
    channelId: number,
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      await this.checkChannelMembership(channelId, userId);

      return await this.sqlService.query(
        `SELECT ma.*, m.sent_at, m.sender_user_id,
                u.first_name as sender_first_name,
                u.last_name as sender_last_name
         FROM message_attachments ma
         INNER JOIN messages m ON ma.message_id = m.id
         INNER JOIN users u ON m.sender_user_id = u.id
         WHERE m.channel_id = @channelId
         AND m.is_deleted = 0
         AND ma.is_deleted = 0
         ORDER BY ma.created_at DESC
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { channelId, limit, offset },
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get channel files: ${error.message}`,
      );
    }
  }

  // ==================== PINNED MESSAGES ====================

  async getPinnedMessages(channelId: number, userId: number) {
    try {
      await this.checkChannelMembership(channelId, userId);

      return await this.sqlService.query(
        `SELECT m.*,
                u.first_name as sender_first_name,
                u.last_name as sender_last_name,
                u.avatar_url as sender_avatar_url,
                pinner.first_name as pinned_by_first_name,
                pinner.last_name as pinned_by_last_name
         FROM messages m
         INNER JOIN users u ON m.sender_user_id = u.id
         LEFT JOIN users pinner ON m.pinned_by = pinner.id
         WHERE m.channel_id = @channelId
         AND m.is_pinned = 1
         AND m.is_deleted = 0
         ORDER BY m.pinned_at DESC`,
        { channelId },
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get pinned messages: ${error.message}`,
      );
    }
  }

  // ==================== MESSAGE REACTIONS ====================

  async getMessageReactions(messageId: number, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT channel_id FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      await this.checkChannelMembership(message[0].channel_id, userId);

      return await this.sqlService.query(
        `SELECT mr.emoji, 
                COUNT(*) as count,
                STRING_AGG(CAST(u.first_name + ' ' + u.last_name AS NVARCHAR(MAX)), ', ') as users
         FROM message_reactions mr
         INNER JOIN users u ON mr.user_id = u.id
         WHERE mr.message_id = @messageId
         GROUP BY mr.emoji
         ORDER BY COUNT(*) DESC`,
        { messageId },
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get message reactions: ${error.message}`,
      );
    }
  }

  // ==================== USER PRESENCE ====================

  async updateUserPresence(
    userId: number,
    status: 'online' | 'away' | 'offline',
  ) {
    try {
      await this.sqlService.query(
        `UPDATE users 
         SET status = @status, 
             last_active_at = GETUTCDATE()
         WHERE id = @userId`,
        { userId, status },
      );

      await this.redisService.set(`user:${userId}:status`, status, 300);

      return { message: 'User presence updated', status };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update user presence: ${error.message}`,
      );
    }
  }

  async getOnlineUsers(organizationId: number) {
    try {
      return await this.sqlService.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name, u.avatar_url, u.status, u.last_active_at
         FROM users u
         INNER JOIN chat_participants cp ON u.id = cp.user_id
         INNER JOIN chat_channels c ON cp.channel_id = c.id
         WHERE c.created_by_tenant_id = @organizationId
         AND cp.is_active = 1
         AND u.status IN ('online', 'away')
         AND u.last_active_at > DATEADD(minute, -5, GETUTCDATE())`,
        { organizationId },
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to get online users: ${error.message}`,
      );
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkDeleteMessages(messageIds: number[], userId: number) {
    try {
      if (!messageIds || messageIds.length === 0) {
        throw new BadRequestException('No message IDs provided');
      }

      const messages = await this.sqlService.query(
        `SELECT DISTINCT channel_id, sender_user_id 
         FROM messages 
         WHERE id IN (${messageIds.join(',')})`,
        {},
      );

      for (const msg of messages) {
        if (msg.sender_user_id !== userId) {
          await this.checkChannelPermission(msg.channel_id, userId, [
            MemberRole.OWNER,
            MemberRole.ADMIN,
          ]);
        }
      }

      await this.sqlService.query(
        `UPDATE messages 
         SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId
         WHERE id IN (${messageIds.join(',')})`,
        { userId },
      );

      return {
        message: 'Messages deleted successfully',
        deleted: messageIds.length,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to bulk delete messages: ${error.message}`,
      );
    }
  }

  // ==================== CHANNEL SETTINGS ====================

  async getChannelSettings(channelId: number, userId: number) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      const result = await this.sqlService.query(
        `SELECT settings FROM chat_channels WHERE id = @channelId`,
        { channelId },
      );

      if (result.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      return {
        channelId,
        settings: result[0].settings ? JSON.parse(result[0].settings) : {},
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get channel settings: ${error.message}`,
      );
    }
  }

  async updateChannelSettings(
    channelId: number,
    settings: any,
    userId: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      await this.sqlService.query(
        `UPDATE chat_channels 
         SET settings = @settings, 
             updated_by = @userId, 
             updated_at = GETUTCDATE()
         WHERE id = @channelId`,
        { channelId, settings: JSON.stringify(settings), userId },
      );

      return {
        message: 'Channel settings updated',
        settings,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update channel settings: ${error.message}`,
      );
    }
  }

  // ==================== HELPER METHODS ====================

  async checkChannelMembership(channelId: number, userId: number) {
    const result = await this.sqlService.query(
      `SELECT * FROM chat_participants 
       WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId },
    );

    if (result.length === 0) {
      throw new ForbiddenException('You are not a participant of this channel');
    }

    return result[0];
  }

  async checkChannelPermission(
    channelId: number,
    userId: number,
    allowedRoles: MemberRole[],
  ) {
    const member = await this.checkChannelMembership(channelId, userId);

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return member;
  }

  async updateChannelMemberCount(channelId: number) {
    await this.sqlService.query(
      `UPDATE chat_channels 
       SET member_count = (SELECT COUNT(*) FROM chat_participants 
                           WHERE channel_id = @channelId AND is_active = 1)
       WHERE id = @channelId`,
      { channelId },
    );
  }

  async getLastMessageId(channelId: number): Promise<number | null> {
    const result = await this.sqlService.query(
      `SELECT TOP 1 id FROM messages 
       WHERE channel_id = @channelId AND is_deleted = 0 
       ORDER BY sent_at DESC`,
      { channelId },
    );

    return result.length > 0 ? result[0].id : null;
  }

  // ============================================
  // Additional methods to add to chat.service.ts
  // ============================================

  // ==================== MESSAGE FORWARDING (NEW) ====================

  async forwardMessage(
    messageId: number,
    targetChannelIds: number[],
    userId: number,
    organizationId: number,
  ) {
    try {
      // Get original message
      const message = await this.sqlService.query(
        `SELECT * FROM messages WHERE id = @messageId AND is_deleted = 0`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      // Check if user has access to source channel
      await this.checkChannelMembership(message[0].channel_id, userId);

      const forwardedMessages: any[] = [];

      for (const targetChannelId of targetChannelIds) {
        try {
          // Check if user has access to target channel
          await this.checkChannelMembership(targetChannelId, userId);

          // Forward the message (encrypted content remains same)
          const result = await this.sqlService.query(
            `INSERT INTO messages (
              channel_id, sender_tenant_id, sender_user_id, message_type,
              encrypted_content, encryption_iv, encryption_auth_tag, content_hash,
              has_attachments, reply_to_message_id,
              sent_at, created_by, created_at
            )
            OUTPUT INSERTED.*
            VALUES (
              @channelId, @organizationId, @userId, @messageType,
              @encryptedContent, @encryptionIv, @encryptionAuthTag, @contentHash,
              @hasAttachments, @originalMessageId,
              GETUTCDATE(), @userId, GETUTCDATE()
            )`,
            {
              channelId: targetChannelId,
              organizationId,
              userId,
              messageType: message[0].message_type,
              encryptedContent: message[0].encrypted_content,
              encryptionIv: message[0].encryption_iv,
              encryptionAuthTag: message[0].encryption_auth_tag,
              contentHash: message[0].content_hash,
              hasAttachments: message[0].has_attachments,
              originalMessageId: messageId,
            },
          );

          const newMessageId = result[0].id;

          // Create delivery receipts
          await this.createDeliveryReceipts(
            targetChannelId,
            newMessageId,
            userId,
          );

          // Update channel activity
          await this.sqlService.query(
            `UPDATE chat_channels 
             SET message_count = message_count + 1,
                 last_message_at = GETUTCDATE(),
                 last_activity_at = GETUTCDATE()
             WHERE id = @channelId`,
            { channelId: targetChannelId },
          );

          forwardedMessages.push(result[0]);
        } catch (error) {
          this.logger.warn(
            `Failed to forward to channel ${targetChannelId}:`,
            error.message,
          );
        }
      }

      await this.redisService.del(`user:*:channels:*`);

      return {
        message: 'Message forwarded',
        forwarded: forwardedMessages.length,
        total: targetChannelIds.length,
        messages: forwardedMessages,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to forward message: ${error.message}`,
      );
    }
  }

  // ==================== CHANNEL KEY ROTATION (NEW) ====================

  async rotateChannelKey(channelId: number, reason: string, userId: number) {
    try {
      // Check if user is owner
      await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER]);

      // Generate new channel key
      const newChannelKey = this.encryptionService.generateChannelKey();
      const newEncryptedChannelKey =
        this.encryptionService.encrypt(newChannelKey);

      // Get current key version
      const channel = await this.sqlService.query(
        `SELECT encryption_version FROM chat_channels WHERE id = @channelId`,
        { channelId },
      );

      const currentVersion = channel[0].encryption_version || 'v1';
      const newVersion = `v${parseInt(currentVersion.substring(1)) + 1}`;

      // Update channel encryption version
      await this.sqlService.query(
        `UPDATE chat_channels 
         SET encryption_version = @newVersion,
             updated_by = @userId,
             updated_at = GETUTCDATE()
         WHERE id = @channelId`,
        { channelId, newVersion, userId },
      );

      // Get all channel participants
      const participants = await this.sqlService.query(
        `SELECT user_id FROM chat_participants 
         WHERE channel_id = @channelId AND is_active = 1`,
        { channelId },
      );

      // Update encrypted keys for all participants
      for (const participant of participants) {
        await this.sqlService.query(
          `UPDATE chat_participants
           SET encrypted_channel_key = @newEncryptedChannelKey,
               key_version = @newVersion,
               updated_at = GETUTCDATE()
           WHERE channel_id = @channelId AND user_id = @userId`,
          {
            channelId,
            userId: participant.user_id,
            newEncryptedChannelKey,
            newVersion,
          },
        );
      }

      // Log key rotation in channel_key_rotations table
      await this.sqlService.query(
        `INSERT INTO channel_key_rotations (
          channel_id, old_key_version, new_key_version,
          rotated_by, rotation_reason, affected_participants,
          rotated_at, created_at, created_by
        )
        VALUES (
          @channelId, @oldVersion, @newVersion,
          @userId, @reason, @participantCount,
          GETUTCDATE(), GETUTCDATE(), @userId
        )`,
        {
          channelId,
          oldVersion: currentVersion,
          newVersion,
          userId,
          reason,
          participantCount: participants.length,
        },
      );

      // Log audit event
      await this.sqlService.query(
        `INSERT INTO audit_logs (
          tenant_id, user_id, entity_type, entity_id, action_type,
          old_values, new_values, created_at
        )
        SELECT 
          created_by_tenant_id, @userId, 'chat_channels', @channelId, 'KEY_ROTATION',
          JSON_QUERY('{"version": "' + @oldVersion + '"}'),
          JSON_QUERY('{"version": "' + @newVersion + '", "reason": "' + @reason + '"}'),
          GETUTCDATE()
        FROM chat_channels WHERE id = @channelId`,
        { userId, channelId, oldVersion: currentVersion, newVersion, reason },
      );

      await this.redisService.del(`user:*:channels:*`);

      return {
        message: 'Channel key rotated successfully',
        channelId,
        oldVersion: currentVersion,
        newVersion,
        participantsUpdated: participants.length,
        newChannelKey, // Return new key to owner for distribution
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Failed to rotate channel key:', error);
      throw new BadRequestException(
        `Failed to rotate channel key: ${error.message}`,
      );
    }
  }
}
