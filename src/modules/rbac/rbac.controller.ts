// modules/rbac/rbac.controller.ts - UPDATED
import { Controller, Post, Body } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../core/decorators';

@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  // ==================== ROLES MANAGEMENT ====================
  @Post('roles/list')
  @Permissions('roles:read')
  async listRoles(
    @Body() body: any,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return await this.rbacService.listRoles(body, userType, tenantId);
  }

  @Post('roles/get')
  @Permissions('roles:read')
  async getRole(
    @Body() body: { roleId: number },
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return await this.rbacService.getRoleById(
      BigInt(body.roleId),
      userType,
      tenantId
    );
  }

  @Post('roles/create')
  @Permissions('roles:create')
  async createRole(
    @Body() body: any,
    @CurrentUser('id') userId: bigint,
    @TenantId() tenantId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return await this.rbacService.createRole(
      body,
      userId,
      tenantId,
      userType
    );
  }

  @Post('roles/update')
  @Permissions('roles:write')
  async updateRole(
    @Body() body: any,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return await this.rbacService.updateRole(
      BigInt(body.roleId),
      body,
      userId,
      userType,
      tenantId
    );
  }

  @Post('roles/delete')
  @Permissions('roles:delete')
  async deleteRole(
    @Body() body: { roleId: number },
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return await this.rbacService.deleteRole(
      BigInt(body.roleId),
      userId,
      userType,
      tenantId
    );
  }

  // ==================== ROLE PERMISSIONS - HIERARCHICAL ====================
  
  @Post('roles/permissions/tree')
  @Permissions('role-permissions:read')
  async getRolePermissionsTree(
    @Body() body: { roleId: number },
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return this.rbacService.getRolePermissionsTree(
      BigInt(body.roleId),
      userType,
      tenantId
    );
  }

  @Post('roles/permissions/bulk-assign')
  @Permissions('role-permissions:write')
  async bulkAssignPermissions(
    @Body() body: { 
      roleId: number; 
      changes: Array<{ mode: 'I' | 'D'; permissionId: number }> 
    },
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: bigint
  ) {
    return await this.rbacService.bulkAssignPermissions(
      BigInt(body.roleId),
      body.changes,
      userId,
      userType,
      tenantId
    );
  }

  // ==================== USER ROLES MANAGEMENT ====================
  
  @Post('users/roles/assign')
  @Permissions('user-roles:write')
  async assignRole(
    @Body() body: { userId: number; roleId: number },
    @CurrentUser('id') assignerId: bigint,
    @CurrentUser('userType') assignerType: string,
    @TenantId() assignerTenantId: bigint
  ) {
    return await this.rbacService.assignRoleToUser(
      BigInt(body.userId),
      BigInt(body.roleId),
      assignerId,
      assignerType,
      assignerTenantId
    );
  }

  @Post('users/roles/list')
  @Permissions('user-roles:read')
  async getUserRoles(
    @Body() body: { userId: number },
    @CurrentUser('userType') requestorType: string,
    @TenantId() requestorTenantId: bigint
  ) {
    return await this.rbacService.getUserRoles(
      BigInt(body.userId),
      requestorType,
      requestorTenantId
    );
  }

  @Post('users/roles/remove')
  @Permissions('user-roles:write')
  async removeRole(
    @Body() body: { userId: number; roleId: number },
    @CurrentUser('userType') requestorType: string,
    @TenantId() requestorTenantId: bigint
  ) {
    return await this.rbacService.removeRoleFromUser(
      BigInt(body.userId),
      BigInt(body.roleId),
      requestorType,
      requestorTenantId
    );
  }
}