// modules/rbac/menu-permissions.service.ts - UPDATED
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class MenuPermissionsService {
  constructor(private sqlService: SqlServerService) {}

  async linkMenuPermission(
    menuKey: string,
    permissionId: number,
    isRequired: boolean,
    createdBy: number,
    userType: string
  ) {
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      throw new ForbiddenException('Only super admins can manage menu permissions');
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by, created_at)
         OUTPUT INSERTED.*
         VALUES (@menuKey, @permissionId, @isRequired, @createdBy, GETUTCDATE())`,
        { menuKey, permissionId, isRequired, createdBy }
      );
      return {
        success: true,
        data: result[0],
        message: 'Menu permission linked successfully'
      };
    } catch (error: any) {
      // If exists, update instead
      if (error.message?.includes('UNIQUE') || error.message?.includes('duplicate')) {
        const updateResult: any = await this.sqlService.query(
          `UPDATE menu_permissions 
           SET is_required = @isRequired, updated_at = GETUTCDATE()
           OUTPUT INSERTED.*
           WHERE menu_key = @menuKey AND permission_id = @permissionId`,
          { menuKey, permissionId, isRequired }
        );
        
        return {
          success: true,
          data: updateResult[0],
          message: 'Menu permission updated successfully'
        };
      }
      throw error;
    }
  }

  async bulkLinkMenuPermissions(mappings: any[], createdBy: number, userType: string) {
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      throw new ForbiddenException('Only super admins can manage menu permissions');
    }

    // Get unique menu keys
    const menuKeys = [...new Set(mappings.map(m => m.menuKey))];
    
    // Delete existing permissions for these menus
    for (const menuKey of menuKeys) {
      await this.sqlService.query(
        `DELETE FROM menu_permissions WHERE menu_key = @menuKey`,
        { menuKey }
      );
    }

    // Insert all new mappings
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
            createdBy
          }
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
      total: mappings.length
    };
  }

  async unlinkMenuPermission(menuKey: string, permissionId: number, userType: string) {
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      throw new ForbiddenException('Only super admins can manage menu permissions');
    }

    const result: any = await this.sqlService.query(
      `DELETE FROM menu_permissions 
       OUTPUT DELETED.* 
       WHERE menu_key = @menuKey AND permission_id = @permissionId`,
      { menuKey, permissionId }
    );

    if (result.length === 0) {
      throw new NotFoundException('Menu permission not found');
    }

    return {
      success: true,
      data: result[0],
      message: 'Menu permission unlinked successfully'
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
      { menuKey }
    );

    return {
      success: true,
      data: result || [],
      message: 'Menu permissions retrieved successfully'
    };
  }

  async listMenuPermissions(dto: any) {
    try {
      // Build query
      let query = `
        SELECT 
          mp.id,
          mp.menu_key,
          mp.permission_id,
          mp.is_required,
          mp.applicable_to,
          mp.created_at,
          mp.updated_at,
          p.permission_key,
          p.resource,
          p.action,
          p.category,
          p.description,
          p.is_system_permission
        FROM menu_permissions mp
        INNER JOIN permissions p ON mp.permission_id = p.id
        WHERE 1=1
      `;

      const params: any = {};

      if (dto.menuKey) {
        query += ' AND mp.menu_key = @menuKey';
        params.menuKey = dto.menuKey;
      }

      if (dto.category) {
        query += ' AND p.category = @category';
        params.category = dto.category;
      }

      if (dto.search) {
        query += ' AND (mp.menu_key LIKE @search OR p.permission_key LIKE @search OR p.description LIKE @search)';
        params.search = `%${dto.search}%`;
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult: any = await this.sqlService.query(countQuery, params);
      const total = countResult[0]?.total || 0;

      // Add sorting
      const sortBy = dto.sortBy || 'created_at';
      const sortOrder = dto.sortOrder || 'DESC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Add pagination
      const page = dto.page || 1;
      const limit = dto.limit || 50;
      const offset = (page - 1) * limit;

      params.offset = offset;
      params.limit = limit;

      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

      const result = await this.sqlService.query(query, params);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          menuPermissionsList: result || [],
          meta: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: total,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        },
        message: 'Menu permissions list retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get User's Accessible Menus
   */
  async getUserAccessibleMenus(userId: number) {
    try {
      // Get user's permissions from their roles
      const userPermissions = await this.sqlService.query(
        `SELECT DISTINCT
           p.id as permission_id,
           p.permission_key,
           p.resource,
           p.action,
           p.category
         FROM user_roles ur
         INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
         INNER JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = @userId AND ur.is_active = 1
         ORDER BY p.category, p.permission_key`,
        { userId }
      );

      // Get all menus that user can access
      const accessibleMenus = await this.sqlService.query(
        `SELECT DISTINCT mp.menu_key
         FROM menu_permissions mp
         WHERE mp.is_required = 1
           AND EXISTS (
             SELECT 1 
             FROM user_roles ur
             INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
             WHERE ur.user_id = @userId 
               AND rp.permission_id = mp.permission_id
               AND ur.is_active = 1
           )
         UNION
         SELECT DISTINCT mp2.menu_key
         FROM menu_permissions mp2
         WHERE mp2.is_required = 0
         ORDER BY menu_key`,
        { userId }
      );

      // Get menus that are blocked (required permissions missing)
      const blockedMenus = await this.sqlService.query(
        `SELECT DISTINCT 
           mp.menu_key,
           STRING_AGG(p.permission_key, ', ') as missing_permissions
         FROM menu_permissions mp
         INNER JOIN permissions p ON mp.permission_id = p.id
         WHERE mp.is_required = 1
           AND NOT EXISTS (
             SELECT 1 
             FROM user_roles ur
             INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
             WHERE ur.user_id = @userId 
               AND rp.permission_id = mp.permission_id
               AND ur.is_active = 1
           )
         GROUP BY mp.menu_key
         ORDER BY mp.menu_key`,
        { userId }
      );

      return {
        success: true,
        data: {
          userId,
          userPermissions: userPermissions || [],
          accessibleMenus: accessibleMenus.map((m: any) => m.menu_key) || [],
          blockedMenus: blockedMenus || []
        },
        message: 'User accessible menus retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user can access specific menu
   */
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
        { userId, menuKey }
      );

      const missingCount = result[0]?.missingCount || 0;
      return missingCount === 0;
    } catch (error) {
      throw error;
    }
  }

  async updateMenuPermission(
    id: number,
    menuKey: string,
    permissionId: number,
    isRequired: boolean,
    userType: string
  ) {
    if (userType !== 'owner' && userType !== 'superadmin' && userType !== 'super_admin') {
      throw new ForbiddenException('Only super admins can manage menu permissions');
    }

    const result: any = await this.sqlService.query(
      `UPDATE menu_permissions 
       SET menu_key = @menuKey, 
           permission_id = @permissionId, 
           is_required = @isRequired, 
           updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE id = @id`,
      { id, menuKey, permissionId, isRequired }
    );

    if (result.length === 0) {
      throw new NotFoundException('Menu permission not found');
    }

    return {
      success: true,
      data: result[0],
      message: 'Menu permission updated successfully'
    };
  }

  async getMenuPermissionById(id: number) {
    const result: any = await this.sqlService.query(
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
       WHERE mp.id = @id`,
      { id }
    );

    if (result.length === 0) {
      throw new NotFoundException('Menu permission not found');
    }

    return {
      success: true,
      data: result[0],
      message: 'Menu permission retrieved successfully'
    };
  }
}