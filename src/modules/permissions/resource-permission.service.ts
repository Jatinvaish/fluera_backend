// modules/permissions/permissions.service.ts - COMPLETE WITH ALL METHODS
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PermissionsService {
  constructor(private sqlService: SqlServerService) { }


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
    let passwordHash: any = null;

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

  async getPermissionsByIds(permissionIds: bigint[]) {
    if (permissionIds.length === 0) return [];

    const ids = permissionIds.map(id => id.toString()).join(',');

    const result: any = await this.sqlService.query(
      `SELECT * FROM permissions WHERE id IN (${ids}) ORDER BY category, resource, action`
    );

    return result || [];
  }


  // HERE start new
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
        return {
          data: {
            permissionsList: [],
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

      const meta = result[1]?.[0] || {
        currentPage: filters.page || 1,
        itemsPerPage: filters.limit || 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };

      return {
        data: {
          permissionsList: result[0],
          meta: meta
        }
      };
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
    return { data: result[0] };
  }

  async createPermission(dto: any, userId: bigint, userType: string) {
    const isSystemPermission = userType === 'owner' || userType === 'superadmin';

    const result: any = await this.sqlService.query(
      `INSERT INTO permissions (name, resource, action, description, category, is_system_permission, created_by)
       OUTPUT INSERTED.* 
       VALUES (@name, @resource, @action, @description, @category, @isSystemPermission, @userId)`,
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
    return { data: result[0] };
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
  // RESOURCE ACCESS CHECK (FIXED)
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
}

