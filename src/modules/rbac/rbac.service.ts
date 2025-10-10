
// ============================================
// modules/rbac/rbac.service.ts
// ============================================
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto } from './dto/rbac.dto';

@Injectable()
export class RbacService {
  constructor(private sqlService: SqlServerService) { }

  // ==================== ROLES ====================

  async getAllRoles() {
    return this.sqlService.query(`
      SELECT * FROM roles 
      ORDER BY hierarchy_level DESC, name
    `);
  }

  async getRoleById(id: bigint) {
    const result = await this.sqlService.query(
      'SELECT * FROM roles WHERE id = @id',
      { id }
    );
    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }
    return result[0];
  }

  async createRole(dto: CreateRoleDto, userId?: bigint, organizationId?: bigint) {
    const result = await this.sqlService.query(
      `INSERT INTO roles (organization_id, name, display_name, description, color, 
                          is_default, hierarchy_level, created_by)
       OUTPUT INSERTED.*
       VALUES (@organizationId, @name, @displayName, @description, @color, 
               @isDefault, @hierarchyLevel, @userId)`,
      {
        organizationId: organizationId || null,
        name: dto.name,
        displayName: dto.displayName || dto.name,
        description: dto.description || null,
        color: dto.color || null,
        isDefault: dto.isDefault || false,
        hierarchyLevel: dto.hierarchyLevel || 0,
        userId: userId || null,
      }
    );
    return result[0];
  }

  async updateRole(id: bigint, dto: UpdateRoleDto, userId: bigint) {
    const result = await this.sqlService.query(
      `UPDATE roles 
       SET display_name = COALESCE(@displayName, display_name),
           description = COALESCE(@description, description),
           color = COALESCE(@color, color),
           is_default = COALESCE(@isDefault, is_default),
           hierarchy_level = COALESCE(@hierarchyLevel, hierarchy_level),
           updated_by = @userId,
           updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE id = @id`,
      {
        id,
        displayName: dto.displayName,
        description: dto.description,
        color: dto.color,
        isDefault: dto.isDefault,
        hierarchyLevel: dto.hierarchyLevel,
        userId,
      }
    );
    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }
    return result[0];
  }

  async deleteRole(id: bigint) {
    const result = await this.sqlService.query(
      'DELETE FROM roles OUTPUT DELETED.* WHERE id = @id AND is_system_role = 0',
      { id }
    );
    if (result.length === 0) {
      throw new NotFoundException('Role not found or is a system role');
    }
    return { message: 'Role deleted successfully' };
  }

  // ==================== PERMISSIONS ====================

  async getAllPermissions() {
    return this.sqlService.query(`
      SELECT * FROM permissions 
      ORDER BY category, resource, action
    `);
  }

  async getPermissionById(id: bigint) {
    const result = await this.sqlService.query(
      'SELECT * FROM permissions WHERE id = @id',
      { id }
    );
    if (result.length === 0) {
      throw new NotFoundException('Permission not found');
    }
    return result[0];
  }

  async createPermission(dto: CreatePermissionDto, userId?: bigint) {
    const result = await this.sqlService.query(
      `INSERT INTO permissions (name, resource, action, description, category, created_by)
       OUTPUT INSERTED.*
       VALUES (@name, @resource, @action, @description, @category, @userId)`,
      {
        name: dto.name,
        resource: dto.resource,
        action: dto.action,
        description: dto.description || null,
        category: dto.category || null,
        userId: userId || null,
      }
    );
    return result[0];
  }

  async deletePermission(id: bigint) {
    const result = await this.sqlService.query(
      'DELETE FROM permissions OUTPUT DELETED.* WHERE id = @id AND is_system_permission = 0',
      { id }
    );
    if (result.length === 0) {
      throw new NotFoundException('Permission not found or is a system permission');
    }
    return { message: 'Permission deleted successfully' };
  }

  // ==================== ROLE PERMISSIONS ====================

  async assignPermissionsToRole(roleId: bigint, permissionIds: number[], userId: bigint) {
    const insertedPermissions = [];

    for (const permissionId of permissionIds) {
      try {
        const result = await this.sqlService.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_by)
           OUTPUT INSERTED.*
           VALUES (@roleId, @permissionId, @userId)`,
          { roleId, permissionId: BigInt(permissionId), userId }
        );
        //@ts-ignore
        insertedPermissions.push(result[0]);
      } catch (error) {
        // Skip if already exists
        console.log(`Permission ${permissionId} already assigned to role ${roleId}`);
      }
    }

    // Update role permission count
    await this.sqlService.query(
      `UPDATE roles 
       SET permissions_count = (SELECT COUNT(*) FROM role_permissions WHERE role_id = @roleId)
       WHERE id = @roleId`,
      { roleId }
    );

    return {
      message: 'Permissions assigned successfully',
      assigned: insertedPermissions.length,
      total: permissionIds.length,
    };
  }

  async getRolePermissions(roleId: bigint) {
    return this.sqlService.query(
      `SELECT p.*, rp.created_at as assigned_at
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = @roleId
       ORDER BY p.category, p.resource, p.action`,
      { roleId }
    );
  }

  async removePermissionFromRole(roleId: bigint, permissionId: bigint) {
    const result = await this.sqlService.query(
      'DELETE FROM role_permissions WHERE role_id = @roleId AND permission_id = @permissionId',
      { roleId, permissionId }
    );

    // Update role permission count
    await this.sqlService.query(
      `UPDATE roles 
       SET permissions_count = (SELECT COUNT(*) FROM role_permissions WHERE role_id = @roleId)
       WHERE id = @roleId`,
      { roleId }
    );

    return { message: 'Permission removed from role' };
  }

  // ==================== USER ROLES ====================

  async assignRoleToUser(userId: bigint, roleId: bigint, assignedBy: bigint) {
    try {
      const result = await this.sqlService.query(
        `INSERT INTO user_roles (user_id, role_id, is_active, created_by)
         OUTPUT INSERTED.*
         VALUES (@userId, @roleId, 1, @assignedBy)`,
        { userId, roleId, assignedBy }
      );

      // Update role user count
      await this.sqlService.query(
        `UPDATE roles 
         SET users_count = (SELECT COUNT(*) FROM user_roles WHERE role_id = @roleId AND is_active = 1)
         WHERE id = @roleId`,
        { roleId }
      );

      return result[0];
    } catch (error) {
      throw new ConflictException('User already has this role');
    }
  }

  async getUserRoles(userId: bigint) {
    return this.sqlService.query(
      `SELECT r.*, ur.assigned_at, ur.is_active
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = @userId
       ORDER BY r.hierarchy_level DESC`,
      { userId }
    );
  }

  async removeRoleFromUser(userId: bigint, roleId: bigint) {
    await this.sqlService.query(
      'DELETE FROM user_roles WHERE user_id = @userId AND role_id = @roleId',
      { userId, roleId }
    );

    // Update role user count
    await this.sqlService.query(
      `UPDATE roles 
       SET users_count = (SELECT COUNT(*) FROM user_roles WHERE role_id = @roleId AND is_active = 1)
       WHERE id = @roleId`,
      { roleId }
    );

    return { message: 'Role removed from user' };
  }

  // ==================== SEED SYSTEM DATA ====================

  async seedSystemRolesAndPermissions() {
    // Define system permissions
    const permissions = [
      // ABAC
      { name: 'abac:manage', resource: 'abac', action: 'manage', category: 'ABAC', description: 'Manage ABAC attributes and policies' },
      { name: 'abac:read', resource: 'abac', action: 'read', category: 'ABAC', description: 'Read ABAC attributes and policies' },
      { name: 'abac:evaluate', resource: 'abac', action: 'evaluate', category: 'ABAC', description: 'Evaluate ABAC policies' },

      // System Config
      { name: 'system_config:read', resource: 'system_config', action: 'read', category: 'System', description: 'Read system configuration' },
      { name: 'system_config:create', resource: 'system_config', action: 'create', category: 'System', description: 'Create system configuration' },
      { name: 'system_config:update', resource: 'system_config', action: 'update', category: 'System', description: 'Update system configuration' },
      { name: 'system_config:delete', resource: 'system_config', action: 'delete', category: 'System', description: 'Delete system configuration' },

      // Audit Logs
      { name: 'audit_logs:read', resource: 'audit_logs', action: 'read', category: 'Audit', description: 'Read audit logs' },
      { name: 'audit_logs:create', resource: 'audit_logs', action: 'create', category: 'Audit', description: 'Create audit logs' },

      // System Events
      { name: 'system_events:read', resource: 'system_events', action: 'read', category: 'System', description: 'Read system events' },
      { name: 'system_events:create', resource: 'system_events', action: 'create', category: 'System', description: 'Create system events' },

      // RBAC
      { name: 'rbac:manage', resource: 'rbac', action: 'manage', category: 'RBAC', description: 'Manage roles and permissions' },
      { name: 'rbac:read', resource: 'rbac', action: 'read', category: 'RBAC', description: 'Read roles and permissions' },

      // Users
      { name: 'users:read', resource: 'users', action: 'read', category: 'Users', description: 'Read users' },
      { name: 'users:create', resource: 'users', action: 'create', category: 'Users', description: 'Create users' },
      { name: 'users:update', resource: 'users', action: 'update', category: 'Users', description: 'Update users' },
      { name: 'users:delete', resource: 'users', action: 'delete', category: 'Users', description: 'Delete users' },
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
      try {
        const result: any = await this.sqlService.query(
          `INSERT INTO permissions (name, resource, action, description, category, is_system_permission)
           OUTPUT INSERTED.*
           VALUES (@name, @resource, @action, @description, @category, 1)`,
          perm
        );
        //@ts-ignore
        createdPermissions.push(result[0]);
      } catch (error) {
        console.log(`Permission ${perm.name} already exists`);
      }
    }

    // Define system roles
    const roles = [
      { name: 'super_admin', displayName: 'Super Admin', hierarchyLevel: 100, color: '#DC2626' },
      { name: 'admin', displayName: 'Admin', hierarchyLevel: 90, color: '#EA580C' },
      { name: 'agency_admin', displayName: 'Agency Admin', hierarchyLevel: 80, color: '#7C3AED' },
      { name: 'brand_admin', displayName: 'Brand Admin', hierarchyLevel: 70, color: '#2563EB' },
      { name: 'creator', displayName: 'Creator', hierarchyLevel: 60, color: '#16A34A' },
      { name: 'manager', displayName: 'Manager', hierarchyLevel: 50, color: '#0891B2' },
      { name: 'staff', displayName: 'Staff', hierarchyLevel: 40, color: '#6B7280' },
    ];

    const createdRoles = [];
    for (const role of roles) {
      try {
        const result: any = await this.sqlService.query(
          `INSERT INTO roles (name, display_name, hierarchy_level, color, is_system_role)
           OUTPUT INSERTED.*
           VALUES (@name, @displayName, @hierarchyLevel, @color, 1)`,
          role
        );
        //@ts-ignore
        createdRoles.push(result[0]);
      } catch (error) {
        console.log(`Role ${role.name} already exists`);
      }
    }

    // Assign all permissions to super_admin
    const superAdminRole = await this.sqlService.query(
      `SELECT id FROM roles WHERE name = 'super_admin'`
    );

    if (superAdminRole.length > 0) {
      const allPermissions = await this.getAllPermissions();
      for (const perm of allPermissions) {
        try {
          await this.sqlService.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES (@roleId, @permissionId)`,
            { roleId: superAdminRole[0].id, permissionId: perm.id }
          );
        } catch (error) {
          // Skip if already exists
        }
      }
    }

    // Assign common permissions to admin
    const adminRole = await this.sqlService.query(
      `SELECT id FROM roles WHERE name = 'admin'`
    );

    if (adminRole.length > 0) {
      const adminPermissions = ['abac:manage', 'abac:read', 'system_config:read',
        'audit_logs:read', 'rbac:manage', 'users:read',
        'users:create', 'users:update'];

      for (const permName of adminPermissions) {
        const perm = await this.sqlService.query(
          `SELECT id FROM permissions WHERE name = @name`,
          { name: permName }
        );
        if (perm.length > 0) {
          try {
            await this.sqlService.query(
              `INSERT INTO role_permissions (role_id, permission_id)
               VALUES (@roleId, @permissionId)`,
              { roleId: adminRole[0].id, permissionId: perm[0].id }
            );
          } catch (error) {
            // Skip if already exists
          }
        }
      }
    }

    return {
      message: 'System roles and permissions seeded successfully',
      permissions: createdPermissions.length,
      roles: createdRoles.length,
    };
  }
}