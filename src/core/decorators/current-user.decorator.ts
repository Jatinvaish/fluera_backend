// src/core/decorators/current-user.decorator.ts - PRODUCTION READY
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() - Get entire user object with context
 * @CurrentUser('id') - Get user.id
 * @CurrentUser('permissions') - Get user's effective permissions
 * @CurrentUser('tenantId') - Get active tenant ID (can be null for super_admin)
 */
export const CurrentUser = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      console.warn('⚠️ CurrentUser decorator: request.user is undefined');
      return null;
    }

    // ✅ Enhance user object with context from middleware
    const enhancedUser = {
      ...user,
      tenantId: request.tenantId || null,
      userType: request.userType || user.user_type || user.userType,
      isGlobalAdmin: request.isGlobalAdmin || false,
      permissions: request.userPermissions || []
    };
    
    return property ? enhancedUser[property] : enhancedUser;
  },
);