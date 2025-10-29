// modules/menu-permissions/menu-permissions.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators';
import { MenuPermissionsService } from './menu-permission.service';

@Controller('menu-permissions')
export class MenuPermissionsController {
  constructor(private menuPermissionsService: MenuPermissionsService) {}

  @Post('link')
  @Permissions('menu-permissions.write')
  async linkMenuPermission(
    @Body() dto: { menuKey: string; permissionId: number; isRequired?: boolean },
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.menuPermissionsService.linkMenuPermission(
      dto.menuKey,
      BigInt(dto.permissionId),
      dto.isRequired ?? true,
      userId,
      userType
    );
  }

  @Post('bulk-link')
  @Permissions('menu-permissions.write')
  async bulkLinkMenuPermissions(
    @Body() dto: { mappings: Array<{ menuKey: string; permissionId: number; isRequired?: boolean }> },
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.menuPermissionsService.bulkLinkMenuPermissions(
      dto.mappings,
      userId,
      userType
    );
  }

  @Post('unlink')
  @Permissions('menu-permissions.write')
  async unlinkMenuPermission(
    @Body() dto: { menuKey: string; permissionId: number },
    @CurrentUser('userType') userType: string
  ) {
    return this.menuPermissionsService.unlinkMenuPermission(
      dto.menuKey,
      BigInt(dto.permissionId),
      userType
    );
  }

  @Post('menu/get')
  @Permissions('menu-permissions.read')
  async getMenuPermissions(@Body() dto: { menuKey: string }) {
    return this.menuPermissionsService.getMenuPermissions(dto.menuKey);
  }

  @Post('list')
  @Permissions('menu-permissions.read')
  async listMenuPermissions(@Body() dto: any) {
    return this.menuPermissionsService.listMenuPermissions(dto);
  }

  @Post('user-access')
  @Permissions('menu-permissions.read')
  async getUserAccessibleMenus(
    @Body() dto: { userId?: number },
    @CurrentUser('id') currentUserId: bigint
  ) {
    const targetUserId = dto.userId ? BigInt(dto.userId) : currentUserId;
    return this.menuPermissionsService.getUserAccessibleMenus(targetUserId);
  }

  // NO PERMISSION CHECK - This is crucial for loading menu access
  @Post('my-access')
  async getMyAccessibleMenus(@CurrentUser('id') userId: bigint) {
    return this.menuPermissionsService.getUserAccessibleMenus(userId);
  }

  @Post('check-access')
  async checkMenuAccess(
    @Body() dto: { menuKey: string; userId?: number },
    @CurrentUser('id') currentUserId: bigint
  ) {
    const targetUserId = dto.userId ? BigInt(dto.userId) : currentUserId;
    const canAccess = await this.menuPermissionsService.canUserAccessMenu(
      targetUserId,
      dto.menuKey
    );

    return {
      success: true,
      data: {
        canAccess,
        menuKey: dto.menuKey,
        userId: targetUserId.toString()
      },
      message: canAccess ? 'Access granted' : 'Access denied'
    };
  }
}