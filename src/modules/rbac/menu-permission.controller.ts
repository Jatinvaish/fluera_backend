import { Controller, Post, Body } from '@nestjs/common';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { CurrentUser } from 'src/core/decorators';
import { LinkMenuPermissionDto, BulkLinkMenuPermissionsDto, GetUserMenuAccessDto } from './dto/rbac.dto';
import { MenuPermissionService } from './menu-permission.service';

@Controller('rbac/menu-permissions')
export class MenuPermissionController {
  constructor(private menuPermissionService: MenuPermissionService) { }

  @Post('link')
  @Permissions('rbac:manage')
  async linkMenuPermission(
    @Body() dto: LinkMenuPermissionDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.menuPermissionService.linkMenuPermission(
      dto.menuKey,
      BigInt(dto.permissionId),
      dto.isRequired ?? true,
      userId
    );
  }

  @Post('bulk-link')
  @Permissions('rbac:manage', 'rbac:write')
  async bulkLinkMenuPermissions(
    @Body() dto: BulkLinkMenuPermissionsDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.menuPermissionService.bulkLinkMenuPermissions(dto.mappings, userId);
  }

  @Post('user-access')
  @Permissions('rbac:read')
  async getUserAccessibleMenus(@Body() dto: GetUserMenuAccessDto) {
    return this.menuPermissionService.getUserAccessibleMenus(BigInt(dto.userId));
  }

  @Post('my-access')
  async getMyAccessibleMenus(@CurrentUser('id') userId: bigint) {
    return this.menuPermissionService.getUserAccessibleMenus(userId);
  }
}