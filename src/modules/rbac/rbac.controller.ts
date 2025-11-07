// modules/rbac/rbac.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../core/decorators';
import {
  CreateRoleDto,
  UpdateRoleDto,
  ListRolesDto,
  GetRoleDto,
  DeleteRoleDto,
  CreatePermissionDto,
  ListPermissionsDto,
  GetPermissionDto,
  DeletePermissionDto,
  AssignPermissionsDto,
  BulkAssignPermissionsDto,
  GetRolePermissionsTreeDto,
  RemovePermissionsDto,
  AssignRoleToUserDto,
  GetUserRolesDto,
  RemoveRoleFromUserDto,
  GetUserEffectivePermissionsDto,
  LinkMenuPermissionDto,
  BulkLinkMenuPermissionsDto,
  UnlinkMenuPermissionDto,
  GetMenuPermissionsDto,
  ListMenuPermissionsDto,
  GetUserAccessibleMenusDto,
  CheckMenuAccessDto,
  GrantResourcePermissionDto,
  RevokeResourcePermissionDto,
  CheckResourcePermissionDto,
  CheckBatchPermissionsDto,
  ListResourcePermissionsDto,
  CreateRoleLimitDto,
  UpdateRoleLimitDto,
  GetRoleLimitsDto,
} from './dto/rbac.dto';

