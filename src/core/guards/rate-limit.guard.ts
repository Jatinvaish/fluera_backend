// core/guards/rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (maxAttempts: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { maxAttempts, windowSeconds });

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private redisService: RedisService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitConfig = this.reflector.get<{ maxAttempts: number; windowSeconds: number }>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitConfig) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const identifier = this.getIdentifier(request);

    const { allowed, remaining } = await this.redisService.checkRateLimit(
      identifier,
      rateLimitConfig.maxAttempts,
      rateLimitConfig.windowSeconds,
    );

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', rateLimitConfig.maxAttempts.toString());
    response.header('X-RateLimit-Remaining', remaining.toString());

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitConfig.windowSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getIdentifier(request: any): string {
    // Use IP + User ID for authenticated, IP only for unauthenticated
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }
}
 