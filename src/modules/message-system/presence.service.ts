// ============================================
// src/modules/message-system/presence.service.ts - NEW
// ============================================
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../core/redis/redis.service';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private redisService: RedisService) {}

  /**
   * ✅ Set user as typing in channel (expires after 5 seconds)
   */
  async setTyping(userId: number, channelId: number, isTyping: boolean) {
    const key = `typing:${channelId}:${userId}`;

    if (isTyping) {
      await this.redisService.set(key, Date.now().toString(), 5);
    } else {
      await this.redisService.del(key);
    }
  }

  /**
   * ✅ Get all users currently typing in channel
   */
  async getTypingUsers(channelId: number): Promise<number[]> {
    const pattern = `typing:${channelId}:*`;
    const keys = await this.getAllKeys(pattern);

    const typingUsers: number[] = [];
    for (const key of keys) {
      const userId = parseInt(key.split(':')[2]);
      if (!isNaN(userId)) {
        typingUsers.push(userId);
      }
    }

    return typingUsers;
  }

  /**
   * ✅ Update user online status
   */
  async setUserOnline(userId: number, tenantId: number) {
    const key = `presence:${tenantId}:${userId}`;
    await this.redisService.set(key, 'online', 300); // 5 minutes TTL
  }

  /**
   * ✅ Set user offline
   */
  async setUserOffline(userId: number, tenantId: number) {
    const key = `presence:${tenantId}:${userId}`;
    await this.redisService.del(key);
  }

  /**
   * ✅ Get all online users in tenant
   */
  async getOnlineUsers(tenantId: number): Promise<number[]> {
    const pattern = `presence:${tenantId}:*`;
    const keys = await this.getAllKeys(pattern);

    return keys.map((key) => parseInt(key.split(':')[2])).filter((id) => !isNaN(id));
  }

  /**
   * ✅ Check if user is online
   */
  async isUserOnline(userId: number, tenantId: number): Promise<boolean> {
    const key = `presence:${tenantId}:${userId}`;
    const exists = await this.redisService.exists(key);
    return exists;
  }

  /**
   * ✅ Helper to get all keys matching pattern
   */
  private async getAllKeys(pattern: string): Promise<string[]> {
    try {
      const client = this.redisService.getClient();
      if (!client) return [];

      const keys: string[] = [];
      let cursor = '0';

      do {
        const [newCursor, foundKeys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      this.logger.error('Failed to scan Redis keys:', error);
      return [];
    }
  }
}