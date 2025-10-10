
// ============================================
// UPDATED core/interceptors/audit.interceptor.ts
// ============================================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from 'src/modules/global-modules/audit-logs/audit-logs.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip, headers } = request;

    // Skip audit for certain routes
    const skipAudit = ['/api/v1/auth/login', '/api/v1/health', '/api/v1/audit-logs'].some((path) =>
      url.includes(path),
    );

    if (skipAudit || !user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            await this.auditLogsService.createAuditLog({
              entityType: this.extractEntityType(url),
              entityId: this.extractEntityId(url, data),
              actionType: this.mapMethodToAction(method),
              newValues: body ? JSON.stringify(body) : null,
              userId: user?.id,
              sessionId: user?.sessionId,
              ipAddress: ip,
              userAgent: headers['user-agent'],
              organizationId: user?.organizationId,
              metadata: JSON.stringify({
                url,
                statusCode: context.switchToHttp().getResponse().statusCode,
              }),
            });
          } catch (error) {
            console.error('Audit logging failed:', error);
          }
        },
      }),
    );
  }

  private extractEntityType(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 2] || 'unknown';
  }

  private extractEntityId(url: string, data: any): bigint | null {
    const match = url.match(/\/(\d+)$/);
    if (match) return BigInt(match[1]);
    return data?.id ? BigInt(data.id) : null;
  }

  private mapMethodToAction(method: string): string {
    const mapping = {
      POST: 'CREATE',
      GET: 'READ',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return mapping[method] || 'UNKNOWN';
  }
}
