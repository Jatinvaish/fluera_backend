// src/common/guards/tenant.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SqlServerService } from '../database';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private databaseService: SqlServerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Extract tenant ID from header or subdomain
    const tenantId =
      request.headers['x-tenant-id'] ||
      this.extractTenantFromSubdomain(request.hostname);

    if (!tenantId) {
      throw new ForbiddenException('Tenant not specified');
    }

    // Check if user has access to this tenant
    const membership = await this.databaseService.query(
      `SELECT * FROM [dbo].[tenant_members] 
       WHERE user_id = @userId 
         AND tenant_id = @tenantId 
         AND status = 'active'`,
      { userId: user.id, tenantId },
    );

    if (membership.length === 0) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    // Attach tenant info to request
    request.tenant = {
      id: tenantId,
      role: membership[0].role_type,
    };

    return true;
  }

  private extractTenantFromSubdomain(hostname: string): string | null {
    // Example: agency123.fluera.com -> agency123
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }
}
