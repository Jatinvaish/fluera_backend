
// ============================================
// modules/global-modules/audit-logs/audit-logs.service.ts
// ============================================
import { Injectable } from '@nestjs/common';
import { SqlServerService } from '../../../core/database/sql-server.service';
import { CreateAuditLogDto, QueryAuditLogsDto } from './dto/audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private sqlService: SqlServerService) {}

  async createAuditLog(dto: CreateAuditLogDto) {
    const result = await this.sqlService.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action_type, old_values, 
                               new_values, user_id, session_id, ip_address, 
                               user_agent, organization_id, metadata)
       OUTPUT INSERTED.*
       VALUES (@entityType, @entityId, @actionType, @oldValues, @newValues,
               @userId, @sessionId, @ipAddress, @userAgent, @organizationId, @metadata)`,
      {
        entityType: dto.entityType,
        entityId: dto.entityId || null,
        actionType: dto.actionType,
        oldValues: dto.oldValues || null,
        newValues: dto.newValues || null,
        userId: dto.userId || null,
        sessionId: dto.sessionId || null,
        ipAddress: dto.ipAddress || null,
        userAgent: dto.userAgent || null,
        organizationId: dto.organizationId || null,
        metadata: dto.metadata || null,
      }
    );
    return result[0];
  }

  async findAll(query: QueryAuditLogsDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1'];
    const params: any = { limit, offset };

    if (query.entityType) {
      whereConditions.push('entity_type = @entityType');
      params.entityType = query.entityType;
    }
    if (query.actionType) {
      whereConditions.push('action_type = @actionType');
      params.actionType = query.actionType;
    }
    if (query.userId) {
      whereConditions.push('user_id = @userId');
      params.userId = query.userId;
    }
    if (query.organizationId) {
      whereConditions.push('organization_id = @organizationId');
      params.organizationId = query.organizationId;
    }

    const whereClause = whereConditions.join(' AND ');

    const logs = await this.sqlService.query(
      `SELECT * FROM audit_logs 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );

    const countResult = await this.sqlService.query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`,
      params
    );

    return {
      data: logs,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit),
    };
  }

  async findOne(id: bigint) {
    const result = await this.sqlService.query(
      'SELECT * FROM audit_logs WHERE id = @id',
      { id }
    );
    return result[0] || null;
  }
}