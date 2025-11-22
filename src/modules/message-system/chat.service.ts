// src/modules/message-system/chat.service.ts - COMPLETE SLACK-LIKE SERVICE
import { Injectable, Logger, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { RedisService } from 'src/core/redis/redis.service';
import { CreateChannelDto, SendMessageDto, UpdateChannelDto } from './dto/chat.dto';

export interface MessageResponse {
  id: number;
  channel_id: number;
  sender_user_id: number;
  sender_tenant_id: number;
  message_type: string;
  content: string;
  sent_at: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private sqlService: SqlServerService,
    private redisService: RedisService,
  ) {}

  // ==================== MESSAGES ====================

  async sendMessage(dto: SendMessageDto, userId: number, tenantId: number): Promise<MessageResponse> {
    const validation = await this.validateFromCache(dto.channelId, userId);
    if (!validation.isMember) throw new ForbiddenException('Not a channel member');

    const result = await this.sqlService.execute('sp_SendMessage_Fast', {
      channelId: dto.channelId, userId, tenantId,
      messageType: dto.messageType || 'text',
      content: dto.content,
      hasAttachments: dto.attachments && dto.attachments?.length > 0 ? 1 : 0,
      hasMentions: dto.mentions && dto.mentions ?.length > 0 ? 1 : 0,
      replyToMessageId: dto.replyToMessageId || null,
      threadId: dto.threadId || null,
    });

    const message = result[0] as MessageResponse;
    setImmediate(() => this.processMessageAsync(message.id, dto.channelId, userId, validation.participant_ids));
    return message;
  }

  async getMessages(channelId: number, userId: number, limit = 50, beforeId?: number) {
    const cacheKey = `msgs:${channelId}:${limit}:${beforeId || 'latest'}`;
    if (!beforeId) {
      try {
        const cached = await Promise.race([
          this.redisService.get(cacheKey),
          new Promise((_, r) => setTimeout(() => r('timeout'), 10))
        ]);
        if (cached) return JSON.parse(cached as string);
      } catch {}
    }

    const messages = await this.sqlService.execute('sp_GetMessages_Fast', {
      channelId, limit: Math.min(limit, 100), beforeId: beforeId || null,
    });

    if (!beforeId && messages.length > 0) {
      setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(messages), 30));
    }
    return messages;
  }

  async editMessage(messageId: number, content: string, userId: number) {
    const msg = await this.sqlService.query(
      `SELECT id, sender_user_id, channel_id FROM messages WHERE id = @messageId AND is_deleted = 0`,
      { messageId }
    );
    if (!msg.length) throw new NotFoundException('Message not found');
    if (msg[0].sender_user_id !== userId) throw new ForbiddenException('Can only edit your own messages');

    await this.sqlService.query(
      `UPDATE messages SET content = @content, is_edited = 1, edited_at = GETUTCDATE(), updated_at = GETUTCDATE() WHERE id = @messageId`,
      { messageId, content }
    );

    setImmediate(() => this.redisService.del(`msgs:${msg[0].channel_id}:*`));
    return { success: true, messageId };
  }

  async deleteMessage(messageId: number, userId: number) {
    const msg = await this.sqlService.query(
      `SELECT m.id, m.sender_user_id, m.channel_id, cp.role 
       FROM messages m
       JOIN chat_participants cp ON m.channel_id = cp.channel_id AND cp.user_id = @userId
       WHERE m.id = @messageId`,
      { messageId, userId }
    );
    if (!msg.length) throw new NotFoundException('Message not found');
    if (msg[0].sender_user_id !== userId && !['admin', 'owner'].includes(msg[0].role)) {
      throw new ForbiddenException('Cannot delete this message');
    }

    await this.sqlService.query(
      `UPDATE messages SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId WHERE id = @messageId`,
      { messageId, userId }
    );

    setImmediate(() => this.redisService.del(`msgs:${msg[0].channel_id}:*`));
    return { success: true };
  }

  async pinMessage(messageId: number, isPinned: boolean, userId: number) {
    const msg = await this.sqlService.query(
      `SELECT m.id, m.channel_id, cp.role FROM messages m
       JOIN chat_participants cp ON m.channel_id = cp.channel_id AND cp.user_id = @userId
       WHERE m.id = @messageId AND m.is_deleted = 0`,
      { messageId, userId }
    );
    if (!msg.length) throw new NotFoundException('Message not found');

    await this.sqlService.query(
      `UPDATE messages SET is_pinned = @isPinned, pinned_at = ${isPinned ? 'GETUTCDATE()' : 'NULL'}, pinned_by = ${isPinned ? '@userId' : 'NULL'} WHERE id = @messageId`,
      { messageId, isPinned: isPinned ? 1 : 0, userId }
    );
    return { success: true };
  }

  async getPinnedMessages(channelId: number, userId: number) {
    await this.validateMembership(channelId, userId);
    return this.sqlService.query(
      `SELECT m.*, u.first_name as sender_first_name, u.last_name as sender_last_name, u.avatar_url as sender_avatar_url
       FROM messages m JOIN users u ON m.sender_user_id = u.id
       WHERE m.channel_id = @channelId AND m.is_pinned = 1 AND m.is_deleted = 0
       ORDER BY m.pinned_at DESC`,
      { channelId }
    );
  }

  async forwardMessage(messageId: number, targetChannelIds: number[], userId: number, tenantId: number) {
    const original = await this.sqlService.query(
      `SELECT content, message_type FROM messages WHERE id = @messageId AND is_deleted = 0`,
      { messageId }
    );
    if (!original.length) throw new NotFoundException('Message not found');

    const results:any = [];
    for (const channelId of targetChannelIds) {
      const validation = await this.validateFromCache(channelId, userId);
      if (validation.isMember) {
        const msg = await this.sendMessage({
          channelId, content: original[0].content, messageType: original[0].message_type
        }, userId, tenantId);
        results.push({ channelId, messageId: msg.id, success: true });
      } else {
        results.push({ channelId, success: false, error: 'Not a member' });
      }
    }
    return { forwarded: results };
  }

  // ==================== THREADS ====================

  async getThreadMessages(parentMessageId: number, userId: number, limit = 50) {
    const parent = await this.sqlService.query(
      `SELECT m.channel_id FROM messages m
       JOIN chat_participants cp ON m.channel_id = cp.channel_id
       WHERE m.id = @parentMessageId AND cp.user_id = @userId AND cp.is_active = 1`,
      { parentMessageId, userId }
    );
    if (!parent.length) throw new ForbiddenException('Access denied');

    return this.sqlService.query(
      `SELECT m.*, u.first_name as sender_first_name, u.last_name as sender_last_name, u.avatar_url as sender_avatar_url
       FROM messages m JOIN users u ON m.sender_user_id = u.id
       WHERE (m.thread_id = @parentMessageId OR m.reply_to_message_id = @parentMessageId) AND m.is_deleted = 0
       ORDER BY m.sent_at ASC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`,
      { parentMessageId, limit }
    );
  }

  async replyInThread(parentMessageId: number, content: string, userId: number, tenantId: number) {
    const parent = await this.sqlService.query(
      `SELECT channel_id FROM messages WHERE id = @parentMessageId AND is_deleted = 0`,
      { parentMessageId }
    );
    if (!parent.length) throw new NotFoundException('Parent message not found');

    const msg = await this.sendMessage({
      channelId: parent[0].channel_id, content, messageType: 'text',
      replyToMessageId: parentMessageId, threadId: parentMessageId
    }, userId, tenantId);

    await this.sqlService.query(
      `UPDATE messages SET reply_count = ISNULL(reply_count, 0) + 1 WHERE id = @parentMessageId`,
      { parentMessageId }
    );
    return msg;
  }

  // ==================== REACTIONS ====================

  async addReaction(messageId: number, userId: number, tenantId: number, emoji: string) {
    const exists = await this.sqlService.query(
      `SELECT id FROM message_reactions WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
      { messageId, userId, emoji }
    );
    if (exists.length) return { success: true, action: 'already_exists' };

    await this.sqlService.query(
      `INSERT INTO message_reactions (message_id, user_id, tenant_id, emoji, created_at, created_by)
       VALUES (@messageId, @userId, @tenantId, @emoji, GETUTCDATE(), @userId)`,
      { messageId, userId, tenantId, emoji }
    );
    return { success: true, action: 'added' };
  }

  async removeReaction(messageId: number, userId: number, emoji: string) {
    await this.sqlService.query(
      `DELETE FROM message_reactions WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
      { messageId, userId, emoji }
    );
    return { success: true };
  }

  // ==================== CHANNELS ====================

  async getUserChannels(userId: number, limit = 50) {
    const cacheKey = `user:${userId}:channels`;
    try {
      const cached = await Promise.race([
        this.redisService.get(cacheKey),
        new Promise((_, r) => setTimeout(() => r('timeout'), 10))
      ]);
      if (cached) return JSON.parse(cached as string);
    } catch {}

    const channels = await this.sqlService.execute('sp_GetUserChannels_Fast', { userId, limit });
    setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(channels), 300));
    return channels;
  }

  async createChannel(dto: CreateChannelDto, userId: number, tenantId: number) {
    if (!dto.participantIds?.length) throw new BadRequestException('At least one participant required');

    const allParticipants = Array.from(new Set([userId, ...dto.participantIds]));
    const result = await this.sqlService.execute('sp_CreateChannel_Fast', {
      tenantId, userId, name: dto.name || 'New Channel',
      channelType: dto.channelType || 'group',
      participantIds: allParticipants.join(','),
      description: dto.description || null,
      isPrivate: dto.isPrivate ? 1 : 0,
      relatedType: dto.relatedType || null,
      relatedId: dto.relatedId || null,
    });

    setImmediate(() => allParticipants.forEach(id => this.redisService.del(`user:${id}:channels`)));
    return { id: result[0]?.channel_id, name: dto.name, channelType: dto.channelType, participants: allParticipants };
  }

  async getChannelById(channelId: number, userId: number) {
    await this.validateMembership(channelId, userId);
    const result = await this.sqlService.query(
      `SELECT c.*, cp.role, cp.is_muted, cp.is_pinned, cp.joined_at
       FROM chat_channels c
       JOIN chat_participants cp ON c.id = cp.channel_id
       WHERE c.id = @channelId AND cp.user_id = @userId AND cp.is_active = 1`,
      { channelId, userId }
    );
    if (!result.length) throw new NotFoundException('Channel not found');
    return result[0];
  }

  async updateChannel(channelId: number, dto: UpdateChannelDto, userId: number) {
    await this.validateAdminRole(channelId, userId);
    const updates: string[] = [], params: any = { channelId, userId };

    if (dto.name) { updates.push('name = @name'); params.name = dto.name; }
    if (dto.description !== undefined) { updates.push('description = @description'); params.description = dto.description; }
    if (dto.isPrivate !== undefined) { updates.push('is_private = @isPrivate'); params.isPrivate = dto.isPrivate ? 1 : 0; }

    if (updates.length === 0) throw new BadRequestException('No fields to update');
    updates.push('updated_at = GETUTCDATE()', 'updated_by = @userId');

    await this.sqlService.query(`UPDATE chat_channels SET ${updates.join(', ')} WHERE id = @channelId`, params);
    return this.getChannelById(channelId, userId);
  }

  async archiveChannel(channelId: number, userId: number) {
    await this.validateAdminRole(channelId, userId);
    await this.sqlService.query(
      `UPDATE chat_channels SET is_archived = 1, archived_at = GETUTCDATE(), archived_by = @userId WHERE id = @channelId`,
      { channelId, userId }
    );
    return { success: true, message: 'Channel archived' };
  }

  async unarchiveChannel(channelId: number, userId: number) {
    await this.validateAdminRole(channelId, userId);
    await this.sqlService.query(
      `UPDATE chat_channels SET is_archived = 0, archived_at = NULL, archived_by = NULL WHERE id = @channelId`,
      { channelId, userId }
    );
    return { success: true };
  }

  async leaveChannel(channelId: number, userId: number) {
    const participant = await this.sqlService.query(
      `SELECT role FROM chat_participants WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId }
    );
    if (!participant.length) throw new BadRequestException('Not a member');
    if (participant[0].role === 'owner') {
      const others = await this.sqlService.query(
        `SELECT user_id FROM chat_participants WHERE channel_id = @channelId AND user_id != @userId AND is_active = 1`,
        { channelId, userId }
      );
      if (others.length > 0) throw new BadRequestException('Transfer ownership before leaving');
    }

    await this.sqlService.query(
      `UPDATE chat_participants SET is_active = 0, left_at = GETUTCDATE() WHERE channel_id = @channelId AND user_id = @userId`,
      { channelId, userId }
    );
    await this.sqlService.query(`UPDATE chat_channels SET member_count = member_count - 1 WHERE id = @channelId`, { channelId });
    setImmediate(() => this.redisService.del(`user:${userId}:channels`));
    return { success: true };
  }

  async deleteChannel(channelId: number, userId: number) {
    await this.validateOwnerRole(channelId, userId);
    await this.sqlService.query(`UPDATE chat_channels SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId WHERE id = @channelId`, { channelId, userId });
    return { success: true };
  }

  async pinChannel(channelId: number, isPinned: boolean, userId: number) {
    await this.sqlService.query(
      `UPDATE chat_participants SET is_pinned = @isPinned WHERE channel_id = @channelId AND user_id = @userId`,
      { channelId, isPinned: isPinned ? 1 : 0, userId }
    );
    setImmediate(() => this.redisService.del(`user:${userId}:channels`));
    return { success: true };
  }

  async muteChannel(channelId: number, isMuted: boolean, muteUntil: string | undefined, userId: number) {
    await this.sqlService.query(
      `UPDATE chat_participants SET is_muted = @isMuted, mute_until = @muteUntil WHERE channel_id = @channelId AND user_id = @userId`,
      { channelId, isMuted: isMuted ? 1 : 0, muteUntil: muteUntil || null, userId }
    );
    return { success: true };
  }

  // ==================== MEMBERS ====================

  async getChannelMembers(channelId: number, userId: number) {
    await this.validateMembership(channelId, userId);
    return this.sqlService.query(
      `SELECT cp.user_id, cp.role, cp.joined_at, cp.is_muted,
              u.first_name, u.last_name, u.email, u.avatar_url, u.status, u.last_active_at
       FROM chat_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.channel_id = @channelId AND cp.is_active = 1
       ORDER BY CASE cp.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, u.first_name`,
      { channelId }
    );
  }

  async addMembers(channelId: number, userIds: number[], userId: number, tenantId: number) {
    await this.validateAdminRole(channelId, userId);
    const added:any = [];

    for (const uid of userIds) {
      const exists = await this.sqlService.query(
        `SELECT id, is_active FROM chat_participants WHERE channel_id = @channelId AND user_id = @uid`,
        { channelId, uid }
      );
      if (exists.length && exists[0].is_active) continue;
      if (exists.length) {
        await this.sqlService.query(`UPDATE chat_participants SET is_active = 1, joined_at = GETUTCDATE() WHERE channel_id = @channelId AND user_id = @uid`, { channelId, uid });
      } else {
        await this.sqlService.query(
          `INSERT INTO chat_participants (channel_id, user_id, tenant_id, role, is_active, joined_at, created_at, created_by)
           VALUES (@channelId, @uid, @tenantId, 'member', 1, GETUTCDATE(), GETUTCDATE(), @userId)`,
          { channelId, uid, tenantId, userId }
        );
      }
      added.push(uid);
      setImmediate(() => this.redisService.del(`user:${uid}:channels`));
    }

    if (added.length) {
      await this.sqlService.query(`UPDATE chat_channels SET member_count = member_count + @count WHERE id = @channelId`, { channelId, count: added.length });
    }
    return { success: true, addedMembers: added };
  }

  async removeMember(channelId: number, targetUserId: number, userId: number) {
    await this.validateAdminRole(channelId, userId);
    const target = await this.sqlService.query(
      `SELECT role FROM chat_participants WHERE channel_id = @channelId AND user_id = @targetUserId AND is_active = 1`,
      { channelId, targetUserId }
    );
    if (!target.length) throw new BadRequestException('User not in channel');
    if (target[0].role === 'owner') throw new ForbiddenException('Cannot remove owner');

    await this.sqlService.query(`UPDATE chat_participants SET is_active = 0, left_at = GETUTCDATE() WHERE channel_id = @channelId AND user_id = @targetUserId`, { channelId, targetUserId });
    await this.sqlService.query(`UPDATE chat_channels SET member_count = member_count - 1 WHERE id = @channelId`, { channelId });
    setImmediate(() => this.redisService.del(`user:${targetUserId}:channels`));
    return { success: true };
  }

  async updateMemberRole(channelId: number, targetUserId: number, role: string, userId: number) {
    await this.validateOwnerRole(channelId, userId);
    if (role === 'owner') {
      await this.sqlService.query(`UPDATE chat_participants SET role = 'admin' WHERE channel_id = @channelId AND user_id = @userId`, { channelId, userId });
    }
    await this.sqlService.query(`UPDATE chat_participants SET role = @role WHERE channel_id = @channelId AND user_id = @targetUserId`, { channelId, targetUserId, role });
    return { success: true };
  }

  async getAvailableMembersForChannel(channelId: number, tenantId: number, userId: number) {
    return this.sqlService.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.status
       FROM users u
       JOIN tenant_members tm ON u.id = tm.user_id
       WHERE tm.tenant_id = @tenantId AND tm.is_active = 1
       AND u.id NOT IN (SELECT user_id FROM chat_participants WHERE channel_id = @channelId AND is_active = 1)
       ORDER BY u.first_name`,
      { channelId, tenantId }
    );
  }

  // ==================== SEARCH ====================

  async search(query: string, userId: number, tenantId: number, opts: { channelId?: number; type: string; limit: number }) {
    const results: any = {};
    const searchTerm = `%${query}%`;

    if (opts.type === 'all' || opts.type === 'messages') {
      results.messages = await this.sqlService.query(
        `SELECT TOP (@limit) m.id, m.content, m.channel_id, m.sent_at, c.name as channel_name,
                u.first_name as sender_first_name, u.last_name as sender_last_name
         FROM messages m
         JOIN chat_channels c ON m.channel_id = c.id
         JOIN chat_participants cp ON c.id = cp.channel_id
         JOIN users u ON m.sender_user_id = u.id
         WHERE cp.user_id = @userId AND cp.is_active = 1 AND m.is_deleted = 0
         AND m.content LIKE @searchTerm ${opts.channelId ? 'AND m.channel_id = @channelId' : ''}
         ORDER BY m.sent_at DESC`,
        { userId, searchTerm, limit: opts.limit, channelId: opts.channelId }
      );
    }

    if (opts.type === 'all' || opts.type === 'channels') {
      results.channels = await this.sqlService.query(
        `SELECT TOP (@limit) c.id, c.name, c.description, c.channel_type, c.member_count
         FROM chat_channels c
         JOIN chat_participants cp ON c.id = cp.channel_id
         WHERE cp.user_id = @userId AND cp.is_active = 1 AND c.is_deleted = 0
         AND (c.name LIKE @searchTerm OR c.description LIKE @searchTerm)`,
        { userId, searchTerm, limit: opts.limit }
      );
    }

    if (opts.type === 'all' || opts.type === 'members') {
      results.members = await this.sqlService.query(
        `SELECT TOP (@limit) u.id, u.first_name, u.last_name, u.email, u.avatar_url
         FROM users u JOIN tenant_members tm ON u.id = tm.user_id
         WHERE tm.tenant_id = @tenantId AND tm.is_active = 1
         AND (u.first_name LIKE @searchTerm OR u.last_name LIKE @searchTerm OR u.email LIKE @searchTerm)`,
        { tenantId, searchTerm, limit: opts.limit }
      );
    }
    return results;
  }

  // ==================== TEAM ====================

  async getTeamMembers(tenantId: number, userId: number, search?: string) {
    const cacheKey = `team:${tenantId}:members`;
    if (!search) {
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached as string);
      } catch {}
    }

    let query = `SELECT u.id, u.email, u.first_name, u.last_name, u.display_name, u.avatar_url, u.status, u.last_active_at
                 FROM users u JOIN tenant_members tm ON u.id = tm.user_id
                 WHERE tm.tenant_id = @tenantId AND tm.is_active = 1`;
    const params: any = { tenantId };

    if (search) {
      query += ` AND (u.first_name LIKE @search OR u.last_name LIKE @search OR u.email LIKE @search)`;
      params.search = `%${search}%`;
    }
    query += ` ORDER BY u.first_name`;

    const members = await this.sqlService.query(query, params);
    if (!search) setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(members), 300));
    return members;
  }

  async createTeamCollaboration(dto: any, userId: number, tenantId: number) {
    const allParticipants = Array.from(new Set([userId, ...dto.memberIds]));
    if (allParticipants.length === 2) {
      const existing = await this.sqlService.query(
        `SELECT c.id, c.name FROM chat_channels c
         JOIN chat_participants cp1 ON c.id = cp1.channel_id AND cp1.user_id = @p1 AND cp1.is_active = 1
         JOIN chat_participants cp2 ON c.id = cp2.channel_id AND cp2.user_id = @p2 AND cp2.is_active = 1
         WHERE c.channel_type = 'direct' AND c.is_deleted = 0`,
        { p1: allParticipants[0], p2: allParticipants[1] }
      );
      if (existing.length) return { id: existing[0].id, name: existing[0].name, isExisting: true };
    }
    return this.createChannel({ name: dto.name, channelType: allParticipants.length === 2 ? 'direct' : 'group', participantIds: dto.memberIds }, userId, tenantId);
  }

  // ==================== PRESENCE ====================

  async setUserOnline(userId: number, tenantId: number) {
    await this.redisService.set(`presence:${tenantId}:${userId}`, 'online', 300);
    return { success: true };
  }

  async setUserOffline(userId: number, tenantId: number) {
    await this.redisService.del(`presence:${tenantId}:${userId}`);
    return { success: true };
  }

  async getOnlineUsers(tenantId: number) {
    const keys = await this.scanKeys(`presence:${tenantId}:*`);
    return keys.map(k => parseInt(k.split(':')[2])).filter(id => !isNaN(id));
  }

  // ==================== FILES ====================

  async getChannelFiles(channelId: number, userId: number, limit = 50) {
    await this.validateMembership(channelId, userId);
    return this.sqlService.query(
      `SELECT TOP (@limit) ma.id, ma.file_name, ma.file_size, ma.mime_type, ma.file_url, ma.created_at, m.sender_user_id, u.first_name, u.last_name
       FROM message_attachments ma
       JOIN messages m ON ma.message_id = m.id
       JOIN users u ON m.sender_user_id = u.id
       WHERE m.channel_id = @channelId AND m.is_deleted = 0
       ORDER BY ma.created_at DESC`,
      { channelId, limit }
    );
  }

  // ==================== READ STATUS ====================

  async markAsRead(channelId: number, messageId: number, userId: number) {
    setImmediate(async () => {
      try {
        await this.sqlService.execute('sp_MarkAsRead_Fast', { messageId, userId, channelId });
        await this.redisService.del(`user:${userId}:unread`);
      } catch {}
    });
    return { success: true };
  }

  async getUnreadCount(userId: number): Promise<number> {
    const cacheKey = `user:${userId}:unread`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return parseInt(cached as string);
    } catch {}

    const result = await this.sqlService.execute('sp_GetUnreadCount_Fast', { userId });
    const count = result[0]?.unread_count || 0;
    setImmediate(() => this.redisService.set(cacheKey, count.toString(), 30));
    return count;
  }

  // ==================== PRIVATE HELPERS ====================

  private async validateFromCache(channelId: number, userId: number) {
    const cacheKey = `validate:${channelId}:${userId}`;
    try {
      const cached = await Promise.race([this.redisService.get(cacheKey), new Promise((_, r) => setTimeout(() => r('timeout'), 10))]);
      if (cached) return JSON.parse(cached as string);
    } catch {}

    const result = await this.sqlService.execute('sp_ValidateMessageSend_Fast', { channelId, userId });
    const validation = { isMember: result[0]?.isMember === 1, participant_ids: result[0]?.participant_ids || '' };
    setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(validation), 60));
    return validation;
  }

  private async validateMembership(channelId: number, userId: number) {
    const result = await this.sqlService.query(
      `SELECT 1 FROM chat_participants WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId }
    );
    if (!result.length) throw new ForbiddenException('Not a channel member');
  }

  private async validateAdminRole(channelId: number, userId: number) {
    const result = await this.sqlService.query(
      `SELECT role FROM chat_participants WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId }
    );
    if (!result.length) throw new ForbiddenException('Not a channel member');
    if (!['admin', 'owner'].includes(result[0].role)) throw new ForbiddenException('Admin access required');
  }

  private async validateOwnerRole(channelId: number, userId: number) {
    const result = await this.sqlService.query(
      `SELECT role FROM chat_participants WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId }
    );
    if (!result.length) throw new ForbiddenException('Not a channel member');
    if (result[0].role !== 'owner') throw new ForbiddenException('Owner access required');
  }

  private async processMessageAsync(messageId: number, channelId: number, senderId: number, participantIdsStr: string) {
    try {
      const participantIds = participantIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id !== senderId);
      await Promise.allSettled([
        this.sqlService.execute('sp_CreateReadReceiptsBulk_Fast', { messageId, channelId, senderId }),
        this.invalidateCaches(channelId, participantIds),
      ]);
    } catch (err) {
      this.logger.error(`Async processing error: ${err.message}`);
    }
  }

  private async invalidateCaches(channelId: number, participantIds: number[]) {
    const patterns = [
      `validate:${channelId}:*`, `msgs:${channelId}:*`,
      ...participantIds.slice(0, 10).map(id => `user:${id}:unread`),
      ...participantIds.slice(0, 10).map(id => `user:${id}:channels`),
    ];
    await Promise.allSettled(patterns.map(p => this.redisService.del(p)));
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    try {
      const client = this.redisService.getClient();
      if (!client) return [];
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [newCursor, foundKeys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');
      return keys;
    } catch { return []; }
  }
}