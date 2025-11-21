// modules/rbac/rbac.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { RbacPermissionFilterService } from './rbac-permission-filter.service';
import { use } from 'passport';

@Injectable()
export class RbacService {
  constructor(
    private sqlService: SqlServerService,
    private filterService: RbacPermissionFilterService,
  ) {}

  // ============================================
  // ROLES MANAGEMENT
  // ============================================

  async listRoles(filters: any, userType: string, tenantId: number) {
    const result: any = await this.sqlService.execute('sp_ListRoles', {
      scope: filters.scope || 'all',
      tenantId,
      page: filters.page || 1,
      limit: filters.limit || 50,
      userType,
    });

    return {
      success: true,
      data: {
        rolesList: result[0] || [],
        meta: result[1]?.[0] || {
          currentPage: filters.page || 1,
          itemsPerPage: filters.limit || 50,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    };
  }

  async getRoleById(roleId: number, userType: string, tenantId: number) {
    console.log('roleIdasaaaaaaaaaaa', roleId);
    const result: any = await this.sqlService.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM user_roles WHERE role_id = r.id AND is_active = 1) as users_count,
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permissions_count
       FROM roles r WHERE r.id = @roleId`,
      { roleId },
    );

    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    if (
      userType !== 'owner' &&
      userType !== 'superadmin' &&
      userType !== 'super_admin'
    ) {
      if (
        result[0].tenant_id &&
        Number(result[0].tenant_id) !== Number(tenantId)
      ) {
        throw new ForbiddenException('Access denied to this role');
      }
    }

    return { success: true, data: result[0] };
  }

  async createRole(
    dto: any,
    userId: number,
    tenantId: number,
    userType: string,
  ) {
    if (dto.isSystemRole && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('Only super admins can create system roles');
    }

    try {
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
          userId,
        },
      );

      return {
        success: true,
        data: result[0],
        message: 'Role created successfully',
      };
    } catch (error: any) {
      if (
        error.message?.includes('UNIQUE') ||
        error.message?.includes('duplicate')
      ) {
        throw new ConflictException('Role with this name already exists');
      }
      throw error;
    }
  }

  async updateRole(
    roleId: number,
    dto: any,
    userId: number,
    userType: string,
    tenantId: number,
  ) {
    const role = await this.getRoleById(roleId, userType, tenantId);

    if (
      role.data.is_system_role &&
      userType !== 'owner' &&
      userType !== 'superadmin'
    ) {
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
        userId,
      },
    );

    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    return {
      success: true,
      data: result[0],
      message: 'Role updated successfully',
    };
  }

  async deleteRole(
    roleId: number,
    userId: number,
    userType: string,
    tenantId: number,
  ) {
    const role = await this.getRoleById(roleId, userType, tenantId);

    if (role.data.is_system_role) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    const usersCount: any = await this.sqlService.query(
      `SELECT COUNT(*) as count FROM user_roles WHERE role_id = @roleId AND is_active = 1`,
      { roleId },
    );

    if (usersCount[0]?.count > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${usersCount[0].count} users are currently assigned`,
      );
    }

    await this.sqlService.query(
      `DELETE FROM role_permissions WHERE role_id = @roleId`,
      { roleId },
    );

    const result: any = await this.sqlService.query(
      `DELETE FROM roles OUTPUT DELETED.* WHERE id = @roleId`,
      { roleId },
    );

    if (result.length === 0) {
      throw new NotFoundException('Role not found');
    }

