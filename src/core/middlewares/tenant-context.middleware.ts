// src/core/middlewares/tenant-context.middleware.ts - NEW
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * ✅ Ensures tenantId and userType are always available on request object
 * This runs AFTER JWT authentication
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const request = req as any;

    if (request.user) {
      const user = request.user;

      // ✅ Handle global admins (NO tenant required)
      const isGlobalAdmin =
        user.userType === 'super_admin' ||
        user.userType === 'owner' ||
        user.userType === 'saas_admin';

      if (isGlobalAdmin) {
        // Check if acting on behalf of a tenant
        const requestedTenantId = request.headers['x-tenant-id'];

        if (requestedTenantId) {
          request.tenantId = parseInt(requestedTenantId, 10);
          this.logger.debug(
            `Global admin ${user.id} acting as tenant ${request.tenantId}`
          );
        } else {
          request.tenantId = null; // ✅ NULL is VALID for global operations
          this.logger.debug(`Global admin ${user.id} performing global operation`);
        }

        request.userType = user.userType;
        request.isGlobalAdmin = true; // ✅ NEW FLAG

      } else {
        // ✅ Regular users MUST have tenant
        request.tenantId = user.tenantId;
        request.userType = user.userType;
        request.isGlobalAdmin = false;

        if (!request.tenantId) {
          this.logger.error(
            `❌ Regular user ${user.id} has no tenant assignment`
          );
        }
      }
    }

    next();
  }
}