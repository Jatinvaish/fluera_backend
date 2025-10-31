// src/core/interceptors/logging.interceptor.ts - FASTIFY VERSION
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();
    
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || '';
    const startTime = Date.now();

    this.logger.log(
      `➡️  [${context.getClass().name}] ${method} ${url} - ${ip} - ${userAgent}`,
    );

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const statusCode = reply.statusCode;
        
        this.logger.log(
          `✅ [${context.getClass().name}] ${method} ${url} - ${statusCode} - ${responseTime}ms`,
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        
        this.logger.error(
          `❌ [${context.getClass().name}] ${method} ${url} - Error: ${error.message} - ${responseTime}ms`,
        );
        
        // Re-throw the error so it can be handled by exception filters
        return throwError(() => error);
      }),
    );
  }
}