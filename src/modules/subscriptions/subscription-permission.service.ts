// src/modules/subscriptions/subscription-permission.service.ts
import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { AuditLoggerService } from '../global-modules/audit-logs/audit-logs.service';
import { CreateSubscriptionFeatureDto, UpdateSubscriptionFeatureDto, ListSubscriptionFeaturesDto, CreateSubscriptionFeaturePermissionDto, ListSubscriptionFeaturePermissionsDto, UpdateSubscriptionFeaturePermissionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionPermissionService {
  private readonly logger = new Logger(SubscriptionPermissionService.name);

  constructor(
    private sqlService: SqlServerService,
    private auditLogger: AuditLoggerService,
  ) { }

  /**
   * Get all permissions available in tenant's subscription
   */
  async getSubscriptionPermissions(tenantId: number) {
    try {
      const result: any = await this.sqlService.execute(
        'sp_GetSubscriptionPermissions',
        { tenantId },
      );

      return {
        success: true,
        data: result || [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subscription permissions for tenant ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  // -

  // --
  async createSubscriptionFeature(dto: CreateSubscriptionFeatureDto, userId: number) {
    try {
      const query = `
        INSERT INTO subscription_features (
          subscription_id,
          feature_price,
          restricted_to,
          name,
          is_deleted,
          created_at,
          created_by,
          updated_at,
          updated_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @subscriptionId,
          @featurePrice,
          @restrictedTo,
          @name,
          0,
          GETDATE(),
          @userId,
          GETDATE(),
          @userId
        )
      `;

      const result: any = await this.sqlService.query(query, {
        subscriptionId: dto.subscription_id,
        featurePrice: dto.feature_price || null,
        restrictedTo: dto.restricted_to || null,
        name: dto.name,
        userId,
      });

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_features',
        entityId: result[0].id,
        actionType: 'CREATE',
        severity: 'medium',
      });

      return {
        success: true,
        message: 'Subscription feature created successfully',
        data: result[0],
      };
    } catch (error) {
      this.logger.error('Failed to create subscription feature:', error);
      throw new BadRequestException('Failed to create subscription feature');
    }
  }

  /**
   * Update an existing subscription feature
   */
  async updateSubscriptionFeature(dto: UpdateSubscriptionFeatureDto, userId: number) {
    try {
      // Check if feature exists and is not deleted
      const checkQuery = `
        SELECT id FROM subscription_features 
        WHERE id = @id AND is_deleted = 0
      `;
      const existing: any = await this.sqlService.query(checkQuery, { id: dto.id });

      if (!existing || existing.length === 0) {
        throw new NotFoundException('Subscription feature not found');
      }

      const query = `
        UPDATE subscription_features
        SET
          subscription_id = COALESCE(@subscriptionId, subscription_id),
          feature_price = COALESCE(@featurePrice, feature_price),
          restricted_to = COALESCE(@restrictedTo, restricted_to),
          name = COALESCE(@name, name),
          updated_at = GETDATE(),
          updated_by = @userId
        OUTPUT INSERTED.*
        WHERE id = @id AND is_deleted = 0
      `;

      const result: any = await this.sqlService.query(query, {
        id: dto.id,
        subscriptionId: dto.subscription_id || null,
        featurePrice: dto.feature_price !== undefined ? dto.feature_price : null,
        restrictedTo: dto.restricted_to || null,
        name: dto.name || null,
        userId,
      });


      await this.auditLogger.log({
        userId,
        entityType: 'subscription_features',
        entityId: dto.id,
        actionType: 'UPDATE',
        severity: 'high',
      });


      return {
        success: true,
        message: 'Subscription feature updated successfully',
        data: result[0],
      };
    } catch (error) {
      this.logger.error('Failed to update subscription feature:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update subscription feature');
    }
  }

  /**
   * List subscription features with pagination
   */
  async listSubscriptionFeatures(filters: ListSubscriptionFeaturesDto) {
    try {
      // Build WHERE clause
      const conditions: string[] = ['sf.is_deleted = 0'];
      const params: any = {};

      if (filters.subscription_id) {
        conditions.push('sf.subscription_id = @subscriptionId');
        params.subscriptionId = filters.subscription_id;
      }

      if (filters.name) {
        conditions.push('sf.name LIKE @name');
        params.name = `%${filters.name}%`;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const allowedSortFields = ['name', 'feature_price', 'restricted_to', 'created_at', 'subscription_id'];
      const sortBy = filters.sortBy && allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
      const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM subscription_features sf
        ${whereClause}
      `;
      const countResult: any = await this.sqlService.query(countQuery, params);
      const total = countResult[0]?.total || 0;

      // Calculate pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      // Get paginated data with permissions count
      const dataQuery = `
        SELECT
          sf.id,
          sf.subscription_id,
          sf.name,
          sp.plan_name,
          sf.feature_price,
          sf.restricted_to,
          sf.created_at,
          sf.updated_at,
          (SELECT COUNT(*) FROM subscription_feature_permissions sfp
           WHERE sfp.feature_id = sf.id AND sfp.is_deleted = 0) as permissions_count
        FROM subscription_features sf
        INNER JOIN subscription_plans sp on sf.subscription_id = sp.id
        ${whereClause}
        ORDER BY sf.${sortBy} ${sortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result: any = await this.sqlService.query(dataQuery, params);

      return {
        success: true,
        data: {
          featuresList: result || [],
          meta: {
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            itemsPerPage: limit
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to list subscription features:', error);
      throw new BadRequestException('Failed to list subscription features');
    }
  }

  /**
   * Get subscription feature by ID
   */
  async getSubscriptionFeatureById(id: number) {
    try {
      const query = `
        SELECT 
          sf.*,
          (SELECT COUNT(*) FROM subscription_feature_permissions sfp 
           WHERE sfp.feature_id = sf.id AND sfp.is_deleted = 0) as permissions_count
        FROM subscription_features sf
        WHERE sf.id = @id AND sf.is_deleted = 0
      `;

      const result: any = await this.sqlService.query(query, { id });

      if (!result || result.length === 0) {
        throw new NotFoundException('Subscription feature not found');
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription feature ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get subscription feature');
    }
  }

  /**
   * Soft delete a subscription feature
   */
  async deleteSubscriptionFeature(id: number, userId: number) {
    try {
      // Check if feature exists and is not deleted
      const checkQuery = `
        SELECT id FROM subscription_features 
        WHERE id = @id AND is_deleted = 0
      `;
      const existing: any = await this.sqlService.query(checkQuery, { id });

      if (!existing || existing.length === 0) {
        throw new NotFoundException('Subscription feature not found');
      }

      const query = `
        UPDATE subscription_features
        SET
          is_deleted = 1,
          updated_at = GETDATE(),
          updated_by = @userId
        WHERE id = @id
      `;

      await this.sqlService.query(query, { id, userId });

      // Also soft delete related feature permissions
      const deletePermissionsQuery = `
        UPDATE subscription_feature_permissions
        SET
          is_deleted = 1,
          updated_at = GETDATE(),
          updated_by = @userId
        WHERE feature_id = @id
      `;

      await this.sqlService.query(deletePermissionsQuery, { id, userId });
      await this.auditLogger.log({
        userId,
        entityType: 'subscription_features',
        entityId: id,
        actionType: 'DELETE',
        severity: 'high',
      });

      return {
        success: true,
        message: 'Subscription feature deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete subscription feature ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete subscription feature');
    }
  }

  async createSubscriptionFeaturePermission(
    dto: CreateSubscriptionFeaturePermissionDto,
    userId: number,
  ) {
    try {
      // Validate feature exists
      const featureCheck = `
      SELECT id FROM subscription_features 
      WHERE id = @featureId AND is_deleted = 0
    `;
      const featureExists: any = await this.sqlService.query(featureCheck, {
        featureId: dto.feature_id,
      });

      if (!featureExists || featureExists.length === 0) {
        throw new BadRequestException('Subscription feature not found');
      }

      // Validate all permissions exist
      const permissionCheck = `
      SELECT id FROM permissions WHERE id IN (${dto.permission_ids.join(',')})
    `;
      const permissionsExist: any = await this.sqlService.query(permissionCheck);

      if (!permissionsExist || permissionsExist.length !== dto.permission_ids.length) {
        throw new BadRequestException('One or more permissions not found');
      }

      // Insert multiple records
      const values = dto.permission_ids.map((permId, index) =>
        `(@subscriptionId, @featureId, @permissionId${index}, @permissionPrice, @restrictedTo, 0, GETDATE(), @userId, GETDATE(), @userId)`
      ).join(',');

      const params: any = {
        subscriptionId: dto.subscription_id,
        featureId: dto.feature_id,
        permissionPrice: dto.permission_price || null,
        restrictedTo: dto.restricted_to || null,
        userId,
      };

      dto.permission_ids.forEach((permId, index) => {
        params[`permissionId${index}`] = permId;
      });

      const query = `
      INSERT INTO subscription_feature_permissions (
        subscription_id,
        feature_id,
        permission_id,
        permission_price,
        restricted_to,
        is_deleted,
        created_at,
        created_by,
        updated_at,
        updated_by
      )
      OUTPUT INSERTED.*
      VALUES ${values}
    `;

      const results: any = await this.sqlService.query(query, params);

      // Audit log for each created record
      await Promise.all(
        results.map(record =>
          this.auditLogger.log({
            userId,
            entityType: 'subscription_feature_permissions',
            entityId: record.id,
            actionType: 'CREATE',
            severity: 'high',
          })
        )
      );

      return {
        success: true,
        message: `${results.length} subscription feature permission${results.length > 1 ? 's' : ''} created successfully`,
        data: results,
        count: results.length,
      };
    } catch (error) {
      this.logger.error('Failed to create subscription feature permissions:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create subscription feature permissions');
    }
  }

  async updateSubscriptionFeaturePermission(
    dto: UpdateSubscriptionFeaturePermissionDto,
    userId: number,
  ) {
    try {
      // Get existing record
      const existingQuery = `
      SELECT * FROM subscription_feature_permissions 
      WHERE id = @id AND is_deleted = 0
    `;
      const existing: any = await this.sqlService.query(existingQuery, { id: dto.id });

      if (!existing || existing.length === 0) {
        throw new BadRequestException('Feature permission not found');
      }

      const existingRecord = existing[0];

      // If permission_ids provided, delete old and create new
      if (dto.permission_ids && dto.permission_ids.length > 0) {
        // Validate all permissions exist
        const permissionCheck = `
        SELECT id FROM permissions WHERE id IN (${dto.permission_ids.join(',')})
      `;
        const permissionsExist: any = await this.sqlService.query(permissionCheck);

        if (!permissionsExist || permissionsExist.length !== dto.permission_ids.length) {
          throw new BadRequestException('One or more permissions not found');
        }

        // Soft delete existing
        const deleteQuery = `
        UPDATE subscription_feature_permissions 
        SET is_deleted = 1, updated_at = GETDATE(), updated_by = @userId 
        WHERE id = @id
      `;
        await this.sqlService.query(deleteQuery, { id: dto.id, userId });

        // Create new records
        const values = dto.permission_ids.map((permId, index) =>
          `(@subscriptionId, @featureId, @permissionId${index}, @permissionPrice, @restrictedTo,  0, GETDATE(), @userId, GETDATE(), @userId)`
        ).join(',');

        const params: any = {
          subscriptionId: dto.subscription_id || existingRecord.subscription_id,
          featureId: dto.feature_id || existingRecord.feature_id,
          permissionPrice: dto.permission_price ?? existingRecord.permission_price,
          restrictedTo: dto.restricted_to ?? existingRecord.restricted_to,
          userId,
        };

        dto.permission_ids.forEach((permId, index) => {
          params[`permissionId${index}`] = permId;
        });

        const insertQuery = `
        INSERT INTO subscription_feature_permissions (
          subscription_id,
          feature_id,
          permission_id,
          permission_price,
          restricted_to,
          is_deleted,
          created_at,
          created_by,
          updated_at,
          updated_by
        )
        OUTPUT INSERTED.*
        VALUES ${values}
      `;

        const results: any = await this.sqlService.query(insertQuery, params);

        await Promise.all(
          results.map(record =>
            this.auditLogger.log({
              userId,
              entityType: 'subscription_feature_permissions',
              entityId: record.id,
              actionType: 'UPDATE',
              severity: 'high',
            })
          )
        );

        return {
          success: true,
          message: `${results.length} subscription feature permission${results.length > 1 ? 's' : ''} updated successfully`,
          data: results,
          count: results.length,
        };
      }

      // Standard update without permission_ids change
      const updateQuery = `
      UPDATE subscription_feature_permissions
      SET 
        subscription_id = COALESCE(@subscriptionId, subscription_id),
        feature_id = COALESCE(@featureId, feature_id),
        permission_price = COALESCE(@permissionPrice, permission_price),
        restricted_to = COALESCE(@restrictedTo, restricted_to),
        name = COALESCE(@name, name),
        updated_at = GETDATE(),
        updated_by = @userId
      OUTPUT INSERTED.*
      WHERE id = @id AND is_deleted = 0
    `;

      const result: any = await this.sqlService.query(updateQuery, {
        id: dto.id,
        subscriptionId: dto.subscription_id || null,
        featureId: dto.feature_id || null,
        permissionPrice: dto.permission_price !== undefined ? dto.permission_price : null,
        restrictedTo: dto.restricted_to || null,
        userId,
      });

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_feature_permissions',
        entityId: dto.id,
        actionType: 'UPDATE',
        severity: 'high',
      });

      return {
        success: true,
        message: 'Subscription feature permission updated successfully',
        data: result[0],
      };
    } catch (error) {
      this.logger.error('Failed to update subscription feature permission:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update subscription feature permission');
    }
  }

  /**
   * List subscription feature permissions with pagination
   */
  async listSubscriptionFeaturePermissions(filters: ListSubscriptionFeaturePermissionsDto) {
    try {
      // Build WHERE clause
      const conditions: string[] = ['sfp.is_deleted = 0'];
      const params: any = {};

      if (filters.subscription_id) {
        conditions.push('sfp.subscription_id = @subscriptionId');
        params.subscriptionId = filters.subscription_id;
      }

      if (filters.feature_id) {
        conditions.push('sfp.feature_id = @featureId');
        params.featureId = filters.feature_id;
      }

      if (filters.permission_id) {
        conditions.push('sfp.permission_id = @permissionId');
        params.permissionId = filters.permission_id;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const allowedSortFields = ['name', 'permission_price', 'restricted_to', 'created_at', 'subscription_id', 'feature_id', 'permission_id'];
      const sortBy = filters.sortBy && allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'id';
      const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM subscription_feature_permissions sfp
        ${whereClause}
      `;
      const countResult: any = await this.sqlService.query(countQuery, params);
      const total = countResult[0]?.total || 0;

      // Calculate pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      // Get paginated data with related info
      const dataQuery = `
        SELECT
          sfp.id,
          sfp.subscription_id,
          sfp.feature_id,
          sfp.permission_id,
          sfp.permission_price,
          sfp.restricted_to,
          sfp.created_at,
          sfp.updated_at,
          sf.name as feature_name,
          sp.plan_name as plan_name,
          p.permission_key,
          p.resource,
          p.action,
          p.description as permission_description,
          p.category as permission_category
        FROM subscription_feature_permissions sfp
        INNER JOIN subscription_features sf ON sfp.feature_id = sf.id
        INNER JOIN subscription_plans sp ON sf.subscription_id = sp.id
        INNER JOIN permissions p ON sfp.permission_id = p.id
        ${whereClause}
        ORDER BY sfp.${sortBy} ${sortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const result: any = await this.sqlService.query(dataQuery, params);

      return {
        success: true,
        data: {
          featurePermissionsList: result || [],
          meta: {
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            itemsPerPage: limit
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to list subscription feature permissions:', error);
      throw new BadRequestException('Failed to list subscription feature permissions');
    }
  }

  /**
   * Get subscription feature permission by ID
   */
  async getSubscriptionFeaturePermissionById(id: number) {
    try {
      const query = `
        SELECT 
          sfp.*,
          sf.name as feature_name,
          p.permission_key,
          p.resource,
          p.action,
          p.description as permission_description
        FROM subscription_feature_permissions sfp
        INNER JOIN subscription_features sf ON sfp.feature_id = sf.id
        INNER JOIN permissions p ON sfp.permission_id = p.id
        WHERE sfp.id = @id AND sfp.is_deleted = 0
      `;

      const result: any = await this.sqlService.query(query, { id });

      if (!result || result.length === 0) {
        throw new NotFoundException('Subscription feature permission not found');
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription feature permission ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get subscription feature permission');
    }
  }

  /**
   * Soft delete a subscription feature permission
   */
  async deleteSubscriptionFeaturePermission(id: number, userId: number) {
    try {
      // Check if feature permission exists and is not deleted
      const checkQuery = `
        SELECT id FROM subscription_feature_permissions 
        WHERE id = @id AND is_deleted = 0
      `;
      const existing: any = await this.sqlService.query(checkQuery, { id });

      if (!existing || existing.length === 0) {
        throw new NotFoundException('Subscription feature permission not found');
      }

      const query = `
        UPDATE subscription_feature_permissions
        SET
          is_deleted = 1,
          updated_at = GETDATE(),
          updated_by = @userId
        WHERE id = @id
      `;

      await this.sqlService.query(query, { id, userId });

      await this.auditLogger.log({
        userId,
        entityType: 'subscription_feature_permissions',
        entityId: id,
        actionType: 'DELETE',
        severity: 'high',
      });

      return {
        success: true,
        message: 'Subscription feature permission deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete subscription feature permission ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete subscription feature permission');
    }
  }
  async getAllActiveFeaturesForSelect() {
    try {
      const query = `
      SELECT 
        sf.id,
        sf.subscription_id,
        sf.name,
        sp.plan_name,
        sf.feature_price
      FROM subscription_features sf
      INNER JOIN subscription_plans sp on sf.subscription_id = sp.id
      WHERE sf.is_deleted = 0
      ORDER BY sf.name ASC
    `;
      const result: any = await this.sqlService.query(query);

      return {
        success: true,
        data: result || [],
      };
    } catch (error) {
      this.logger.error('Failed to get active features for select:', error);
      throw new BadRequestException('Failed to get active features');
    }
  }
}