@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  // ==================== ROLES MANAGEMENT ====================

  @Post('roles/list')
  @Permissions('roles:read')
  async listRoles(
    @Body() dto: ListRolesDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.listRoles(dto, userType, tenantId);
  }

  @Post('roles/get')
  @Permissions('roles:read')
  async getRole(
    @Body() dto: GetRoleDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.getRoleById(BigInt(dto.roleId), userType, tenantId);
  }

  @Post('roles/create')
  @Permissions('roles:create')
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser('id') userId: bigint,
    @TenantId() tenantId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.createRole(dto, userId, tenantId, userType);
  }

  @Post('roles/update')
  @Permissions('roles:write')
  async updateRole(
    @Body() body: UpdateRoleDto & { roleId: number },
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    const { roleId, ...dto } = body;
    return this.rbacService.updateRole(BigInt(roleId), dto, userId, userType, tenantId);
  }

  @Post('roles/delete')
  @Permissions('roles:delete')
  async deleteRole(
    @Body() dto: DeleteRoleDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.deleteRole(BigInt(dto.roleId), userId, userType, tenantId);
  }

  // ==================== PERMISSIONS MANAGEMENT ====================

  @Post('permissions/list')
  @Permissions('permissions:read')
  async listPermissions(@Body() dto: ListPermissionsDto) {
    return this.rbacService.listPermissions(dto);
  }

  @Post('permissions/get')
  @Permissions('permissions:read')
  async getPermission(@Body() dto: GetPermissionDto) {
    return this.rbacService.getPermissionById(BigInt(dto.permissionId));
  }

  @Post('permissions/create')
  @Permissions('permissions:create')
  async createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.createPermission(dto, userId, userType);
  }

  @Post('permissions/delete')
  @Permissions('permissions:delete')
  async deletePermission(
    @Body() dto: DeletePermissionDto,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.deletePermission(BigInt(dto.permissionId), userType);
  }

  // ==================== ROLE-PERMISSIONS ====================

  @Post('roles/permissions/tree')
  @Permissions('role-permissions:read')
  async getRolePermissionsTree(
    @Body() dto: GetRolePermissionsTreeDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.getRolePermissionsTree(BigInt(dto.roleId), userType, tenantId);
  }

  @Post('roles/permissions/assign')
  @Permissions('role-permissions:write')
  async assignPermissions(
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.assignPermissions(BigInt(dto.roleId), dto.permissionKeys, userId, userType, tenantId);
  }

  @Post('roles/permissions/bulk-assign')
  @Permissions('role-permissions:write')
  async bulkAssignPermissions(
    @Body() dto: BulkAssignPermissionsDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.bulkAssignPermissions(BigInt(dto.roleId), dto.changes, userId, userType, tenantId);
  }

  @Post('roles/permissions/remove')
  @Permissions('role-permissions:write')
  async removePermissions(
    @Body() dto: RemovePermissionsDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.removePermissions(BigInt(dto.roleId), dto.permissionIds, userId, userType, tenantId);
  }

  // ==================== USER-ROLES ====================

  @Post('users/roles/assign')
  @Permissions('user-roles:write')
  async assignRole(
    @Body() dto: AssignRoleToUserDto,
    @CurrentUser('id') assignerId: bigint,
    @CurrentUser('userType') assignerType: string,
    @TenantId() assignerTenantId: bigint
  ) {
    return this.rbacService.assignRoleToUser(
      BigInt(dto.userId),
      BigInt(dto.roleId),
      assignerId,
      assignerType,
      assignerTenantId
    );
  }

  @Post('users/roles/list')
  @Permissions('user-roles:read')
  async getUserRoles(
    @Body() dto: GetUserRolesDto,
    @CurrentUser('userType') requestorType: string,
    @TenantId() requestorTenantId: bigint
  ) {
    return this.rbacService.getUserRoles(BigInt(dto.userId), requestorType, requestorTenantId);
  }

  @Post('users/roles/remove')
  @Permissions('user-roles:write')
  async removeRole(
    @Body() dto: RemoveRoleFromUserDto,
    @CurrentUser('userType') requestorType: string,
    @TenantId() requestorTenantId: bigint
  ) {
    return this.rbacService.removeRoleFromUser(BigInt(dto.userId), BigInt(dto.roleId), requestorType, requestorTenantId);
  }

  @Post('users/permissions/effective')
  @Permissions('user-roles:read')
  async getUserEffectivePermissions(
    @Body() dto: GetUserEffectivePermissionsDto,
    @CurrentUser('userType') requestorType: string,
    @TenantId() requestorTenantId: bigint
  ) {
    return this.rbacService.getUserEffectivePermissions(BigInt(dto.userId), requestorType, requestorTenantId);
  }

  // ==================== MENU-PERMISSIONS ====================

  @Post('menu-permissions/link')
  @Permissions('menu-permissions:write')
  async linkMenuPermission(
    @Body() dto: LinkMenuPermissionDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.linkMenuPermission(dto.menuKey, BigInt(dto.permissionId), dto?.isRequired ||true, userId, userType);
  }

  @Post('menu-permissions/bulk-link')
  @Permissions('menu-permissions:write')
  async bulkLinkMenuPermissions(
    @Body() dto: BulkLinkMenuPermissionsDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.bulkLinkMenuPermissions(dto.mappings, userId, userType);
  }

  @Post('menu-permissions/unlink')
  @Permissions('menu-permissions:write')
  async unlinkMenuPermission(
    @Body() dto: UnlinkMenuPermissionDto,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.unlinkMenuPermission(dto.menuKey, BigInt(dto.permissionId), userType);
  }

  @Post('menu-permissions/menu/get')
  @Permissions('menu-permissions:read')
  async getMenuPermissions(@Body() dto: GetMenuPermissionsDto) {
    return this.rbacService.getMenuPermissions(dto.menuKey);
  }

  @Post('menu-permissions/list')
  @Permissions('menu-permissions:read')
  async listMenuPermissions(@Body() dto: ListMenuPermissionsDto) {
    return this.rbacService.listMenuPermissions(dto);
  }

  @Post('menu-permissions/user-access')
  @Permissions('menu-permissions:read')
  async getUserAccessibleMenus(
    @Body() dto: GetUserAccessibleMenusDto,
    @CurrentUser('id') currentUserId: bigint
  ) {
    const targetUserId = dto.userId ? BigInt(dto.userId) : currentUserId;
    return this.rbacService.getUserAccessibleMenus(targetUserId);
  }

  // NO PERMISSION CHECK - Critical for menu loading
  @Post('menu-permissions/my-access')
  async getMyAccessibleMenus(@CurrentUser('id') userId: bigint) {
    return this.rbacService.getUserAccessibleMenus(userId);
  }

  @Post('menu-permissions/check-access')
  async checkMenuAccess(
    @Body() dto: CheckMenuAccessDto,
    @CurrentUser('id') currentUserId: bigint
  ) {
    const targetUserId = dto.userId ? BigInt(dto.userId) : currentUserId;
    const canAccess = await this.rbacService.canUserAccessMenu(targetUserId, dto.menuKey);

    return {
      success: true,
      data: {
        canAccess,
        menuKey: dto.menuKey,
        userId: targetUserId.toString(),
      },
      message: canAccess ? 'Access granted' : 'Access denied',
    };
  }

  // ==================== RESOURCE-PERMISSIONS ====================

  @Post('resource-permissions/grant')
  async grantResourcePermission(
    @Body() dto: GrantResourcePermissionDto,
    @CurrentUser('id') grantedBy: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.grantResourcePermission(dto, grantedBy, userType, tenantId);
  }

  @Post('resource-permissions/revoke')
  async revokeResourcePermission(
    @Body() dto: RevokeResourcePermissionDto,
    @CurrentUser('id') revokedBy: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.revokeResourcePermission(dto, revokedBy, userType, tenantId);
  }

  @Post('resource-permissions/check')
  async checkResourcePermission(
    @Body() dto: CheckResourcePermissionDto,
    @CurrentUser('id') userId: bigint,
    @TenantId() tenantId: bigint
  ) {
    const hasPermission = await this.rbacService.checkResourcePermission(
      userId,
      tenantId,
      dto.resourceType,
      BigInt(dto.resourceId),
      dto.permissionType
    );
    return { success: true, data: { hasPermission } };
  }

  @Post('resource-permissions/check-batch')
  async checkBatchPermissions(
    @Body() dto: CheckBatchPermissionsDto,
    @CurrentUser('id') userId: bigint,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.checkBatchPermissions(dto.checks, userId, tenantId);
  }

  @Post('resource-permissions/list')
  async listResourcePermissions(
    @Body() dto: ListResourcePermissionsDto,
    @CurrentUser('id') requestorId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.listResourcePermissions(
      dto.resourceType,
      BigInt(dto.resourceId),
      requestorId,
      userType,
      tenantId
    );
  }

  // ==================== ROLE-LIMITS ====================

  @Post('role-limits/create')
  @Permissions('role-limits:write')
  async createRoleLimit(
    @Body() dto: CreateRoleLimitDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.createRoleLimit(dto, userId, userType);
  }

  @Post('role-limits/update')
  @Permissions('role-limits:write')
  async updateRoleLimit(
    @Body() dto: UpdateRoleLimitDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.updateRoleLimit(dto, userId, userType);
  }

  @Post('role-limits/get')
  @Permissions('role-limits:read')
  async getRoleLimits(@Body() dto: GetRoleLimitsDto) {
    return this.rbacService.getRoleLimits(BigInt(dto.roleId));
  }
}