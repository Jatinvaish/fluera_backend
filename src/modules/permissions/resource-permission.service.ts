// modules/permissions/permissions.service.ts - COMPLETE WITH ALL METHODS
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PermissionsService {
  constructor(private sqlService: SqlServerService) {}

  // ============================================
  // RBAC PERMISSIONS (CRUD)
  // ============================================
  async listPermissions(filters: any) {
  try {
    const result: any = await this.sqlService.execute(
      'sp_ListPermissions',
      {
        category: filters.category || null,
        scope: filters.scope || 'all',
        page: filters.page || 1,
        limit: filters.limit || 10
      }
    );

    if (!result || result.length === 0) {
      return { data: [], meta: { currentPage: filters.page || 1, itemsPerPage: filters.limit || 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
    }

     const meta = result[1]?.[0] || {
        currentPage: filters.page || 1,
        itemsPerPage: filters.limit || 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    return { data: {permissionsList : result[0], meta: meta} };
  } catch (error) {
    throw error;
  }
}


  async getPermissionById(id: bigint) {
    const result: any = await this.sqlService.query(
      `SELECT * FROM permissions WHERE id = @id`,
      { id }
    );
    if (result.length === 0) throw new NotFoundException('Permission not found');
    return result[0];
  }

  async createPermission(dto: any, userId: bigint, userType: string) {
    const isSystemPermission = userType === 'owner' || userType === 'superadmin';
    
    const result: any = await this.sqlService.query(
      `INSERT INTO permissions (name, resource, action, description, category, is_system_permission, created_by)
       OUTPUT INSERTED.* VALUES (@name, @resource, @action, @description, @category, @isSystemPermission, @userId)`,
      {
        name: dto.name,
        resource: dto.resource,
        action: dto.action,
        description: dto.description || null,
        category: dto.category || null,
        isSystemPermission,
        userId
      }
    );
    return result[0];
  }

  async deletePermission(id: bigint, userType: string) {
    const systemCheck = (userType === 'owner' || userType === 'superadmin') ? '' : 'AND is_system_permission = 0';
    
    const result: any = await this.sqlService.query(
      `DELETE FROM permissions OUTPUT DELETED.* WHERE id = @id ${systemCheck}`,
      { id }
    );
    if (result.length === 0) throw new NotFoundException('Permission not found or cannot be deleted');
    return { message: 'Permission deleted successfully' };
  }

  // ============================================
  // RESOURCE ACCESS CHECK (FROM OLD SERVICE)
  // ============================================
  async checkAccess(
    userId: bigint,
    resourceType: string,
    resourceId: bigint,
    permissionType: string,
    userType?: string,
    organizationId?: bigint
  ): Promise<boolean> {
    // Owner/Super Admin always have access
    if (userType === 'owner' || userType === 'superadmin') {
      return true;
    }

    // Check direct user permission
    const directPermission = await this.sqlService.query(
      `SELECT 1 FROM resource_permissions 
       WHERE resource_type = @resourceType 
       AND resource_id = @resourceId 
       AND entity_type = 'user' 
       AND entity_id = @userId 
       AND permission_type = @permissionType
       AND (expires_at IS NULL OR expires_at > GETUTCDATE())`,
      { resourceType, resourceId, userId, permissionType }
    );

    if (directPermission.length > 0) return true;

    // Check role-based permission
    const rolePermission = await this.sqlService.query(
      `SELECT 1 FROM resource_permissions rp
       JOIN user_roles ur ON rp.entity_id = ur.role_id
       WHERE rp.resource_type = @resourceType 
       AND rp.resource_id = @resourceId 
       AND rp.entity_type = 'role'
       AND ur.user_id = @userId
       AND rp.permission_type = @permissionType
       AND (rp.expires_at IS NULL OR rp.expires_at > GETUTCDATE())
       AND ur.is_active = 1`,
      { resourceType, resourceId, userId, permissionType }
    );

    if (rolePermission.length > 0) return true;

    // Check if user is owner/creator of the resource
    const ownership = await this.checkOwnership(userId, resourceType, resourceId);
    if (ownership) return true;

    // Check organization-level access
    if (organizationId && (userType === 'agency_admin' || userType === 'brand_admin')) {
      const orgAccess = await this.checkOrganizationAccess(userId, organizationId, resourceType, resourceId);
      if (orgAccess) return true;
    }

    return false;
  }

  // ============================================
  // RESOURCE PERMISSIONS (GRANT/REVOKE)
  // ============================================
  async grantResourcePermission(dto: any, grantedBy: bigint, userType?: string, organizationId?: bigint) {
    // Validate granter has permission
    const canGrant = await this.checkAccess(
      grantedBy,
      dto.resourceType,
      BigInt(dto.resourceId),
      'share',
      userType,
      organizationId
    );

    if (!canGrant && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to grant access to this resource');
    }

    // Validate entity exists
    await this.validateEntity(dto.entityType, BigInt(dto.entityId));

    // Validate organization scope
    if (userType !== 'owner' && userType !== 'superadmin' && dto.entityType === 'user') {
      await this.validateOrganizationScope(grantedBy, BigInt(dto.entityId), organizationId);
    }

    try {
  const result: any = await this.sqlService.execute(
    'sp_GrantResourcePermission',
    {
      resourceType: dto.resourceType,
      resourceId: BigInt(dto.resourceId),
      entityType: dto.entityType,
      entityId: BigInt(dto.entityId),
      permissionType: dto.permissionType,
      grantedBy,
      expiresAt: dto.expiresAt || null
    }
  );

  // Log the access grant
  await this.logResourceAccess(dto.resourceType, BigInt(dto.resourceId), grantedBy, 'grant_access', 
    { entityType: dto.entityType, entityId: dto.entityId, permissionType: dto.permissionType }
  );

  return result[0] || { message: 'Permission granted successfully' };
} catch (error) {
  if (error.message?.includes('UNIQUE')) {
    throw new ConflictException('This permission already exists');
  }
  throw error;
}

  }

  async revokeResourcePermission(dto: any, revokedBy?: bigint, userType?: string, organizationId?: bigint) {
    // Validate revoker has permission
    if (revokedBy) {
      const canRevoke = await this.checkAccess(
        revokedBy,
        dto.resourceType,
        BigInt(dto.resourceId),
        'share',
        userType,
        organizationId
      );

      if (!canRevoke && userType !== 'owner' && userType !== 'superadmin') {
        throw new ForbiddenException('You do not have permission to revoke access to this resource');
      }
    }

   try {
        await this.sqlService.execute(
          'sp_RevokeResourcePermission',
          {
            resourceType: dto.resourceType,
            resourceId: BigInt(dto.resourceId),
            entityType: dto.entityType,
            entityId: BigInt(dto.entityId),
            permissionType: dto.permissionType || null
          }
        );

        // Log the revocation
        if (revokedBy) {
          await this.logResourceAccess(dto.resourceType, BigInt(dto.resourceId), revokedBy, 'revoke_access',
            { entityType: dto.entityType, entityId: dto.entityId, permissionType: dto.permissionType }
          );
        }

        return { message: 'Permission revoked successfully' };
      } catch (error) {
        throw error;
      }
  }

  async checkResourcePermission(resourceType: string, resourceId: bigint, permissionType: string, userId: bigint) {
  try {
    const result: any = await this.sqlService.execute(
      'sp_CheckResourcePermission',
      { resourceType, resourceId, permissionType, userId }
    );

    return {
      hasPermission: result[0]?.hasPermission === 1 || false,
      grantedBy: result[0]?.grantedBy || null,
      expiresAt: result[0]?.expiresAt || null
    };
  } catch (error) {
    throw error;
  }
}

  async checkBatchPermissions(checks: any[], userId: bigint) {
    const results = await Promise.all(
      checks.map(async (check) => {
        const result = await this.checkResourcePermission(
          check.resourceType,
          BigInt(check.resourceId),
          check.permissionType,
          userId
        );
        return {
          resourceType: check.resourceType,
          resourceId: check.resourceId,
          permissionType: check.permissionType,
          ...result
        };
      })
    );

    return { checks: results };
  }

  async listResourcePermissions(resourceType: string, resourceId: bigint, requestorId?: bigint, userType?: string, organizationId?: bigint) {
    // Validate requestor has access
    if (requestorId) {
      const canView = await this.checkAccess(requestorId, resourceType, resourceId, 'read', userType, organizationId);

      if (!canView && userType !== 'owner' && userType !== 'superadmin') {
        throw new ForbiddenException('You do not have permission to view permissions for this resource');
      }
    }

    try {
  const result: any = await this.sqlService.execute(
    'sp_ListResourcePermissions',
    { resourceType, resourceId }
  );

  return result[0] || [];
} catch (error) {
  throw error;
}

  }

  // ============================================
  // SHARING (ENHANCED WITH OLD SERVICE METHODS)
  // ============================================
  async createShare(dto: any, userId: bigint, userType?: string, organizationId?: bigint) {
    // Validate creator has permission to share
    const canShare = await this.checkAccess(userId, dto.resourceType, BigInt(dto.resourceId), 'share', userType, organizationId);

    if (!canShare && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to share this resource');
    }

    const shareToken = crypto.randomBytes(32).toString('hex');
    let passwordHash:any = null;

    if (dto.passwordProtected && dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    try {
  const result: any = await this.sqlService.execute(
    'sp_CreateResourceShare',
    {
      resourceType: dto.resourceType,
      resourceId: BigInt(dto.resourceId),
      shareToken,
      shareType: dto.shareType || 'view',
      recipientEmail: dto.recipientEmail || null,
      recipientUserId: dto.recipientUserId ? BigInt(dto.recipientUserId) : null,
      passwordProtected: dto.passwordProtected || false,
      passwordHash,
      requiresLogin: dto.requiresLogin !== false,
      allowDownload: dto.allowDownload || false,
      expiresAt: dto.expiresAt || null,
      maxViews: dto.maxViews || null,
      createdBy: userId
    }
  );

  return {
    ...result[0],
    shareUrl: `${process.env.FRONTEND_URL}/shared/${shareToken}`
  };
} catch (error) {
  throw error;
}

  }

  async accessShare(shareToken: string, password?: string, userId?: bigint) {
    try {
     const result: any = await this.sqlService.execute(
    'sp_AccessResourceShare',
    { shareToken }
  );

  if (!result || result.length === 0) {
    throw new NotFoundException('Share link not found or expired');
  }

  const share = result[0];


      // Check if revoked
      if (share.revoked_at) {
        throw new ForbiddenException('This share link has been revoked');
      }

      // Check expiration
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        throw new ForbiddenException('This share link has expired');
      }

      // Check max views
      if (share.max_views && share.view_count >= share.max_views) {
        throw new BadRequestException('Maximum view limit reached for this share link');
      }

      // Check login requirement
      if (share.requires_login && !userId) {
        throw new UnauthorizedException('Login required to access this resource');
      }

      // Check if recipient-specific
      if (share.recipient_user_id && userId && userId !== share.recipient_user_id) {
        throw new ForbiddenException('This link is for a specific user only');
      }

      // Check password
      if (share.password_protected) {
        if (!password) {
          throw new UnauthorizedException('Password required');
        }
        const isPasswordValid = await bcrypt.compare(password, share.password_hash);
        if (!isPasswordValid) {
          throw new UnauthorizedException('Invalid password');
        }
      }

      // Log access
      await this.logResourceAccess(share.resource_type, share.resource_id, userId || null, 'view_via_share', { shareToken });

      // Increment view count
      await this.sqlService.query(
        `UPDATE resource_shares SET view_count = view_count + 1, updated_at = GETUTCDATE() WHERE id = @id`,
        { id: share.id }
      );

      // Get resource data
      const resource = await this.getResourceData(share.resource_type, share.resource_id);

      return {
        shareLink: {
          id: share.id,
          resourceType: share.resource_type,
          resourceId: share.resource_id,
          shareType: share.share_type,
          allowDownload: share.allow_download,
          expiresAt: share.expires_at,
        },
        resource
      };
    } catch (error) {
      throw error;
    }
  }

  async revokeShare(shareId: bigint, userId: bigint, userType?: string) {
    // Get share link
    const shareLinks = await this.sqlService.query(
      `SELECT * FROM resource_shares WHERE id = @shareId`,
      { shareId }
    );

    if (shareLinks.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const shareLink = shareLinks[0];

    // Verify permission to revoke
    if (shareLink.created_by !== userId && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to revoke this share link');
    }

    await this.sqlService.query(
      `UPDATE resource_shares SET revoked_at = GETUTCDATE(), updated_at = GETUTCDATE(), updated_by = @userId WHERE id = @shareId`,
      { shareId, userId }
    );

    return { message: 'Share link revoked successfully' };
  }

  async listShares(resourceType: string, resourceId: bigint, userId: bigint, userType?: string, organizationId?: bigint) {
    // Validate access
    const canView = await this.checkAccess(userId, resourceType, resourceId, 'read', userType, organizationId);

    if (!canView && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to view share links');
    }

    try {
     const result: any = await this.sqlService.execute(
    'sp_ListResourcePermissions',
    { resourceType, resourceId }
  );

  return result[0] || [];

      return result[0] || [];
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================
  private async checkOwnership(userId: bigint, resourceType: string, resourceId: bigint): Promise<boolean> {
    const tableMap: Record<string, string> = {
      email: 'email_messages',
      message: 'messages',
      document: 'content_submissions',
      campaign: 'campaigns',
      contract: 'contracts',
    };

    const tableName = tableMap[resourceType];
    if (!tableName) return false;

    try {
      const result = await this.sqlService.query(
        `SELECT 1 FROM ${tableName} WHERE id = @resourceId AND created_by = @userId`,
        { resourceId, userId }
      );
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async checkOrganizationAccess(userId: bigint, organizationId: bigint, resourceType: string, resourceId: bigint): Promise<boolean> {
    const tableMap: Record<string, string> = {
      email: 'email_messages',
      message: 'messages',
      document: 'content_submissions',
      campaign: 'campaigns',
      contract: 'contracts',
    };

    const tableName = tableMap[resourceType];
    if (!tableName) return false;

    try {
      const result = await this.sqlService.query(
        `SELECT 1 FROM ${tableName} WHERE id = @resourceId AND organization_id = @organizationId`,
        { resourceId, organizationId }
      );
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async validateEntity(entityType: 'user' | 'role' | 'team', entityId: bigint) {
    const tableMap = {
      user: 'users',
      role: 'roles',
      team: 'teams',
    };

    const tableName = tableMap[entityType];
    const result = await this.sqlService.query(
      `SELECT 1 FROM ${tableName} WHERE id = @entityId`,
      { entityId }
    );

    if (result.length === 0) {
      throw new NotFoundException(`${entityType} not found`);
    }
  }

  private async validateOrganizationScope(granterId: bigint, targetUserId: bigint, organizationId?: bigint) {
    if (!organizationId) return;

    const targetUser = await this.sqlService.query(
      `SELECT organization_id FROM users WHERE id = @userId`,
      { userId: targetUserId }
    );

    if (targetUser.length === 0) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser[0].organization_id !== organizationId) {
      throw new ForbiddenException('Cannot grant permissions to users outside your organization');
    }
  }

  private async getResourceData(resourceType: string, resourceId: bigint) {
    const tableMap: Record<string, string> = {
      email: 'email_messages',
      message: 'messages',
      document: 'content_submissions',
      campaign: 'campaigns',
      contract: 'contracts',
    };

    const tableName = tableMap[resourceType];
    if (!tableName) {
      throw new BadRequestException('Invalid resource type');
    }

    const result = await this.sqlService.query(
      `SELECT * FROM ${tableName} WHERE id = @resourceId`,
      { resourceId }
    );

    if (result.length === 0) {
      throw new NotFoundException('Resource not found');
    }

    return result[0];
  }

  private async logResourceAccess(resourceType: string, resourceId: bigint, userId: bigint | null, action: string, metadata?: any) {
    try {
      await this.sqlService.query(
        `INSERT INTO resource_access_logs (resource_type, resource_id, user_id, action, metadata, accessed_at)
         VALUES (@resourceType, @resourceId, @userId, @action, @metadata, GETUTCDATE())`,
        {
          resourceType,
          resourceId,
          userId,
          action,
          metadata: metadata ? JSON.stringify(metadata) : null,
        }
      );
    } catch (error) {
      console.error('Failed to log resource access:', error);
    }
  }
}


// // ============================================
// // modules/permissions/resource-permission.service.ts - COMPLETE
// // ============================================
// import { 
//   BadRequestException, 
//   Injectable, 
//   NotFoundException, 
//   UnauthorizedException, 
//   ForbiddenException,
//   ConflictException 
// } from '@nestjs/common';
// import { SqlServerService } from '../../core/database/sql-server.service';
// import * as crypto from 'crypto';
// import * as bcrypt from 'bcrypt';

// @Injectable()
// export class ResourcePermissionService {
//   constructor(private sqlService: SqlServerService) { }

//   /**
//    * Check if user has access to a resource
//    */
//   async checkAccess(
//     userId: bigint,
//     resourceType: string,
//     resourceId: bigint,
//     permissionType: string,
//     userType?: string,
//     organizationId?: bigint
//   ): Promise<boolean> {
//     // Owner/Super Admin always have access
//     if (userType === 'owner' || userType === 'super_admin') {
//       return true;
//     }

//     // Check direct user permission
//     const directPermission = await this.sqlService.query(
//       `SELECT 1 FROM resource_permissions 
//        WHERE resource_type = @resourceType 
//        AND resource_id = @resourceId 
//        AND entity_type = 'user' 
//        AND entity_id = @userId 
//        AND permission_type = @permissionType
//        AND (expires_at IS NULL OR expires_at > GETUTCDATE())`,
//       { resourceType, resourceId, userId, permissionType }
//     );

//     if (directPermission.length > 0) return true;

//     // Check role-based permission
//     const rolePermission = await this.sqlService.query(
//       `SELECT 1 FROM resource_permissions rp
//        JOIN user_roles ur ON rp.entity_id = ur.role_id
//        WHERE rp.resource_type = @resourceType 
//        AND rp.resource_id = @resourceId 
//        AND rp.entity_type = 'role'
//        AND ur.user_id = @userId
//        AND rp.permission_type = @permissionType
//        AND (rp.expires_at IS NULL OR rp.expires_at > GETUTCDATE())
//        AND ur.is_active = 1`,
//       { resourceType, resourceId, userId, permissionType }
//     );

//     if (rolePermission.length > 0) return true;

//     // Check if user is owner/creator of the resource
//     const ownership = await this.checkOwnership(userId, resourceType, resourceId);
//     if (ownership) return true;

//     // Check organization-level access for agency/brand admins
//     if (organizationId && (userType === 'agency_admin' || userType === 'brand_admin')) {
//       const orgAccess = await this.checkOrganizationAccess(
//         userId,
//         organizationId,
//         resourceType,
//         resourceId
//       );
//       if (orgAccess) return true;
//     }

//     return false;
//   }

//   /**
//    * Grant access to a resource
//    */
//   async grantAccess(
//     resourceType: string,
//     resourceId: bigint,
//     entityType: 'user' | 'role' | 'team',
//     entityId: bigint,
//     permissionType: string,
//     grantedBy: bigint,
//     expiresAt?: Date,
//     userType?: string,
//     organizationId?: bigint
//   ) {
//     // Validate granter has permission to grant
//     const canGrant = await this.checkAccess(
//       grantedBy,
//       resourceType,
//       resourceId,
//       'share',
//       userType,
//       organizationId
//     );

//     if (!canGrant && userType !== 'owner' && userType !== 'super_admin') {
//       throw new ForbiddenException('You do not have permission to grant access to this resource');
//     }

//     // Validate entity exists
//     await this.validateEntity(entityType, entityId);

//     // Validate organization scope for non-super admins
//     if (userType !== 'owner' && userType !== 'super_admin' && entityType === 'user') {
//       await this.validateOrganizationScope(grantedBy, entityId, organizationId);
//     }

//     try {
//       const result = await this.sqlService.query(
//         `INSERT INTO resource_permissions 
//          (resource_type, resource_id, entity_type, entity_id, permission_type, granted_by, expires_at)
//          OUTPUT INSERTED.*
//          VALUES (@resourceType, @resourceId, @entityType, @entityId, @permissionType, @grantedBy, @expiresAt)`,
//         { resourceType, resourceId, entityType, entityId, permissionType, grantedBy, expiresAt: expiresAt || null }
//       );

//       // Log the access grant
//       await this.logResourceAccess(
//         resourceType,
//         resourceId,
//         grantedBy,
//         'grant_access',
//         { entityType, entityId, permissionType }
//       );

//       return result[0];
//     } catch (error) {
//       if (error.message.includes('UNIQUE')) {
//         throw new ConflictException('This permission already exists');
//       }
//       throw error;
//     }
//   }

//   /**
//    * Revoke access to a resource
//    */
//   async revokeAccess(
//     resourceType: string,
//     resourceId: bigint,
//     entityType: 'user' | 'role' | 'team',
//     entityId: bigint,
//     permissionType: string,
//     revokedBy?: bigint,
//     userType?: string,
//     organizationId?: bigint
//   ) {
//     // Validate revoker has permission
//     if (revokedBy) {
//       const canRevoke = await this.checkAccess(
//         revokedBy,
//         resourceType,
//         resourceId,
//         'share',
//         userType,
//         organizationId
//       );

//       if (!canRevoke && userType !== 'owner' && userType !== 'super_admin') {
//         throw new ForbiddenException('You do not have permission to revoke access to this resource');
//       }
//     }

//     const result = await this.sqlService.query(
//       `DELETE FROM resource_permissions 
//        OUTPUT DELETED.*
//        WHERE resource_type = @resourceType 
//        AND resource_id = @resourceId 
//        AND entity_type = @entityType 
//        AND entity_id = @entityId 
//        AND permission_type = @permissionType`,
//       { resourceType, resourceId, entityType, entityId, permissionType }
//     );

//     if (result.length === 0) {
//       throw new NotFoundException('Permission not found');
//     }

//     // Log the revocation
//     if (revokedBy) {
//       await this.logResourceAccess(
//         resourceType,
//         resourceId,
//         revokedBy,
//         'revoke_access',
//         { entityType, entityId, permissionType }
//       );
//     }

//     return { message: 'Access revoked successfully' };
//   }

//   /**
//    * List all permissions for a resource
//    */
//   async listResourcePermissions(
//     resourceType: string, 
//     resourceId: bigint,
//     requestorId?: bigint,
//     userType?: string,
//     organizationId?: bigint
//   ) {
//     // Validate requestor has access to view permissions
//     if (requestorId) {
//       const canView = await this.checkAccess(
//         requestorId,
//         resourceType,
//         resourceId,
//         'read',
//         userType,
//         organizationId
//       );

//       if (!canView && userType !== 'owner' && userType !== 'super_admin') {
//         throw new ForbiddenException('You do not have permission to view permissions for this resource');
//       }
//     }

//     return this.sqlService.query(
//       `SELECT rp.*, 
//               CASE 
//                 WHEN rp.entity_type = 'user' THEN u.email
//                 WHEN rp.entity_type = 'role' THEN r.display_name
//               END as entity_name,
//               CASE 
//                 WHEN rp.entity_type = 'user' THEN u.first_name + ' ' + u.last_name
//                 ELSE NULL
//               END as entity_display_name,
//               gb.email as granted_by_email
//        FROM resource_permissions rp
//        LEFT JOIN users u ON rp.entity_type = 'user' AND rp.entity_id = u.id
//        LEFT JOIN roles r ON rp.entity_type = 'role' AND rp.entity_id = r.id
//        LEFT JOIN users gb ON rp.granted_by = gb.id
//        WHERE rp.resource_type = @resourceType 
//        AND rp.resource_id = @resourceId
//        AND (rp.expires_at IS NULL OR rp.expires_at > GETUTCDATE())
//        ORDER BY rp.entity_type, rp.permission_type`,
//       { resourceType, resourceId }
//     );
//   }

//   /**
//    * Create a shareable link for a resource
//    */
//   async createShareLink(
//     resourceType: string,
//     resourceId: bigint,
//     shareType: 'view' | 'comment' | 'edit',
//     options: {
//       recipientEmail?: string;
//       recipientUserId?: bigint;
//       passwordProtected?: boolean;
//       password?: string;
//       requiresLogin?: boolean;
//       allowDownload?: boolean;
//       expiresAt?: Date;
//       maxViews?: number;
//     },
//     createdBy: bigint,
//     userType?: string,
//     organizationId?: bigint
//   ) {
//     // Validate creator has permission to share
//     const canShare = await this.checkAccess(
//       createdBy,
//       resourceType,
//       resourceId,
//       'share',
//       userType,
//       organizationId
//     );

//     if (!canShare && userType !== 'owner' && userType !== 'super_admin') {
//       throw new ForbiddenException('You do not have permission to share this resource');
//     }

//     const shareToken = this.generateShareToken();
//     const passwordHash = options.password
//       ? await bcrypt.hash(options.password, 12)
//       : null;

//     const result = await this.sqlService.query(
//       `INSERT INTO resource_shares 
//        (resource_type, resource_id, share_token, share_type, recipient_email, 
//         recipient_user_id, password_protected, password_hash, requires_login, 
//         allow_download, expires_at, max_views, created_by)
//        OUTPUT INSERTED.*
//        VALUES (@resourceType, @resourceId, @shareToken, @shareType, @recipientEmail,
//                @recipientUserId, @passwordProtected, @passwordHash, @requiresLogin,
//                @allowDownload, @expiresAt, @maxViews, @createdBy)`,
//       {
//         resourceType,
//         resourceId,
//         shareToken,
//         shareType,
//         recipientEmail: options.recipientEmail || null,
//         recipientUserId: options.recipientUserId || null,
//         passwordProtected: options.passwordProtected || false,
//         passwordHash,
//         requiresLogin: options.requiresLogin !== false,
//         allowDownload: options.allowDownload || false,
//         expiresAt: options.expiresAt || null,
//         maxViews: options.maxViews || null,
//         createdBy,
//       }
//     );

//     return {
//       ...result[0],
//       shareUrl: `${process.env.APP_URL}/shared/${shareToken}`,
//     };
//   }

//   /**
//    * Access a resource via share link
//    */
//   async accessViaShareLink(token: string, password?: string, userId?: bigint) {
//     // Get share link details
//     const shareLinks = await this.sqlService.query(
//       `SELECT * FROM resource_shares 
//        WHERE share_token = @token 
//        AND revoked_at IS NULL
//        AND (expires_at IS NULL OR expires_at > GETUTCDATE())`,
//       { token }
//     );

//     if (shareLinks.length === 0) {
//       throw new NotFoundException('Share link not found or expired');
//     }

//     const shareLink = shareLinks[0];

//     // Check if link has reached max views
//     if (shareLink.max_views && shareLink.view_count >= shareLink.max_views) {
//       throw new BadRequestException('Share link has reached maximum views');
//     }

//     // Check if login is required
//     if (shareLink.requires_login && !userId) {
//       throw new UnauthorizedException('Login required to access this resource');
//     }

//     // Check if recipient-specific
//     if (shareLink.recipient_user_id && userId !== shareLink.recipient_user_id) {
//       throw new ForbiddenException('This link is for a specific user only');
//     }

//     // Check password if protected
//     if (shareLink.password_protected) {
//       if (!password) {
//         throw new UnauthorizedException('Password required');
//       }

//       const isPasswordValid = await bcrypt.compare(password, shareLink.password_hash);

//       if (!isPasswordValid) {
//         throw new UnauthorizedException('Invalid password');
//       }
//     }

//     // Increment view count
//     await this.sqlService.query(
//       `UPDATE resource_shares 
//        SET view_count = view_count + 1,
//            updated_at = GETUTCDATE()
//        WHERE id = @id`,
//       { id: shareLink.id }
//     );

//     // Log access
//     await this.logResourceAccess(
//       shareLink.resource_type,
//       shareLink.resource_id,
//       userId || null,
//       'view_via_share',
//       { shareToken: token }
//     );

//     // Get the actual resource data
//     const resource = await this.getResourceData(
//       shareLink.resource_type,
//       shareLink.resource_id
//     );

//     return {
//       shareLink: {
//         id: shareLink.id,
//         resourceType: shareLink.resource_type,
//         resourceId: shareLink.resource_id,
//         shareType: shareLink.share_type,
//         allowDownload: shareLink.allow_download,
//         expiresAt: shareLink.expires_at,
//       },
//       resource,
//     };
//   }

//   /**
//    * Revoke a share link
//    */
//   async revokeShareLink(token: string, userId: bigint, userType?: string) {
//     // Get share link
//     const shareLinks = await this.sqlService.query(
//       `SELECT * FROM resource_shares 
//        WHERE share_token = @token`,
//       { token }
//     );

//     if (shareLinks.length === 0) {
//       throw new NotFoundException('Share link not found');
//     }

//     const shareLink = shareLinks[0];

//     // Verify permission to revoke
//     if (shareLink.created_by !== userId && userType !== 'owner' && userType !== 'super_admin') {
//       throw new ForbiddenException('You do not have permission to revoke this share link');
//     }

//     // Mark as revoked
//     await this.sqlService.query(
//       `UPDATE resource_shares 
//        SET revoked_at = GETUTCDATE(),
//            updated_at = GETUTCDATE(),
//            updated_by = @userId
//        WHERE share_token = @token`,
//       { token, userId }
//     );

//     return { success: true, message: 'Share link revoked successfully' };
//   }

//   /**
//    * Get all share links for a resource
//    */
//   async getResourceShareLinks(
//     resourceType: string,
//     resourceId: bigint,
//     requestorId: bigint,
//     userType?: string,
//     organizationId?: bigint
//   ) {
//     // Validate access
//     const canView = await this.checkAccess(
//       requestorId,
//       resourceType,
//       resourceId,
//       'read',
//       userType,
//       organizationId
//     );

//     if (!canView && userType !== 'owner' && userType !== 'super_admin') {
//       throw new ForbiddenException('You do not have permission to view share links');
//     }

//     return this.sqlService.query(
//       `SELECT rs.*, 
//               u.email as created_by_email,
//               u.first_name + ' ' + u.last_name as created_by_name
//        FROM resource_shares rs
//        LEFT JOIN users u ON rs.created_by = u.id
//        WHERE rs.resource_type = @resourceType 
//        AND rs.resource_id = @resourceId
//        AND rs.revoked_at IS NULL
//        ORDER BY rs.created_at DESC`,
//       { resourceType, resourceId }
//     );
//   }

//   // ==================== PRIVATE HELPER METHODS ====================

//   private async checkOwnership(
//     userId: bigint,
//     resourceType: string,
//     resourceId: bigint
//   ): Promise<boolean> {
//     const tableMap: Record<string, string> = {
//       email: 'email_messages',
//       message: 'messages',
//       document: 'content_submissions',
//       campaign: 'campaigns',
//       contract: 'contracts',
//     };

//     const tableName = tableMap[resourceType];
//     if (!tableName) return false;

//     try {
//       const result = await this.sqlService.query(
//         `SELECT 1 FROM ${tableName} WHERE id = @resourceId AND created_by = @userId`,
//         { resourceId, userId }
//       );

//       return result.length > 0;
//     } catch (error) {
//       return false;
//     }
//   }

//   private async checkOrganizationAccess(
//     userId: bigint,
//     organizationId: bigint,
//     resourceType: string,
//     resourceId: bigint
//   ): Promise<boolean> {
//     // Check if resource belongs to the organization
//     const tableMap: Record<string, string> = {
//       email: 'email_messages',
//       message: 'messages',
//       document: 'content_submissions',
//       campaign: 'campaigns',
//       contract: 'contracts',
//     };

//     const tableName = tableMap[resourceType];
//     if (!tableName) return false;

//     try {
//       // Check if resource has organization_id column
//       const result = await this.sqlService.query(
//         `SELECT 1 FROM ${tableName} 
//          WHERE id = @resourceId 
//          AND organization_id = @organizationId`,
//         { resourceId, organizationId }
//       );

//       return result.length > 0;
//     } catch (error) {
//       return false;
//     }
//   }

//   private async validateEntity(entityType: 'user' | 'role' | 'team', entityId: bigint) {
//     const tableMap = {
//       user: 'users',
//       role: 'roles',
//       team: 'teams',
//     };

//     const tableName = tableMap[entityType];
    
//     const result = await this.sqlService.query(
//       `SELECT 1 FROM ${tableName} WHERE id = @entityId`,
//       { entityId }
//     );

//     if (result.length === 0) {
//       throw new NotFoundException(`${entityType} not found`);
//     }
//   }

//   private async validateOrganizationScope(
//     granterId: bigint,
//     targetUserId: bigint,
//     organizationId?: bigint
//   ) {
//     if (!organizationId) return;

//     // Get target user's organization
//     const targetUser = await this.sqlService.query(
//       `SELECT organization_id FROM users WHERE id = @userId`,
//       { userId: targetUserId }
//     );

//     if (targetUser.length === 0) {
//       throw new NotFoundException('Target user not found');
//     }

//     if (targetUser[0].organization_id !== organizationId) {
//       throw new ForbiddenException('Cannot grant permissions to users outside your organization');
//     }
//   }

//   private async getResourceData(resourceType: string, resourceId: bigint) {
//     const tableMap: Record<string, string> = {
//       email: 'email_messages',
//       message: 'messages',
//       document: 'content_submissions',
//       campaign: 'campaigns',
//       contract: 'contracts',
//     };

//     const tableName = tableMap[resourceType];
//     if (!tableName) {
//       throw new BadRequestException('Invalid resource type');
//     }

//     const result = await this.sqlService.query(
//       `SELECT * FROM ${tableName} WHERE id = @resourceId`,
//       { resourceId }
//     );

//     if (result.length === 0) {
//       throw new NotFoundException('Resource not found');
//     }

//     return result[0];
//   }

//   private generateShareToken(): string {
//     return crypto.randomBytes(32).toString('hex');
//   }

//   private async logResourceAccess(
//     resourceType: string,
//     resourceId: bigint,
//     userId: bigint | null,
//     action: string,
//     metadata?: any
//   ) {
//     try {
//       await this.sqlService.query(
//         `INSERT INTO resource_access_logs 
//          (resource_type, resource_id, user_id, action, metadata, accessed_at)
//          VALUES (@resourceType, @resourceId, @userId, @action, @metadata, GETUTCDATE())`,
//         {
//           resourceType,
//           resourceId,
//           userId,
//           action,
//           metadata: metadata ? JSON.stringify(metadata) : null,
//         }
//       );
//     } catch (error) {
//       // Log but don't throw - access logging shouldn't break the main flow
//       console.error('Failed to log resource access:', error);
//     }
//   }
// }