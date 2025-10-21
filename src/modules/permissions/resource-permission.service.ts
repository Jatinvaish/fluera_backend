// modules/permissions/resource-permission.service.ts
import { Injectable } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';

@Injectable()
export class ResourcePermissionService {
  constructor(private sqlService: SqlServerService) {}

  async checkAccess(
    userId: bigint,
    resourceType: string,
    resourceId: bigint,
    permissionType: string
  ): Promise<boolean> {
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

    // Check if user is owner/creator
    const ownership = await this.checkOwnership(userId, resourceType, resourceId);
    if (ownership) return true;

    return false;
  }

  async grantAccess(
    resourceType: string,
    resourceId: bigint,
    entityType: 'user' | 'role' | 'team',
    entityId: bigint,
    permissionType: string,
    grantedBy: bigint,
    expiresAt?: Date
  ) {
    return this.sqlService.query(
      `INSERT INTO resource_permissions 
       (resource_type, resource_id, entity_type, entity_id, permission_type, granted_by, expires_at)
       VALUES (@resourceType, @resourceId, @entityType, @entityId, @permissionType, @grantedBy, @expiresAt)`,
      { resourceType, resourceId, entityType, entityId, permissionType, grantedBy, expiresAt }
    );
  }

  async revokeAccess(
    resourceType: string,
    resourceId: bigint,
    entityType: 'user' | 'role' | 'team',
    entityId: bigint,
    permissionType: string
  ) {
    return this.sqlService.query(
      `DELETE FROM resource_permissions 
       WHERE resource_type = @resourceType 
       AND resource_id = @resourceId 
       AND entity_type = @entityType 
       AND entity_id = @entityId 
       AND permission_type = @permissionType`,
      { resourceType, resourceId, entityType, entityId, permissionType }
    );
  }

  async listResourcePermissions(resourceType: string, resourceId: bigint) {
    return this.sqlService.query(
      `SELECT rp.*, 
              CASE 
                WHEN rp.entity_type = 'user' THEN u.email
                WHEN rp.entity_type = 'role' THEN r.display_name
              END as entity_name
       FROM resource_permissions rp
       LEFT JOIN users u ON rp.entity_type = 'user' AND rp.entity_id = u.id
       LEFT JOIN roles r ON rp.entity_type = 'role' AND rp.entity_id = r.id
       WHERE rp.resource_type = @resourceType 
       AND rp.resource_id = @resourceId
       AND (rp.expires_at IS NULL OR rp.expires_at > GETUTCDATE())`,
      { resourceType, resourceId }
    );
  }

  private async checkOwnership(
    userId: bigint,
    resourceType: string,
    resourceId: bigint
  ): Promise<boolean> {
    const tableMap = {
      email: 'email_messages',
      message: 'messages',
      document: 'content_submissions',
      campaign: 'campaigns',
      contract: 'contracts',
    };

    const tableName = tableMap[resourceType];
    if (!tableName) return false;

    const result = await this.sqlService.query(
      `SELECT 1 FROM ${tableName} WHERE id = @resourceId AND created_by = @userId`,
      { resourceId, userId }
    );

    return result.length > 0;
  }

  async createShareLink(
    resourceType: string,
    resourceId: bigint,
    shareType: 'view' | 'comment' | 'edit',
    options: {
      recipientEmail?: string;
      recipientUserId?: bigint;
      passwordProtected?: boolean;
      password?: string;
      requiresLogin?: boolean;
      allowDownload?: boolean;
      expiresAt?: Date;
      maxViews?: number;
    },
    createdBy: bigint
  ) {
    const shareToken = this.generateShareToken();
    const passwordHash = options.password 
      ? await this.hashPassword(options.password) 
      : null;

    const result = await this.sqlService.query(
      `INSERT INTO resource_shares 
       (resource_type, resource_id, share_token, share_type, recipient_email, 
        recipient_user_id, password_protected, password_hash, requires_login, 
        allow_download, expires_at, max_views, created_by)
       OUTPUT INSERTED.*
       VALUES (@resourceType, @resourceId, @shareToken, @shareType, @recipientEmail,
               @recipientUserId, @passwordProtected, @passwordHash, @requiresLogin,
               @allowDownload, @expiresAt, @maxViews, @createdBy)`,
      {
        resourceType,
        resourceId,
        shareToken,
        shareType,
        recipientEmail: options.recipientEmail || null,
        recipientUserId: options.recipientUserId || null,
        passwordProtected: options.passwordProtected || false,
        passwordHash,
        requiresLogin: options.requiresLogin !== false,
        allowDownload: options.allowDownload || false,
        expiresAt: options.expiresAt || null,
        maxViews: options.maxViews || null,
        createdBy,
      }
    );

    return result[0];
  }

  private generateShareToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, 12);
  }
}