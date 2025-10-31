
// ============================================
// src/core/decorators/tenant-id.decorator.ts - NEW V3.0
// ============================================
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || request.user?.tenantId || request.headers['x-tenant-id'];
  },
);