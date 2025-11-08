// modules/permissions/permissions.controller.ts - UPDATED
import { Controller, Post, Body } from '@nestjs/common';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../core/decorators';
import { PermissionsService } from './resource-permission.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) { }

  // ==================== RBAC PERMISSIONS ====================
  @Post('list')
  @Permissions('permissions:read')
  async listPermissions(@Body() filters: any) {
    return this.permissionsService.listPermissions(filters);
  }

  @Post('get')
  @Permissions('permissions:read')
  async getPermission(@Body() body: { permissionId: number }) {
    return this.permissionsService.getPermissionById(Number(body.permissionId));
  }

  @Post('create')
  @Permissions('permissions:create')
  async createPermission(
    @Body() dto: any,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.permissionsService.createPermission(dto, userId, userType);
  }

  @Post('delete')
  @Permissions('permissions:delete')
  async deletePermission(
    @Body() body: { permissionId: number },
    @CurrentUser('userType') userType: string
  ) {
    return this.permissionsService.deletePermission(
      Number(body.permissionId),
      userType
    );
  }

  // ==================== RESOURCE PERMISSIONS ====================
  @Post('grant')
  async grantResourcePermission(
    @Body() dto: any,
    @CurrentUser('id') grantedBy: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.permissionsService.grantResourcePermission(
      dto,
      grantedBy,
      userType,
      tenantId
    );
  }

  @Post('revoke')
  async revokeResourcePermission(
    @Body() dto: any,
    @CurrentUser('id') revokedBy: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.permissionsService.revokeResourcePermission(
      dto,
      revokedBy,
      userType,
      tenantId
    );
  }

  @Post('check')
  async checkResourcePermission(
    @Body() dto: { resourceType: string; resourceId: number; permissionType: string },
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number
  ) {
    const hasPermission = await this.permissionsService.checkResourcePermission(
      userId,
      tenantId,
      dto.resourceType,
      Number(dto.resourceId),
      dto.permissionType
    );
    return { hasPermission };
  }

  @Post('check/batch')
  async checkBatchPermissions(
    @Body() dto: { checks: any[] },
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number
  ) {
    return this.permissionsService.checkBatchPermissions(dto.checks, userId, tenantId);
  }

  @Post('resource/list')
  async listResourcePermissions(
    @Body() dto: { resourceType: string; resourceId: number },
    @CurrentUser('id') requestorId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.permissionsService.listResourcePermissions(
      dto.resourceType,
      Number(dto.resourceId),
      requestorId,
      userType,
      tenantId
    );
  }

  // ==================== ACCESS CHECK ====================
  @Post('access/check')
  async checkAccess(
    @Body() dto: { resourceType: string; resourceId: number; permissionType: string },
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    const hasAccess = await this.permissionsService.checkAccess(
      userId,
      dto.resourceType,
      Number(dto.resourceId),
      dto.permissionType,
      userType,
      tenantId
    );
    return { hasAccess };
  }

  // ==================== SHARING ====================
  @Post('share/create')
  async createShare(
    @Body() dto: any,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.permissionsService.createShare(
      dto,
      userId,
      userType,
      tenantId
    );
  }

  @Post('share/access')
  async accessShare(
    @Body() dto: { shareToken: string; password?: string },
    @CurrentUser('id') userId?: number
  ) {
    return this.permissionsService.accessShare(
      dto.shareToken,
      dto.password,
      userId
    );
  }

  @Post('share/revoke')
  async revokeShare(
    @Body() dto: { shareId: number },
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.permissionsService.revokeShare(
      Number(dto.shareId),
      userId,
      userType
    );
  }

  @Post('share/list')
  async listShares(
    @Body() dto: { resourceType: string; resourceId: number },
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.permissionsService.listShares(
      dto.resourceType,
      Number(dto.resourceId),
      userId,
      userType,
      tenantId
    );
  }
}