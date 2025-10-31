// core/redis/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const tlsEnabled = this.configService.get('REDIS_TLS') === 'true';

    this.client = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: Number(this.configService.get('REDIS_PORT')),
      username: this.configService.get('REDIS_USERNAME'),
      password: this.configService.get('REDIS_PASSWORD'),
      tls: tlsEnabled
        ? {
            rejectUnauthorized: true, // Verify server certificates
            // If you get certificate errors, temporarily set to false for testing:
            // rejectUnauthorized: false,
          }
        : undefined,
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error('❌ Redis connection failed after 10 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      enableOfflineQueue: false, // Fail fast instead of queuing commands
      maxRetriesPerRequest: 3,
      connectTimeout: 10000, // 10 seconds
      lazyConnect: false, // Connect immediately
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connecting...');
    });

    this.client.on('ready', () => {
      this.logger.log('✅ Redis connected and ready');
    });

    this.client.on('error', (err) => {
      this.logger.error(`❌ Redis error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.logger.warn('⚠️ Redis connection closed');
    });

    this.client.on('reconnecting', (delay) => {
      this.logger.warn(`⚠️ Redis reconnecting in ${delay}ms...`);
    });

    this.client.on('end', () => {
      this.logger.warn('⚠️ Redis connection ended');
    });

    // Test connection
    try {
      await this.client.ping();
      this.logger.log('✅ Redis PING successful');
    } catch (error) {
      this.logger.error('❌ Redis PING failed', error.message);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed gracefully');
  }

  /**
   * 🔒 Cache user session (reduce DB hits)
   */
  async cacheUserSession(userId: bigint, sessionData: any, ttl: number = 900): Promise<void> {
    try {
      const key = `session:${userId}`;
      await this.client.setex(key, ttl, JSON.stringify(sessionData));
    } catch (error) {
      this.logger.error(`Failed to cache session for user ${userId}`, error.message);
      throw error;
    }
  }

  /**
   * Get cached session
   */
  async getCachedSession(userId: bigint): Promise<any | null> {
    try {
      const key = `session:${userId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get cached session for user ${userId}`, error.message);
      return null;
    }
  }

  /**
   * Delete cached session
   */
  async deleteCachedSession(userId: bigint): Promise<void> {
    try {
      const key = `session:${userId}`;
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cached session for user ${userId}`, error.message);
    }
  }

  /**
   * 🔒 Revoke token (blacklist)
   */
  async revokeToken(token: string, expirySeconds: number): Promise<void> {
    try {
      const key = `revoked:${token}`;
      await this.client.setex(key, expirySeconds, '1');
    } catch (error) {
      this.logger.error('Failed to revoke token', error.message);
      throw error;
    }
  }

  /**
   * Check if token is revoked
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const key = `revoked:${token}`;
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check token revocation', error.message);
      return false; // Fail open - allow access on Redis error
    }
  }

  /**
   * 🔒 Rate limiting (brute force protection)
   */
  async checkRateLimit(
    identifier: string,
    maxAttempts: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    try {
      const key = `ratelimit:${identifier}`;
      const current = await this.client.incr(key);

      if (current === 1) {
        await this.client.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, maxAttempts - current);
      const allowed = current <= maxAttempts;

      // Get TTL for retryAfter
      let retryAfter: number | undefined;
      if (!allowed) {
        const ttl = await this.client.ttl(key);
        retryAfter = ttl > 0 ? ttl : windowSeconds;
      }

      return {
        allowed,
        remaining,
        retryAfter,
      };
    } catch (error) {
      this.logger.error('Failed to check rate limit', error.message);
      // Fail open - allow request on Redis error
      return { allowed: true, remaining: maxAttempts };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier: string): Promise<void> {
    try {
      const key = `ratelimit:${identifier}`;
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Failed to reset rate limit', error.message);
    }
  }

  /**
   * Cache query result
   */
  async cacheQuery(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      await this.client.setex(`cache:${key}`, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.error(`Failed to cache query: ${key}`, error.message);
    }
  }

  /**
   * Get cached query
   */
  async getCachedQuery(key: string): Promise<any | null> {
    try {
      const data = await this.client.get(`cache:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get cached query: ${key}`, error.message);
      return null;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(`cache:${pattern}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${pattern}`, error.message);
    }
  }

  /**
   * 🔒 Store verification code
   */
  async storeVerificationCode(
    email: string,
    code: string,
    ttl: number = 600
  ): Promise<void> {
    try {
      const key = `verify:${email}`;
      await this.client.setex(key, ttl, code);
    } catch (error) {
      this.logger.error(`Failed to store verification code for ${email}`, error.message);
      throw error;
    }
  }

  /**
   * Verify code
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const key = `verify:${email}`;
      const storedCode = await this.client.get(key);
      if (storedCode === code) {
        await this.client.del(key); // One-time use
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to verify code for ${email}`, error.message);
      return false;
    }
  }

  /**
   * Get remaining attempts for verification code
   */
  async getVerificationAttempts(email: string): Promise<number> {
    try {
      const key = `verify:attempts:${email}`;
      const attempts = await this.client.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      this.logger.error('Failed to get verification attempts', error.message);
      return 0;
    }
  }

  /**
   * Increment verification attempts
   */
  async incrementVerificationAttempts(email: string, ttl: number = 3600): Promise<number> {
    try {
      const key = `verify:attempts:${email}`;
      const attempts = await this.client.incr(key);
      if (attempts === 1) {
        await this.client.expire(key, ttl);
      }
      return attempts;
    } catch (error) {
      this.logger.error('Failed to increment verification attempts', error.message);
      return 0;
    }
  }

  /**
   * Set key with expiration
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Failed to set key: ${key}`, error.message);
      throw error;
    }
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error.message);
      return null;
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key: ${key}`, error.message);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check if key exists: ${key}`, error.message);
      return false;
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error.message);
      return false;
    }
  }
}