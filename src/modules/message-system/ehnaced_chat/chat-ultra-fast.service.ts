// ============================================
// src/modules/message-system/ehnaced_chat/chat-ultra-fast.service.ts
// ULTRA-OPTIMIZED: <50ms for all operations
// ============================================
import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SqlServerService } from '../../../core/database/sql-server.service';
import { RedisService } from '../../../core/redis/redis.service';
import { SendMessageDto } from '../../global-modules/dto/chat.dto';

@Injectable()
export class UltraFastChatService {
  private readonly logger = new Logger(UltraFastChatService.name);

  constructor(
    private sqlService: SqlServerService,
    private redisService: RedisService,
  ) { }

  /**
   * ✅ ULTRA-FAST MESSAGE SEND: <30ms target
   * Removed: encryption validation, async processing, separate validation
   * Added: inline membership check, direct return
   */
  async sendMessageUltraFast(
    dto: SendMessageDto,
    userId: number,
    tenantId: number,
  ) {
    const startTime = Date.now();

    try {
      // ✅ SINGLE ATOMIC OPERATION - membership check + insert
      const result = await this.sqlService.query(
        `
        SET NOCOUNT ON;
        
        DECLARE @messageId BIGINT;
        DECLARE @now DATETIME2(7) = SYSUTCDATETIME();
        DECLARE @isMember BIT = 0;

        -- Check membership (inline)
        IF EXISTS (
          SELECT 1 FROM chat_participants WITH (NOLOCK)
          WHERE channel_id = @channelId 
          AND user_id = @userId 
          AND is_active = 1
        )
          SET @isMember = 1;

        IF @isMember = 0
        BEGIN
          SELECT 0 as success, 'Not a channel member' as error;
          RETURN;
        END;

        BEGIN TRANSACTION;

        -- Insert message
        INSERT INTO messages (
          channel_id, sender_tenant_id, sender_user_id, message_type,
          encrypted_content, encryption_iv, encryption_auth_tag,
          encryption_key_version, has_attachments, has_mentions,
          reply_to_message_id, thread_id, sent_at, created_at, created_by
        )
        VALUES (
          @channelId, @tenantId, @userId, @messageType,
          @encryptedContent, @encryptionIv, @encryptionAuthTag,
          1, @hasAttachments, @hasMentions,
          @replyToMessageId, @threadId, @now, @now, @userId
        );

        SET @messageId = SCOPE_IDENTITY();

        -- Update channel stats
        UPDATE chat_channels WITH (ROWLOCK)
        SET message_count = message_count + 1,
            last_message_at = @now,
            last_activity_at = @now
        WHERE id = @channelId;

        COMMIT TRANSACTION;

        -- Return for broadcast
        SELECT 
          1 as success,
          @messageId as id,
          @channelId as channel_id,
          @userId as sender_user_id,
          @messageType as message_type,
          @now as sent_at;
        `,
        {
          channelId: dto.channelId,
          tenantId,
          userId,
          messageType: dto.messageType || 'text',
          encryptedContent: dto.encryptedContent,
          encryptionIv: dto.encryptionIv,
          encryptionAuthTag: dto.encryptionAuthTag,
          hasAttachments: dto.attachments && dto.attachments?.length > 0 ? 1 : 0,
          hasMentions: dto.mentions && dto.mentions?.length > 0 ? 1 : 0,
          replyToMessageId: dto.replyToMessageId || null,
          threadId: dto.threadId || null,
        }
      );

      if (!result[0]?.success) {
        throw new ForbiddenException(result[0]?.error || 'Not a channel member');
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > 50) {
        this.logger.warn(`⚠️ Slow send: ${elapsed}ms (target: <50ms)`);
      }

      return result[0];

    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`❌ Send failed after ${elapsed}ms:`, error.message);
      throw error;
    }
  }

  /**
   * ✅ ULTRA-FAST MESSAGE LIST: <25ms target
   * Features:
   * - Auto mark-as-read (merged, no separate API call)
   * - Single optimized query with user info
   * - Redis caching (5s TTL for near real-time)
   */
  async getMessagesUltraFast(
    channelId: number,
    userId: number,
    limit: number = 50,
    beforeId?: number
  ) {
    const startTime = Date.now();
    const cacheKey = `msgs:${channelId}:${limit}:${beforeId || 'latest'}`;

    try {
      // Try cache (2-5ms hit)
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        // Auto mark as read (async, non-blocking)
        this.markLastAsReadAsync(channelId, userId, JSON.parse(cached)[0]?.id).catch(() => { });

        const elapsed = Date.now() - startTime;
        this.logger.debug(`✅ Cache hit: ${elapsed}ms`);
        return JSON.parse(cached);
      }
    } catch { }

    // Single optimized query
    const messages = await this.sqlService.query(
      `
      SELECT TOP (@limit)
        m.id,
        m.sender_user_id,
        m.message_type,
        m.encrypted_content,
        m.encryption_iv,
        m.encryption_auth_tag,
        m.encryption_key_version,
        m.has_attachments,
        m.has_mentions,
        m.reply_to_message_id,
        m.thread_id,
        m.sent_at,
        m.is_edited,
        m.edited_at,
        u.first_name,
        u.last_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM message_reactions WITH (NOLOCK) WHERE message_id = m.id) as reaction_count
      FROM messages m WITH (NOLOCK)
      INNER JOIN users u WITH (NOLOCK) ON m.sender_user_id = u.id
      WHERE m.channel_id = @channelId
      AND m.is_deleted = 0
      ${beforeId ? 'AND m.id < @beforeId' : ''}
      ORDER BY m.sent_at DESC
      `,
      {
        channelId,
        limit: Number(limit),
        beforeId: beforeId || null
      }
    );

    // Cache for 5 seconds (near real-time)
    this.redisService.set(cacheKey, JSON.stringify(messages), 5).catch(() => { });

    // ✅ Auto mark-as-read (async, non-blocking)
    if (messages.length > 0) {
      this.markLastAsReadAsync(channelId, userId, messages[0].id).catch(() => { });
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 50) {
      this.logger.warn(`⚠️ Slow list: ${elapsed}ms (target: <50ms)`);
    }

    return messages;
  }

  /**
   * ✅ ASYNC MARK-AS-READ - Non-blocking background operation
   * Merged into list API, no separate endpoint needed
   */
  private async markLastAsReadAsync(channelId: number, userId: number, messageId: number) {
    try {
      await this.sqlService.query(
        `
        UPDATE chat_participants WITH (ROWLOCK)
        SET last_read_message_id = @messageId,
            last_read_at = SYSUTCDATETIME()
        WHERE channel_id = @channelId 
        AND user_id = @userId
        `,
        { channelId, userId, messageId }
      );
    } catch (error) {
      // Silent fail - non-critical
      this.logger.debug('Mark-as-read failed (non-critical):', error.message);
    }
  }

  /**
   * ✅ GET CHANNEL LIST: <30ms target
   * Optimized: single query, essential data only
   */
  async getUserChannelsUltraFast(userId: number, tenantId: number, limit: number = 50) {
    const startTime = Date.now();
    const cacheKey = `user:${userId}:channels`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`✅ Channels cache hit: ${Date.now() - startTime}ms`);
        return JSON.parse(cached);
      }
    } catch { }

    const channels = await this.sqlService.query(
      `
      SELECT TOP (@limit)
        c.id,
        c.name,
        c.channel_type,
        c.is_private,
        c.last_activity_at,
        c.message_count,
        cp.role as user_role,
        cp.encrypted_channel_key,
        cp.last_read_message_id,
        (SELECT COUNT(*) 
         FROM messages m WITH (NOLOCK)
         WHERE m.channel_id = c.id 
         AND m.is_deleted = 0
         AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)
        ) as unread_count
      FROM chat_channels c WITH (NOLOCK)
      INNER JOIN chat_participants cp WITH (NOLOCK) 
        ON c.id = cp.channel_id
      WHERE cp.user_id = @userId
      AND cp.is_active = 1
      AND c.created_by_tenant_id = @tenantId
      AND c.is_archived = 0
      ORDER BY c.last_activity_at DESC
      `,
      { userId, tenantId, limit: Number(limit) }
    );

    // Cache for 30 seconds
    this.redisService.set(cacheKey, JSON.stringify(channels), 30).catch(() => { });

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ Channels fetched in ${elapsed}ms`);

    return channels;
  }

  /**
   * ✅ GET ONLINE PARTICIPANTS - For WebSocket routing
   */
  async getChannelMembersUltraFast(channelId: number): Promise<number[]> {
    const cacheKey = `channel:${channelId}:members`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { }

    const members = await this.sqlService.query(
      `SELECT user_id 
       FROM chat_participants WITH (NOLOCK)
       WHERE channel_id = @channelId AND is_active = 1`,
      { channelId }
    );

    const userIds = members.map(m => m.user_id);

    // Cache for 5 minutes
    this.redisService.set(cacheKey, JSON.stringify(userIds), 300).catch(() => { });

    return userIds;
  }

  /**
   * ✅ CREATE CHANNEL - Standard speed (not real-time critical)
   */
  async createChannelUltraFast(
    dto: any,
    userId: number,
    tenantId: number
  ) {
    const channelKey = this.generateChannelKey();

    const result = await this.sqlService.query(
      `
      DECLARE @channelId BIGINT;
      DECLARE @now DATETIME2(7) = SYSUTCDATETIME();

      BEGIN TRANSACTION;

      INSERT INTO chat_channels (
        created_by_tenant_id, name, channel_type, is_private,
        is_encrypted, encryption_version, encryption_algorithm,
        last_activity_at, created_by, created_at
      )
      VALUES (
        @tenantId, @name, @channelType, @isPrivate,
        1, 'v1', 'AES-256-GCM',
        @now, @userId, @now
      );

      SET @channelId = SCOPE_IDENTITY();

      -- Add creator
      INSERT INTO chat_participants (
        channel_id, tenant_id, user_id, role,
        encrypted_channel_key, is_active,
        joined_at, created_by, created_at
      )
      VALUES (
        @channelId, @tenantId, @userId, 'owner',
        @channelKey, 1,
        @now, @userId, @now
      );

      COMMIT TRANSACTION;

      SELECT @channelId as id, @name as name, @channelType as channel_type;
      `,
      {
        tenantId,
        userId,
        name: dto.name,
        channelType: dto.channelType || 'group',
        isPrivate: dto.isPrivate !== false,
        channelKey,
      }
    );

    // Invalidate cache
    this.redisService.del(`user:${userId}:channels`).catch(() => { });

    return result[0];
  }

  /**
   * ✅ HELPER: Generate channel key
   */
  private generateChannelKey(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}