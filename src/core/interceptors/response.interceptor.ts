
// ============================================
// FIX 5: core/interceptors/response.interceptor.ts
// ============================================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || response.raw?.statusCode || 200;
        
        return {
          success: true,
          statusCode,
          message: data?.message || 'Operation successful',
          data: data?.data || data,
          timestamp: new Date().toISOString(),
          correlationId: request.correlationId || 'unknown',
          path: request.url,
        };
      }),
    );
  }
}