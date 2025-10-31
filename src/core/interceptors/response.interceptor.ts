// core/interceptors/response.interceptor.ts - FASTIFY VERSION
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { EncryptionService } from 'src/common/encryption.service';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  correlationId: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(
    private reflector: Reflector,
    private encryptionService: EncryptionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    const isUnencrypted = this.reflector.getAllAndOverride<boolean>('unencrypted', [
      context.getHandler(),
      context.getClass(),
    ]);

    const encryptionEnabled = !isUnencrypted;

    return next.handle().pipe(
      map((data) => {
        const statusCode = reply.statusCode || 200;

        const apiResponse: ApiResponse<T> = {
          success: true,
          statusCode,
          message: data?.message || 'Operation successful',
          data: data?.data || data,
          timestamp: new Date().toISOString(),
          correlationId: request['correlationId'] || 'unknown',
          path: request.url,
        };

        if (encryptionEnabled) {
          const jsonString = JSON.stringify(apiResponse);
          const encrypted = this.encryptionService.encrypt(jsonString);
          const checksum = this.generateChecksum(encrypted);

          reply.header('X-Encryption-Enabled', 'true');

          return {
            __payload: encrypted,
            __checksum: checksum,
            __ts: Date.now(),
          };
        }

        return apiResponse;
      }),
    );
  }

  private generateChecksum(data: string): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(data + process.env.ENCRYPTION_KEY)
      .digest('hex');
  }
}