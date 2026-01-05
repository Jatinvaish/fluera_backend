// modules/rbac/rbac.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser, TenantId, Unencrypted } from '../../core/decorators';
import {
  CreateRoleDto,
  UpdateRoleDto,
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
  CloneRoleDto,
} from './dto/rbac.dto';

@Controller('rbac')
@Unencrypted()
export class RbacController {
  constructor(private rbacService: RbacService) { }

  // ==================== ROLES MANAGEMENT ====================

  @Post('roles/list')
  @Permissions('roles:read')
  async listRoles(
    @Body() dto: any,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    console.log("🚀 ~ RbacController ~ listRoles ~ tenantId:", tenantId)
    console.log("🚀 ~ RbacController ~ listRoles ~ userType:", userType)
    console.log("🚀 ~ RbacController ~ listRoles ~ dto:", dto)
    return this.rbacService.listRoles(dto, userType, tenantId);
  }

  @Post('roles/get')
  @Permissions('roles:read')
  async getRole(
    @Body() dto: GetRoleDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    console.log('getRoleById', dto.roleId)
    return this.rbacService.getRoleById(Number(dto.roleId), userType, tenantId);
  }

  @Post('roles/create')
  @Permissions('roles:create')
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.createRole(dto, userId, tenantId, userType);
  }

  @Post('roles/update')
  @Permissions('roles:write')
  async updateRole(
    @Body() body: UpdateRoleDto & { roleId: number },
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    const { roleId, ...dto } = body;
    return this.rbacService.updateRole(Number(roleId), dto, userId, userType, tenantId);
  }

  @Post('roles/delete')
  @Permissions('roles:delete')
  async deleteRole(
    @Body() dto: DeleteRoleDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.deleteRole(Number(dto.roleId), userId, userType, tenantId);
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
    return this.rbacService.getPermissionById(Number(dto.permissionId));
  }

  @Post('permissions/create')
  @Permissions('permissions:create')
  async createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('id') userId: number,
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
    return this.rbacService.deletePermission(Number(dto.permissionId), userType);
  }

  // ==================== ROLE-PERMISSIONS ====================

  @Post('roles/permissions/tree')
  @Permissions('role-permissions:read')
  @Unencrypted()
  async getRolePermissionsTree(
    @Body() dto: GetRolePermissionsTreeDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number // ✅ ADD THIS
  ) {
    return this.rbacService.getRolePermissionsTree(
      Number(dto.roleId),
      userType,
      tenantId,
      userId // ✅ PASS userId
    );
  }
  @Post('roles/permissions/assign')
  @Permissions('role-permissions:write')
  async assignPermissions(
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.assignPermissions(Number(dto.roleId), dto.permissionKeys, userId, userType, tenantId);
  }

  @Post('roles/permissions/bulk-assign')
  @Permissions('role-permissions:write')
  async bulkAssignPermissions(
    @Body() dto: BulkAssignPermissionsDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.bulkAssignPermissions(
      Number(dto.roleId),
      dto.changes,
      userId,
      userType,
      tenantId
    );
  }

  // ============================================
  // ADD NEW ENDPOINT: Get Assignable Permissions
  // ============================================
  @Post('permissions/assignable')
  @Permissions('permissions:read')
  async getAssignablePermissions(
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.getAssignablePermissionsForUser(userId, userType);
  }

  @Post('roles/permissions/remove')
  @Permissions('role-permissions:write')
  async removePermissions(
    @Body() dto: RemovePermissionsDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.removePermissions(Number(dto.roleId), dto.permissionIds, userId, userType, tenantId);
  }

  // ==================== USER-ROLES ====================

  @Post('users/roles/assign')
  @Permissions('user-roles:write')
  async assignRole(
    @Body() dto: AssignRoleToUserDto,
    @CurrentUser('id') assignerId: number,
    @CurrentUser('userType') assignerType: string,
    @TenantId() assignerTenantId: number
  ) {
    return this.rbacService.assignRoleToUser(
      Number(dto.userId),
      Number(dto.roleId),
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
    @TenantId() requestorTenantId: number
  ) {
    return this.rbacService.getUserRoles(Number(dto.userId), requestorType, requestorTenantId);
  }

  @Post('users/roles/remove')
  @Permissions('user-roles:write')
  async removeRole(
    @Body() dto: RemoveRoleFromUserDto,
    @CurrentUser('userType') requestorType: string,
    @TenantId() requestorTenantId: number
  ) {
    return this.rbacService.removeRoleFromUser(Number(dto.userId), Number(dto.roleId), requestorType, requestorTenantId);
  }

  @Post('users/permissions/effective')
  @Permissions('user-roles:read')
  async getUserEffectivePermissions(
    @Body() dto: GetUserEffectivePermissionsDto,
    @CurrentUser('userType') requestorType: string,
    @TenantId() requestorTenantId: number
  ) {
    return this.rbacService.getUserEffectivePermissions(Number(dto.userId), requestorType, requestorTenantId);
  }

  // ==================== MENU-PERMISSIONS ====================

  @Post('menu-permissions/link')
  @Permissions('menu-permissions:write')
  async linkMenuPermission(
    @Body() dto: LinkMenuPermissionDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.linkMenuPermission(dto.menuKey, Number(dto.permissionId), dto?.isRequired || true, userId, userType);
  }

  @Post('menu-permissions/bulk-link')
  @Permissions('menu-permissions:write')
  async bulkLinkMenuPermissions(
    @Body() dto: BulkLinkMenuPermissionsDto,
    @CurrentUser('id') userId: number,
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
    return this.rbacService.unlinkMenuPermission(dto.menuKey, Number(dto.permissionId), userType);
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
    @CurrentUser('id') currentUserId: number
  ) {
    const targetUserId = dto.userId ? Number(dto.userId) : currentUserId;
    return this.rbacService.getUserAccessibleMenus(targetUserId);
  }

  // NO PERMISSION CHECK - Critical for menu loading
  @Post('menu-permissions/my-access')
  async getMyAccessibleMenus(@CurrentUser('id') userId: number) {
    return this.rbacService.getUserAccessibleMenus(userId);
  }

  @Post('menu-permissions/check-access')
  async checkMenuAccess(
    @Body() dto: CheckMenuAccessDto,
    @CurrentUser('id') currentUserId: number
  ) {
    const targetUserId = dto.userId ? Number(dto.userId) : currentUserId;
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
    @CurrentUser('id') grantedBy: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.grantResourcePermission(dto, grantedBy, userType, tenantId);
  }

  @Post('resource-permissions/revoke')
  async revokeResourcePermission(
    @Body() dto: RevokeResourcePermissionDto,
    @CurrentUser('id') revokedBy: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.revokeResourcePermission(dto, revokedBy, userType, tenantId);
  }

  @Post('resource-permissions/check')
  async checkResourcePermission(
    @Body() dto: CheckResourcePermissionDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number
  ) {
    const hasPermission = await this.rbacService.checkResourcePermission(
      userId,
      tenantId,
      dto.resourceType,
      Number(dto.resourceId),
      dto.permissionType
    );
    return { success: true, data: { hasPermission } };
  }

  @Post('resource-permissions/check-batch')
  async checkBatchPermissions(
    @Body() dto: CheckBatchPermissionsDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.checkBatchPermissions(dto.checks, userId, tenantId);
  }

  @Post('resource-permissions/list')
  async listResourcePermissions(
    @Body() dto: ListResourcePermissionsDto,
    @CurrentUser('id') requestorId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.listResourcePermissions(
      dto.resourceType,
      Number(dto.resourceId),
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
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.createRoleLimit(dto, userId, userType);
  }

  @Post('role-limits/update')
  @Permissions('role-limits:write')
  async updateRoleLimit(
    @Body() dto: UpdateRoleLimitDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacService.updateRoleLimit(dto, userId, userType);
  }

  @Post('role-limits/get')
  @Permissions('role-limits:read')
  async getRoleLimits(@Body() dto: GetRoleLimitsDto) {
    return this.rbacService.getRoleLimits(Number(dto.roleId));
  }
  @Post('roles/clone')
  @Permissions('roles:create')
  async cloneRole(
    @Body() dto: CloneRoleDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacService.cloneRole(
      dto.sourceRoleId,
      dto.newName,
      userId,
      tenantId,
      userType,
      {
        newDisplayName: dto.newDisplayName,
        description: dto.description,
        copyPermissions: dto.copyPermissions,
        copyLimits: dto.copyLimits,
      }
    );
  }
}