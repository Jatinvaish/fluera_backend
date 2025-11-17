
// ============================================
// src/core/decorators/tenant-id.decorator.ts - ENHANCED
// ============================================
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @TenantId() - Get active tenant ID from:
 * 1. request.user.tenantId (from JWT)
 * 2. request.headers['x-tenant-id']
 * 3. request.tenantId (set by middleware)
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // ✅ For super_admin/owner/saas_admin - NULL is VALID
    if (user?.userType === 'super_admin' || 
        user?.userType === 'owner' || 
        user?.userType === 'saas_admin') {
      
      // Check if they're acting on behalf of a tenant (X-Tenant-ID header)
      const headerTenantId = request.headers['x-tenant-id'];
      if (headerTenantId) {
        const parsed = parseInt(headerTenantId, 10);
        if (!isNaN(parsed)) {
          return parsed; // Acting as tenant admin
        }
      }
      
      // No tenant - global operation (VALID)
      return null;
    }
    
    // Regular users MUST have tenantId
    if (user?.tenantId) {
      return user.tenantId;
    }
    
    // Fallback to header
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId) {
      const parsed = parseInt(headerTenantId, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    // ❌ Regular user without tenant - ERROR
    console.error(`❌ TenantId decorator: Regular user ${user?.id} has no tenant`);
    return null;
  },
);