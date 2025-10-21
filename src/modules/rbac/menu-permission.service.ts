import { Injectable } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class MenuPermissionService {
  constructor(private sqlService: SqlServerService) {}

  /**
   * Link a menu to a required permission
   */
  async linkMenuPermission(
    menuKey: string,
    permissionId: bigint,
    isRequired: boolean = true,
    createdBy?: bigint
  ) {
    try {
      const result = await this.sqlService.query(
        `INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
         OUTPUT INSERTED.*
         VALUES (@menuKey, @permissionId, @isRequired, @createdBy)`,
        { menuKey, permissionId, isRequired, createdBy: createdBy || null }
      );
      return result[0];
    } catch (error) {
      // If duplicate, update instead
      await this.sqlService.query(
        `UPDATE menu_permissions 
         SET is_required = @isRequired 
         WHERE menu_key = @menuKey AND permission_id = @permissionId`,
        { menuKey, permissionId, isRequired }
      );
      return { message: 'Menu permission updated' };
    }
  }

  /**
   * Bulk link multiple menus to permissions
   */
  async bulkLinkMenuPermissions(
    mappings: Array<{ menuKey: string; permissionId: number; isRequired?: boolean }>,
    createdBy?: bigint
  ) {
    const results:any = [];
    for (const mapping of mappings) {
      const result = await this.linkMenuPermission(
        mapping.menuKey,
        BigInt(mapping.permissionId),
        mapping.isRequired ?? true,
        createdBy
      );
      results.push(result);
    }
    return {
      message: 'Menu permissions linked successfully',
      created: results.length,
      total: mappings.length
    };
  }

  /**
   * Get accessible menu keys for a user based on their permissions
   */
  async getUserAccessibleMenus(userId: bigint) {
    // Get user's permissions
    const userPermissions = await this.sqlService.query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = @userId AND ur.is_active = 1`,
      { userId }
    );

    const permissionNames = userPermissions.map((p: any) => p.name);

    // Get all menus with their required permissions
    const menuPermissions = await this.sqlService.query(
      `SELECT DISTINCT 
         mp.menu_key,
         p.name as permission_name,
         mp.is_required
       FROM menu_permissions mp
       JOIN permissions p ON mp.permission_id = p.id`
    );

    // Filter menus based on user permissions
    const menuMap = new Map<string, boolean>();
    
    for (const mp of menuPermissions) {
      const hasPermission = permissionNames.includes(mp.permission_name);
      
      if (mp.is_required) {
        // Required permission - must have it
        if (hasPermission) {
          menuMap.set(mp.menu_key, true);
        } else {
          menuMap.set(mp.menu_key, false);
        }
      } else {
        // Optional permission - having it is enough
        if (hasPermission && !menuMap.has(mp.menu_key)) {
          menuMap.set(mp.menu_key, true);
        }
      }
    }

    // Return list of accessible menu keys
    const accessibleMenus = Array.from(menuMap.entries())
      .filter(([_, hasAccess]) => hasAccess)
      .map(([menuKey, _]) => menuKey);

    return {
      userId,
      accessibleMenus,
      permissions: permissionNames
    };
  }
}
