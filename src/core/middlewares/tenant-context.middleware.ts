// src/core/middlewares/tenant-context.middleware.ts - PRODUCTION READY
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SqlServerService } from '../database/sql-server.service';

/**
 * ✅ UPDATED: Fetches tenant context from DB using user_id
 * No longer reads from headers - DB is single source of truth
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private sqlService: SqlServerService) {}

  async use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const request = req as any;

    if (request.user && request.user.id) {
      try {
        // ✅ FETCH FROM DB instead of headers
        const userContext = await this.fetchUserContext(request.user.id);

        if (userContext) {
          // ✅ Set context from DB
          request.tenantId = userContext.tenant_id;
          request.userType = userContext.user_type;
          request.isGlobalAdmin = this.isGlobalAdmin(userContext.user_type);
          request.userPermissions = userContext.permissions || [];
          
          this.logger.debug(
            `User ${request.user.id} context: tenant=${request.tenantId}, type=${request.userType}, isGlobal=${request.isGlobalAdmin}`
          );
        }
      } catch (error) {
        this.logger.error(`Failed to fetch user context: ${error.message}`);
      }
    }

    next();
  }

  /**
   * ✅ Fetch user context from database
   */
  private async fetchUserContext(userId: number) {
    try {
      const result = await this.sqlService.query(
        `SELECT 
          u.id,
          u.user_type,
          tm.tenant_id,
          (
            SELECT STRING_AGG(p.permission_key, ',') 
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = u.id AND ur.is_active = 1
          ) as permissions
        FROM users u
        LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
        WHERE u.id = @userId`,
        { userId }
      );

      if (result.length === 0) return null;

      return {
        tenant_id: result[0].tenant_id || null,
        user_type: result[0].user_type,
        permissions: result[0].permissions ? result[0].permissions.split(',') : []
      };
    } catch (error) {
      this.logger.error(`Error fetching user context: ${error.message}`);
      return null;
    }
  }

  private isGlobalAdmin(userType: string): boolean {
    return ['super_admin', 'owner', 'saas_admin'].includes(userType);
  }
}