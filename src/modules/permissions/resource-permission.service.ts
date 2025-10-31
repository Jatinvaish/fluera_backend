// modules/permissions/permissions.service.ts - UPDATED WITH SPs
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PermissionsService {
  constructor(private sqlService: SqlServerService) { }

  // ============================================
  // RBAC PERMISSIONS
  // ============================================
  async listPermissions(filters: any) {
    try {
      const result: any = await this.sqlService.execute(
        'sp_ListPermissions',
        {
          category: filters.category || null,
          scope: filters.scope || 'all',
          page: filters.page || 1,
          limit: filters.limit || 50
        }
      );

      if (!result || result.length === 0) {
        return {
          data: {
            permissionsList: [],
            meta: {
              currentPage: filters.page || 1,
              itemsPerPage: filters.limit || 50,
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
        itemsPerPage: filters.limit || 50,
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
  // RESOURCE PERMISSIONS - USING SPs
  // ============================================
  async grantResourcePermission(dto: any, grantedBy: bigint, userType?: string, tenantId?: bigint) {
    // Validate granter has permission
    const canGrant = await this.checkAccess(
      grantedBy,
      dto.resourceType,
      BigInt(dto.resourceId),
      'share',
      userType,
      tenantId
    );

    if (!canGrant && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to grant access to this resource');
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
      if (error.message?.includes('UNIQUE') || error.message?.includes('duplicate')) {
        throw new ConflictException('This permission already exists');
      }
      throw error;
    }
  }

  async revokeResourcePermission(dto: any, revokedBy?: bigint, userType?: string, tenantId?: bigint) {
    // Validate revoker has permission
    if (revokedBy) {
      const canRevoke = await this.checkAccess(
        revokedBy,
        dto.resourceType,
        BigInt(dto.resourceId),
        'share',
        userType,
        tenantId
      );

      if (!canRevoke && userType !== 'owner' && userType !== 'superadmin') {
        throw new ForbiddenException('You do not have permission to revoke access to this resource');
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

  // ✅ UPDATED: Use sp_CheckResourcePermission
  async checkResourcePermission(
    userId: bigint,
    tenantId: bigint,
    resourceType: string,
    resourceId: bigint,
    permissionType: string,
  ): Promise<boolean> {
    const result = await this.sqlService.execute('sp_CheckResourcePermission', {
      userId,
      tenantId,
      resourceType,
      resourceId,
      permissionType,
    });

    // SP returns 2 result sets: direct permissions and role-based permissions
    const hasDirectPermission = result[0]?.has_permission > 0;
    const hasRolePermission = result[1]?.has_role_permission > 0;

    return hasDirectPermission || hasRolePermission;
  }

  async checkBatchPermissions(checks: any[], userId: bigint, tenantId: bigint) {
    const results = await Promise.all(
      checks.map(async (check) => {
        const hasPermission = await this.checkResourcePermission(
          userId,
          tenantId,
          check.resourceType,
          BigInt(check.resourceId),
          check.permissionType,
        );
        return {
          resourceType: check.resourceType,
          resourceId: check.resourceId,
          permissionType: check.permissionType,
          hasPermission,
        };
      })
    );

    return { checks: results };
  }

  async listResourcePermissions(resourceType: string, resourceId: bigint, requestorId?: bigint, userType?: string, tenantId?: bigint) {
    // Validate requestor has access
    if (requestorId) {
      const canView = await this.checkAccess(requestorId, resourceType, resourceId, 'read', userType, tenantId);

      if (!canView && userType !== 'owner' && userType !== 'superadmin') {
        throw new ForbiddenException('You do not have permission to view permissions for this resource');
      }
    }

    const result: any = await this.sqlService.query(
      `SELECT 
        rp.*,
        u.email AS entity_email,
        u.first_name AS entity_first_name,
        u.last_name AS entity_last_name,
        r.name AS entity_role_name
      FROM resource_permissions rp
      LEFT JOIN users u ON rp.entity_type = 'user' AND rp.entity_id = u.id
      LEFT JOIN roles r ON rp.entity_type = 'role' AND rp.entity_id = r.id
      WHERE rp.resource_type = @resourceType 
      AND rp.resource_id = @resourceId
      ORDER BY rp.created_at DESC`,
      { resourceType, resourceId }
    );

    return result || [];
  }

  // ============================================
  // SHARING
  // ============================================
  async createShare(dto: any, userId: bigint, userType?: string, tenantId?: bigint) {
    // Validate creator has permission to share
    const canShare = await this.checkAccess(userId, dto.resourceType, BigInt(dto.resourceId), 'share', userType, tenantId);

    if (!canShare && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to share this resource');
    }

    const shareToken = crypto.randomBytes(32).toString('hex');
    let passwordHash: any = null;

    if (dto.passwordProtected && dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    try {
      const result: any = await this.sqlService.query(
        `INSERT INTO resource_shares (
          resource_type, resource_id, share_token, share_type,
          recipient_email, recipient_user_id, recipient_tenant_id,
          password_protected, password_hash, requires_login,
          allow_download, expires_at, max_views, created_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @resourceType, @resourceId, @shareToken, @shareType,
          @recipientEmail, @recipientUserId, @recipientTenantId,
          @passwordProtected, @passwordHash, @requiresLogin,
          @allowDownload, @expiresAt, @maxViews, @createdBy
        )`,
        {
          resourceType: dto.resourceType,
          resourceId: BigInt(dto.resourceId),
          shareToken,
          shareType: dto.shareType || 'view',
          recipientEmail: dto.recipientEmail || null,
          recipientUserId: dto.recipientUserId ? BigInt(dto.recipientUserId) : null,
          recipientTenantId: dto.recipientTenantId ? BigInt(dto.recipientTenantId) : null,
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
      const result: any = await this.sqlService.query(
        `SELECT * FROM resource_shares WHERE share_token = @shareToken`,
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
      if (share.recipient_user_id && userId && BigInt(userId) !== BigInt(share.recipient_user_id)) {
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
    const shareLinks = await this.sqlService.query(
      `SELECT * FROM resource_shares WHERE id = @shareId`,
      { shareId }
    );

    if (shareLinks.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const shareLink = shareLinks[0];

    // Verify permission to revoke
    if (BigInt(shareLink.created_by) !== BigInt(userId) && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to revoke this share link');
    }

    await this.sqlService.query(
      `UPDATE resource_shares SET revoked_at = GETUTCDATE(), updated_at = GETUTCDATE(), updated_by = @userId WHERE id = @shareId`,
      { shareId, userId }
    );

    return { message: 'Share link revoked successfully' };
  }

  async listShares(resourceType: string, resourceId: bigint, userId: bigint, userType?: string, tenantId?: bigint) {
    // Validate access
    const canView = await this.checkAccess(userId, resourceType, resourceId, 'read', userType, tenantId);

    if (!canView && userType !== 'owner' && userType !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to view share links');
    }

    const result: any = await this.sqlService.query(
      `SELECT 
        rs.*,
        u.email AS created_by_email,
        u.first_name AS created_by_first_name,
        u.last_name AS created_by_last_name
      FROM resource_shares rs
      LEFT JOIN users u ON rs.created_by = u.id
      WHERE rs.resource_type = @resourceType 
      AND rs.resource_id = @resourceId
      ORDER BY rs.created_at DESC`,
      { resourceType, resourceId }
    );

    return result || [];
  }

  // ============================================
  // ACCESS CHECK (ENHANCED)
  // ============================================
  async checkAccess(
    userId: bigint,
    resourceType: string,
    resourceId: bigint,
    permissionType: string,
    userType?: string,
    tenantId?: bigint
  ): Promise<boolean> {
    // Owner/Super Admin always have access
    if (userType === 'owner' || userType === 'superadmin' || userType === 'super_admin') {
      return true;
    }

    // Use SP for permission check if tenantId available
    if (tenantId) {
      return this.checkResourcePermission(userId, tenantId, resourceType, resourceId, permissionType);
    }

    // Fallback to direct checks
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

    // Check ownership
    const ownership = await this.checkOwnership(userId, resourceType, resourceId);
    if (ownership) return true;

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
      file: 'files',
      note: 'notes',
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

  private async getResourceData(resourceType: string, resourceId: bigint) {
    const tableMap: Record<string, string> = {
      email: 'email_messages',
      message: 'messages',
      document: 'content_submissions',
      campaign: 'campaigns',
      contract: 'contracts',
      file: 'files',
      note: 'notes',
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