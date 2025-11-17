// ============================================
// src/modules/message-system/message-queue.service.ts - NEW
// ============================================
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../core/redis/redis.service';
import { SqlServerService } from '../../core/database/sql-server.service';

interface QueuedMessage {
  messageId: number;
  channelId: number;
  recipientUserId: number;
  queuedAt: number;
}

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name);
  private readonly QUEUE_PREFIX = 'msg_queue:';
  private readonly MAX_QUEUE_SIZE = 1000;

  constructor(
    private redisService: RedisService,
    private sqlService: SqlServerService,
  ) {}

  /**
   * ✅ Queue message for offline user
   */
  async queueMessageForUser(
    userId: number,
    messageId: number,
    channelId: number,
  ): Promise<void> {
    const queueKey = `${this.QUEUE_PREFIX}${userId}`;

    const queuedMessage: QueuedMessage = {
      messageId,
      channelId,
      recipientUserId: userId,
      queuedAt: Date.now(),
    };

    try {
      // Add to Redis list (FIFO queue)
      await this.redisService.getClient()?.lpush(
        queueKey,
        JSON.stringify(queuedMessage),
      );

      // Trim queue to prevent unbounded growth
      await this.redisService.getClient()?.ltrim(queueKey, 0, this.MAX_QUEUE_SIZE - 1);

      // Set expiry (7 days)
      await this.redisService.getClient()?.expire(queueKey, 7 * 24 * 60 * 60);

      this.logger.debug(`Queued message ${messageId} for offline user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to queue message:', error);

      // Fallback: Store in database
      await this.queueMessageInDatabase(userId, messageId, channelId);
    }
  }

  /**
   * ✅ Get all queued messages for user (when they come online)
   */
  async getQueuedMessages(userId: number): Promise<QueuedMessage[]> {
    const queueKey = `${this.QUEUE_PREFIX}${userId}`;

    try {
      // Get all messages from queue
      const rawMessages = await this.redisService.getClient()?.lrange(queueKey, 0, -1);

      if (!rawMessages || rawMessages.length === 0) {
        return [];
      }

      const messages: QueuedMessage[] = rawMessages
        .map((raw) => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Clear queue after retrieval
      await this.redisService.getClient()?.del(queueKey);

      this.logger.log(`Delivered ${messages.length} queued messages to user ${userId}`);

      return messages;
    } catch (error) {
      this.logger.error('Failed to get queued messages:', error);

      // Fallback: Get from database
      return await this.getQueuedMessagesFromDatabase(userId);
    }
  }

  /**
   * ✅ Check queue size for user
   */
  async getQueueSize(userId: number): Promise<number> {
    const queueKey = `${this.QUEUE_PREFIX}${userId}`;

    try {
      const size = await this.redisService.getClient()?.llen(queueKey);
      return size || 0;
    } catch (error) {
      this.logger.error('Failed to get queue size:', error);
      return 0;
    }
  }

  /**
   * ✅ Fallback: Store queued message in database
   */
  private async queueMessageInDatabase(
    userId: number,
    messageId: number,
    channelId: number,
  ): Promise<void> {
    try {
      await this.sqlService.query(
        `INSERT INTO message_queue (user_id, message_id, channel_id, queued_at, expires_at)
         VALUES (@userId, @messageId, @channelId, GETUTCDATE(), DATEADD(day, 7, GETUTCDATE()))`,
        { userId, messageId, channelId },
      );
    } catch (error) {
      this.logger.error('Failed to queue message in database:', error);
    }
  }

  /**
   * ✅ Fallback: Get queued messages from database
   */
  private async getQueuedMessagesFromDatabase(userId: number): Promise<QueuedMessage[]> {
    try {
      const result = await this.sqlService.query(
        `SELECT message_id, channel_id, user_id as recipientUserId, 
                DATEDIFF(second, '1970-01-01', queued_at) * 1000 as queuedAt
         FROM message_queue
         WHERE user_id = @userId
         AND expires_at > GETUTCDATE()
         ORDER BY queued_at ASC`,
        { userId },
      );

      // Delete retrieved messages
      await this.sqlService.query(
        `DELETE FROM message_queue WHERE user_id = @userId`,
        { userId },
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to get queued messages from database:', error);
      return [];
    }
  }

  /**
   * ✅ Clear expired messages (run periodically)
   */
  async clearExpiredMessages(): Promise<void> {
    try {
      await this.sqlService.query(
        `DELETE FROM message_queue WHERE expires_at < GETUTCDATE()`,
        {},
      );
    } catch (error) {
      this.logger.error('Failed to clear expired messages:', error);
    }
  }
}