// =====================================================
// UPDATED: modules/rbac/rbac.service.ts
// Cleaned up and optimized for role-permission management
// =====================================================

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class RbacService {
  constructor(private sqlService: SqlServerService) {}

  // ============================================
  // ROLES MANAGEMENT
  // ============================================
  async listRoles(filters: any, userType: string, organizationId: bigint) {
    try {
      const result = await this.sqlService.execute('sp_ListRoles', {
        userType,
        organizationId,
        scope: filters.scope || 'all',
        page: filters.page || 1,
        limit: filters.limit || 10
      });

      if (!result || !Array.isArray(result) || result.length === 0) {
        return {
          data: {
            rolesList: [],
            meta: {
              currentPage: filters.page || 1,
              itemsPerPage: filters.limit || 10,
              totalItems: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            }
          }
        };
      }

      return {
        data: {
          rolesList: result[0] || [],
          meta: result[1]?.[0] || {
            currentPage: filters.page || 1,
            itemsPerPage: filters.limit || 10,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async getRoleById(roleId: bigint, userType: string, organizationId: bigint) {
    const result: any = await this.sqlService.query(
      `SELECT * FROM roles WHERE id = @roleId`,
      { roleId }
    );
    
    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    // Check access permissions
    if (userType !== 'owner' && userType !== 'superadmin') {
      if (result[0].organization_id && result[0].organization_id !== organizationId) {
        throw new ForbiddenException('Access denied to this role');
      }
    }

    return { data: result[0] };
  }

  async createRole(dto: any, userId: bigint, organizationId: bigint, userType: string) {
    const result: any = await this.sqlService.query(
      `INSERT INTO roles (organization_id, name, display_name, description, color, hierarchy_level, created_by)
       OUTPUT INSERTED.*
       VALUES (@organizationId, @name, @displayName, @description, @color, @hierarchyLevel, @userId)`,
      {
        organizationId: dto.organizationId ? BigInt(dto.organizationId) : organizationId,
        name: dto.name,
        displayName: dto.displayName || dto.name,
        description: dto.description || null,
        color: dto.color || '#6366F1',
        hierarchyLevel: dto.hierarchyLevel || 0,
        userId
      }
    );
    return { data: result[0] };
  }

  async updateRole(roleId: bigint, dto: any, userId: bigint, userType: string, organizationId: bigint) {
    // Verify access
    await this.getRoleById(roleId, userType, organizationId);

    const result: any = await this.sqlService.query(
      `UPDATE roles SET
         display_name = COALESCE(@displayName, display_name),
         description = COALESCE(@description, description),
         color = COALESCE(@color, color),
         hierarchy_level = COALESCE(@hierarchyLevel, hierarchy_level),
         updated_by = @userId,
         updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE id = @roleId`,
      { 
        roleId, 
        displayName: dto.displayName, 
        description: dto.description, 
        color: dto.color, 
        hierarchyLevel: dto.hierarchyLevel, 
        userId 
      }
    );

    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    return { data: result[0] };
  }

  async deleteRole(roleId: bigint, userId: bigint, userType: string, organizationId: bigint) {
    // Verify access
    await this.getRoleById(roleId, userType, organizationId);

    // Check if role has users
    const usersCount: any = await this.sqlService.query(
      `SELECT COUNT(*) as count FROM user_roles WHERE role_id = @roleId AND is_active = 1`,
      { roleId }
    );

    if (usersCount[0]?.count > 0) {
      throw new BadRequestException(`Cannot delete role: ${usersCount[0].count} users are currently assigned to this role`);
    }

    const result: any = await this.sqlService.query(
      `DELETE FROM roles OUTPUT DELETED.* WHERE id = @roleId AND is_system_role = 0`,
      { roleId }
    );

    if (result.length === 0) {
      throw new NotFoundException('Role not found or is a system role');
    }

    return { message: 'Role deleted successfully' };
  }

  // ============================================
  // ROLE PERMISSIONS - HIERARCHICAL TREE
  // ============================================
  async getRolePermissionsTree(roleId: bigint, userType: string, organizationId: bigint) {
    // Verify access
    await this.getRoleById(roleId, userType, organizationId);

    try {
      const result = await this.sqlService.execute('sp_GetRolePermissionsTree', { roleId });

      if (!result || result.length === 0) {
        return {
          success: true,
          data: {
            role: null,
            permissions_tree: [],
            summary: {
              total_permissions: 0,
              assigned_permissions: 0,
              total_categories: 0
            }
          }
        };
      }

      const role = result[0]?.[0] || null;
      const permissions = result[1] || [];
      const summary = result[2]?.[0] || {
        total_permissions: 0,
        assigned_permissions: 0,
        total_categories: 0
      };

      // Group permissions by category and module for hierarchical display
      const grouped = this.groupPermissionsHierarchically(permissions);

      return {
        success: true,
        data: {
          role,
          permissions_tree: grouped,
          summary
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Helper method to group permissions hierarchically
  private groupPermissionsHierarchically(permissions: any[]) {
    const categories = new Map();

    permissions.forEach(perm => {
      const category = perm.category || 'Uncategorized';
      
      if (!categories.has(category)) {
        categories.set(category, new Map());
      }

      const modules = categories.get(category);
      const module = perm.module;

      if (!modules.has(module)) {
        modules.set(module, {
          module_name: module,
          parent_permissions: [],
          child_permissions: []
        });
      }

      const moduleData = modules.get(module);

      const permissionData = {
        id: perm.permission_id,
        name: perm.permission_name,
        action: perm.action,
        description: perm.description,
        is_checked: Boolean(perm.is_checked),
        is_system_permission: Boolean(perm.is_system_permission)
      };

      if (perm.is_child) {
        moduleData.child_permissions.push({
          ...permissionData,
          parent_id: perm.parent_permission_id
        });
      } else {
        moduleData.parent_permissions.push(permissionData);
      }
    });

    // Convert maps to arrays
    const result: any[] = [];
    categories.forEach((modules, categoryName) => {
      const modulesList: any[] = [];
      modules.forEach(moduleData => {
        modulesList.push(moduleData);
      });
      result.push({
        category: categoryName,
        modules: modulesList
      });
    });

    return result;
  }

  // ============================================
  // BULK ASSIGN PERMISSIONS
  // ============================================
  async bulkAssignPermissions(
    roleId: bigint,
    changes: Array<{ mode: 'I' | 'D'; permissionId: number }>,
    userId: bigint,
    userType: string,
    organizationId: bigint
  ) {
    // Verify access
    await this.getRoleById(roleId, userType, organizationId);

    // Validate changes array
    if (!Array.isArray(changes) || changes.length === 0) {
      throw new BadRequestException('Changes array is required and cannot be empty');
    }

    // Validate each change
    for (const change of changes) {
      if (!change.mode || !['I', 'D'].includes(change.mode)) {
        throw new BadRequestException('Each change must have a valid mode (I or D)');
      }
      if (!change.permissionId) {
        throw new BadRequestException('Each change must have a permissionId');
      }
    }

    const changesJson = JSON.stringify(changes);

    try {
      const result = await this.sqlService.execute('sp_BulkAssignRolePermissions', {
        roleId,
        changes: changesJson,
        userId
      });

      const summary = result[0]?.[0] || {
        assigned_count: 0,
        deleted_count: 0,
        total_changes: 0,
        current_total_permissions: 0
      };

      return {
        success: true,
        data: {
          assigned_permissions: summary.assigned_count,
          deleted_permissions: summary.deleted_count,
          total_changes: summary.total_changes,
          current_total_permissions: summary.current_total_permissions
        },
        message: 'Permissions updated successfully'
      };
    } catch (error: any) {
      if (error.message?.includes('Cannot modify system role')) {
        throw new ForbiddenException('Cannot modify permissions for system roles');
      }
      if (error.message?.includes('invalid')) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }
      throw error;
    }
  }

  // ============================================
  // USER ROLES MANAGEMENT
  // ============================================
  async assignRoleToUser(
    userId: bigint, 
    roleId: bigint, 
    assignedBy: bigint, 
    assignerType: string, 
    assignerOrgId: bigint
  ) {
    // Validate user exists
    const targetUser: any = await this.sqlService.query(
      `SELECT organization_id, user_type FROM users WHERE id = @userId`,
      { userId }
    );

    if (targetUser.length === 0) {
      throw new NotFoundException('User not found');
    }

    // Validate role exists and access
    await this.getRoleById(roleId, assignerType, assignerOrgId);

    // Check organization scope
    if (assignerType !== 'owner' && assignerType !== 'superadmin') {
      if (targetUser[0].organization_id !== assignerOrgId) {
        throw new ForbiddenException('Cannot assign roles to users outside your organization');
      }
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO user_roles (user_id, role_id, is_active, created_by) 
         OUTPUT INSERTED.* 
         VALUES (@userId, @roleId, 1, @assignedBy)`,
        { userId, roleId, assignedBy }
      );

      // Update users count on role
      await this.sqlService.query(
        `UPDATE roles 
         SET users_count = (SELECT COUNT(*) FROM user_roles WHERE role_id = @roleId AND is_active = 1),
             updated_at = GETUTCDATE()
         WHERE id = @roleId`,
        { roleId }
      );

      return {
        success: true,
        data: result[0],
        message: 'Role assigned to user successfully'
      };
    } catch (error: any) {
      if (error.message?.includes('UNIQUE') || error.message?.includes('duplicate')) {
        throw new BadRequestException('User already has this role assigned');
      }
      throw error;
    }
  }

  async getUserRoles(userId: bigint, requestorType: string, requestorOrgId: bigint) {
    // Check access
    if (requestorType !== 'owner' && requestorType !== 'superadmin') {
      const targetUser: any = await this.sqlService.query(
        `SELECT organization_id FROM users WHERE id = @userId`,
        { userId }
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      if (targetUser[0].organization_id !== requestorOrgId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const result = await this.sqlService.query(
      `SELECT 
         ur.id,
         ur.user_id,
         ur.role_id,
         ur.assigned_at,
         ur.is_active,
         ur.expires_at,
         r.name as role_name,
         r.display_name as role_display_name,
         r.hierarchy_level,
         r.color,
         r.permissions_count
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = @userId
       ORDER BY r.hierarchy_level DESC, ur.assigned_at DESC`,
      { userId }
    );

    return {
      success: true,
      data: result
    };
  }

  async removeRoleFromUser(
    userId: bigint, 
    roleId: bigint, 
    requestorType: string, 
    requestorOrgId: bigint
  ) {
    // Check access
    if (requestorType !== 'owner' && requestorType !== 'superadmin') {
      const targetUser: any = await this.sqlService.query(
        `SELECT organization_id FROM users WHERE id = @userId`,
        { userId }
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      if (targetUser[0].organization_id !== requestorOrgId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const result: any = await this.sqlService.query(
      `DELETE FROM user_roles 
       OUTPUT DELETED.*
       WHERE user_id = @userId AND role_id = @roleId`,
      { userId, roleId }
    );

    if (result.length === 0) {
      throw new NotFoundException('User role assignment not found');
    }

    // Update users count on role
    await this.sqlService.query(
      `UPDATE roles 
       SET users_count = (SELECT COUNT(*) FROM user_roles WHERE role_id = @roleId AND is_active = 1),
           updated_at = GETUTCDATE()
       WHERE id = @roleId`,
      { roleId }
    );

    return { 
      success: true,
      message: 'Role removed from user successfully' 
    };
  }
}