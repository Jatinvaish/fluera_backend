// ============================================
// src/auth/services/pkce.service.ts - NEW FILE
// ============================================
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from './redis.service';

@Injectable()
export class PkceService {
  private readonly logger = new Logger(PkceService.name);
  private memoryStore = new Map<string, { verifier: string; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private redisService: RedisService) {
    // Cleanup expired in-memory verifiers every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredVerifiers();
    }, 60000);
  }

  /**
   * Generate a cryptographically random code verifier
   * @returns Base64 URL-encoded string (43-128 characters)
   */
  generateCodeVerifier(): string {
    return crypto
      .randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate code challenge from verifier using SHA256
   * @param verifier - The code verifier
   * @returns Base64 URL-encoded SHA256 hash
   */
  generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Store code verifier with state as key
   * Uses Redis if available, otherwise falls back to memory
   */
  async storeCodeVerifier(state: string, verifier: string, ttl: number = 600): Promise<void> {
    try {
      const key = `pkce:microsoft:${state}`;
      
      // Try Redis first
      const redisClient = this.redisService.getClient();
      if (redisClient) {
        await this.redisService.set(key, verifier, ttl);
        this.logger.debug(`Stored PKCE verifier in Redis: ${state}`);
        return;
      }

      // Fallback to memory
      this.memoryStore.set(state, {
        verifier,
        expiresAt: Date.now() + ttl * 1000,
      });
      this.logger.debug(`Stored PKCE verifier in memory: ${state}`);
    } catch (error) {
      this.logger.error('Failed to store code verifier', error.message);
      // Fallback to memory on error
      this.memoryStore.set(state, {
        verifier,
        expiresAt: Date.now() + ttl * 1000,
      });
    }
  }

  /**
   * Retrieve and delete code verifier
   * Checks Redis first, then memory store
   */
  async getCodeVerifier(state: string): Promise<string | null> {
    try {
      const key = `pkce:microsoft:${state}`;
      
      // Try Redis first
      const redisClient = this.redisService.getClient();
      if (redisClient) {
        const verifier = await this.redisService.get(key);
        if (verifier) {
          // Delete after retrieval (one-time use)
          await this.redisService.del(key);
          this.logger.debug(`Retrieved PKCE verifier from Redis: ${state}`);
          return verifier;
        }
      }

      // Try memory store
      const data = this.memoryStore.get(state);
      if (data) {
        // Check expiration
        if (Date.now() > data.expiresAt) {
          this.memoryStore.delete(state);
          this.logger.warn(`PKCE verifier expired: ${state}`);
          return null;
        }

        // Delete after retrieval (one-time use)
        this.memoryStore.delete(state);
        this.logger.debug(`Retrieved PKCE verifier from memory: ${state}`);
        return data.verifier;
      }

      this.logger.warn(`PKCE verifier not found: ${state}`);
      return null;
    } catch (error) {
      this.logger.error('Failed to get code verifier', error.message);
      return null;
    }
  }

  /**
   * Clean up expired verifiers from memory store
   */
  private cleanupExpiredVerifiers(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [state, data] of this.memoryStore.entries()) {
      if (now > data.expiresAt) {
        this.memoryStore.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired PKCE verifiers from memory`);
    }
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryStore.clear();
  }
}