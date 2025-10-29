// modules/menu-permissions/menu-permissions.service.ts - UPDATED
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class MenuPermissionsService {
  constructor(private sqlService: SqlServerService) {}

  async linkMenuPermission(
    menuKey: string,
    permissionId: bigint,
    isRequired: boolean,
    createdBy: bigint,
    userType: string
  ) {
    if (userType !== 'owner' && userType !== 'superadmin') {
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
    } catch (error) {
      // If exists, update instead
      const updateResult: any = await this.sqlService.query(
        `UPDATE menu_permissions 
         SET is_required = @isRequired, updated_at = GETUTCDATE()
         OUTPUT INSERTED.*
         WHERE menu_key = @menuKey AND permission_id = @permissionId`,
        { menuKey, permissionId, isRequired }
      );
      
      if (updateResult.length === 0) {
        throw error;
      }
      
      return {
        success: true,
        data: updateResult[0],
        message: 'Menu permission updated successfully'
      };
    }
  }

  async bulkLinkMenuPermissions(mappings: any[], createdBy: bigint, userType: string) {
    if (userType !== 'owner' && userType !== 'superadmin') {
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
            permissionId: BigInt(mapping.permissionId),
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

  async unlinkMenuPermission(menuKey: string, permissionId: bigint, userType: string) {
    if (userType !== 'owner' && userType !== 'superadmin') {
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
         p.name as permission_name,
         p.resource,
         p.action,
         p.category,
         p.description
       FROM menu_permissions mp
       INNER JOIN permissions p ON mp.permission_id = p.id
       WHERE mp.menu_key = @menuKey
       ORDER BY p.category, p.name`,
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
      const result = await this.sqlService.execute(
        'sp_ListMenuPermissions',
        {
          page: dto.page || 1,
          limit: dto.limit || 50,
          search: dto.search || null,
          menuKey: dto.menuKey || null,
          category: dto.category || null,
          sortBy: dto.sortBy || 'created_at',
          sortOrder: dto.sortOrder || 'DESC'
        }
      );

      if (!result || result.length === 0) {
        return {
          success: true,
          data: {
            menuPermissionsList: [],
            meta: {
              currentPage: dto.page || 1,
              itemsPerPage: dto.limit || 50,
              totalItems: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            }
          }
        };
      }

      const meta = result[1]?.[0] || {
        currentPage: dto.page || 1,
        itemsPerPage: dto.limit || 50,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };

      return {
        success: true,
        data: {
          menuPermissionsList: result[0] || [],
          meta
        },
        message: 'Menu permissions list retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * NEW METHOD: Get User's Accessible Menus
   * Uses sp_GetUserAccessibleMenus stored procedure
   */
  async getUserAccessibleMenus(userId: bigint) {
    try {
      const result = await this.sqlService.execute(
        'sp_GetUserAccessibleMenus',
        { userId }
      );

      if (!result || result.length === 0) {
        return {
          success: true,
          data: {
            userId,
            userPermissions: [],
            accessibleMenus: [],
            blockedMenus: []
          },
          message: 'No permissions found for user'
        };
      }

      return {
        success: true,
        data: {
          userId,
          userPermissions: result[0] || [],
          accessibleMenus: result[1] || [],
          blockedMenus: result[2] || []
        },
        message: 'User accessible menus retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * NEW METHOD: Check if user can access specific menu
   */
  async canUserAccessMenu(userId: bigint, menuKey: string): Promise<boolean> {
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
    id: bigint,
    menuKey: string,
    permissionId: bigint,
    isRequired: boolean,
    userType: string
  ) {
    if (userType !== 'owner' && userType !== 'superadmin') {
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

  async getMenuPermissionById(id: bigint) {
    const result: any = await this.sqlService.query(
      `SELECT 
         mp.id, 
         mp.menu_key, 
         mp.permission_id, 
         mp.is_required, 
         mp.created_at,
         p.name as permission_name, 
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
