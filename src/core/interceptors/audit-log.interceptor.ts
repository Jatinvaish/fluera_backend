// src/core/interceptors/audit-log.interceptor.ts - FASTIFY VERSION
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SqlServerService } from '../database';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private databaseService: SqlServerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url, body } = request;
    const user = (request as any).user;
    const tenant = (request as any).tenant;

    // Only log state-changing operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - startTime;
        const reply = context.switchToHttp().getResponse<FastifyReply>();

        try {
          // Determine entity type and ID from URL
          const entityInfo = this.extractEntityInfo(url, body, data);

          await this.databaseService.execute('[dbo].[sp_CreateAuditLog]', {
            user_id: user?.id || null,
            tenant_id: tenant?.id || null,
            entity_type: entityInfo.entityType,
            entity_id: entityInfo.entityId,
            action_type: this.mapMethodToAction(method),
            old_values: null,
            new_values: JSON.stringify(body),
            ip_address: request.ip || request.socket.remoteAddress,
            user_agent: request.headers['user-agent'],
            session_id: request.headers['x-session-token'] as string || null,
            metadata: JSON.stringify({
              url,
              method,
              duration,
              statusCode: reply.statusCode,
            }),
          });
        } catch (error) {
          console.error('Failed to create audit log:', error);
        }
      }),
    );
  }

  private extractEntityInfo(url: string, body: any, data: any): {
    entityType: string;
    entityId: string | null;
  } {
    // Extract entity type from URL path
    const pathParts = url.split('/').filter((p) => p && !p.match(/^\d+$/));
    const entityType = pathParts[pathParts.length - 1] || 'unknown';

    // Try to extract ID from response or body
    const entityId = data?.id || body?.id || null;

    return { entityType, entityId };
  }

  private mapMethodToAction(method: string): string {
    const actionMap = {
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };
    return actionMap[method] || 'unknown';
  }
}