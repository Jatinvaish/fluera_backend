
// ============================================
// FIX 4: core/interceptors/logging.interceptor.ts
// ============================================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const userAgent = request.headers['user-agent'] || '';
    const correlationId = request.correlationId;

    const now = Date.now();

    this.logger.log(
      `📥 [${correlationId}] ${method} ${url} - User Agent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode || response.raw?.statusCode;
          const executionTime = Date.now() - now;

          this.logger.log(
            `📤 [${correlationId}] ${method} ${url} - Status: ${statusCode} - ${executionTime}ms`,
          );
        },
        error: (error) => {
          const executionTime = Date.now() - now;
          this.logger.error(
            `❌ [${correlationId}] ${method} ${url} - Error: ${error.message} - ${executionTime}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}
