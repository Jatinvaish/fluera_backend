// ============================================
// src/core/redis/redis.service.ts - MAKE REDIS OPTIONAL
// ============================================
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null; // ✅ Allow null
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false; // ✅ Track connection status

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // ✅ Check if Redis is enabled
    const redisEnabled = this.configService.get('REDIS_ENABLED', 'false') === 'true';
    
    if (!redisEnabled) {
      this.logger.warn('⚠️ Redis is DISABLED - Running without cache');
      return;
    }

    try {
      const tlsEnabled = this.configService.get('REDIS_TLS') === 'true';

      this.client = new Redis({
        host: this.configService.get('REDIS_HOST'),
        port: Number(this.configService.get('REDIS_PORT')),
        username: this.configService.get('REDIS_USERNAME'),
        password: this.configService.get('REDIS_PASSWORD'),
        tls: tlsEnabled
          ? {
              rejectUnauthorized: true,
            }
          : undefined,
        retryStrategy: (times) => {
          if (times > 3) { // ✅ Reduce retries from 10 to 3
            this.logger.error('❌ Redis connection failed after 3 retries - Running without cache');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000, // ✅ Reduce from 10s to 5s
        lazyConnect: false,
      });

      this.client.on('connect', () => {
        this.logger.log('✅ Redis connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log('✅ Redis connected and ready');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.error(`❌ Redis error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('⚠️ Redis connection closed');
      });

      this.client.on('end', () => {
        this.isConnected = false;
        this.logger.warn('⚠️ Redis connection ended');
      });

      // Test connection
      await this.client.ping();
      this.logger.log('✅ Redis PING successful');
    } catch (error) {
      this.logger.error('❌ Redis initialization failed - Running without cache', error.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  // ✅ Helper to check if Redis is available
  private isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  // ============================================
  // ✅ ALL METHODS NOW HANDLE REDIS BEING UNAVAILABLE
  // ============================================

  async cacheUserSession(userId: number, sessionData: any, ttl: number = 900): Promise<void> {
    if (!this.isAvailable()) {
      this.logger.debug('Redis unavailable, skipping session cache');
      return; // ✅ Silently skip
    }

    try {
      const key = `session:${userId}`;
      await this.client!.setex(key, ttl, JSON.stringify(sessionData));
    } catch (error) {
      this.logger.error(`Failed to cache session for user ${userId}`, error.message);
      // ✅ Don't throw - just log
    }
  }

  async getCachedSession(userId: number): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `session:${userId}`;
      const data = await this.client!.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get cached session for user ${userId}`, error.message);
      return null;
    }
  }

  async deleteCachedSession(userId: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `session:${userId}`;
      await this.client!.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cached session for user ${userId}`, error.message);
    }
  }

  async revokeToken(token: string, expirySeconds: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `revoked:${token}`;
      await this.client!.setex(key, expirySeconds, '1');
    } catch (error) {
      this.logger.error('Failed to revoke token', error.message);
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    if (!this.isAvailable()) return false; // ✅ Fail open

    try {
      const key = `revoked:${token}`;
      const exists = await this.client!.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check token revocation', error.message);
      return false;
    }
  }

  async checkRateLimit(
    identifier: string,
    maxAttempts: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    if (!this.isAvailable()) {
      // ✅ Without Redis, allow all requests (no rate limiting)
      return { allowed: true, remaining: maxAttempts };
    }

    try {
      const key = `ratelimit:${identifier}`;
      const current = await this.client!.incr(key);

      if (current === 1) {
        await this.client!.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, maxAttempts - current);
      const allowed = current <= maxAttempts;

      let retryAfter: number | undefined;
      if (!allowed) {
        const ttl = await this.client!.ttl(key);
        retryAfter = ttl > 0 ? ttl : windowSeconds;
      }

      return {
        allowed,
        remaining,
        retryAfter,
      };
    } catch (error) {
      this.logger.error('Failed to check rate limit', error.message);
      return { allowed: true, remaining: maxAttempts };
    }
  }

  async resetRateLimit(identifier: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `ratelimit:${identifier}`;
      await this.client!.del(key);
    } catch (error) {
      this.logger.error('Failed to reset rate limit', error.message);
    }
  }

  async cacheQuery(key: string, data: any, ttl: number = 300): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client!.setex(`cache:${key}`, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.error(`Failed to cache query: ${key}`, error.message);
    }
  }

  async getCachedQuery(key: string): Promise<any | null> {
    if (!this.isAvailable()) return null;

    try {
      const data = await this.client!.get(`cache:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get cached query: ${key}`, error.message);
      return null;
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const keys = await this.client!.keys(`cache:${pattern}*`);
      if (keys.length > 0) {
        await this.client!.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${pattern}`, error.message);
    }
  }

  async storeVerificationCode(
    email: string,
    code: string,
    ttl: number = 600
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `verify:${email}`;
      await this.client!.setex(key, ttl, code);
    } catch (error) {
      this.logger.error(`Failed to store verification code for ${email}`, error.message);
    }
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const key = `verify:${email}`;
      const storedCode = await this.client!.get(key);
      if (storedCode === code) {
        await this.client!.del(key);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to verify code for ${email}`, error.message);
      return false;
    }
  }

  async getVerificationAttempts(email: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const key = `verify:attempts:${email}`;
      const attempts = await this.client!.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      this.logger.error('Failed to get verification attempts', error.message);
      return 0;
    }
  }

  async incrementVerificationAttempts(email: string, ttl: number = 3600): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const key = `verify:attempts:${email}`;
      const attempts = await this.client!.incr(key);
      if (attempts === 1) {
        await this.client!.expire(key, ttl);
      }
      return attempts;
    } catch (error) {
      this.logger.error('Failed to increment verification attempts', error.message);
      return 0;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      if (ttl) {
        await this.client!.setex(key, ttl, value);
      } else {
        await this.client!.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Failed to set key: ${key}`, error.message);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;

    try {
      return await this.client!.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error.message);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client!.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key: ${key}`, error.message);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check if key exists: ${key}`, error.message);
      return false;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error.message);
      return false;
    }
  }
}