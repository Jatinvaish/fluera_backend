// ============================================
// modules/chat/chat.service.ts
// ============================================
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
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
  MessageType
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(private sqlService: SqlServerService) { }

  // ==================== CHANNELS ====================

  async createChannel(dto: CreateChannelDto, userId: bigint, organizationId: bigint) {
    // Create channel
    const result = await this.sqlService.query(
      `INSERT INTO chat_channels (organization_id, name, description, channel_type, 
                                   related_type, related_id, is_private, member_count,
                                   created_by, last_activity_at)
       OUTPUT INSERTED.*
       VALUES (@organizationId, @name, @description, @channelType, 
               @relatedType, @relatedId, @isPrivate, 1, @userId, GETUTCDATE())`,
      {
        organizationId,
        name: dto.name,
        description: dto.description || null,
        channelType: dto.channelType,
        relatedType: dto.relatedType || null,
        relatedId: dto.relatedId ? BigInt(dto.relatedId) : null,
        isPrivate: dto.isPrivate || false,
        userId
      }
    );

    const channel = result[0];

    // Add creator as owner
    await this.addChannelMember(
      BigInt(channel.id),
      userId,
      userId,
      MemberRole.OWNER
    );

    // Add additional members if provided
    if (dto.memberIds && dto.memberIds.length > 0) {
      for (const memberId of dto.memberIds) {
        if (BigInt(memberId) !== userId) {
          await this.addChannelMember(
            BigInt(channel.id),
            BigInt(memberId),
            userId,
            MemberRole.MEMBER
          );
        }
      }
    }

    return this.getChannelById(BigInt(channel.id), userId);
  }

  async getChannelById(channelId: bigint, userId: bigint) {
    // Check if user is member
    const membership = await this.sqlService.query(
      `SELECT * FROM chat_channel_members 
       WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId }
    );

    if (membership.length === 0) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    const result = await this.sqlService.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM chat_channel_members WHERE channel_id = c.id AND is_active = 1) as member_count,
              (SELECT COUNT(*) FROM messages WHERE channel_id = c.id AND is_deleted = 0) as message_count,
              ccm.role as user_role,
              ccm.is_muted as is_muted,
              ccm.last_read_message_id,
              ccm.last_read_at
       FROM chat_channels c
       LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = @userId
       WHERE c.id = @channelId`,
      { channelId, userId }
    );

    if (result.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    return result[0];
  }

  async getUserChannels(userId: bigint, organizationId: bigint, dto: GetChannelsDto) {
    let query = `
      SELECT c.*, 
             ccm.role as user_role,
             ccm.last_read_message_id,
             ccm.last_read_at,
             ccm.is_muted,
             (SELECT COUNT(*) FROM messages m 
              WHERE m.channel_id = c.id 
              AND m.is_deleted = 0 
              AND (ccm.last_read_message_id IS NULL OR m.id > ccm.last_read_message_id)) as unread_count,
             (SELECT TOP 1 content FROM messages 
              WHERE channel_id = c.id AND is_deleted = 0 
              ORDER BY sent_at DESC) as last_message_preview,
             (SELECT TOP 1 sent_at FROM messages 
              WHERE channel_id = c.id AND is_deleted = 0 
              ORDER BY sent_at DESC) as last_message_at
      FROM chat_channels c
      INNER JOIN chat_channel_members ccm ON c.id = ccm.channel_id
      WHERE ccm.user_id = @userId 
      AND ccm.is_active = 1
      AND c.organization_id = @organizationId
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

    return this.sqlService.query(query, params);
  }

  async updateChannel(channelId: bigint, dto: UpdateChannelDto, userId: bigint) {
    // Check if user is admin/owner
    await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER, MemberRole.ADMIN]);

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
        userId
      }
    );

    if (result.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    return result[0];
  }

  async archiveChannel(channelId: bigint, isArchived: boolean, userId: bigint) {
    await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER, MemberRole.ADMIN]);

    await this.sqlService.query(
      `UPDATE chat_channels 
       SET is_archived = @isArchived, updated_by = @userId, updated_at = GETUTCDATE()
       WHERE id = @channelId`,
      { channelId, isArchived, userId }
    );

    return { message: isArchived ? 'Channel archived' : 'Channel unarchived' };
  }

  async deleteChannel(channelId: bigint, userId: bigint) {
    await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER]);

    // Soft delete by archiving
    await this.sqlService.query(
      `UPDATE chat_channels 
       SET is_archived = 1, updated_by = @userId, updated_at = GETUTCDATE()
       WHERE id = @channelId`,
      { channelId, userId }
    );

    return { message: 'Channel deleted successfully' };
  }

  // ==================== CHANNEL MEMBERS ====================

  async addChannelMembers(channelId: bigint, dto: AddChannelMembersDto, userId: bigint) {
    await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const addedMembers:any = [];

    for (const memberId of dto.userIds) {
      try {
        const member:any = await this.addChannelMember(
          channelId,
          BigInt(memberId),
          userId,
          dto.role || MemberRole.MEMBER
        );
        addedMembers.push(member);
      } catch (error) {
        console.log(`Failed to add member ${memberId}:`, error.message);
      }
    }

    // Update member count
    await this.updateChannelMemberCount(channelId);

    return {
      message: 'Members added successfully',
      added: addedMembers.length,
      total: dto.userIds.length,
      members: addedMembers
    };
  }

  async addChannelMember(channelId: bigint, memberId: bigint, addedBy: bigint, role: MemberRole = MemberRole.MEMBER) {
    const result = await this.sqlService.query(
      `INSERT INTO chat_channel_members (channel_id, user_id, role, is_active, joined_at, created_by)
       OUTPUT INSERTED.*
       VALUES (@channelId, @memberId, @role, 1, GETUTCDATE(), @addedBy)`,
      { channelId, memberId, role, addedBy }
    );

    return result[0];
  }

  async removeChannelMember(channelId: bigint, memberId: bigint, removedBy: bigint) {
    // Check permission (owner/admin can remove, or user can remove themselves)
    if (removedBy !== memberId) {
      await this.checkChannelPermission(channelId, removedBy, [MemberRole.OWNER, MemberRole.ADMIN]);
    }

    await this.sqlService.query(
      `UPDATE chat_channel_members 
       SET is_active = 0, left_at = GETUTCDATE(), updated_by = @removedBy
       WHERE channel_id = @channelId AND user_id = @memberId`,
      { channelId, memberId, removedBy }
    );

    await this.updateChannelMemberCount(channelId);

    return { message: 'Member removed successfully' };
  }

  async getChannelMembers(channelId: bigint, userId: bigint) {
    // Check if user is member
    await this.checkChannelMembership(channelId, userId);

    return this.sqlService.query(
      `SELECT ccm.*, 
              u.first_name, u.last_name, u.email, u.avatar_url, u.status,
              u.last_active_at
       FROM chat_channel_members ccm
       INNER JOIN users u ON ccm.user_id = u.id
       WHERE ccm.channel_id = @channelId AND ccm.is_active = 1
       ORDER BY ccm.role DESC, u.first_name`,
      { channelId }
    );
  }

  async updateMemberRole(channelId: bigint, dto: UpdateMemberRoleDto, updatedBy: bigint) {
    await this.checkChannelPermission(channelId, updatedBy, [MemberRole.OWNER]);

    await this.sqlService.query(
      `UPDATE chat_channel_members 
       SET role = @role, updated_by = @updatedBy, updated_at = GETUTCDATE()
       WHERE channel_id = @channelId AND user_id = @userId`,
      { channelId, userId: BigInt(dto.userId), role: dto.role, updatedBy }
    );

    return { message: 'Member role updated successfully' };
  }

  async updateMemberNotification(channelId: bigint, dto: UpdateMemberNotificationDto, userId: bigint) {
    await this.sqlService.query(
      `UPDATE chat_channel_members 
       SET is_muted = COALESCE(@isMuted, is_muted),
           notification_settings = COALESCE(@notificationSettings, notification_settings),
           updated_by = @userId,
           updated_at = GETUTCDATE()
       WHERE channel_id = @channelId AND user_id = @userId`,
      {
        channelId,
        userId,
        isMuted: dto.isMuted,
        notificationSettings: dto.notificationSettings ? JSON.stringify(dto.notificationSettings) : null
      }
    );

    return { message: 'Notification settings updated' };
  }

  // ==================== MESSAGES ====================

  async sendMessage(dto: SendMessageDto, userId: bigint, organizationId: bigint) {
    // Check if user is member
    await this.checkChannelMembership(BigInt(dto.channelId), userId);

    // Create message
    const result = await this.sqlService.query(
      `INSERT INTO messages (organization_id, channel_id, sender_id, message_type, 
                             content, formatted_content, reply_to_message_id, thread_id,
                             attachments, mentions, sent_at, created_by)
       OUTPUT INSERTED.*
       VALUES (@organizationId, @channelId, @userId, @messageType, 
               @content, @formattedContent, @replyToMessageId, @threadId,
               @attachments, @mentions, GETUTCDATE(), @userId)`,
      {
        organizationId,
        channelId: BigInt(dto.channelId),
        userId,
        messageType: dto.messageType || 'text',
        content: dto.content,
        formattedContent: dto.formattedContent || null,
        replyToMessageId: dto.replyToMessageId ? BigInt(dto.replyToMessageId) : null,
        threadId: dto.threadId ? BigInt(dto.threadId) : null,
        attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
        mentions: dto.mentions ? JSON.stringify(dto.mentions) : null
      }
    );

    // Update channel activity
    await this.sqlService.query(
      `UPDATE chat_channels 
       SET message_count = message_count + 1, 
           last_message_at = GETUTCDATE(),
           last_activity_at = GETUTCDATE()
       WHERE id = @channelId`,
      { channelId: BigInt(dto.channelId) }
    );

    return result[0];
  }

  async getMessages(channelId: bigint, userId: bigint, dto: GetMessagesDto) {
    // Check membership
    await this.checkChannelMembership(channelId, userId);

    let query = `
      SELECT m.*,
             u.first_name as sender_first_name,
             u.last_name as sender_last_name,
             u.avatar_url as sender_avatar_url,
             (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count,
             (SELECT COUNT(*) FROM messages WHERE reply_to_message_id = m.id) as reply_count
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.channel_id = @channelId
    `;

    const params: any = { channelId };

    if (!dto.includeDeleted) {
      query += ` AND m.is_deleted = 0`;
    }

    if (dto.beforeMessageId) {
      query += ` AND m.id < @beforeMessageId`;
      params.beforeMessageId = BigInt(dto.beforeMessageId);
    }

    if (dto.afterMessageId) {
      query += ` AND m.id > @afterMessageId`;
      params.afterMessageId = BigInt(dto.afterMessageId);
    }

    query += ` ORDER BY m.sent_at DESC`;
    query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    params.limit = dto.limit || 50;
    params.offset = dto.offset || 0;

    return this.sqlService.query(query, params);
  }

  async editMessage(messageId: bigint, dto: EditMessageDto, userId: bigint) {
    // Check if user is message sender
    const message = await this.sqlService.query(
      `SELECT * FROM messages WHERE id = @messageId AND sender_id = @userId`,
      { messageId, userId }
    );

    if (message.length === 0) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const result = await this.sqlService.query(
      `UPDATE messages 
       SET content = @content,
           formatted_content = @formattedContent,
           is_edited = 1,
           edited_at = GETUTCDATE(),
           updated_by = @userId
       OUTPUT INSERTED.*
       WHERE id = @messageId`,
      {
        messageId,
        content: dto.content,
        formattedContent: dto.formattedContent || null,
        userId
      }
    );

    return result[0];
  }

  async deleteMessage(messageId: bigint, userId: bigint, hardDelete: boolean = false) {
    const message = await this.sqlService.query(
      `SELECT * FROM messages WHERE id = @messageId`,
      { messageId }
    );

    if (message.length === 0) {
      throw new NotFoundException('Message not found');
    }

    // Check permission (sender can delete, or channel admin/owner)
    if (message[0].sender_id !== userId) {
      await this.checkChannelPermission(
        message[0].channel_id,
        userId,
        [MemberRole.OWNER, MemberRole.ADMIN]
      );
    }

    if (hardDelete) {
      await this.sqlService.query(
        `DELETE FROM messages WHERE id = @messageId`,
        { messageId }
      );
    } else {
      await this.sqlService.query(
        `UPDATE messages 
         SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId
         WHERE id = @messageId`,
        { messageId, userId }
      );
    }

    return { message: 'Message deleted successfully' };
  }

  async reactToMessage(messageId: bigint, emoji: string, userId: bigint, organizationId: bigint) {
    // Check if reaction exists
    const existing = await this.sqlService.query(
      `SELECT * FROM message_reactions 
       WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
      { messageId, userId, emoji }
    );

    if (existing.length > 0) {
      // Remove reaction
      await this.sqlService.query(
        `DELETE FROM message_reactions 
         WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
        { messageId, userId, emoji }
      );
      return { message: 'Reaction removed', action: 'removed' };
    } else {
      // Add reaction
      await this.sqlService.query(
        `INSERT INTO message_reactions (message_id, organization_id, user_id, emoji, created_by)
         VALUES (@messageId, @organizationId, @userId, @emoji, @userId)`,
        { messageId, organizationId, userId, emoji }
      );
      return { message: 'Reaction added', action: 'added' };
    }
  }

  async pinMessage(messageId: bigint, isPinned: boolean, userId: bigint) {
    const message = await this.sqlService.query(
      `SELECT channel_id FROM messages WHERE id = @messageId`,
      { messageId }
    );

    if (message.length === 0) {
      throw new NotFoundException('Message not found');
    }

    // Check permission
    await this.checkChannelPermission(
      message[0].channel_id,
      userId,
      [MemberRole.OWNER, MemberRole.ADMIN]
    );

    await this.sqlService.query(
      `UPDATE messages 
       SET is_pinned = @isPinned,
           pinned_at = ${isPinned ? 'GETUTCDATE()' : 'NULL'},
           pinned_by = ${isPinned ? '@userId' : 'NULL'}
       WHERE id = @messageId`,
      { messageId, isPinned, userId }
    );

    return { message: isPinned ? 'Message pinned' : 'Message unpinned' };
  }

  // ==================== SEARCH ====================

  async searchMessages(userId: bigint, organizationId: bigint, dto: SearchMessagesDto) {
    let query = `
      SELECT m.*,
             u.first_name as sender_first_name,
             u.last_name as sender_last_name,
             c.name as channel_name
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      INNER JOIN chat_channels c ON m.channel_id = c.id
      INNER JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = @userId
      WHERE m.organization_id = @organizationId
      AND m.is_deleted = 0
      AND ccm.is_active = 1
      AND m.content LIKE @query
    `;

    const params: any = {
      userId,
      organizationId,
      query: `%${dto.query}%`
    };

    if (dto.channelId) {
      query += ` AND m.channel_id = @channelId`;
      params.channelId = BigInt(dto.channelId);
    }

    if (dto.userId) {
      query += ` AND m.sender_id = @senderId`;
      params.senderId = BigInt(dto.userId);
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

    return this.sqlService.query(query, params);
  }

  // ==================== DIRECT MESSAGES ====================

  async createDirectMessage(dto: CreateDirectMessageDto, userId: bigint, organizationId: bigint) {
    // Check if DM channel already exists
    let channel = await this.sqlService.query(
      `SELECT c.* FROM chat_channels c
       INNER JOIN chat_channel_members ccm1 ON c.id = ccm1.channel_id AND ccm1.user_id = @userId
       INNER JOIN chat_channel_members ccm2 ON c.id = ccm2.channel_id AND ccm2.user_id = @recipientId
       WHERE c.channel_type = 'direct' 
       AND c.organization_id = @organizationId
       AND (SELECT COUNT(*) FROM chat_channel_members WHERE channel_id = c.id AND is_active = 1) = 2`,
      { userId, recipientId: BigInt(dto.recipientUserId), organizationId }
    );

    let channelId: bigint;

    if (channel.length === 0) {
      // Create new DM channel
      const newChannel = await this.sqlService.query(
        `INSERT INTO chat_channels (organization_id, name, channel_type, is_private, created_by)
         OUTPUT INSERTED.*
         VALUES (@organizationId, 'Direct Message', 'direct', 1, @userId)`,
        { organizationId, userId }
      );

      channelId = newChannel[0].id;

      // Add both users as members
      await this.addChannelMember(channelId, userId, userId, MemberRole.MEMBER);
      await this.addChannelMember(channelId, BigInt(dto.recipientUserId), userId, MemberRole.MEMBER);
    } else {
      channelId = channel[0].id;
    }

    // Send message
    return this.sendMessage(
      {
        channelId: Number(channelId),
        content: dto.content,
        attachments: dto.attachments,
        messageType: MessageType.TEXT
      },
      userId,
      organizationId
    );
  }

  // ==================== MARK AS READ ====================

  async markAsRead(dto: MarkAsReadDto, userId: bigint) {
    const messageId = dto.messageId 
      ? BigInt(dto.messageId)
      : await this.getLastMessageId(BigInt(dto.channelId));

    if (!messageId) {
      return { message: 'No messages to mark as read' };
    }

    await this.sqlService.query(
      `UPDATE chat_channel_members 
       SET last_read_message_id = @messageId,
           last_read_at = GETUTCDATE(),
           updated_by = @userId
       WHERE channel_id = @channelId AND user_id = @userId`,
      { channelId: BigInt(dto.channelId), messageId, userId }
    );

    return { message: 'Marked as read' };
  }

  async getUnreadCount(userId: bigint, organizationId: bigint) {
    const result = await this.sqlService.query(
      `SELECT 
         COUNT(*) as total_unread,
         COUNT(DISTINCT m.channel_id) as unread_channels
       FROM messages m
       INNER JOIN chat_channels c ON m.channel_id = c.id
       INNER JOIN chat_channel_members ccm ON c.id = ccm.channel_id
       WHERE ccm.user_id = @userId
       AND ccm.is_active = 1
       AND c.organization_id = @organizationId
       AND m.is_deleted = 0
       AND m.sender_id != @userId
       AND (ccm.last_read_message_id IS NULL OR m.id > ccm.last_read_message_id)`,
      { userId, organizationId }
    );

    return result[0];
  }

  // ==================== THREADS ====================

  async getThreadMessages(threadId: bigint, userId: bigint, limit: number = 50, offset: number = 0) {
    // Check if user has access to parent message's channel
    const parentMessage = await this.sqlService.query(
      `SELECT channel_id FROM messages WHERE id = @threadId`,
      { threadId }
    );

    if (parentMessage.length === 0) {
      throw new NotFoundException('Thread not found');
    }

    await this.checkChannelMembership(parentMessage[0].channel_id, userId);

    return this.sqlService.query(
      `SELECT m.*,
              u.first_name as sender_first_name,
              u.last_name as sender_last_name,
              u.avatar_url as sender_avatar_url,
              (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       WHERE (m.thread_id = @threadId OR m.id = @threadId)
       AND m.is_deleted = 0
       ORDER BY m.sent_at ASC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { threadId, limit, offset }
    );
  }

  // ==================== FILE ATTACHMENTS ====================

  async getChannelFiles(channelId: bigint, userId: bigint, limit: number = 50, offset: number = 0) {
    await this.checkChannelMembership(channelId, userId);

    return this.sqlService.query(
      `SELECT ma.*, m.sent_at, m.sender_id,
              u.first_name as sender_first_name,
              u.last_name as sender_last_name
       FROM message_attachments ma
       INNER JOIN messages m ON ma.message_id = m.id
       INNER JOIN users u ON m.sender_id = u.id
       WHERE m.channel_id = @channelId
       AND m.is_deleted = 0
       AND ma.is_deleted = 0
       ORDER BY ma.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { channelId, limit, offset }
    );
  }

  // ==================== HELPER METHODS ====================

  async checkChannelMembership(channelId: bigint, userId: bigint) {
    const result = await this.sqlService.query(
      `SELECT * FROM chat_channel_members 
       WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId }
    );

    if (result.length === 0) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    return result[0];
  }

  async checkChannelPermission(channelId: bigint, userId: bigint, allowedRoles: MemberRole[]) {
    const member = await this.checkChannelMembership(channelId, userId);

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return member;
  }

  async updateChannelMemberCount(channelId: bigint) {
    await this.sqlService.query(
      `UPDATE chat_channels 
       SET member_count = (SELECT COUNT(*) FROM chat_channel_members 
                           WHERE channel_id = @channelId AND is_active = 1)
       WHERE id = @channelId`,
      { channelId }
    );
  }

  async getLastMessageId(channelId: bigint): Promise<bigint | null> {
    const result = await this.sqlService.query(
      `SELECT TOP 1 id FROM messages 
       WHERE channel_id = @channelId AND is_deleted = 0 
       ORDER BY sent_at DESC`,
      { channelId }
    );

    return result.length > 0 ? result[0].id : null;
  }

  // ==================== PINNED MESSAGES ====================

  async getPinnedMessages(channelId: bigint, userId: bigint) {
    await this.checkChannelMembership(channelId, userId);

    return this.sqlService.query(
      `SELECT m.*,
              u.first_name as sender_first_name,
              u.last_name as sender_last_name,
              u.avatar_url as sender_avatar_url,
              pinner.first_name as pinned_by_first_name,
              pinner.last_name as pinned_by_last_name
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       LEFT JOIN users pinner ON m.pinned_by = pinner.id
       WHERE m.channel_id = @channelId
       AND m.is_pinned = 1
       AND m.is_deleted = 0
       ORDER BY m.pinned_at DESC`,
      { channelId }
    );
  }

  // ==================== MESSAGE REACTIONS ====================

  async getMessageReactions(messageId: bigint, userId: bigint) {
    const message = await this.sqlService.query(
      `SELECT channel_id FROM messages WHERE id = @messageId`,
      { messageId }
    );

    if (message.length === 0) {
      throw new NotFoundException('Message not found');
    }

    await this.checkChannelMembership(message[0].channel_id, userId);

    return this.sqlService.query(
      `SELECT mr.emoji, 
              COUNT(*) as count,
              STRING_AGG(CAST(u.first_name + ' ' + u.last_name AS NVARCHAR(MAX)), ', ') as users
       FROM message_reactions mr
       INNER JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = @messageId
       GROUP BY mr.emoji
       ORDER BY COUNT(*) DESC`,
      { messageId }
    );
  }
}