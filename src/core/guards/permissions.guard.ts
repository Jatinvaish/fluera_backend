import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_PERMISSION_KEY, ResourcePermissionConfig } from '../decorators/resource-permission.decorator';
import { PermissionsService } from 'src/modules/permissions/resource-permission.service';

@Injectable()
export class ResourcePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
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
    const tenantId = request.tenant?.id || request.user?.tenantId;

    const resourceId = config.extractResourceId
      ? config.extractResourceId(request)
      : request.params.id;

    // ✅ USE SP FOR PERMISSION CHECK
    const hasPermission = await this.permissionsService.checkResourcePermission(
      user.id,
      tenantId,
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