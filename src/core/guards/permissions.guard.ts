import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_PERMISSION_KEY, ResourcePermissionConfig } from '../decorators/resource-permission.decorator';
import { RbacPermissionFilterService } from 'src/modules/rbac/rbac-permission-filter.service';

@Injectable()
export class ResourcePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: RbacPermissionFilterService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<ResourcePermissionConfig>(
      RESOURCE_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ✅ Get tenantId - may be NULL for global admins
    const tenantId = request.tenant?.id || request.user?.tenantId || null;

    const resourceId = config.extractResourceId
      ? config.extractResourceId(request)
      : request.params.id;

    // ✅ Check permission with nullable tenantId
    const hasPermission = await this.permissionsService.checkResourcePermission(
      user.id,
      tenantId, // ✅ Can be NULL
      config.resourceType,
      Number(resourceId),
      config.permissionType,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You don't have ${config.permissionType} permission for this ${config.resourceType}`
      );
    }

    return true;
  }
}