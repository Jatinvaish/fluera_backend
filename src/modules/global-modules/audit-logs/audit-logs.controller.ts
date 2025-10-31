// src/modules/global-modules/audit-logs/audit-logs.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Query, 
  UseGuards,
  BadRequestException 
} from '@nestjs/common';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { TenantId, CurrentUser } from 'src/core/decorators';
import { AuditLoggerService, AuditLogEntry } from './audit-logs.service';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';

interface CreateAuditLogDto {
  entityType: string;
  entityId?: number;
  actionType: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface QueryAuditLogsDto {
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private auditLogsService: AuditLoggerService) {}

  /**
   * Manually create an audit log entry
   * (Usually audit logs are created automatically, but this allows manual entries)
   */
  @Post()
  @Permissions('audit_logs:create')
  async create(
    @Body() dto: CreateAuditLogDto,
    @TenantId() tenantId: bigint,
    @CurrentUser() user: any
  ) {
    const auditEntry: AuditLogEntry = {
      tenantId: Number(tenantId),
      userId: user.id,
      entityType: dto.entityType,
      entityId: dto.entityId,
      actionType: dto.actionType,
      oldValues: dto.oldValues,
      newValues: dto.newValues,
      metadata: dto.metadata,
      severity: dto.severity || 'low',
    };

    await this.auditLogsService.log(auditEntry);

    return {
      message: 'Audit log created successfully',
    };
  }

  /**
   * Query audit logs (admin only)
   */
  @Get()
  @Permissions('audit_logs:read')
  async findAll(
    @Query() query: QueryAuditLogsDto,
    @TenantId() tenantId: bigint,
    @CurrentUser() user: any
  ) {
    // Parse dates if provided
    const filters = {
      tenantId: Number(tenantId),
      entityType: query.entityType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? Math.min(query.limit, 1000) : 100, // Max 1000
    };

    const logs = await this.auditLogsService.queryLogs(
      user.id,
      user.roles || [], // Assuming user object has roles
      filters
    );

    return {
      logs,
      total: logs.length,
      filters,
    };
  }

  /**
   * Get recent audit logs (last 24 hours)
   */
  @Get('recent')
  @Permissions('audit_logs:read')
  async getRecent(
    @TenantId() tenantId: bigint,
    @CurrentUser() user: any
  ) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const logs = await this.auditLogsService.queryLogs(
      user.id,
      user.roles || [],
      {
        tenantId: Number(tenantId),
        startDate: yesterday,
        endDate: new Date(),
        limit: 50,
      }
    );

    return {
      logs,
      total: logs.length,
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  @Get('entity/:type/:id')
  @Permissions('audit_logs:read')
  async getEntityLogs(
    @Query('type') entityType: string,
    @Query('id') entityId: string,
    @TenantId() tenantId: bigint,
    @CurrentUser() user: any
  ) {
    if (!entityType || !entityId) {
      throw new BadRequestException('Entity type and ID are required');
    }

    const logs = await this.auditLogsService.queryLogs(
      user.id,
      user.roles || [],
      {
        tenantId: Number(tenantId),
        entityType,
        limit: 100,
      }
    );

    // Filter by entity ID (could be optimized with a dedicated SP parameter)
    const filtered = logs.filter(log => log.entity_id === parseInt(entityId));

    return {
      logs: filtered,
      total: filtered.length,
      entityType,
      entityId,
    };
  }
}