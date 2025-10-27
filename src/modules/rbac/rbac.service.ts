import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class RbacService {
  constructor(private sqlService: SqlServerService) { }

  // ============================================
  // ROLES
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

      // Result is array of recordsets: [data[], meta[]]
      if (!result || !Array.isArray(result) || result.length === 0) {
        return {
          data: [],
          meta: {
            currentPage: filters.page || 1,
            itemsPerPage: filters.limit || 10,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }

      const data = result[0] || [];
      const meta = result[1]?.[0] || {
        currentPage: filters.page || 1,
        itemsPerPage: filters.limit || 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };

      return {
        data:
          { rolesList: data, meta: meta },
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
    if (result.length === 0) throw new NotFoundException('Role not found');

    if (userType !== 'owner' && userType !== 'superadmin') {
      if (result[0].organization_id && result[0].organization_id !== organizationId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return result[0];
  }

  async createRole(dto: any, userId: bigint, organizationId: bigint, userType: string) {
    const result: any = await this.sqlService.query(
      `INSERT INTO roles (organization_id, name, display_name, description, color, hierarchy_level, created_by)
       OUTPUT INSERTED.*
       VALUES (@organizationId, @name, @displayName, @description, @color, @hierarchyLevel, @userId)`,
      {
        organizationId: dto.organizationId ? BigInt(dto.organizationId) : null,
        name: dto.name,
        displayName: dto.displayName || dto.name,
        description: dto.description || null,
        color: dto.color || null,
        hierarchyLevel: dto.hierarchyLevel || 0,
        userId
      }
    );
    return result[0];
  }

  async updateRole(roleId: bigint, dto: any, userId: bigint, userType: string, organizationId: bigint) {
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
      { roleId, displayName: dto.displayName, description: dto.description, color: dto.color, hierarchyLevel: dto.hierarchyLevel, userId }
    );
    if (result.length === 0) throw new NotFoundException('Role not found');
    return result[0];
  }

  async deleteRole(roleId: bigint, userId: bigint, userType: string, organizationId: bigint) {
    await this.getRoleById(roleId, userType, organizationId);

    const result: any = await this.sqlService.query(
      `DELETE FROM roles OUTPUT DELETED.* WHERE id = @roleId AND is_system_role = 0`,
      { roleId }
    );
    if (result.length === 0) throw new NotFoundException('Role not found or is system role');
    return { message: 'Role deleted successfully' };
  }

  // ============================================
  // ROLE PERMISSIONS
  // ============================================
  async assignPermissionsToRole(roleId: bigint, permissionIds: number[], userId: bigint, userType: string, organizationId: bigint) {
    await this.getRoleById(roleId, userType, organizationId);

    let assigned = 0;
    for (const permissionId of permissionIds) {
      try {
        await this.sqlService.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_by) VALUES (@roleId, @permissionId, @userId)`,
          { roleId, permissionId: BigInt(permissionId), userId }
        );
        assigned++;
      } catch (error) { }
    }

    await this.sqlService.query(
      `UPDATE roles SET permissions_count = (SELECT COUNT(*) FROM role_permissions WHERE role_id = @roleId) WHERE id = @roleId`,
      { roleId }
    );

    return { message: 'Permissions assigned', assigned, total: permissionIds.length };
  }

  async getRolePermissions(roleId: bigint, userType: string, organizationId: bigint) {
    await this.getRoleById(roleId, userType, organizationId);

    return this.sqlService.query(
      `SELECT p.*, rp.created_at as assignedat
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = @roleId
       ORDER BY p.category, p.resource, p.action`,
      { roleId }
    );
  }

  async removePermissionFromRole(roleId: bigint, permissionId: bigint, userType: string, organizationId: bigint) {
    await this.getRoleById(roleId, userType, organizationId);

    await this.sqlService.query(
      `DELETE FROM role_permissions WHERE role_id = @roleId AND permission_id = @permissionId`,
      { roleId, permissionId }
    );

    await this.sqlService.query(
      `UPDATE roles SET permissions_count = (SELECT COUNT(*) FROM role_permissions WHERE role_id = @roleId) WHERE id = @roleId`,
      { roleId }
    );

    return { message: 'Permission removed from role' };
  }

  // ============================================
  // USER ROLES
  // ============================================
  async assignRoleToUser(userId: bigint, roleId: bigint, assignedBy: bigint, assignerType: string, assignerOrgId: bigint) {
    const targetUser: any = await this.sqlService.query(
      `SELECT organization_id, user_type FROM users WHERE id = @userId`,
      { userId }
    );
    if (targetUser.length === 0) throw new NotFoundException('User not found');

    await this.getRoleById(roleId, assignerType, assignerOrgId);

    if (assignerType !== 'owner' && assignerType !== 'superadmin') {
      if (targetUser[0].organization_id !== assignerOrgId) {
        throw new ForbiddenException('Cannot assign roles outside your organization');
      }
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO user_roles (user_id, role_id, is_active, created_by) OUTPUT INSERTED.* VALUES (@userId, @roleId, 1, @assignedBy)`,
        { userId, roleId, assignedBy }
      );

      await this.sqlService.query(
        `UPDATE roles SET users_count = (SELECT COUNT(*) FROM user_roles WHERE role_id = @roleId AND is_active = 1) WHERE id = @roleId`,
        { roleId }
      );

      return result[0];
    } catch (error) {
      throw new Error('User already has this role');
    }
  }

  async getUserRoles(userId: bigint, requestorType: string, requestorOrgId: bigint) {
    if (requestorType !== 'owner' && requestorType !== 'superadmin') {
      const targetUser: any = await this.sqlService.query(
        `SELECT organization_id FROM users WHERE id = @userId`,
        { userId }
      );
      if (targetUser.length === 0 || targetUser[0].organization_id !== requestorOrgId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.sqlService.query(
      `SELECT r.*, ur.assigned_at, ur.is_active
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = @userId
       ORDER BY r.hierarchy_level DESC`,
      { userId }
    );
  }

  async removeRoleFromUser(userId: bigint, roleId: bigint, requestorType: string, requestorOrgId: bigint) {
    if (requestorType !== 'owner' && requestorType !== 'superadmin') {
      const targetUser: any = await this.sqlService.query(
        `SELECT organization_id FROM users WHERE id = @userId`,
        { userId }
      );
      if (targetUser.length === 0 || targetUser[0].organization_id !== requestorOrgId) {
        throw new ForbiddenException('Access denied');
      }
    }

    await this.sqlService.query(
      `DELETE FROM user_roles WHERE user_id = @userId AND role_id = @roleId`,
      { userId, roleId }
    );

    await this.sqlService.query(
      `UPDATE roles SET users_count = (SELECT COUNT(*) FROM user_roles WHERE role_id = @roleId AND is_active = 1) WHERE id = @roleId`,
      { roleId }
    );

    return { message: 'Role removed from user' };
  }

  // ============================================
  // SYSTEM SEED
  // ============================================
  async seedSystemRolesAndPermissions() {
    const permissions = [
      { name: 'superadmin:manage', resource: 'superadmin', action: 'manage', category: 'System', description: 'Full system access' },
      { name: 'agency:manage', resource: 'agency', action: 'manage', category: 'Agency', description: 'Manage agency' },
      { name: 'brand:manage', resource: 'brand', action: 'manage', category: 'Brand', description: 'Manage brand' },
      { name: 'creator:manage', resource: 'creator', action: 'manage', category: 'Creator', description: 'Manage creator' },
      { name: 'rbac:manage', resource: 'rbac', action: 'manage', category: 'RBAC', description: 'Manage RBAC' },
      { name: 'rbac:read', resource: 'rbac', action: 'read', category: 'RBAC', description: 'Read RBAC' },
    ];

    const createdPermissions: any[] = [];
    for (const perm of permissions) {
      try {
        const result: any = await this.sqlService.query(
          `INSERT INTO permissions (name, resource, action, description, category, is_system_permission)
           OUTPUT INSERTED.* VALUES (@name, @resource, @action, @description, @category, 1)`,
          perm
        );
        createdPermissions.push(result[0]);
      } catch (error) { }
    }

    const roles = [
      { name: 'super_admin', displayName: 'Super Admin', hierarchyLevel: 100, color: '#DC2626' },
      { name: 'agency_admin', displayName: 'Agency Admin', hierarchyLevel: 80, color: '#7C3AED' },
      { name: 'brand_admin', displayName: 'Brand Admin', hierarchyLevel: 70, color: '#2563EB' },
      { name: 'creator_admin', displayName: 'Creator Admin', hierarchyLevel: 60, color: '#16A34A' },
    ];

    const createdRoles: any[] = [];
    for (const role of roles) {
      try {
        const result: any = await this.sqlService.query(
          `INSERT INTO roles (name, display_name, hierarchy_level, color, is_system_role)
           OUTPUT INSERTED.* VALUES (@name, @displayName, @hierarchyLevel, @color, 1)`,
          role
        );
        createdRoles.push(result[0]);
      } catch (error) { }
    }

    return {
      message: 'System roles and permissions seeded',
      permissions: createdPermissions.length,
      roles: createdRoles.length
    };
  }
}