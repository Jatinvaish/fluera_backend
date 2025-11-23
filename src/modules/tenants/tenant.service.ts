// ============================================
// src/modules/tenants/tenants.service.ts - V4.0
// ============================================
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { EncryptionService } from 'src/common/encryption.service';
import { GetTenantMembersQueryDto } from './dto/tenant.dto';

export interface PaginatedMembersResponse {
  data: any[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

@Injectable()
export class TenantsService {
  constructor(
    private sqlService: SqlServerService,
    private encryptionService: EncryptionService
  ) { }

  /**
   * Get user's tenants
   */
  async getUserTenants(userId: number) {
    const tenants = await this.sqlService.query(
      `SELECT 
        t.id, t.tenant_type, t.name, t.slug, t.logo_url,
        t.subscription_status, t.is_trial, t.trial_ends_at,
        tm.role_id, tm.member_type, tm.joined_at,
        r.name as role_name
      FROM tenant_members tm
      JOIN tenants t ON tm.tenant_id = t.id
      LEFT JOIN roles r ON tm.role_id = r.id
      WHERE tm.user_id = @userId AND tm.is_active = 1 AND t.is_active = 1
      ORDER BY tm.joined_at DESC`,
      { userId }
    );

    return tenants;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: number, userId: number) {
    const hasAccess = await this.verifyUserAccess(userId, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const tenants = await this.sqlService.query(
      `SELECT 
        t.*,
        u.email as owner_email,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name,
        (SELECT COUNT(*) FROM tenant_members WHERE tenant_id = t.id AND is_active = 1) as member_count
      FROM tenants t
      JOIN users u ON t.owner_user_id = u.id
      WHERE t.id = @tenantId`,
      { tenantId }
    );

    if (tenants.length === 0) {
      throw new NotFoundException('Tenant not found');
    }

    return tenants[0];
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: number, userId: number, dto: any) {
    const hasAccess = await this.verifyUserAccess(userId, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const updates: string[] = [];
    const params: any = { tenantId, userId };

    if (dto.name) {
      updates.push('name = @name');
      params.name = dto.name;
    }
    if (dto.logoUrl !== undefined) {
      updates.push('logo_url = @logoUrl');
      params.logoUrl = dto.logoUrl;
    }
    if (dto.timezone) {
      updates.push('timezone = @timezone');
      params.timezone = dto.timezone;
    }
    if (dto.locale) {
      updates.push('locale = @locale');
      params.locale = dto.locale;
    }
    if (dto.currency) {
      updates.push('currency = @currency');
      params.currency = dto.currency;
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    updates.push('updated_at = GETUTCDATE()');
    updates.push('updated_by = @userId');

    await this.sqlService.query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = @tenantId`,
      params
    );

    return this.getTenantById(tenantId, userId);
  }

  /**
   * Get tenant members with pagination, sorting, and search
   */
  async getTenantMembers(
    tenantId: number,
    userId: number,
    query: GetTenantMembersQueryDto
  ): Promise<PaginatedMembersResponse> {
    const hasAccess = await this.verifyUserAccess(userId, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    // Use defaults from DTO or override with provided values
    const page = query.page || 1;
    const limit = query.limit || 10;
    const search = query.search?.trim() || null;
    const sortBy = query.sortBy || 'joined_at';
    const sortOrder = query.sortOrder || 'DESC';

    try {
      const results = await this.sqlService.execute('sp_GetTenantMembers', {
        tenantId,
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });

      if (!results || results.length === 0) {
        return {
          data: [],
          pagination: {
            currentPage: page,
            pageSize: limit,
            totalCount: 0,
            totalPages: 0,
          },
        };
      }

      // Extract pagination info from first row
      const firstRow = results[0];
      const totalCount = firstRow.total_count || 0;
      const totalPages = firstRow.total_pages || 0;

      // Remove pagination fields from data
      const data = results.map(row => {
        const { total_count, current_page, page_size, total_pages, ...cleanRow } = row;
        return cleanRow;
      });

      return {
        data,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalCount,
          totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch tenant members: ${error.message}`
      );
    }
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId: number, userId: number) {
    const hasAccess = await this.verifyUserAccess(userId, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const stats = await this.sqlService.execute('sp_GetTenantUsageStats', {
      tenantId,
    });

    if (stats.length === 0) {
      throw new NotFoundException('Tenant not found');
    }

    const tenant = stats[0];

    return {
      limits: {
        staff: tenant.max_staff,
        storageGb: tenant.max_storage_gb,
        campaigns: tenant.max_campaigns,
        invitations: tenant.max_invitations,
        creators: tenant.max_creators,
        brands: tenant.max_brands,
      },
      current: {
        staff: tenant.current_staff,
        storageGb: tenant.current_storage_gb,
        campaigns: tenant.current_campaigns,
        invitations: tenant.current_invitations,
        creators: tenant.current_creators,
        brands: tenant.current_brands,
      },
      usage: {
        staffPercent: tenant.staff_usage_percent,
        storagePercent: tenant.storage_usage_percent,
        campaignsPercent: tenant.campaigns_usage_percent,
      },
    };
  }

  /**
   * Rotate Tenant Encryption Keys
   */
  async rotateTenantKeys(tenantId: number, userId: number) {
    const hasAccess = await this.verifyUserAccess(userId, tenantId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    // Generate new keys
    const newKeys = this.encryptionService.generateTenantKey();

    const result = await this.sqlService.execute('sp_RotateTenantKeys', {
      tenantId,
      newPublicKey: newKeys.publicKey,
      newEncryptedPrivateKey: newKeys.encryptedPrivateKey,
      rotatedBy: userId,
    });

    return {
      message: 'Tenant encryption keys rotated successfully',
      keyVersion: result[0].key_version,
      rotatedAt: result[0].key_rotated_at,
    };
  }

  /**
   * Verify user has access to tenant
   */
  private async verifyUserAccess(userId: number, tenantId: number): Promise<boolean> {
    const result = await this.sqlService.execute('sp_VerifyTenantAccess', {
      userId,
      tenantId,
    });

    return result[0]?.has_access === 1;
  }
}