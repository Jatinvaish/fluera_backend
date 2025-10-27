// modules/rbac/rbac.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators';

@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  // ROLES
  @Post('roles/list')
  @Permissions('rbac:read')
  async listRoles(@Body() body: any, @CurrentUser('userType') userType: string, @CurrentUser('organizationId') organizationId: bigint) {
    const res = await this.rbacService.listRoles(body, userType, organizationId);
    return res;
  }

  @Post('roles/get')
  @Permissions('rbac:read')
  async getRole(@Body() body: { roleId: number }, @CurrentUser('userType') userType: string, @CurrentUser('organizationId') organizationId: bigint) {
    return await this.rbacService.getRoleById(BigInt(body.roleId), userType, organizationId);
  }

  @Post('roles/create')
  @Permissions('rbac:manage')
  async createRole(@Body() body: any, @CurrentUser('id') userId: bigint, @CurrentUser('organizationId') organizationId: bigint, @CurrentUser('userType') userType: string) {
    return await this.rbacService.createRole(body, userId, organizationId, userType);
  }

  @Post('roles/update')
  @Permissions('rbac:manage')
  async updateRole(@Body() body: any, @CurrentUser('id') userId: bigint, @CurrentUser('userType') userType: string, @CurrentUser('organizationId') organizationId: bigint) {
    return await this.rbacService.updateRole(BigInt(body.roleId), body, userId, userType, organizationId);
  }

  @Post('roles/delete')
  @Permissions('rbac:manage')
  async deleteRole(@Body() body: { roleId: number }, @CurrentUser('id') userId: bigint, @CurrentUser('userType') userType: string, @CurrentUser('organizationId') organizationId: bigint) {
    return await this.rbacService.deleteRole(BigInt(body.roleId), userId, userType, organizationId);
  }

  // ROLE PERMISSIONS
  @Post('roles/permissions/assign')
  @Permissions('rbac:manage')
  async assignPermissions(@Body() body: { roleId: number; permissionIds: number[] }, @CurrentUser('id') userId: bigint, @CurrentUser('userType') userType: string, @CurrentUser('organizationId') organizationId: bigint) {
    return await this.rbacService.assignPermissionsToRole(BigInt(body.roleId), body.permissionIds, userId, userType, organizationId);
  }

  @Post('roles/permissions/list')
  @Permissions('rbac:read')
  async getRolePermissions(@Body() body: { roleId: number }, @CurrentUser('userType') userType: string, @CurrentUser('organizationId') organizationId: bigint) {
    return this.rbacService.getRolePermissions(BigInt(body.roleId), userType, organizationId);
  }

  @Post('roles/permissions/remove')
  @Permissions('rbac:manage')
  async removePermission(@Body() body: { roleId: number; permissionId: number }, @CurrentUser('userType') userType: string, @CurrentUser('organizationId') organizationId: bigint) {
    return await  this.rbacService.removePermissionFromRole(BigInt(body.roleId), BigInt(body.permissionId), userType, organizationId);
  }

  // USER ROLES
  @Post('users/roles/assign')
  @Permissions('rbac:manage')
  async assignRole(@Body() body: { userId: number; roleId: number }, @CurrentUser('id') assignerId: bigint, @CurrentUser('userType') assignerType: string, @CurrentUser('organizationId') assignerOrgId: bigint) {
    return await this.rbacService.assignRoleToUser(BigInt(body.userId), BigInt(body.roleId), assignerId, assignerType, assignerOrgId);
  }

  @Post('users/roles/list')
  @Permissions('rbac:read')
  async getUserRoles(@Body() body: { userId: number }, @CurrentUser('userType') requestorType: string, @CurrentUser('organizationId') requestorOrgId: bigint) {
    return await this.rbacService.getUserRoles(BigInt(body.userId), requestorType, requestorOrgId);
  }

  @Post('users/roles/remove')
  @Permissions('rbac:manage')
  async removeRole(@Body() body: { userId: number; roleId: number }, @CurrentUser('userType') requestorType: string, @CurrentUser('organizationId') requestorOrgId: bigint) {
    return await this.rbacService.removeRoleFromUser(BigInt(body.userId), BigInt(body.roleId), requestorType, requestorOrgId);
  }

  // SEED
  @Post('seed/system-data')
  async seedSystemData() {
    return await  this.rbacService.seedSystemRolesAndPermissions();
  }
}