    return { success: true, message: 'Role deleted successfully' };
  }

  // ============================================
  // PERMISSIONS MANAGEMENT
  // ============================================

  async listPermissions(filters: any) {
    const result: any = await this.sqlService.execute('sp_ListPermissions', {
      category: filters.category || null,
      scope: filters.scope || 'all',
      page: filters.page || 1,
      limit: filters.limit || 50,
    });

    return {
      success: true,
      data: {
        permissionsList: result[0] || [],
        meta: result[1]?.[0] || {},
      },
    };
  }

  async getPermissionById(id: number) {
    const result: any = await this.sqlService.query(
      `SELECT * FROM permissions WHERE id = @id`,
      { id },
    );

    if (result.length === 0) {
      throw new NotFoundException('Permission not found');
    }

    return { success: true, data: result[0] };
  }

  async createPermission(dto: any, userId: number, userType: string) {
    const isSystemPermission =
      userType === 'owner' || userType === 'superadmin';

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO permissions (permission_key, resource, action, description, category, is_system_permission, created_by)
         OUTPUT INSERTED.* 
         VALUES (@permissionKey, @resource, @action, @description, @category, @isSystemPermission, @userId)`,
        {
          permissionKey: `${dto.resource}:${dto.action}`,
          resource: dto.resource,
          action: dto.action,
          description: dto.description || null,
          category: dto.category || null,
          isSystemPermission,
          userId,
        },
      );

      return {
        success: true,
        data: result[0],
        message: 'Permission created successfully',
      };
    } catch (error: any) {
      if (
        error.message?.includes('UNIQUE') ||
        error.message?.includes('duplicate')
      ) {
        throw new ConflictException('Permission already exists');
      }
      throw error;
    }
  }

  async deletePermission(id: number, userType: string) {
    const systemCheck =
      userType === 'owner' || userType === 'superadmin'
        ? ''
        : 'AND is_system_permission = 0';

    const result: any = await this.sqlService.query(
      `DELETE FROM permissions OUTPUT DELETED.* WHERE id = @id ${systemCheck}`,
      { id },
    );

    if (result.length === 0) {
      throw new NotFoundException('Permission not found or cannot be deleted');
    }

    return { success: true, message: 'Permission deleted successfully' };
  }

  // ============================================
  // ROLE-PERMISSIONS
  // ============================================

  async getRolePermissionsTree(
    roleId: number,
    userType: string,
    tenantId: number,
    userId: number,
  ) {
    let permissions: any[] = [];

    if (userType === 'owner' || userType === 'super_admin') {
      // Super admin sees all permissions
      permissions = await this.sqlService.query(
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
        { roleId },
      );
    } else {
      // Regular users see only permissions they themselves have
      permissions = await this.sqlService.query(
        `SELECT DISTINCT
        p.id as permission_id,
        p.permission_key,
        p.resource,
        p.action,
        p.description,
        p.category,
        p.is_system_permission,
        CASE WHEN target_rp.permission_id IS NOT NULL THEN 1 ELSE 0 END as is_checked
       FROM permissions p
       INNER JOIN role_permissions user_rp ON p.id = user_rp.permission_id
       INNER JOIN user_roles ur ON user_rp.role_id = ur.role_id
       LEFT JOIN role_permissions target_rp ON p.id = target_rp.permission_id AND target_rp.role_id = @roleId
       WHERE ur.user_id = @userId 
         AND ur.is_active = 1
       ORDER BY p.category, p.resource, p.action`,
        { roleId, userId },
      );
    }

    const grouped = this.groupPermissionsHierarchically(permissions);

    return {
      success: true,
      data: {
        roleId,
        permissions_tree: grouped,
        summary: {
          total_permissions: permissions.length,
          assigned_permissions: permissions.filter(
            (p: any) => p.is_checked === 1,
          ).length,
          total_categories: grouped.length,
        },
      },
    };
  }

  private groupPermissionsHierarchically(permissions: any[]) {
    const categories = new Map();

    permissions.forEach((perm) => {
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
        is_system_permission: Boolean(perm.is_system_permission),
      });
    });

    const result: any[] = [];
    categories.forEach((perms, categoryName) => {
      result.push({
        category: categoryName,
        permissions: perms,
      });
    });

    return result;
  }

  async assignPermissions(
    roleId: number,
    permissionKeys: string[],
    userId: number,
    userType: string,
    tenantId: number,
  ) {
    const role = await this.getRoleById(roleId, userType, tenantId);

    if (
      role.data.is_system_role &&
      userType !== 'owner' &&
      userType !== 'superadmin'
    ) {
      throw new ForbiddenException(
        'Cannot modify permissions for system roles',
      );
    }

    const permissions = await this.sqlService.query(
      `SELECT id FROM permissions WHERE permission_key IN (${permissionKeys.map(() => '?').join(',')})`,
      permissionKeys,
    );

    let assignedCount = 0;
    for (const perm of permissions) {
      try {
        await this.sqlService.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_by)
           VALUES (@roleId, @permissionId, @userId)`,
          { roleId, permissionId: perm.id, userId },
        );
        assignedCount++;
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE')) throw error;
      }
    }

    return {
      success: true,
      data: { assigned_permissions: assignedCount },
      message: 'Permissions assigned successfully',
    };
  }

  async bulkAssignPermissions(
    roleId: number,
    changes: any[],
    userId: number,
    userType: string,
    tenantId: number,
  ) {
    const role = await this.getRoleById(roleId, userType, tenantId);

    if (
      role.data.is_system_role &&
      userType !== 'owner' &&
      userType !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Cannot modify permissions for system roles',
      );
    }

    let assignedCount = 0;
    let deletedCount = 0;

    for (const change of changes) {
      const permissionId = Number(change.permissionId);

      if (change.mode === 'I') {
        try {
          await this.sqlService.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_by)
             VALUES (@roleId, @permissionId, @userId)`,
            { roleId, permissionId, userId },
          );
          assignedCount++;
        } catch (error: any) {
          if (!error.message?.includes('UNIQUE')) throw error;
        }
      } else if (change.mode === 'D') {
        await this.sqlService.query(
          `DELETE FROM role_permissions WHERE role_id = @roleId AND permission_id = @permissionId`,
          { roleId, permissionId },
        );
        deletedCount++;
      }
    }

    const totalResult: any = await this.sqlService.query(
      `SELECT COUNT(*) as total FROM role_permissions WHERE role_id = @roleId`,
      { roleId },
    );

    return {
      success: true,
      data: {
        assigned_permissions: assignedCount,
        deleted_permissions: deletedCount,
        total_changes: changes.length,
        current_total_permissions: totalResult[0]?.total || 0,
      },
      message: 'Permissions updated successfully',
    };
  }

  async removePermissions(
    roleId: number,
    permissionIds: number[],
    userId: number,
    userType: string,
    tenantId: number,
  ) {
    const role = await this.getRoleById(roleId, userType, tenantId);

    if (
      role.data.is_system_role &&
      userType !== 'owner' &&
      userType !== 'superadmin'
    ) {
      throw new ForbiddenException(
        'Cannot modify permissions for system roles',
      );
    }

    await this.sqlService.query(
      `DELETE FROM role_permissions 
       WHERE role_id = @roleId AND permission_id IN (${permissionIds.join(',')})`,
      { roleId },
    );

    return {
      success: true,
      message: 'Permissions removed successfully',
    };
  }

  // ============================================
  // USER-ROLES
  // ============================================

  private async checkRoleHierarchy(
    assignerId: number,
    targetRoleId: number,
    assignerType: string,
  ): Promise<void> {
    // Super admins can assign any role
    if (
      assignerType === 'owner' ||
      assignerType === 'superadmin' ||
      assignerType === 'super_admin'
    ) {
      return;
    }

    // Get assigner's highest hierarchy level
    const assignerRoles: any = await this.sqlService.query(
      `SELECT MAX(r.hierarchy_level) as max_hierarchy
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = @userId AND ur.is_active = 1`,
      { userId: assignerId },
    );

    const assignerHierarchy = assignerRoles[0]?.max_hierarchy || 0;

    // Get target role hierarchy
    const targetRole: any = await this.sqlService.query(
      `SELECT hierarchy_level FROM roles WHERE id = @roleId`,
      { roleId: targetRoleId },
    );

    const targetHierarchy = targetRole[0]?.hierarchy_level || 0;

    // Check hierarchy
    if (targetHierarchy > assignerHierarchy) {
      throw new ForbiddenException(
        `Cannot assign role with hierarchy ${targetHierarchy}. Your maximum hierarchy is ${assignerHierarchy}`,
      );
    }
  }

  /**
   * ✅ UPDATE: Add hierarchy check to assignRoleToUser
   */
  async assignRoleToUser(
    userId: number,
    roleId: number,
    assignedBy: number,
    assignerType: string,
    assignerTenantId: number,
  ) {
    // ✅ ADD HIERARCHY CHECK
    await this.checkRoleHierarchy(assignedBy, roleId, assignerType);

    const targetUser: any = await this.sqlService.query(
      `SELECT tm.tenant_id, u.user_type 
     FROM users u
     LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
     WHERE u.id = @userId`,
      { userId },
    );

    if (targetUser.length === 0) {
      throw new NotFoundException('User not found');
    }

    await this.getRoleById(roleId, assignerType, assignerTenantId);

    if (
      assignerType !== 'owner' &&
      assignerType !== 'superadmin' &&
      assignerType !== 'super_admin'
    ) {
      const userTenantId = targetUser[0].tenant_id;
      if (userTenantId && Number(userTenantId) !== Number(assignerTenantId)) {
        throw new ForbiddenException(
          'Cannot assign roles to users outside your tenant',
        );
      }
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO user_roles (user_id, role_id, is_active, created_by) 
       OUTPUT INSERTED.* 
       VALUES (@userId, @roleId, 1, @assignedBy)`,
        { userId, roleId, assignedBy },
      );

      return {
        success: true,
        data: result[0],
        message: 'Role assigned to user successfully',
      };
    } catch (error: any) {
      if (
        error.message?.includes('UNIQUE') ||
        error.message?.includes('duplicate')
      ) {
        throw new ConflictException('User already has this role assigned');
      }
      throw error;
    }
  }

  async getUserRoles(
    userId: number,
    requestorType: string,
    requestorTenantId: number,
  ) {
    if (
      requestorType !== 'owner' &&
      requestorType !== 'superadmin' &&
      requestorType !== 'super_admin'
    ) {
      const targetUser: any = await this.sqlService.query(
        `SELECT tm.tenant_id FROM users u
         LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
         WHERE u.id = @userId`,
        { userId },
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      const userTenantId = targetUser[0].tenant_id;
      if (userTenantId && Number(userTenantId) !== Number(requestorTenantId)) {
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
      { userId },
    );

    return {
      success: true,
      data: result,
    };
  }

  async removeRoleFromUser(
    userId: number,
    roleId: number,
    requestorType: string,
    requestorTenantId: number,
  ) {
    if (
      requestorType !== 'owner' &&
      requestorType !== 'superadmin' &&
      requestorType !== 'super_admin'
    ) {
      const targetUser: any = await this.sqlService.query(
        `SELECT tm.tenant_id FROM users u
         LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
         WHERE u.id = @userId`,
        { userId },
      );

      if (targetUser.length === 0) {
        throw new NotFoundException('User not found');
      }

      const userTenantId = targetUser[0].tenant_id;
      if (userTenantId && Number(userTenantId) !== Number(requestorTenantId)) {
        throw new ForbiddenException('Access denied');
      }
    }

    const result: any = await this.sqlService.query(
      `DELETE FROM user_roles 
       OUTPUT DELETED.*
       WHERE user_id = @userId AND role_id = @roleId`,
      { userId, roleId },
    );

    if (result.length === 0) {
      throw new NotFoundException('User role assignment not found');
    }

    return {
      success: true,
      message: 'Role removed from user successfully',
    };
  }

  async getUserEffectivePermissions(
    userId: number,
    requestorType: string,
    requestorTenantId: number,
  ) {
    const roles = await this.getUserRoles(
      userId,
      requestorType,
      requestorTenantId,
    );

    const permissions = await this.sqlService.query(
      `SELECT DISTINCT
         p.id,
         p.permission_key,
         p.resource,
         p.action,
         p.category,
         p.description
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = @userId AND ur.is_active = 1
       ORDER BY p.category, p.permission_key`,
      { userId },
    );

    return {
      success: true,
      data: {
        userId,
        roles: roles.data,
        permissions,
      },
    };
  }

  // ============================================
  // MENU-PERMISSIONS
  // ============================================

  async linkMenuPermission(
    menuKey: string,
    permissionId: number,
    isRequired: boolean,
    createdBy: number,
    userType: string,
  ) {
    if (
      userType !== 'owner' &&
      userType !== 'superadmin' &&
      userType !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Only super admins can manage menu permissions',
      );
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by, created_at)
         OUTPUT INSERTED.*
         VALUES (@menuKey, @permissionId, @isRequired, @createdBy, GETUTCDATE())`,
        { menuKey, permissionId, isRequired, createdBy },
      );

      return {
        success: true,
        data: result[0],
        message: 'Menu permission linked successfully',
      };
    } catch (error: any) {
      if (
        error.message?.includes('UNIQUE') ||
        error.message?.includes('duplicate')
      ) {
        const updateResult: any = await this.sqlService.query(
          `UPDATE menu_permissions 
           SET is_required = @isRequired, updated_at = GETUTCDATE()
           OUTPUT INSERTED.*
           WHERE menu_key = @menuKey AND permission_id = @permissionId`,
          { menuKey, permissionId, isRequired },
        );

        return {
          success: true,
          data: updateResult[0],
          message: 'Menu permission updated successfully',
        };
      }
      throw error;
    }
  }

  async bulkLinkMenuPermissions(
    mappings: any[],
    createdBy: number,
    userType: string,
  ) {
    if (
      userType !== 'owner' &&
      userType !== 'superadmin' &&
      userType !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Only super admins can manage menu permissions',
      );
    }

    const menuKeys = [...new Set(mappings.map((m) => m.menuKey))];

    for (const menuKey of menuKeys) {
      await this.sqlService.query(
        `DELETE FROM menu_permissions WHERE menu_key = @menuKey`,
        { menuKey },
      );
    }

    const results: any[] = [];
    for (const mapping of mappings) {
      try {
        const result: any = await this.sqlService.query(
          `INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by, created_at)
           OUTPUT INSERTED.*
           VALUES (@menuKey, @permissionId, @isRequired, @createdBy, GETUTCDATE())`,
          {
            menuKey: mapping.menuKey,
            permissionId: Number(mapping.permissionId),
            isRequired: mapping.isRequired ?? true,
            createdBy,
          },
        );
        results.push(result[0]);
      } catch (error) {
        console.error('Error linking permission:', error);
      }
    }

    return {
      success: true,
      data: results,
      message: 'Menu permissions linked successfully',
      created: results.length,
      total: mappings.length,
    };
  }

  async unlinkMenuPermission(
    menuKey: string,
    permissionId: number,
    userType: string,
  ) {
    if (
      userType !== 'owner' &&
      userType !== 'superadmin' &&
      userType !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Only super admins can manage menu permissions',
      );
    }

    const result: any = await this.sqlService.query(
      `DELETE FROM menu_permissions 
       OUTPUT DELETED.* 
       WHERE menu_key = @menuKey AND permission_id = @permissionId`,
      { menuKey, permissionId },
    );

    if (result.length === 0) {
      throw new NotFoundException('Menu permission not found');
    }

    return {
      success: true,
      data: result[0],
      message: 'Menu permission unlinked successfully',
    };
  }

  async getMenuPermissions(menuKey: string) {
    const result = await this.sqlService.query(
      `SELECT 
         mp.id,
         mp.menu_key,
         mp.permission_id,
         mp.is_required,
         mp.created_at,
         p.permission_key,
         p.resource,
         p.action,
         p.category,
         p.description
       FROM menu_permissions mp
       INNER JOIN permissions p ON mp.permission_id = p.id
       WHERE mp.menu_key = @menuKey
       ORDER BY p.category, p.permission_key`,
      { menuKey },
    );

    return {
      success: true,
      data: result || [],
      message: 'Menu permissions retrieved successfully',
    };
  }

  async listMenuPermissions(dto: any) {
    const result: any = await this.sqlService.execute(
      'sp_ListMenuPermissions',
      {
        page: dto.page || 1,
        limit: dto.limit || 50,
        search: dto.search || null,
        menuKey: dto.menuKey || null,
        category: dto.category || null,
        sortBy: dto.sortBy || 'created_at',
        sortOrder: dto.sortOrder || 'DESC',
      },
    );

    return {
      success: true,
      data: {
        menuPermissionsList: result[0] || [],
        meta: result[1]?.[0] || {},
      },
      message: 'Menu permissions list retrieved successfully',
    };
  }

  async getUserAccessibleMenus(userId: number) {
    const result: any = await this.sqlService.execute(
      'sp_GetUserAccessibleMenus',
      { userId },
    );

    return {
      success: true,
      data: {
        userId,
        userPermissions: result[0] || [],
        accessibleMenus: (result[1] || []).map((m: any) => m.menu_key),
        blockedMenus: result[2] || [],
      },
      message: 'User accessible menus retrieved successfully',
    };
  }

  async canUserAccessMenu(userId: number, menuKey: string): Promise<boolean> {
    try {
      const result: any = await this.sqlService.query(
        `SELECT COUNT(*) as missingCount
         FROM menu_permissions mp
         WHERE mp.menu_key = @menuKey
           AND mp.is_required = 1
           AND NOT EXISTS (
             SELECT 1 
             FROM user_roles ur
             INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
             WHERE ur.user_id = @userId 
               AND rp.permission_id = mp.permission_id
               AND ur.is_active = 1
           )`,
        { userId, menuKey },
      );

      const missingCount = result[0]?.missingCount || 0;
      return missingCount === 0;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // RESOURCE-PERMISSIONS
  // ============================================

  async grantResourcePermission(
    dto: any,
    grantedBy: number,
    userType?: string,
    tenantId?: number,
  ) {
    const canGrant = await this.checkAccess(
      grantedBy,
      dto.resourceType,
      Number(dto.resourceId),
      'share',
      userType,
      tenantId,
    );

    if (!canGrant && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException(
        'You do not have permission to grant access to this resource',
      );
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO resource_permissions (
          resource_type, resource_id, entity_type, entity_id, 
          permission_type, granted_by, expires_at
        )
        OUTPUT INSERTED.*
        VALUES (@resourceType, @resourceId, @entityType, @entityId, @permissionType, @grantedBy, @expiresAt)`,
        {
          resourceType: dto.resourceType,
          resourceId: Number(dto.resourceId),
          entityType: dto.entityType,
          entityId: Number(dto.entityId),
          permissionType: dto.permissionType,
          grantedBy,
          expiresAt: dto.expiresAt || null,
        },
      );

      return {
        success: true,
        data: result[0],
        message: 'Resource permission granted successfully',
      };
    } catch (error: any) {
      if (
        error.message?.includes('UNIQUE') ||
        error.message?.includes('duplicate')
      ) {
        throw new ConflictException('This permission already exists');
      }
      throw error;
    }
  }

  async revokeResourcePermission(
    dto: any,
    revokedBy?: number,
    userType?: string,
    tenantId?: number,
  ) {
    if (revokedBy) {
      const canRevoke = await this.checkAccess(
        revokedBy,
        dto.resourceType,
        Number(dto.resourceId),
        'share',
        userType,
        tenantId,
      );

      if (!canRevoke && userType !== 'owner' && userType !== 'superadmin') {
        throw new ForbiddenException(
          'You do not have permission to revoke access to this resource',
        );
      }
    }

    try {
      await this.sqlService.query(
        `DELETE FROM resource_permissions 
         WHERE resource_type = @resourceType 
         AND resource_id = @resourceId 
         AND entity_type = @entityType 
         AND entity_id = @entityId
         ${dto.permissionType ? 'AND permission_type = @permissionType' : ''}`,
        {
          resourceType: dto.resourceType,
          resourceId: Number(dto.resourceId),
          entityType: dto.entityType,
          entityId: Number(dto.entityId),
          permissionType: dto.permissionType || null,
        },
      );

      return { success: true, message: 'Permission revoked successfully' };
    } catch (error) {
      throw error;
    }
  }

  async checkResourcePermission(
    userId: number,
    tenantId: number,
    resourceType: string,
    resourceId: number,
    permissionType: string,
  ): Promise<boolean> {
    const result = await this.sqlService.execute('sp_CheckResourcePermission', {
      userId,
      tenantId,
      resourceType,
      resourceId,
      permissionType,
    });

    const hasDirectPermission = result[0]?.has_permission > 0;
    const hasRolePermission = result[1]?.has_role_permission > 0;

    return hasDirectPermission || hasRolePermission;
  }

  // Continuing from checkBatchPermissions method...

  async checkBatchPermissions(checks: any[], userId: number, tenantId: number) {
    const results = await Promise.all(
      checks.map(async (check) => {
        const hasPermission = await this.checkResourcePermission(
          userId,
          tenantId,
          check.resourceType,
          Number(check.resourceId),
          check.permissionType,
        );

        return {
          resourceType: check.resourceType,
          resourceId: check.resourceId,
          permissionType: check.permissionType,
          hasPermission,
        };
      }),
    );

    return {
      success: true,
      data: results,
    };
  }

  async listResourcePermissions(
    resourceType: string,
    resourceId: number,
    requestorId: number,
    userType: string,
    tenantId: number,
  ) {
    const canView = await this.checkAccess(
      requestorId,
      resourceType,
      resourceId,
      'read',
      userType,
      tenantId,
    );

    if (
      !canView &&
      userType !== 'owner' &&
      userType !== 'superadmin' &&
      userType !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'You do not have permission to view permissions for this resource',
      );
    }

    const result = await this.sqlService.query(
      `SELECT 
         rp.id,
         rp.resource_type,
         rp.resource_id,
         rp.entity_type,
         rp.entity_id,
         rp.permission_type,
         rp.granted_by,
         rp.expires_at,
         rp.created_at,
         CASE 
           WHEN rp.entity_type = 'user' THEN u.email
           WHEN rp.entity_type = 'role' THEN r.display_name
         END as entity_name
       FROM resource_permissions rp
       LEFT JOIN users u ON rp.entity_type = 'user' AND rp.entity_id = u.id
       LEFT JOIN roles r ON rp.entity_type = 'role' AND rp.entity_id = r.id
       WHERE rp.resource_type = @resourceType 
         AND rp.resource_id = @resourceId
       ORDER BY rp.created_at DESC`,
      { resourceType, resourceId },
    );

    return {
      success: true,
      data: result || [],
    };
  }

  private async checkAccess(
    userId: number,
    resourceType: string,
    resourceId: number,
    permissionType: string,
    userType?: string,
    tenantId?: number,
  ): Promise<boolean> {
    // Super admins have access to everything
    if (
      userType === 'owner' ||
      userType === 'superadmin' ||
      userType === 'super_admin'
    ) {
      return true;
    }

    // Check resource-level permissions
    const hasResourcePermission = await this.checkResourcePermission(
      userId,
      tenantId!,
      resourceType,
      resourceId,
      permissionType,
    );

    return hasResourcePermission;
  }

  // ============================================
  // ROLE-LIMITS
  // ============================================

  async createRoleLimit(dto: any, createdBy: number, userType: string) {
    if (
      userType !== 'owner' &&
      userType !== 'superadmin' &&
      userType !== 'super_admin'
    ) {
      throw new ForbiddenException('Only super admins can create role limits');
    }

    // Verify role exists
    const roleExists: any = await this.sqlService.query(
      `SELECT id FROM roles WHERE id = @roleId`,
      { roleId: Number(dto.roleId) },
    );

    if (roleExists.length === 0) {
      throw new NotFoundException('Role not found');
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO role_limits (
          role_id, limit_type, limit_value, current_usage, 
          reset_period, last_reset_at, created_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @roleId, @limitType, @limitValue, 0, 
          @resetPeriod, GETUTCDATE(), @createdBy
        )`,
        {
          roleId: Number(dto.roleId),
          limitType: dto.limitType,
          limitValue: dto.limitValue,
          resetPeriod: dto.resetPeriod || 'never',
          createdBy,
        },
      );

      return {
        success: true,
        data: result[0],
        message: 'Role limit created successfully',
      };
    } catch (error: any) {
      if (
        error.message?.includes('UNIQUE') ||
        error.message?.includes('duplicate')
      ) {
        throw new ConflictException(
          'A limit for this role and type already exists',
        );
      }
      throw error;
    }
  }

  async updateRoleLimit(dto: any, updatedBy: number, userType: string) {
    if (
      userType !== 'owner' &&
      userType !== 'superadmin' &&
      userType !== 'super_admin'
    ) {
      throw new ForbiddenException('Only super admins can update role limits');
    }

    const result: any = await this.sqlService.query(
      `UPDATE role_limits 
       SET 
         limit_value = COALESCE(@limitValue, limit_value),
         reset_period = COALESCE(@resetPeriod, reset_period),
         updated_by = @updatedBy,
         updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE id = @limitId`,
      {
        limitId: Number(dto.limitId),
        limitValue: dto.limitValue,
        resetPeriod: dto.resetPeriod,
        updatedBy,
      },
    );

    if (result.length === 0) {
      throw new NotFoundException('Role limit not found');
    }

    return {
      success: true,
      data: result[0],
      message: 'Role limit updated successfully',
    };
  }

  async getRoleLimits(roleId: number) {
    const result = await this.sqlService.query(
      `SELECT 
         rl.*,
         r.name as role_name,
         r.display_name as role_display_name
       FROM role_limits rl
       INNER JOIN roles r ON rl.role_id = r.id
       WHERE rl.role_id = @roleId
       ORDER BY rl.limit_type`,
      { roleId },
    );

    return {
      success: true,
      data: result || [],
    };
  }

  async checkRoleLimit(roleId: number, limitType: string): Promise<boolean> {
    const result: any = await this.sqlService.query(
      `SELECT limit_value, current_usage, reset_period, last_reset_at
       FROM role_limits
       WHERE role_id = @roleId AND limit_type = @limitType`,
      { roleId, limitType },
    );

    if (result.length === 0) {
      return true; // No limit defined means unlimited
    }

    const limit = result[0];

    // Check if we need to reset the counter
    if (limit.reset_period !== 'never' && limit.last_reset_at) {
      const shouldReset = this.shouldResetLimit(
        new Date(limit.last_reset_at),
        limit.reset_period,
      );

      if (shouldReset) {
        await this.resetRoleLimitUsage(roleId, limitType);
        return true;
      }
    }

    return limit.current_usage < limit.limit_value;
  }

  async incrementRoleLimitUsage(roleId: number, limitType: string) {
    await this.sqlService.query(
      `UPDATE role_limits 
       SET current_usage = current_usage + 1,
           updated_at = GETUTCDATE()
       WHERE role_id = @roleId AND limit_type = @limitType`,
      { roleId, limitType },
    );
  }

  private async resetRoleLimitUsage(roleId: number, limitType: string) {
    await this.sqlService.query(
      `UPDATE role_limits 
       SET current_usage = 0,
           last_reset_at = GETUTCDATE(),
           updated_at = GETUTCDATE()
       WHERE role_id = @roleId AND limit_type = @limitType`,
      { roleId, limitType },
    );
  }

  private shouldResetLimit(lastReset: Date, resetPeriod: string): boolean {
    const now = new Date();
    const diffMs = now.getTime() - lastReset.getTime();

    switch (resetPeriod) {
      case 'daily':
        return diffMs >= 24 * 60 * 60 * 1000;
      case 'monthly':
        const monthDiff =
          (now.getFullYear() - lastReset.getFullYear()) * 12 +
          (now.getMonth() - lastReset.getMonth());
        return monthDiff >= 1;
      case 'yearly':
        return now.getFullYear() > lastReset.getFullYear();
      default:
        return false;
    }
  }

  // ============================================
  // HELPER METHODS FOR INVITATION FLOW
  // ============================================

  async validateRoleForInvitation(
    roleId: number,
    inviterType: string,
    inviterTenantId: number,
  ) {
    const role: any = await this.sqlService.query(
      `SELECT id, name, display_name, tenant_id, is_system_role, hierarchy_level
       FROM roles 
       WHERE id = @roleId`,
      { roleId },
    );

    if (role.length === 0) {
      throw new NotFoundException('Role not found');
    }

    const roleData = role[0];

    // Super admins can assign any role
    if (
      inviterType === 'owner' ||
      inviterType === 'superadmin' ||
      inviterType === 'super_admin'
    ) {
      return roleData;
    }

    // For tenant users, they can only assign roles from their own tenant
    if (
      roleData.tenant_id &&
      Number(roleData.tenant_id) !== Number(inviterTenantId)
    ) {
      throw new ForbiddenException(
        'You can only assign roles from your own tenant',
      );
    }

    // Cannot assign system roles unless you're a super admin
    if (roleData.is_system_role) {
      throw new ForbiddenException('You cannot assign system roles');
    }

    return roleData;
  }

  async getRolesByTenant(tenantId: number, includeSystem: boolean = false) {
    let query = `
      SELECT id, name, display_name, description, hierarchy_level, is_system_role, is_default
      FROM roles 
      WHERE tenant_id = @tenantId
    `;

    if (includeSystem) {
      query += ` OR is_system_role = 1`;
    }

    query += ` ORDER BY hierarchy_level DESC, name ASC`;

    const result = await this.sqlService.query(query, { tenantId });

    return {
      success: true,
      data: result || [],
    };
  }

  async getDefaultRoleForUserType(userType: string, tenantId?: number) {
    const result: any = await this.sqlService.query(
      `SELECT TOP 1 id, name, display_name
       FROM roles 
       WHERE is_default = 1 
         AND (tenant_id = @tenantId OR tenant_id IS NULL)
       ORDER BY 
         CASE WHEN tenant_id = @tenantId THEN 0 ELSE 1 END,
         hierarchy_level DESC`,
      { tenantId: tenantId || null },
    );

    if (result.length === 0) {
      throw new NotFoundException('No default role found for this user type');
    }

    return result[0];
  }
  async getAssignablePermissionsForUser(userId: number, userType: string) {
    const permissions = await this.filterService.getAssignablePermissions(
      userId,
      userType,
    );

    // Group by category
    const grouped = permissions.reduce((acc: any, perm: any) => {
      const cat = perm.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(perm);
      return acc;
    }, {});

    return {
      success: true,
      data: {
        permissions,
        groupedByCategory: grouped,
        totalAssignable: permissions.length,
        isGlobalAdmin: this.filterService.isGlobalAdmin(userType),
      },
      message: 'Assignable permissions retrieved successfully',
    };
  }
}
