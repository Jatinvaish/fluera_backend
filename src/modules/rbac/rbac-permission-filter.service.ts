// modules/rbac/rbac-permission-filter.service.ts - NEW HELPER
import { Injectable } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class RbacPermissionFilterService {
  constructor(private sqlService: SqlServerService) {}

  /**
   * ✅ Check if user is global admin
   */
  isGlobalAdmin(userType: string): boolean {
    return ['super_admin', 'owner', 'saas_admin'].includes(userType);
  }

  /**
   * ✅ Check if role is system role
   */
  isSystemRole(roleId: number, roles: any[]): boolean {
    const role = roles.find(r => r.id === roleId);
    return role?.is_system_role === true;
  }

  /**
   * ✅ Get user's effective permissions
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const result: any = await this.sqlService.query(
      `SELECT DISTINCT p.permission_key
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = @userId AND ur.is_active = 1`,
      { userId }
    );

    return result.map((r: any) => r.permission_key);
  }

  /**
   * ✅ Filter permissions tree based on user's permissions
   * Non-super admin can only see/modify permissions they have
   */
  filterPermissionsTree(
    permissionsTree: any,
    userType: string,
    userPermissions: string[]
  ): any {
    // Super admin sees everything
    if (this.isGlobalAdmin(userType)) {
      return permissionsTree;
    }

    // Filter permissions by what user has
    const userPermSet = new Set(userPermissions);
    
    return {
      ...permissionsTree,
      permissions_tree: permissionsTree.permissions_tree.map((category: any) => ({
        ...category,
        permissions: category.permissions.map((perm: any) => ({
          ...perm,
          // ✅ Mark as readonly if user doesn't have this permission
          is_readonly: !userPermSet.has(perm.permission_key),
        }))
      }))
    };
  }

  /**
   * ✅ Check if user can assign a permission
   * User can only assign permissions they already have
   */
  canAssignPermission(
    userType: string,
    userPermissions: string[],
    permissionKey: string
  ): boolean {
    // Super admin can assign anything
    if (this.isGlobalAdmin(userType)) {
      return true;
    }

    // Non-super admin can only assign permissions they have
    return userPermissions.includes(permissionKey);
  }

  /**
   * ✅ Check if user can modify a role
   * System roles are locked for non-super admin
   */
  canModifyRole(userType: string, role: any): boolean {
    // Super admin can modify anything
    if (this.isGlobalAdmin(userType)) {
      return true;
    }

    // Non-super admin cannot modify system roles
    return !role.is_system_role;
  }

  /**
   * ✅ Filter permission changes to only allowed ones
   */
  filterPermissionChanges(
    changes: Array<{ mode: 'I' | 'D'; permissionId: number }>,
    userType: string,
    userPermissions: string[],
    allPermissions: any[]
  ): Array<{ mode: 'I' | 'D'; permissionId: number }> {
    // Super admin can make any changes
    if (this.isGlobalAdmin(userType)) {
      return changes;
    }

    // Filter to only permissions user has
    const userPermSet = new Set(userPermissions);
    
    return changes.filter(change => {
      const perm = allPermissions.find(p => p.id === change.permissionId);
      if (!perm) return false;
      
      return userPermSet.has(perm.permission_key);
    });
  }

  /**
   * ✅ Get assignable permissions for user
   * Returns only permissions the user has (for role creation)
   */
  async getAssignablePermissions(
    userId: number,
    userType: string
  ): Promise<any[]> {
    // Super admin can assign all permissions
    if (this.isGlobalAdmin(userType)) {
      const all: any = await this.sqlService.query(
        `SELECT * FROM permissions ORDER BY category, resource, action`
      );
      return all;
    }

    // Non-super admin can only assign permissions they have
    const result: any = await this.sqlService.query(
      `SELECT DISTINCT p.*
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = @userId AND ur.is_active = 1
       ORDER BY p.category, p.resource, p.action`,
      { userId }
    );

    return result;
  }
}