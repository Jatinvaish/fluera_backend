// ============================================
// src/modules/message-system/chat.service.ts
// OPTIMIZED FOR 30MS DELIVERY
// ============================================
import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { RedisService } from 'src/core/redis/redis.service';
import { CreateChannelDto, SendMessageDto } from './dto/chat.dto';

export interface MessageResponse {
  id: number;
  channel_id: number;
  sender_user_id: number;
  sender_tenant_id: number;
  message_type: string;
  sent_at: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private sqlService: SqlServerService,
    private redisService: RedisService,
  ) { }

  /**
   * ✅ SEND MESSAGE - Target: <30ms
   */
  async sendMessage(dto: SendMessageDto, userId: number, tenantId: number): Promise<MessageResponse> {
    // Validate membership from cache
    const validation = await this.validateFromCache(dto.channelId, userId);
    if (!validation.isMember) {
      throw new ForbiddenException('Not a channel member');
    }

    // Send message - single DB call
    const result = await this.sqlService.execute('sp_SendMessage_Fast', {
      channelId: dto.channelId,
      userId,
      tenantId,
      messageType: dto.messageType || 'text',
      content: dto.content,
      hasAttachments: dto.attachments && dto.attachments?.length > 0 ? 1 : 0,
      hasMentions: dto.mentions && dto.mentions?.length > 0 ? 1 : 0,
      replyToMessageId: dto.replyToMessageId || null,
      threadId: dto.threadId || null,
    });

    const message = result[0] as MessageResponse;

    // Fire-and-forget async tasks (don't block response)
    setImmediate(() => {
      this.processMessageAsync(message.id, dto.channelId, userId, validation.participant_ids);
    });

    return message;
  }

  /**
   * ✅ GET MESSAGES - Target: <30ms (cached), <100ms (DB)
   */
  async getMessages(channelId: number, userId: number, limit: number = 50, beforeId?: number) {
    const cacheKey = `msgs:${channelId}:${limit}:${beforeId || 'latest'}`;

    // Try cache (10ms timeout)
    if (!beforeId) {
      try {
        const cached = await Promise.race([
          this.redisService.get(cacheKey),
          new Promise((_, reject) => setTimeout(() => reject('timeout'), 10))
        ]);
        if (cached) return JSON.parse(cached as string);
      } catch { }
    }

    // Fetch from DB
    const messages = await this.sqlService.execute('sp_GetMessages_Fast', {
      channelId,
      limit: Math.min(limit, 100),
      beforeId: beforeId || null,
    });

    // Cache async
    if (!beforeId && messages.length > 0) {
      setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(messages), 30));
    }

    return messages;
  }

  /**
   * ✅ GET USER CHANNELS - Target: <20ms (cached)
   */
  async getUserChannels(userId: number, limit: number = 50) {
    const cacheKey = `user:${userId}:channels`;

    // Try cache
    try {
      const cached = await Promise.race([
        this.redisService.get(cacheKey),
        new Promise((_, reject) => setTimeout(() => reject('timeout'), 10))
      ]);
      if (cached) return JSON.parse(cached as string);
    } catch { }

    // Fetch from DB
    const channels = await this.sqlService.execute('sp_GetUserChannels_Fast', { userId, limit });

    // Cache async
    setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(channels), 300));

    return channels;
  }

  /**
   * ✅ CREATE CHANNEL - Target: <200ms
   */
  async createChannel(dto: CreateChannelDto, userId: number, tenantId: number) {
    if (!dto.participantIds?.length) {
      throw new BadRequestException('At least one participant required');
    }

    const allParticipants = Array.from(new Set([userId, ...dto.participantIds]));
    const result = await this.sqlService.execute('sp_CreateChannel_Fast', {
      tenantId,
      userId,
      name: dto.name || 'New Channel',
      channelType: dto.channelType || 'group',
      participantIds: allParticipants.join(','),
      relatedType: dto.relatedType || null,
      relatedId: dto.relatedId || null,
    });

    const channelId = result[0]?.channel_id;

    // Invalidate cache async
    setImmediate(() => {
      allParticipants.forEach(id =>
        this.redisService.del(`user:${id}:channels`)
      );
    });

    return {
      id: channelId,
      name: dto.name,
      channelType: dto.channelType,
      participants: allParticipants,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * ✅ GET CHANNEL BY ID
   */
  async getChannelById(channelId: number, userId: number) {
    const validation = await this.validateFromCache(channelId, userId);
    if (!validation.isMember) {
      throw new ForbiddenException('Not a channel member');
    }

    const result = await this.sqlService.query(
      `SELECT c.id, c.name, c.channel_type, c.description, c.member_count, 
              c.message_count, c.last_message_at, c.created_at, cp.role, cp.is_muted
       FROM chat_channels c
       INNER JOIN chat_participants cp ON c.id = cp.channel_id
       WHERE c.id = @channelId AND cp.user_id = @userId AND cp.is_active = 1`,
      { channelId, userId }
    );

    if (!result.length) throw new BadRequestException('Channel not found');
    return result[0];
  }

  /**
   * ✅ MARK AS READ - Fire and forget
   */
  async markAsRead(channelId: number, messageId: number, userId: number) {
    setImmediate(async () => {
      try {
        await this.sqlService.execute('sp_MarkAsRead_Fast', { messageId, userId, channelId });
        await this.redisService.del(`user:${userId}:unread`);
      } catch { }
    });
    return { success: true };
  }

  /**
   * ✅ GET UNREAD COUNT - Target: <15ms
   */
  async getUnreadCount(userId: number): Promise<number> {
    const cacheKey = `user:${userId}:unread`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return parseInt(cached as string);
    } catch { }

    const result = await this.sqlService.execute('sp_GetUnreadCount_Fast', { userId });
    const count = result[0]?.unread_count || 0;

    setImmediate(() => this.redisService.set(cacheKey, count.toString(), 30));
    return count;
  }

  /**
   * ✅ ADD REACTION - Target: <50ms
   */
  async addReaction(messageId: number, userId: number, tenantId: number, emoji: string) {
    await this.sqlService.query(
      `INSERT INTO message_reactions (message_id, user_id, tenant_id, emoji, created_at, created_by)
       VALUES (@messageId, @userId, @tenantId, @emoji, GETUTCDATE(), @userId)`,
      { messageId, userId, tenantId, emoji }
    );

    // Invalidate message cache async
    setImmediate(async () => {
      const msg = await this.sqlService.query(
        `SELECT channel_id FROM messages WHERE id = @messageId`,
        { messageId }
      );
      if (msg.length) {
        this.redisService.del(`msgs:${msg[0].channel_id}:*`);
      }
    });

    return { success: true };
  }

  /**
   * ✅ REMOVE REACTION
   */
  async removeReaction(messageId: number, userId: number, emoji: string) {
    await this.sqlService.query(
      `DELETE FROM message_reactions 
       WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
      { messageId, userId, emoji }
    );

    return { success: true };
  }

  /**
   * ✅ GET TEAM MEMBERS - For mentions
   */
  async getTeamMembers(tenantId: number, userId: number) {
    const cacheKey = `team:${tenantId}:members`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached as string);
    } catch { }

    const members = await this.sqlService.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.display_name, 
              u.avatar_url, u.status, u.last_active_at
       FROM users u
       INNER JOIN tenant_members tm ON u.id = tm.user_id
       WHERE tm.tenant_id = @tenantId  
       ORDER BY u.first_name, u.last_name`,
      { tenantId }
    );

    setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(members), 300));
    return members;
  }

  /**
   * ✅ CREATE TEAM COLLABORATION (DM or Group)
   */
  async createTeamCollaboration(dto: any, userId: number, tenantId: number) {
    const allParticipants = Array.from(new Set([userId, ...dto.memberIds]));

    // For DM, check if exists
    if (allParticipants.length === 2) {
      const existing = await this.sqlService.query(
        `SELECT c.id, c.name FROM chat_channels c
         WHERE c.channel_type = 'direct' AND c.created_by_tenant_id = @tenantId
         AND c.participant_tenant_ids LIKE '%' + CAST(@p1 AS VARCHAR) + '%'
         AND c.participant_tenant_ids LIKE '%' + CAST(@p2 AS VARCHAR) + '%'`,
        { tenantId, p1: allParticipants[0], p2: allParticipants[1] }
      );
      if (existing.length) {
        return { id: existing[0].id, name: existing[0].name, isExisting: true };
      }
    }

    // Create new channel
    return this.createChannel(
      {
        name: dto.name,
        channelType: allParticipants.length === 2 ? 'direct' : 'group',
        participantIds: dto.memberIds,
      },
      userId,
      tenantId
    );
  }

  // ==================== PRIVATE HELPERS ====================

  private async validateFromCache(channelId: number, userId: number) {
    const cacheKey = `validate:${channelId}:${userId}`;

    try {
      const cached = await Promise.race([
        this.redisService.get(cacheKey),
        new Promise((_, reject) => setTimeout(() => reject('timeout'), 10))
      ]);
      if (cached) return JSON.parse(cached as string);
    } catch { }

    const result = await this.sqlService.execute('sp_ValidateMessageSend_Fast', { channelId, userId });

    const validation = {
      isMember: result[0]?.isMember === 1,
      participant_ids: result[0]?.participant_ids || '',
    };

    setImmediate(() => this.redisService.set(cacheKey, JSON.stringify(validation), 60));
    return validation;
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
      `validate:${channelId}:*`,
      `msgs:${channelId}:*`,
      ...participantIds.slice(0, 10).map(id => `user:${id}:unread`),
      ...participantIds.slice(0, 10).map(id => `user:${id}:channels`),
    ];

    await Promise.allSettled(patterns.map(p => this.redisService.del(p)));
  }
}
