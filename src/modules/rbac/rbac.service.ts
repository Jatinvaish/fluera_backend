// modules/rbac/rbac.service.ts - UPDATED
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class RbacService {
  constructor(private sqlService: SqlServerService) {}

  // ============================================
  // ROLES MANAGEMENT
  // ============================================
  async listRoles(filters: any, userType: string, tenantId: bigint) {
    try {
      // ✅ Build query based on user type
      let query = `
        SELECT 
          r.id,
          r.tenant_id,
          r.name,
          r.display_name,
          r.description,
          r.is_system_role,
          r.is_default,
          r.hierarchy_level,
          r.created_at,
          r.updated_at,
          (SELECT COUNT(*) FROM user_roles WHERE role_id = r.id AND is_active = 1) as users_count,
          (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permissions_count
        FROM roles r
        WHERE 1=1
      `;

      const params: any = {};

      // Filter by scope
      if (filters.scope === 'system') {
        query += ' AND r.is_system_role = 1';
      } else if (filters.scope === 'tenant') {
        query += ' AND r.tenant_id = @tenantId';
        params.tenantId = tenantId;
      } else if (filters.scope === 'all') {
        // Super admin sees all, others see system + their tenant roles
        if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
          query += ' AND (r.is_system_role = 1 OR r.tenant_id = @tenantId)';
          params.tenantId = tenantId;
        }
      }

      query += ' ORDER BY r.hierarchy_level DESC, r.name';

      // Add pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      params.offset = offset;
      params.limit = limit;

      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

      const roles = await this.sqlService.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM roles r WHERE 1=1';
      if (filters.scope === 'system') {
        countQuery += ' AND r.is_system_role = 1';
      } else if (filters.scope === 'tenant') {
        countQuery += ' AND r.tenant_id = @tenantId';
      } else if (filters.scope === 'all' && userType !== 'owner' && userType !== 'superadmin') {
        countQuery += ' AND (r.is_system_role = 1 OR r.tenant_id = @tenantId)';
      }

      const countResult: any = await this.sqlService.query(countQuery, { tenantId });
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: {
          rolesList: roles,
          meta: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: total,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async getRoleById(roleId: bigint, userType: string, tenantId: bigint) {
    const result: any = await this.sqlService.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM user_roles WHERE role_id = r.id AND is_active = 1) as users_count,
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permissions_count
       FROM roles r WHERE r.id = @roleId`,
      { roleId }
    );
    
    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    // Check access permissions
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      if (result[0].tenant_id && BigInt(result[0].tenant_id) !== BigInt(tenantId)) {
        throw new ForbiddenException('Access denied to this role');
      }
    }

    return { data: result[0] };
  }

  async createRole(dto: any, userId: bigint, tenantId: bigint, userType: string) {
    // System roles can only be created by super admins
    if (dto.isSystemRole && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('Only super admins can create system roles');
    }

    const result: any = await this.sqlService.query(
      `INSERT INTO roles (tenant_id, name, display_name, description, is_system_role, is_default, hierarchy_level, created_by)
       OUTPUT INSERTED.*
       VALUES (@tenantId, @name, @displayName, @description, @isSystemRole, @isDefault, @hierarchyLevel, @userId)`,
      {
        tenantId: dto.isSystemRole ? null : tenantId,
        name: dto.name,
        displayName: dto.displayName || dto.name,
        description: dto.description || null,
        isSystemRole: dto.isSystemRole || false,
        isDefault: dto.isDefault || false,
        hierarchyLevel: dto.hierarchyLevel || 0,
        userId
      }
    );
    return { data: result[0], message: 'Role created successfully' };
  }

  async updateRole(roleId: bigint, dto: any, userId: bigint, userType: string, tenantId: bigint) {
    // Verify access
    const role = await this.getRoleById(roleId, userType, tenantId);

    // Cannot modify system roles unless super admin
    if (role.data.is_system_role && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('Cannot modify system roles');
    }

    const result: any = await this.sqlService.query(
      `UPDATE roles SET
         display_name = COALESCE(@displayName, display_name),
         description = COALESCE(@description, description),
         hierarchy_level = COALESCE(@hierarchyLevel, hierarchy_level),
         updated_by = @userId,
         updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE id = @roleId`,
      { 
        roleId, 
        displayName: dto.displayName, 
        description: dto.description, 
        hierarchyLevel: dto.hierarchyLevel, 
        userId 
      }
    );

    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    return { data: result[0], message: 'Role updated successfully' };
  }

  async deleteRole(roleId: bigint, userId: bigint, userType: string, tenantId: bigint) {
    // Verify access
    const role = await this.getRoleById(roleId, userType, tenantId);

    // Cannot delete system roles
    if (role.data.is_system_role) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    // Check if role has users
    const usersCount: any = await this.sqlService.query(
      `SELECT COUNT(*) as count FROM user_roles WHERE role_id = @roleId AND is_active = 1`,
      { roleId }
    );

    if (usersCount[0]?.count > 0) {
      throw new BadRequestException(`Cannot delete role: ${usersCount[0].count} users are currently assigned to this role`);
    }

    // Delete role permissions first
    await this.sqlService.query(
      `DELETE FROM role_permissions WHERE role_id = @roleId`,
      { roleId }
    );

    const result: any = await this.sqlService.query(
      `DELETE FROM roles OUTPUT DELETED.* WHERE id = @roleId`,
      { roleId }
    );

    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    return { message: 'Role deleted successfully' };
  }

  // ============================================
  // ROLE PERMISSIONS - HIERARCHICAL TREE
  // ============================================
  async getRolePermissionsTree(roleId: bigint, userType: string, tenantId: bigint) {
    // Verify access
    await this.getRoleById(roleId, userType, tenantId);

    // Get all permissions with checked status for this role
    const permissions = await this.sqlService.query(
      `SELECT 
        p.id as permission_id,
        p.permission_key,
        p.resource,
        p.action,
        p.description,
        p.category,
        p.is_system_permission,
        CASE WHEN rp.permission_id IS NOT NULL THEN 1 ELSE 0 END as is_checked
       FROM permissions p
       LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = @roleId
       ORDER BY p.category, p.resource, p.action`,
      { roleId }
    );

    // Group permissions by category
    const grouped = this.groupPermissionsHierarchically(permissions);

    // Get summary
    const summary = {
      total_permissions: permissions.length,
      assigned_permissions: permissions.filter((p: any) => p.is_checked === 1).length,
      total_categories: grouped.length
    };

    return {
      success: true,
      data: {
        roleId,
        permissions_tree: grouped,
        summary
      }
    };
  }

  private groupPermissionsHierarchically(permissions: any[]) {
    const categories = new Map();

    permissions.forEach(perm => {
      const category = perm.category || 'Uncategorized';
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }

      categories.get(category).push({
        id: perm.permission_id,
        permission_key: perm.permission_key,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        is_checked: Boolean(perm.is_checked),
        is_system_permission: Boolean(perm.is_system_permission)
      });
    });

    // Convert to array
    const result: any[] = [];
    categories.forEach((perms, categoryName) => {
      result.push({
        category: categoryName,
        permissions: perms
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
    tenantId: bigint
  ) {
    // Verify access
    const role = await this.getRoleById(roleId, userType, tenantId);

    // Cannot modify system roles unless super admin
    if (role.data.is_system_role && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('Cannot modify permissions for system roles');
    }

    // Validate changes
    if (!Array.isArray(changes) || changes.length === 0) {
      throw new BadRequestException('Changes array is required and cannot be empty');
    }

    let assignedCount = 0;
    let deletedCount = 0;

    for (const change of changes) {
      if (!change.mode || !['I', 'D'].includes(change.mode)) {
        throw new BadRequestException('Each change must have a valid mode (I or D)');
      }
      if (!change.permissionId) {
        throw new BadRequestException('Each change must have a permissionId');
      }

      const permissionId = BigInt(change.permissionId);

      if (change.mode === 'I') {
        // Insert (assign permission)
        try {
          await this.sqlService.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_by)
             VALUES (@roleId, @permissionId, @userId)`,
            { roleId, permissionId, userId }
          );
          assignedCount++;
        } catch (error: any) {
          // Ignore if already exists
          if (!error.message?.includes('UNIQUE') && !error.message?.includes('duplicate')) {
            throw error;
          }
        }
      } else if (change.mode === 'D') {
        // Delete (remove permission)
        await this.sqlService.query(
          `DELETE FROM role_permissions WHERE role_id = @roleId AND permission_id = @permissionId`,
          { roleId, permissionId }
        );
        deletedCount++;
      }
    }

    // Get current total
    const totalResult: any = await this.sqlService.query(
      `SELECT COUNT(*) as total FROM role_permissions WHERE role_id = @roleId`,
      { roleId }
    );

    return {
      success: true,
      data: {
        assigned_permissions: assignedCount,
        deleted_permissions: deletedCount,
        total_changes: changes.length,
        current_total_permissions: totalResult[0]?.total || 0
      },
      message: 'Permissions updated successfully'
    };
  }

  // ============================================
  // USER ROLES MANAGEMENT
  // ============================================
  async assignRoleToUser(
    userId: bigint, 
    roleId: bigint, 
    assignedBy: bigint, 
    assignerType: string, 
    assignerTenantId: bigint
  ) {
    // Validate user exists and get tenant membership
    const targetUser: any = await this.sqlService.query(
      `SELECT tm.tenant_id, u.user_type 
       FROM users u
       LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
       WHERE u.id = @userId`,
      { userId }
    );

    if (targetUser.length === 0) {
      throw new NotFoundException('User not found');
    }

    // Validate role exists and access
    await this.getRoleById(roleId, assignerType, assignerTenantId);

    // Check tenant scope (non-super admins can only assign within their tenant)
    if (assignerType !== 'owner' && assignerType !== 'superadmin' && assignerType !== 'super_admin') {
      const userTenantId = targetUser[0].tenant_id;
      if (userTenantId && BigInt(userTenantId) !== BigInt(assignerTenantId)) {
        throw new ForbiddenException('Cannot assign roles to users outside your tenant');
      }
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO user_roles (user_id, role_id, is_active, created_by) 
         OUTPUT INSERTED.* 
         VALUES (@userId, @roleId, 1, @assignedBy)`,
        { userId, roleId, assignedBy }
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

  async getUserRoles(userId: bigint, requestorType: string, requestorTenantId: bigint) {
    // Check access
    if (requestorType !== 'owner' && requestorType !== 'superadmin' && requestorType !== 'super_admin') {
      const targetUser: any = await this.sqlService.query(
        `SELECT tm.tenant_id FROM users u
         LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
         WHERE u.id = @userId`,
        { userId }
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      const userTenantId = targetUser[0].tenant_id;
      if (userTenantId && BigInt(userTenantId) !== BigInt(requestorTenantId)) {
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
         r.is_system_role,
         (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permissions_count
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
    requestorTenantId: bigint
  ) {
    // Check access (same as getUserRoles)
    if (requestorType !== 'owner' && requestorType !== 'superadmin' && requestorType !== 'super_admin') {
      const targetUser: any = await this.sqlService.query(
        `SELECT tm.tenant_id FROM users u
         LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
         WHERE u.id = @userId`,
        { userId }
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      const userTenantId = targetUser[0].tenant_id;
      if (userTenantId && BigInt(userTenantId) !== BigInt(requestorTenantId)) {
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

    return { 
      success: true,
      message: 'Role removed from user successfully' 
    };
  }
}