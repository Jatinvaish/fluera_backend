
// src/modules/audit-logs/audit-logs.service.ts
import { Injectable } from '@nestjs/common';
import { SqlServerService } from 'src/core/database/sql-server.service';

@Injectable()
export class AuditLogsService {
  constructor(private sqlService: SqlServerService) {}

  async create(dto: any) {
    const result = await this.sqlService.query(
      `INSERT INTO audit_logs (
        tenant_id, user_id, entity_type, entity_id, action_type,
        old_values, new_values, ip_address, user_agent, session_id, metadata
      ) OUTPUT INSERTED.*
      VALUES (
        @tenantId, @userId, @entityType, @entityId, @actionType,
        @oldValues, @newValues, @ipAddress, @userAgent, @sessionId, @metadata
      )`,
      {
        tenantId: dto.tenantId || null,
        userId: dto.userId || null,
        entityType: dto.entityType,
        entityId: dto.entityId || null,
        actionType: dto.actionType,
        oldValues: dto.oldValues || null,
        newValues: dto.newValues || null,
        ipAddress: dto.ipAddress || null,
        userAgent: dto.userAgent || null,
        sessionId: dto.sessionId || null,
        metadata: dto.metadata || null,
      }
    );
    return result[0];
  }

  async findAll(query: any) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1'];
    const params: any = { limit, offset };

    if (query.tenantId) {
      whereConditions.push('tenant_id = @tenantId');
      params.tenantId = query.tenantId;
    }
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
}
