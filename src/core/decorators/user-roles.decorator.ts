// ============================================
// src/core/decorators/user-roles.decorator.ts
// ============================================
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @UserRoles() - Get user's roles array from request.user
 * 
 * @example
 * ```typescript
 * @Get('example')
 * async example(@UserRoles() roles: string[]) {
 *   // roles = ['agency_admin', 'user_manager']
 *   return { roles };
 * }
 * ```
 */
export const UserRoles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      console.warn('⚠️ UserRoles decorator: request.user is undefined');
      return [];
    }
    
    return user.roles || [];
  },
);
