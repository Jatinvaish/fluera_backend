// =====================================================
// UPDATED: modules/rbac/rbac.controller.ts
// Cleaned and optimized endpoints
// =====================================================

import { Controller, Post, Body } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators';

@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  // ==================== ROLES MANAGEMENT ====================
  @Post('roles/list')
  @Permissions('roles.read')
  async listRoles(
    @Body() body: any,
    @CurrentUser('userType') userType: string,
    @CurrentUser('organizationId') organizationId: bigint
  ) {
    return await this.rbacService.listRoles(body, userType, organizationId);
  }

  @Post('roles/get')
  @Permissions('roles.read')
  async getRole(
    @Body() body: { roleId: number },
    @CurrentUser('userType') userType: string,
    @CurrentUser('organizationId') organizationId: bigint
  ) {
    return await this.rbacService.getRoleById(
      BigInt(body.roleId),
      userType,
      organizationId
    );
  }

  @Post('roles/create')
  @Permissions('roles.create')
  async createRole(
    @Body() body: any,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
    @CurrentUser('userType') userType: string
  ) {
    return await this.rbacService.createRole(
      body,
      userId,
      organizationId,
      userType
    );
  }

  @Post('roles/update')
  @Permissions('roles.write')
  async updateRole(
    @Body() body: any,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @CurrentUser('organizationId') organizationId: bigint
  ) {
    return await this.rbacService.updateRole(
      BigInt(body.roleId),
      body,
      userId,
      userType,
      organizationId
    );
  }

  @Post('roles/delete')
  @Permissions('roles.delete')
  async deleteRole(
    @Body() body: { roleId: number },
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @CurrentUser('organizationId') organizationId: bigint
  ) {
    return await this.rbacService.deleteRole(
      BigInt(body.roleId),
      userId,
      userType,
      organizationId
    );
  }

  // ==================== ROLE PERMISSIONS - HIERARCHICAL ====================
  
  /**
   * Get permissions tree for a role (for Manage Permissions page)
   * Returns hierarchical structure grouped by category/module with checked state
   */
  @Post('roles/permissions/tree')
  @Permissions('role-permissions.read')
  async getRolePermissionsTree(
    @Body() body: { roleId: number },
    @CurrentUser('userType') userType: string,
    @CurrentUser('organizationId') organizationId: bigint
  ) {
    return this.rbacService.getRolePermissionsTree(
      BigInt(body.roleId),
      userType,
      organizationId
    );
  }

  /**
   * Bulk update role permissions (for Manage Permissions page)
   * Accepts array of changes: [{ mode: 'I', permissionId: 1 }, { mode: 'D', permissionId: 2 }]
   */
  @Post('roles/permissions/bulk-assign')
  @Permissions('role-permissions.write')
  async bulkAssignPermissions(
    @Body() body: { 
      roleId: number; 
      changes: Array<{ mode: 'I' | 'D'; permissionId: number }> 
    },
    @CurrentUser('id') userId: bigint,
    @CurrentUser('userType') userType: string,
    @CurrentUser('organizationId') organizationId: bigint
  ) {
    return await this.rbacService.bulkAssignPermissions(
      BigInt(body.roleId),
      body.changes,
      userId,
      userType,
      organizationId
    );
  }

  // ==================== USER ROLES MANAGEMENT ====================
  
  @Post('users/roles/assign')
  @Permissions('user-roles.write')
  async assignRole(
    @Body() body: { userId: number; roleId: number },
    @CurrentUser('id') assignerId: bigint,
    @CurrentUser('userType') assignerType: string,
    @CurrentUser('organizationId') assignerOrgId: bigint
  ) {
    return await this.rbacService.assignRoleToUser(
      BigInt(body.userId),
      BigInt(body.roleId),
      assignerId,
      assignerType,
      assignerOrgId
    );
  }

  @Post('users/roles/list')
  @Permissions('user-roles.read')
  async getUserRoles(
    @Body() body: { userId: number },
    @CurrentUser('userType') requestorType: string,
    @CurrentUser('organizationId') requestorOrgId: bigint
  ) {
    return await this.rbacService.getUserRoles(
      BigInt(body.userId),
      requestorType,
      requestorOrgId
    );
  }

  @Post('users/roles/remove')
  @Permissions('user-roles.write')
  async removeRole(
    @Body() body: { userId: number; roleId: number },
    @CurrentUser('userType') requestorType: string,
    @CurrentUser('organizationId') requestorOrgId: bigint
  ) {
    return await this.rbacService.removeRoleFromUser(
      BigInt(body.userId),
      BigInt(body.roleId),
      requestorType,
      requestorOrgId
    );
  }
}