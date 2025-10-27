// modules/menu-permissions/menu-permissions.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators';
import { MenuPermissionsService } from './menu-permission.service';

@Controller('menu-permissions')
export class MenuPermissionsController {
  constructor(private menuPermissionsService: MenuPermissionsService) {}

  @Post('link')
  @Permissions('rbac:manage')
  async linkMenuPermission(@Body() dto: any, @CurrentUser('id') userId: bigint, @CurrentUser('userType') userType: string) {
    return this.menuPermissionsService.linkMenuPermission(dto.menuKey, BigInt(dto.permissionId), dto.isRequired ?? true, userId, userType);
  }

  @Post('bulk-link')
  @Permissions('rbac:manage')
  async bulkLinkMenuPermissions(@Body() dto: { mappings: any[] }, @CurrentUser('id') userId: bigint, @CurrentUser('userType') userType: string) {
    return this.menuPermissionsService.bulkLinkMenuPermissions(dto.mappings, userId, userType);
  }

  @Post('unlink')
  @Permissions('rbac:manage')
  async unlinkMenuPermission(@Body() dto: any, @CurrentUser('userType') userType: string) {
    return this.menuPermissionsService.unlinkMenuPermission(dto.menuKey, BigInt(dto.permissionId), userType);
  }

  @Post('menu/get')
  @Permissions('rbac:read')
  async getMenuPermissions(@Body() dto: { menuKey: string }) {
    return this.menuPermissionsService.getMenuPermissions(dto.menuKey);
  }

  @Post('list')
  @Permissions('rbac:read')
  async listMenuPermissions(@Body() dto: any) {
    return this.menuPermissionsService.listMenuPermissions(dto);
  }

  @Post('user-access')
  @Permissions('rbac:read')
  async getUserAccessibleMenus(@Body() dto: { userId?: number }, @CurrentUser('id') currentUserId: bigint) {
    const targetUserId = dto.userId ? BigInt(dto.userId) : currentUserId;
    return this.menuPermissionsService.getUserAccessibleMenus(targetUserId);
  }

  @Post('my-access')
  async getMyAccessibleMenus(@CurrentUser('id') userId: bigint) {
    return this.menuPermissionsService.getUserAccessibleMenus(userId);
  }
}
