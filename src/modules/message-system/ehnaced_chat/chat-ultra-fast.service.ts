// ============================================
// src/modules/message-system/chat-ultra-optimized.service.ts
// TARGET: <50ms message delivery, <30ms message list
// ============================================
import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { RedisService } from 'src/core/redis/redis.service';
import { SendMessageDto } from 'src/modules/global-modules/dto/chat.dto';


interface MessageResponse {
  id: number;
  channel_id: number;
  sender_user_id: number;
  sender_tenant_id: number;
  message_type: string;
  sent_at: string;
  encryption_key_version: number;
}

interface ValidationResult {
  isMember: boolean;
  encryption_version: string;
  participant_ids: string;
}

@Injectable()
export class UltraFastChatService {
  private readonly logger = new Logger(UltraFastChatService.name);
  private readonly MAX_CACHE_TTL = 60; // 1 minute for hot data

  constructor(
    private sqlService: SqlServerService,
    private redisService: RedisService,
  ) { }

  /**
   * ✅ ULTRA-FAST MESSAGE SEND: <50ms target
   * 
   * Optimizations:
   * 1. Single SP call (no multiple queries)
   * 2. Cached validation (Redis with fallback)
   * 3. Fire-and-forget async operations
   * 4. Zero blocking operations
   */
  async sendMessageUltraFast(
    dto: SendMessageDto,
    userId: number,
    tenantId: number,
  ): Promise<MessageResponse> {
    const startTime = Date.now();

    try {
      // ✅ STEP 1: CACHED VALIDATION (~5ms with cache, ~15ms without)
      const validation = await this.validateMessageSendCached(dto.channelId, userId);

      if (!validation.isMember) {
        throw new ForbiddenException('Not a channel member');
      }

      // Extract encryption version number (v1 -> 1)
      const keyVersion = parseInt(validation.encryption_version?.substring(1) || '1');

      // ✅ STEP 2: SINGLE SP CALL FOR MESSAGE INSERT (~20-30ms)
      const result = await this.sqlService.execute('sp_InsertMessage_UltraFast', {
        channelId: dto.channelId,
        userId,
        tenantId,
        messageType: dto.messageType || 'text',
        encryptedContent: dto.encryptedContent,
        encryptionIv: dto.encryptionIv,
        encryptionAuthTag: dto.encryptionAuthTag,
        keyVersion,
        hasAttachments: dto.attachments && dto.attachments?.length > 0 ? 1 : 0,
        hasMentions: dto.mentions && dto.mentions?.length > 0 ? 1 : 0,
        replyToMessageId: dto.replyToMessageId || null,
        threadId: dto.threadId || null,
      });

      const message = result[0] as MessageResponse;

      // ✅ STEP 3: FIRE-AND-FORGET ASYNC OPERATIONS (non-blocking)
      this.processMessageAsync(
        message.id,
        dto.channelId,
        userId,
        validation.participant_ids,
      ).catch(err => {
        this.logger.warn(`Async processing failed (non-critical): ${err.message}`);
      });

      const elapsed = Date.now() - startTime;

      if (elapsed > 50) {
        this.logger.warn(`⚠️ Message send exceeded target: ${elapsed}ms (target: 50ms)`);
      } else {
        this.logger.debug(`✅ Message sent in ${elapsed}ms`);
      }

      return message;

    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`❌ Message send failed after ${elapsed}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ OPTIMIZED: Cached validation with smart fallback
   * Cache hit: ~5ms | Cache miss: ~15ms
   */
  private async validateMessageSendCached(
    channelId: number,
    userId: number,
  ): Promise<ValidationResult> {
    const cacheKey = `validate:${channelId}:${userId}`;

    // Try cache first (Redis)
    try {
      const cached = await Promise.race([
        this.redisService.get(cacheKey),
        this.timeout(10), // Max 10ms wait for Redis
      ]);

      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Redis timeout or failure - continue to DB
      this.logger.debug(`Cache miss/timeout for ${cacheKey}`);
    }

    // Execute optimized SP
    const result = await this.sqlService.execute('sp_ValidateMessageSend', {
      channelId,
      userId,
    });

    if (!result || result.length === 0) {
      return { isMember: false, encryption_version: 'v1', participant_ids: '' };
    }

    const validation: ValidationResult = {
      isMember: result[0].isMember === 1,
      encryption_version: result[0].encryption_version || 'v1',
      participant_ids: result[0].participant_ids || '',
    };

    // Cache for 60 seconds (fire-and-forget)
    this.redisService.set(cacheKey, JSON.stringify(validation), this.MAX_CACHE_TTL)
      .catch(() => { }); // Ignore cache errors

    return validation;
  }

  /**
   * ✅ ULTRA-FAST MESSAGE FETCH: <30ms target
   * 
   * Optimizations:
   * 1. Single SP call with covering index
   * 2. Aggressive caching for hot channels
   * 3. Minimal data transfer
   */
  async getMessagesUltraFast(
    channelId: number,
    userId: number,
    limit: number = 50,
    beforeId?: number,
  ) {
    const startTime = Date.now();
    const cacheKey = `msgs:${channelId}:${limit}:${beforeId || 'latest'}`;

    // Try cache first (only for recent messages)
    if (!beforeId) {
      try {
        const cached = await Promise.race([
          this.redisService.get(cacheKey),
          this.timeout(10), // Max 10ms wait
        ]);

        if (cached && typeof cached === 'string') {
          const elapsed = Date.now() - startTime;
          this.logger.debug(`✅ Messages from cache in ${elapsed}ms`);
          return JSON.parse(cached);
        }
      } catch (err) {
        // Cache miss/timeout - continue to DB
      }
    }

    // Execute optimized SP
    const messages = await this.sqlService.execute('sp_GetMessages_UltraFast', {
      channelId,
      limit: Math.min(limit, 100), // Cap at 100
      beforeId: beforeId || null,
    });

    const elapsed = Date.now() - startTime;

    if (elapsed > 30) {
      this.logger.warn(`⚠️ Message fetch exceeded target: ${elapsed}ms (target: 30ms)`);
    } else {
      this.logger.debug(`✅ Messages fetched in ${elapsed}ms`);
    }

    // Cache only recent messages (fire-and-forget)
    if (!beforeId && messages.length > 0) {
      this.redisService.set(cacheKey, JSON.stringify(messages), 30)
        .catch(() => { });
    }

    return messages;
  }

  /**
   * ✅ ASYNC NON-BLOCKING: Runs in background
   * This does NOT affect message delivery speed
   */
  private async processMessageAsync(
    messageId: number,
    channelId: number,
    senderId: number,
    participantIdsStr: string,
  ): Promise<void> {
    try {
      const participantIds = participantIdsStr
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id !== senderId);

      if (participantIds.length === 0) return;

      // Run all async operations in parallel
      await Promise.allSettled([
        // Create read receipts (bulk insert)
        this.sqlService.execute('sp_CreateReadReceiptsBulk', {
          messageId,
          channelId,
          senderId,
        }),

        // Invalidate relevant caches
        this.invalidateCachesAsync(channelId, participantIds.slice(0, 10)),

        // Update unread counts in Redis (if available)
        this.updateUnreadCountsAsync(participantIds, channelId),
      ]);
    } catch (err) {
      this.logger.error(`Async processing error: ${err.message}`);
      // Don't throw - this is background work
    }
  }

  /**
   * ✅ SMART CACHE INVALIDATION
   */
  private async invalidateCachesAsync(
    channelId: number,
    participantIds: number[],
  ): Promise<void> {
    const patterns = [
      `validate:${channelId}:*`,
      `msgs:${channelId}:*`,
      ...participantIds.map(id => `user:${id}:unread`),
    ];

    await Promise.allSettled(
      patterns.map(pattern => this.redisService.del(pattern))
    );
  }

  /**
   * ✅ UPDATE UNREAD COUNTS (Redis only, non-critical)
   */
  private async updateUnreadCountsAsync(
    participantIds: number[],
    channelId: number,
  ): Promise<void> {
    await Promise.allSettled(
      participantIds.map(userId =>
        this.redisService
          .set(`unread:${userId}:${channelId}`, '1', 3600)
          .catch(() => { })
      )
    );
  }

  /**
   * ✅ OPTIMIZED: Get user channels on connect
   */
  async getUserChannelsFast(userId: number): Promise<any[]> {
    const cacheKey = `user:${userId}:channels`;

    // Try cache
    try {
      const cached = await Promise.race([
        this.redisService.get(cacheKey),
        this.timeout(10),
      ]);

      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Continue to DB
    }

    // Execute SP
    const channels = await this.sqlService.execute('sp_GetUserChannels_Fast', {
      userId,
    });

    // Cache for 5 minutes
    this.redisService.set(cacheKey, JSON.stringify(channels), 300)
      .catch(() => { });

    return channels;
  }

  /**
   * ✅ OPTIMIZED: Mark as read (async, doesn't block)
   */
  async markAsReadAsync(
    channelId: number,
    messageId: number,
    userId: number,
  ): Promise<void> {
    // Fire and forget
    this.sqlService.execute('sp_MarkAsRead_Async', {
      messageId,
      userId,
      channelId,
    }).catch(err => {
      this.logger.warn(`Mark as read failed: ${err.message}`);
    });
  }

  /**
   * ✅ GET CHANNEL MEMBERS (for WebSocket routing)
   */
  async getChannelMembersFast(channelId: number): Promise<number[]> {
    const cacheKey = `channel:${channelId}:members`;

    try {
      const cached = await Promise.race([
        this.redisService.get(cacheKey),
        this.timeout(10),
      ]);

      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Continue to DB
    }

    const result = await this.sqlService.execute('sp_GetChannelMembers_Fast', {
      channelId,
    });

    const memberIds = result.map(r => r.user_id);

    // Cache for 2 minutes
    this.redisService.set(cacheKey, JSON.stringify(memberIds), 120)
      .catch(() => { });

    return memberIds;
  }

  /**
   * ✅ BATCH MESSAGE SEND (for multiple messages)
   */
  async sendMessageBatch(
    messages: SendMessageDto[],
    userId: number,
    tenantId: number,
  ) {
    const startTime = Date.now();

    // Process in parallel (max 5 at a time to avoid overload)
    const chunks = this.chunkArray(messages, 5);
    const results: any = [];

    for (const chunk of chunks) {
      const chunkResults: any = await Promise.all(
        chunk.map(dto => this.sendMessageUltraFast(dto, userId, tenantId))
      );
      results.push(...chunkResults);
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`Batch sent ${results.length} messages in ${elapsed}ms`);

    return {
      sent: results.length,
      messages: results,
      totalTime: elapsed,
      avgPerMessage: Math.round(elapsed / results.length),
    };
  }

  /**
   * ✅ GET UNREAD COUNT (cached)
   */
  async getUnreadCount(userId: number, tenantId: number): Promise<number> {
    const cacheKey = `user:${userId}:unread:total`;

    try {
      const cached = await Promise.race([
        this.redisService.get(cacheKey),
        this.timeout(10),
      ]);

      if (cached) {
        return parseInt(cached as string);
      }
    } catch (err) {
      // Continue to DB
    }

    const result = await this.sqlService.query(
      `SELECT COUNT(*) as unread_count
       FROM chat_participants cp WITH (NOLOCK)
       INNER JOIN messages m WITH (NOLOCK) 
         ON m.channel_id = cp.channel_id
       WHERE cp.user_id = @userId
       AND cp.is_active = 1
       AND m.sent_at > ISNULL(cp.last_read_at, '1900-01-01')
       AND m.sender_user_id != @userId
       AND m.is_deleted = 0`,
      { userId }
    );

    const count = result[0]?.unread_count || 0;

    // Cache for 30 seconds
    this.redisService.set(cacheKey, count.toString(), 30)
      .catch(() => { });

    return count;
  }

  // ==================== HELPER METHODS ====================

  private timeout(ms: number): Promise<null> {
    return new Promise(resolve => setTimeout(() => resolve(null), ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * ✅ HEALTH CHECK
   */
  getHealthMetrics() {
    return {
      service: 'chat-ultra-optimized',
      target_message_send: '<50ms',
      target_message_fetch: '<30ms',
      caching: 'redis-with-fallback',
      sp_optimization: 'enabled',
    };
  }
}