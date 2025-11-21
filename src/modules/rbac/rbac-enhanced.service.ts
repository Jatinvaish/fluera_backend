// modules/rbac/rbac-enhanced.service.ts - PART 1
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class RbacEnhancedService {
  constructor(private sqlService: SqlServerService) { }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async bulkAssignRolesToUser(
    userId: number,
    roleIds: number[],
    assignerId: number,
    assignerType: string,
    assignerTenantId: number
  ) {
    // Validate user exists
    const user: any = await this.sqlService.query(
      `SELECT u.id, u.user_type, tm.tenant_id
       FROM users u
       LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
       WHERE u.id = @userId`,
      { userId }
    );

    if (user.length === 0) {
      throw new NotFoundException('User not found');
    }

    const userTenantId = user[0].tenant_id;

    // Check tenant access
    if (assignerType !== 'owner' && assignerType !== 'superadmin' && assignerType !== 'super_admin') {
      if (userTenantId && Number(userTenantId) !== Number(assignerTenantId)) {
        throw new ForbiddenException('Cannot assign roles to users outside your tenant');
      }
    }

    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const roleId of roleIds) {
      try {
        // Validate role hierarchy
        await this.checkRoleHierarchy(assignerId, roleId, assignerType);

        // Validate role exists and tenant access
        const role: any = await this.sqlService.query(
          `SELECT id, name, display_name, tenant_id, is_system_role, hierarchy_level
           FROM roles WHERE id = @roleId`,
          { roleId }
        );

        if (role.length === 0) {
          results.push({ roleId, status: 'failed', reason: 'Role not found' });
          failedCount++;
          continue;
        }

        // Check if role already assigned
        const existing: any = await this.sqlService.query(
          `SELECT id FROM user_roles WHERE user_id = @userId AND role_id = @roleId AND is_active = 1`,
          { userId, roleId }
        );

        if (existing.length > 0) {
          results.push({ roleId, status: 'skipped', reason: 'Already assigned' });
          continue;
        }

        // Assign role
        await this.sqlService.query(
          `INSERT INTO user_roles (user_id, role_id, is_active, created_by, created_at)
           VALUES (@userId, @roleId, 1, @assignerId, GETUTCDATE())`,
          { userId, roleId, assignerId }
        );

        results.push({ roleId, status: 'success', roleName: role[0].display_name });
        successCount++;
      } catch (error: any) {
        results.push({ roleId, status: 'failed', reason: error.message });
        failedCount++;
      }
    }

    return {
      success: true,
      data: {
        userId,
        totalRequested: roleIds.length,
        successCount,
        failedCount,
        results,
      },
      message: `Bulk role assignment completed: ${successCount} successful, ${failedCount} failed`,
    };
  }

  async bulkRemoveRolesFromUser(
    userId: number,
    roleIds: number[],
    removerId: number,
    removerType: string,
    removerTenantId: number
  ) {
    // Validate user exists
    const user: any = await this.sqlService.query(
      `SELECT u.id, tm.tenant_id
       FROM users u
       LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
       WHERE u.id = @userId`,
      { userId }
    );

    if (user.length === 0) {
      throw new NotFoundException('User not found');
    }

    const userTenantId = user[0].tenant_id;

    // Check tenant access
    if (removerType !== 'owner' && removerType !== 'superadmin' && removerType !== 'super_admin') {
      if (userTenantId && Number(userTenantId) !== Number(removerTenantId)) {
        throw new ForbiddenException('Cannot remove roles from users outside your tenant');
      }
    }

    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const roleId of roleIds) {
      try {
        const result: any = await this.sqlService.query(
          `DELETE FROM user_roles 
           OUTPUT DELETED.role_id, (SELECT display_name FROM roles WHERE id = DELETED.role_id) as role_name
           WHERE user_id = @userId AND role_id = @roleId AND is_active = 1`,
          { userId, roleId }
        );

        if (result.length > 0) {
          results.push({ roleId, status: 'success', roleName: result[0].role_name });
          successCount++;
        } else {
          results.push({ roleId, status: 'skipped', reason: 'Not assigned or already inactive' });
        }
      } catch (error: any) {
        results.push({ roleId, status: 'failed', reason: error.message });
        failedCount++;
      }
    }

    return {
      success: true,
      data: {
        userId,
        totalRequested: roleIds.length,
        successCount,
        failedCount,
        results,
      },
      message: `Bulk role removal completed: ${successCount} successful, ${failedCount} failed`,
    };
  }

  async bulkAssignUsersToRole(
    roleId: number,
    userIds: number[],
    assignerId: number,
    assignerType: string,
    assignerTenantId: number
  ) {
    // Validate role exists
    const role: any = await this.sqlService.query(
      `SELECT id, name, display_name, tenant_id, is_system_role, hierarchy_level
       FROM roles WHERE id = @roleId`,
      { roleId }
    );

    if (role.length === 0) {
      throw new NotFoundException('Role not found');
    }

    // Check hierarchy
    await this.checkRoleHierarchy(assignerId, roleId, assignerType);

    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const userId of userIds) {
      try {
        // Validate user exists
        const user: any = await this.sqlService.query(
          `SELECT u.id, u.email, u.first_name, u.last_name, tm.tenant_id
           FROM users u
           LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
           WHERE u.id = @userId`,
          { userId }
        );

        if (user.length === 0) {
          results.push({ userId, status: 'failed', reason: 'User not found' });
          failedCount++;
          continue;
        }

        const userTenantId = user[0].tenant_id;

        // Check tenant access
        if (assignerType !== 'owner' && assignerType !== 'superadmin' && assignerType !== 'super_admin') {
          if (userTenantId && Number(userTenantId) !== Number(assignerTenantId)) {
            results.push({ userId, status: 'failed', reason: 'User outside your tenant' });
            failedCount++;
            continue;
          }
        }

        // Check if already assigned
        const existing: any = await this.sqlService.query(
          `SELECT id FROM user_roles WHERE user_id = @userId AND role_id = @roleId AND is_active = 1`,
          { userId, roleId }
        );

        if (existing.length > 0) {
          results.push({ userId, status: 'skipped', reason: 'Already assigned', userEmail: user[0].email });
          continue;
        }

        // Assign role
        await this.sqlService.query(
          `INSERT INTO user_roles (user_id, role_id, is_active, created_by, created_at)
           VALUES (@userId, @roleId, 1, @assignerId, GETUTCDATE())`,
          { userId, roleId, assignerId }
        );

        results.push({
          userId,
          status: 'success',
          userEmail: user[0].email,
          userName: `${user[0].first_name || ''} ${user[0].last_name || ''}`.trim()
        });
        successCount++;
      } catch (error: any) {
        results.push({ userId, status: 'failed', reason: error.message });
        failedCount++;
      }
    }

    return {
      success: true,
      data: {
        roleId,
        roleName: role[0].display_name,
        totalRequested: userIds.length,
        successCount,
        failedCount,
        results,
      },
      message: `Bulk user assignment completed: ${successCount} successful, ${failedCount} failed`,
    };
  }


  // ============================================
  // ROLE CLONING
  // ============================================

  async cloneRole(
    sourceRoleId: number,
    newName: string,
    userId: number,
    tenantId: number,
    userType: string,
    options: {
      newDisplayName?: string;
      description?: string;
      copyPermissions?: boolean;
      copyLimits?: boolean;
    } = {}
  ) {
    // Validate source role
    const sourceRole: any = await this.sqlService.query(
      `SELECT * FROM roles WHERE id = @roleId`,
      { roleId: sourceRoleId }
    );

    if (sourceRole.length === 0) {
      throw new NotFoundException('Source role not found');
    }

    const source = sourceRole[0];

    // Check if user can access source role
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      if (source.tenant_id && Number(source.tenant_id) !== Number(tenantId)) {
        throw new ForbiddenException('Cannot clone roles from other tenants');
      }
      if (source.is_system_role) {
        throw new ForbiddenException('Cannot clone system roles unless you are a super admin');
      }
    }

    // Check if new name already exists in tenant
    const nameCheck: any = await this.sqlService.query(
      `SELECT id FROM roles WHERE name = @name AND (tenant_id = @tenantId OR tenant_id IS NULL)`,
      { name: newName, tenantId }
    );

    if (nameCheck.length > 0) {
      throw new ConflictException(`Role with name '${newName}' already exists`);
    }

    // Create new role
    const newRoleResult: any = await this.sqlService.query(
      `INSERT INTO roles (
        tenant_id, name, display_name, description, 
        is_system_role, is_default, hierarchy_level, created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @tenantId, @name, @displayName, @description,
        0, 0, @hierarchyLevel, @userId
      )`,
      {
        tenantId: source.is_system_role ? null : tenantId,
        name: newName,
        displayName: options.newDisplayName || newName,
        description: options.description || `Cloned from ${source.display_name}`,
        hierarchyLevel: source.hierarchy_level,
        userId,
      }
    );

    const newRole = newRoleResult[0];

    // Copy permissions if requested
    let copiedPermissions = 0;
    if (options.copyPermissions !== false) {
      const permissions: any = await this.sqlService.query(
        `SELECT permission_id FROM role_permissions WHERE role_id = @roleId`,
        { roleId: sourceRoleId }
      );

      for (const perm of permissions) {
        try {
          await this.sqlService.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_by)
             VALUES (@roleId, @permissionId, @userId)`,
            {
              roleId: newRole.id,
              permissionId: perm.permission_id,
              userId,
            }
          );
          copiedPermissions++;
        } catch (error) {
          console.error('Error copying permission:', error);
        }
      }
    }

    // Copy limits if requested
    let copiedLimits = 0;
    if (options.copyLimits === true) {
      const limits: any = await this.sqlService.query(
        `SELECT limit_type, limit_value, reset_period
         FROM role_limits WHERE role_id = @roleId`,
        { roleId: sourceRoleId }
      );

      for (const limit of limits) {
        try {
          await this.sqlService.query(
            `INSERT INTO role_limits (role_id, limit_type, limit_value, current_usage, reset_period, last_reset_at, created_by)
             VALUES (@roleId, @limitType, @limitValue, 0, @resetPeriod, GETUTCDATE(), @userId)`,
            {
              roleId: newRole.id,
              limitType: limit.limit_type,
              limitValue: limit.limit_value,
              resetPeriod: limit.reset_period,
              userId,
            }
          );
          copiedLimits++;
        } catch (error) {
          console.error('Error copying limit:', error);
        }
      }
    }

    return {
      success: true,
      data: {
        newRole,
        sourceRole: {
          id: source.id,
          name: source.name,
          display_name: source.display_name,
        },
        copiedPermissions,
        copiedLimits,
      },
      message: `Role cloned successfully. ${copiedPermissions} permissions and ${copiedLimits} limits copied.`,
    };
  }

  // ============================================
  // ROLE COMPARISON
  // ============================================

  async compareRoles(
    roleId1: number,
    roleId2: number,
    userType: string,
    tenantId: number
  ) {
    // Fetch both roles
    const roles: any = await this.sqlService.query(
      `SELECT * FROM roles WHERE id IN (@roleId1, @roleId2)`,
      { roleId1, roleId2 }
    );

    if (roles.length !== 2) {
      throw new NotFoundException('One or both roles not found');
    }

    const role1 = roles.find((r: any) => r.id === roleId1);
    const role2 = roles.find((r: any) => r.id === roleId2);

    // Check access
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      if ((role1.tenant_id && Number(role1.tenant_id) !== Number(tenantId)) ||
        (role2.tenant_id && Number(role2.tenant_id) !== Number(tenantId))) {
        throw new ForbiddenException('Cannot compare roles from other tenants');
      }
    }

    // Get permissions for both roles
    const permissions1: any = await this.sqlService.query(
      `SELECT 
        p.id, p.permission_key, p.resource, p.action, p.category, p.description
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = @roleId
       ORDER BY p.category, p.resource, p.action`,
      { roleId: roleId1 }
    );

    const permissions2: any = await this.sqlService.query(
      `SELECT 
        p.id, p.permission_key, p.resource, p.action, p.category, p.description
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = @roleId
       ORDER BY p.category, p.resource, p.action`,
      { roleId: roleId2 }
    );

    const perm1Ids = new Set(permissions1.map((p: any) => p.id));
    const perm2Ids = new Set(permissions2.map((p: any) => p.id));

    const onlyInRole1 = permissions1.filter((p: any) => !perm2Ids.has(p.id));
    const onlyInRole2 = permissions2.filter((p: any) => !perm1Ids.has(p.id));
    const common = permissions1.filter((p: any) => perm2Ids.has(p.id));

    return {
      success: true,
      data: {
        role1: {
          id: role1.id,
          name: role1.name,
          display_name: role1.display_name,
          hierarchy_level: role1.hierarchy_level,
          total_permissions: permissions1.length,
        },
        role2: {
          id: role2.id,
          name: role2.name,
          display_name: role2.display_name,
          hierarchy_level: role2.hierarchy_level,
          total_permissions: permissions2.length,
        },
        comparison: {
          common_permissions: common.length,
          unique_to_role1: onlyInRole1.length,
          unique_to_role2: onlyInRole2.length,
          similarity_percentage: common.length > 0
            ? Math.round((common.length / Math.max(permissions1.length, permissions2.length)) * 100)
            : 0,
        },
        permissions: {
          common,
          only_in_role1: onlyInRole1,
          only_in_role2: onlyInRole2,
        },
      },
      message: 'Role comparison completed successfully',
    };
  }
  async searchPermissions(dto: any) {
    const { search, resource, category, action, page = 1, limit = 50 } = dto;

    let whereConditions: string[] = ['1=1'];
    const params: any = { page, limit };

    if (search) {
      whereConditions.push(
        `(p.permission_key LIKE @search OR p.description LIKE @search OR p.resource LIKE @search)`
      );
      params.search = `%${search}%`;
    }

    if (resource) {
      whereConditions.push('p.resource = @resource');
      params.resource = resource;
    }

    if (category) {
      whereConditions.push('p.category = @category');
      params.category = category;
    }

    if (action) {
      whereConditions.push('p.action = @action');
      params.action = action;
    }

    const offset = (page - 1) * limit;
    const whereClause = whereConditions.join(' AND ');

    const [permissions, countResult] = await Promise.all([
      this.sqlService.query(
        `SELECT 
          p.*,
          (SELECT COUNT(*) FROM role_permissions WHERE permission_id = p.id) as roles_count
         FROM permissions p
         WHERE ${whereClause}
         ORDER BY p.category, p.resource, p.action
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { ...params, offset }
      ),
      this.sqlService.query(
        `SELECT COUNT(*) as total FROM permissions p WHERE ${whereClause}`,
        params
      ),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        permissions,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      message: 'Permissions search completed successfully',
    };
  }

  async getAvailablePermissionsForRole(roleId: number, category?: string, search?: string) {
    // Get permissions not assigned to this role
    const params: any = { roleId };
    let conditions = ['p.id NOT IN (SELECT permission_id FROM role_permissions WHERE role_id = @roleId)'];

    if (category) {
      conditions.push('p.category = @category');
      params.category = category;
    }

    if (search) {
      conditions.push('(p.permission_key LIKE @search OR p.description LIKE @search)');
      params.search = `%${search}%`;
    }

    const whereClause = conditions.join(' AND ');

    const permissions = await this.sqlService.query(
      `SELECT 
        p.id, p.permission_key, p.resource, p.action, p.category, p.description, p.is_system_permission
       FROM permissions p
       WHERE ${whereClause}
       ORDER BY p.category, p.resource, p.action`,
      params
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
        roleId,
        availablePermissions: permissions,
        groupedByCategory: grouped,
        totalAvailable: permissions.length,
      },
      message: 'Available permissions retrieved successfully',
    };
  }

  // ============================================
  // MENU HIERARCHY
  // ============================================

  async getMenuHierarchyWithAccess(userId: number, includeBlockedReasons: boolean = true) {
    // Get user's permissions
    const userPermissions = await this.sqlService.query(
      `SELECT DISTINCT p.permission_key
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = @userId AND ur.is_active = 1`,
      { userId }
    );

    const userPermissionKeys = new Set(userPermissions.map((p: any) => p.permission_key));

    // Get all menu permissions
    const menuPermissions = await this.sqlService.query(
      `SELECT 
        mp.menu_key, 
        mp.is_required,
        p.permission_key,
        p.resource,
        p.action
       FROM menu_permissions mp
       JOIN permissions p ON mp.permission_id = p.id
       ORDER BY mp.menu_key`
    );

    // Build menu structure with access status
    const MENU_STRUCTURE = await this.getMenuStructure();
    const enrichedHierarchy = this.enrichMenuWithAccess(
      MENU_STRUCTURE,
      menuPermissions,
      userPermissionKeys,
      includeBlockedReasons
    );

    return {
      success: true,
      data: {
        userId,
        hierarchy: enrichedHierarchy,
        summary: {
          totalMenus: this.countMenus(enrichedHierarchy),
          accessibleMenus: this.countAccessibleMenus(enrichedHierarchy),
          blockedMenus: this.countBlockedMenus(enrichedHierarchy),
        },
      },
      message: 'Menu hierarchy retrieved successfully',
    };
  }

  async getBlockedMenusWithReasons(userId: number) {
    const hierarchyResult = await this.getMenuHierarchyWithAccess(userId, true);
    const blockedMenus = this.extractBlockedMenus(hierarchyResult.data.hierarchy);

    return {
      success: true,
      data: {
        userId,
        blockedMenus,
        totalBlocked: blockedMenus.length,
      },
      message: 'Blocked menus retrieved successfully',
    };
  }

  private enrichMenuWithAccess(
    menus: any[],
    menuPermissions: any[],
    userPermissionKeys: Set<string>,
    includeReasons: boolean
  ): any[] {
    return menus.map((menu) => {
      const requiredPerms = menuPermissions.filter(
        (mp: any) => mp.menu_key === menu.key && mp.is_required
      );

      const missingPermissions = requiredPerms.filter(
        (mp: any) => !userPermissionKeys.has(mp.permission_key)
      );

      const hasAccess = missingPermissions.length === 0;

      const enriched: any = {
        key: menu.key,
        title: menu.title,
        path: menu.path,
        icon: menu.icon,
        hasAccess,
      };

      if (!hasAccess && includeReasons) {
        enriched.blockedReasons = missingPermissions.map(
          (mp: any) => `Missing permission: ${mp.permission_key}`
        );
        enriched.requiredPermissions = missingPermissions.map((mp: any) => mp.permission_key);
      }

      if (menu.children && menu.children.length > 0) {
        enriched.children = this.enrichMenuWithAccess(
          menu.children,
          menuPermissions,
          userPermissionKeys,
          includeReasons
        );
      }

      return enriched;
    });
  }

  private countMenus(menus: any[]): number {
    return menus.reduce((count, menu) => {
      return count + 1 + (menu.children ? this.countMenus(menu.children) : 0);
    }, 0);
  }

  private countAccessibleMenus(menus: any[]): number {
    return menus.reduce((count, menu) => {
      const current = menu.hasAccess ? 1 : 0;
      const children = menu.children ? this.countAccessibleMenus(menu.children) : 0;
      return count + current + children;
    }, 0);
  }

  private countBlockedMenus(menus: any[]): number {
    return menus.reduce((count, menu) => {
      const current = !menu.hasAccess ? 1 : 0;
      const children = menu.children ? this.countBlockedMenus(menu.children) : 0;
      return count + current + children;
    }, 0);
  }

  private extractBlockedMenus(menus: any[]): any[] {
    const blocked: any[] = [];

    for (const menu of menus) {
      if (!menu.hasAccess) {
        blocked.push({
          key: menu.key,
          title: menu.title,
          path: menu.path,
          blockedReasons: menu.blockedReasons || [],
          requiredPermissions: menu.requiredPermissions || [],
        });
      }

      if (menu.children) {
        blocked.push(...this.extractBlockedMenus(menu.children));
      }
    }

    return blocked;
  }

  private async getMenuStructure() {
    // This should match your MENU_STRUCTURE from frontend
    return [
      {
        key: 'dashboard',
        title: 'Dashboard',
        icon: 'LayoutDashboard',
        path: '/dashboard',
        order: 1,
      },
      {
        key: 'access-control',
        title: 'Access Control',
        icon: 'Shield',
        path: '/access-control',
        order: 2,
        children: [
          { key: 'access-control.roles', title: 'Roles', icon: 'Shield', path: '/access-control/roles', order: 1 },
          { key: 'access-control.permissions', title: 'Permissions', icon: 'Key', path: '/access-control/permissions', order: 2 },
          { key: 'access-control.role-permissions', title: 'Role Permissions', icon: 'ShieldCheck', path: '/access-control/role-permissions', order: 3 },
          { key: 'access-control.user-roles', title: 'User Roles', icon: 'UserCheck', path: '/access-control/user-roles', order: 4 },
          { key: 'access-control.menu-permissions', title: 'Menu Permissions', icon: 'Menu', path: '/access-control/menu-permissions', order: 5 },
        ],
      },
    ];
  }

  // ============================================
  // TENANT-SPECIFIC
  // ============================================

  async getTenantRoles(tenantId: number, includeSystemRoles: boolean = false, status: string = 'active') {
    let conditions = ['r.tenant_id = @tenantId'];
    const params: any = { tenantId };

    if (includeSystemRoles) {
      conditions = ['(r.tenant_id = @tenantId OR r.is_system_role = 1)'];
    }

    if (status !== 'all') {
      // For now, we assume all roles are active unless deleted
      // You can add an is_active column if needed
    }

    const roles = await this.sqlService.query(
      `SELECT 
        r.*,
        (SELECT COUNT(*) FROM user_roles WHERE role_id = r.id AND is_active = 1) as users_count,
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permissions_count
       FROM roles r
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.hierarchy_level DESC, r.name`,
      params
    );

    return {
      success: true,
      data: {
        tenantId,
        includeSystemRoles,
        roles,
        summary: {
          totalRoles: roles.length,
          systemRoles: roles.filter((r: any) => r.is_system_role).length,
          customRoles: roles.filter((r: any) => !r.is_system_role).length,
        },
      },
      message: 'Tenant roles retrieved successfully',
    };
  }

  async transferRoleOwnership(
    roleId: number,
    newTenantId: number,
    userId: number,
    userType: string,
    currentTenantId: number
  ) {
    // Only super admins can transfer roles
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      throw new ForbiddenException('Only super admins can transfer role ownership');
    }

    // Validate role
    const role: any = await this.sqlService.query(
      `SELECT * FROM roles WHERE id = @roleId`,
      { roleId }
    );

    if (role.length === 0) {
      throw new NotFoundException('Role not found');
    }

    if (role[0].is_system_role) {
      throw new BadRequestException('Cannot transfer system roles');
    }

    // Validate new tenant exists
    const tenant: any = await this.sqlService.query(
      `SELECT id, name FROM tenants WHERE id = @tenantId`,
      { tenantId: newTenantId }
    );

    if (tenant.length === 0) {
      throw new NotFoundException('Target tenant not found');
    }

    // Transfer ownership
    await this.sqlService.query(
      `UPDATE roles 
       SET tenant_id = @newTenantId, updated_by = @userId, updated_at = GETUTCDATE()
       WHERE id = @roleId`,
      { roleId, newTenantId, userId }
    );

    return {
      success: true,
      data: {
        roleId,
        roleName: role[0].name,
        oldTenantId: role[0].tenant_id,
        newTenantId,
        newTenantName: tenant[0].name,
      },
      message: 'Role ownership transferred successfully',
    };
  }

  async getTenantRoleAnalytics(tenantId: number, metric?: string) {
    const roles = await this.sqlService.query(
      `SELECT 
        r.id, r.name, r.display_name, r.is_system_role, r.hierarchy_level, r.created_at,
        (SELECT COUNT(*) FROM user_roles WHERE role_id = r.id AND is_active = 1) as users_count,
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permissions_count,
        (SELECT MAX(assigned_at) FROM user_roles WHERE role_id = r.id) as last_assigned
       FROM roles r
       WHERE r.tenant_id = @tenantId OR (r.is_system_role = 1 AND EXISTS (
         SELECT 1 FROM user_roles ur 
         JOIN users u ON ur.user_id = u.id 
         JOIN tenant_members tm ON u.id = tm.user_id 
         WHERE ur.role_id = r.id AND tm.tenant_id = @tenantId
       ))
       ORDER BY users_count DESC, r.name`,
      { tenantId }
    );

    const totalUsers = await this.sqlService.query(
      `SELECT COUNT(DISTINCT ur.user_id) as total
       FROM user_roles ur
       JOIN users u ON ur.user_id = u.id
       JOIN tenant_members tm ON u.id = tm.user_id
       WHERE tm.tenant_id = @tenantId AND ur.is_active = 1`,
      { tenantId }
    );

    return {
      success: true,
      data: {
        tenantId,
        roles,
        summary: {
          totalRoles: roles.length,
          systemRoles: roles.filter((r: any) => r.is_system_role).length,
          customRoles: roles.filter((r: any) => !r.is_system_role).length,
          totalUsers: totalUsers[0]?.total || 0,
          averageRolesPerUser: roles.length > 0
            ? (roles.reduce((sum: number, r: any) => sum + r.users_count, 0) / (totalUsers[0]?.total || 1)).toFixed(2)
            : 0,
        },
      },
      message: 'Tenant role analytics retrieved successfully',
    };
  }

  // ============================================
  // VALIDATION
  // ============================================

  async validateRoleAssignment(
    requestorId: number,
    userId: number,
    roleId: number,
    requestorType: string,
    tenantId: number
  ) {
    // Super admins can assign anything
    if (requestorType === 'owner' || requestorType === 'superadmin' || requestorType === 'super_admin') {
      return {
        success: true,
        data: {
          canAssign: true,
          reason: 'Super admin has full permissions',
        },
        message: 'Validation successful',
      };
    }

    // Get requestor's max hierarchy
    const requestorRoles: any = await this.sqlService.query(
      `SELECT MAX(r.hierarchy_level) as max_hierarchy
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = @userId AND ur.is_active = 1`,
      { userId: requestorId }
    );

    const requestorHierarchy = requestorRoles[0]?.max_hierarchy || 0;

    // Get target role hierarchy
    const targetRole: any = await this.sqlService.query(
      `SELECT hierarchy_level, name, display_name, tenant_id FROM roles WHERE id = @roleId`,
      { roleId }
    );

    if (targetRole.length === 0) {
      return {
        success: false,
        data: {
          canAssign: false,
          reason: 'Role not found',
        },
        message: 'Validation failed',
      };
    }

    const targetHierarchy = targetRole[0].hierarchy_level;
    const roleTenantId = targetRole[0].tenant_id;

    // Check hierarchy
    if (targetHierarchy > requestorHierarchy) {
      return {
        success: true,
        data: {
          canAssign: false,
          reason: `Cannot assign role with hierarchy ${targetHierarchy}. Your maximum is ${requestorHierarchy}`,
          requestorHierarchy,
          targetRoleHierarchy: targetHierarchy,
        },
        message: 'Validation failed - insufficient hierarchy level',
      };
    }

    // Check tenant
    if (roleTenantId && Number(roleTenantId) !== Number(tenantId)) {
      return {
        success: true,
        data: {
          canAssign: false,
          reason: 'Cannot assign roles from other tenants',
        },
        message: 'Validation failed - tenant mismatch',
      };
    }

    return {
      success: true,
      data: {
        canAssign: true,
        roleName: targetRole[0].display_name,
        roleHierarchy: targetHierarchy,
        requestorHierarchy,
      },
      message: 'Validation successful',
    };
  }

  async validateRoleName(roleName: string, tenantId: number, excludeRoleId?: number) {
    let query = `SELECT id, name FROM roles WHERE name = @roleName AND (tenant_id = @tenantId OR tenant_id IS NULL)`;
    const params: any = { roleName, tenantId };

    if (excludeRoleId) {
      query += ` AND id != @excludeRoleId`;
      params.excludeRoleId = excludeRoleId;
    }

    const existing = await this.sqlService.query(query, params);

    return {
      success: true,
      data: {
        isAvailable: existing.length === 0,
        roleName,
        conflict: existing.length > 0 ? existing[0] : null,
      },
      message: existing.length === 0 ? 'Role name is available' : 'Role name already exists',
    };
  }

  // ============================================
  // AUDIT & REPORTING
  // ============================================

  async getRoleAssignmentHistory(dto: any, userType: string, tenantId: number) {
    const { userId, roleId, startDate, endDate, page = 1, limit = 50 } = dto;

    let conditions = ['1=1'];
    const params: any = { page, limit };

    if (userId) {
      conditions.push('ur.user_id = @userId');
      params.userId = userId;
    }

    if (roleId) {
      conditions.push('ur.role_id = @roleId');
      params.roleId = roleId;
    }

    if (startDate) {
      conditions.push('ur.assigned_at >= @startDate');
      params.startDate = startDate;
    }

    if (endDate) {
      conditions.push('ur.assigned_at <= @endDate');
      params.endDate = endDate;
    }

    // Tenant filtering for non-super admins
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      conditions.push(`EXISTS (
        SELECT 1 FROM tenant_members tm 
        WHERE tm.user_id = ur.user_id AND tm.tenant_id = @tenantId
      )`);
      params.tenantId = tenantId;
    }

    const offset = (page - 1) * limit;
    const whereClause = conditions.join(' AND ');

    const [history, countResult] = await Promise.all([
      this.sqlService.query(
        `SELECT 
          ur.id, ur.user_id, ur.role_id, ur.assigned_at, ur.is_active,
          u.email, u.first_name, u.last_name,
          r.name as role_name, r.display_name as role_display_name,
          assigner.email as assigned_by_email
         FROM user_roles ur
         JOIN users u ON ur.user_id = u.id
         JOIN roles r ON ur.role_id = r.id
         LEFT JOIN users assigner ON ur.created_by = assigner.id
         WHERE ${whereClause}
         ORDER BY ur.assigned_at DESC
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { ...params, offset }
      ),
      this.sqlService.query(
        `SELECT COUNT(*) as total FROM user_roles ur WHERE ${whereClause}`,
        params
      ),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      success: true,
      data: {
        history,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Role assignment history retrieved successfully',
    };
  }

  async getPermissionChangeHistory(dto: any, userType: string, tenantId: number) {
    const { roleId, permissionId, startDate, endDate, page = 1, limit = 50 } = dto;

    // Note: This requires an audit table for role_permissions
    // For now, we'll return a placeholder
    return {
      success: true,
      data: {
        history: [],
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: 0,
          totalPages: 0,
        },
      },
      message: 'Permission change history requires audit_logs table setup',
    };
  }

  async getUserAccessReport(
    userId: number,
    userType: string,
    tenantId: number,
    options: any
  ) {
    const user: any = await this.sqlService.query(
      `SELECT id, email, first_name, last_name, user_type FROM users WHERE id = @userId`,
      { userId }
    );

    if (user.length === 0) {
      throw new NotFoundException('User not found');
    }

    // Get user roles
    const roles = await this.sqlService.query(
      `SELECT r.*, ur.assigned_at 
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = @userId AND ur.is_active = 1
       ORDER BY r.hierarchy_level DESC`,
      { userId }
    );

    // Get inherited permissions
    let permissions: any[] = [];
    if (options.includeInheritedPermissions !== false) {
      permissions = await this.sqlService.query(
        `SELECT DISTINCT p.*
         FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = @userId AND ur.is_active = 1
         ORDER BY p.category, p.permission_key`,
        { userId }
      );
    }

    // Get accessible menus
    let accessibleMenus: any[] = [];
    if (options.includeMenuAccess !== false) {
      const menuAccess = await this.getMenuHierarchyWithAccess(userId, false);
      accessibleMenus = this.flattenAccessibleMenus(menuAccess.data.hierarchy);
    }

    return {
      success: true,
      data: {
        user: user[0],
        roles,
        permissions,
        accessibleMenus,
        summary: {
          totalRoles: roles.length,
          totalPermissions: permissions.length,
          accessibleMenusCount: accessibleMenus.length,
          highestHierarchy: roles.length > 0 ? Math.max(...roles.map((r: any) => r.hierarchy_level)) : 0,
        },
      },
      message: 'User access report generated successfully',
    };
  }

  private flattenAccessibleMenus(menus: any[]): any[] {
    const accessible: any[] = [];

    for (const menu of menus) {
      if (menu.hasAccess) {
        accessible.push({
          key: menu.key,
          title: menu.title,
          path: menu.path,
        });
      }

      if (menu.children) {
        accessible.push(...this.flattenAccessibleMenus(menu.children));
      }
    }

    return accessible;
  }

  // ============================================
  // ROLE TEMPLATES (Simplified)
  // ============================================

  async createRoleTemplate(dto: any, userId: number, userType: string) {
    // Placeholder - implement based on your needs
    return {
      success: true,
      message: 'Role templates feature coming soon',
    };
  }

  async listRoleTemplates(userType: string) {
    return {
      success: true,
      data: [],
      message: 'Role templates feature coming soon',
    };
  }

  async applyRoleTemplate(
    templateName: string,
    tenantId: number,
    userId: number,
    userType: string,
    customRoleName?: string
  ) {
    return {
      success: true,
      message: 'Role templates feature coming soon',
    };
  }

  // ============================================
  // ADVANCED QUERIES
  // ============================================

  async getRolesByHierarchy(
    tenantId: number,
    minLevel?: number,
    maxLevel?: number,
    userType?: string
  ) {
    console.log('Getting roles by hierarchy for tenant:', tenantId, 'minLevel:', minLevel, 'maxLevel:', maxLevel);
    let conditions = ['(r.tenant_id = @tenantId OR r.is_system_role = 1)'];
    const params: any = { tenantId };

    if (minLevel !== undefined) {
      conditions.push('r.hierarchy_level >= @minLevel');
      params.minLevel = minLevel;
    }

    if (maxLevel !== undefined) {
      conditions.push('r.hierarchy_level <= @maxLevel');
      params.maxLevel = maxLevel;
    }

    const roles = await this.sqlService.query(
      `SELECT 
        r.*,
        (SELECT COUNT(*) FROM user_roles WHERE role_id = r.id AND is_active = 1) as users_count
       FROM roles r
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.hierarchy_level DESC, r.name`,
      params
    );

    return {
      success: true,
      data: {
        roles,
        filters: { minLevel, maxLevel, tenantId },
      },
      message: 'Roles by hierarchy retrieved successfully',
    };
  }

  async getUnassignedUsers(tenantId: number, page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;

    const [users, countResult] = await Promise.all([
      this.sqlService.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.user_type
         FROM users u
         JOIN tenant_members tm ON u.id = tm.user_id
         WHERE tm.tenant_id = @tenantId 
         AND tm.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM user_roles WHERE user_id = u.id AND is_active = 1
         )
         ORDER BY u.created_at DESC
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { tenantId, offset, limit }
      ),
      this.sqlService.query(
        `SELECT COUNT(*) as total
         FROM users u
         JOIN tenant_members tm ON u.id = tm.user_id
         WHERE tm.tenant_id = @tenantId 
         AND tm.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM user_roles WHERE user_id = u.id AND is_active = 1
         )`,
        { tenantId }
      ),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      success: true,
      data: {
        users,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Unassigned users retrieved successfully',
    };
  }

  async getRoleUsageStats(tenantId: number, roleId?: number, period?: string) {
    const params: any = { tenantId };
    let roleCondition = '';

    if (roleId) {
      roleCondition = 'AND r.id = @roleId';
      params.roleId = roleId;
    }

    const stats = await this.sqlService.query(
      `SELECT 
        r.id, r.name, r.display_name,
        COUNT(DISTINCT ur.user_id) as current_users,
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permissions_count,
        MIN(ur.assigned_at) as first_assignment,
        MAX(ur.assigned_at) as last_assignment
       FROM roles r
       LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
       WHERE (r.tenant_id = @tenantId OR r.is_system_role = 1) ${roleCondition}
       GROUP BY r.id, r.name, r.display_name
       ORDER BY current_users DESC`,
      params
    );

    return {
      success: true,
      data: {
        stats,
        period,
        tenantId,
      },
      message: 'Role usage statistics retrieved successfully',
    };
  }

  // Helper method from Part 1
  private async checkRoleHierarchy(
    assignerId: number,
    targetRoleId: number,
    assignerType: string
  ): Promise<void> {
    if (assignerType === 'owner' || assignerType === 'superadmin' || assignerType === 'super_admin') {
      return;
    }

    const assignerRoles: any = await this.sqlService.query(
      `SELECT MAX(r.hierarchy_level) as max_hierarchy
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = @userId AND ur.is_active = 1`,
      { userId: assignerId }
    );

    const assignerHierarchy = assignerRoles[0]?.max_hierarchy || 0;

    const targetRole: any = await this.sqlService.query(
      `SELECT hierarchy_level FROM roles WHERE id = @roleId`,
      { roleId: targetRoleId }
    );

    const targetHierarchy = targetRole[0]?.hierarchy_level || 0;

    if (targetHierarchy > assignerHierarchy) {
      throw new ForbiddenException(
        `Cannot assign role with hierarchy ${targetHierarchy}. Your maximum hierarchy is ${assignerHierarchy}`
      );
    }
  }
}