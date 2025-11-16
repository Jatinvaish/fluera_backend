// ============================================
// src/core/decorators/current-user.decorator.ts - ENHANCED
// ============================================
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() - Get entire user object
 * @CurrentUser('id') - Get user.id
 * @CurrentUser('email') - Get user.email
 * @CurrentUser('roles') - Get user.roles array
 * @CurrentUser('permissions') - Get user.permissions array
 * @CurrentUser('tenantId') - Get active tenant ID
 * @CurrentUser('isSuperAdmin') - Get super admin status
 */
export const CurrentUser = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      console.warn('⚠️ CurrentUser decorator: request.user is undefined');
      return null;
    }
    
    return property ? user[property] : user;
  },
);
