
// ============================================
// modules/global-modules/system-events/system-events.service.ts
// ============================================
import { Injectable } from '@nestjs/common';
import { SqlServerService } from '../../../core/database/sql-server.service';
import { CreateSystemEventDto } from './dto/system-events.dto';

@Injectable()
export class SystemEventsService {
  constructor(private sqlService: SqlServerService) {}

  async create(dto: CreateSystemEventDto) {
    const result = await this.sqlService.query(
      `INSERT INTO system_events (organization_id, user_id, event_type, event_name,
                                  event_data, source, session_id, ip_address, user_agent)
       OUTPUT INSERTED.*
       VALUES (@organizationId, @userId, @eventType, @eventName, @eventData,
               @source, @sessionId, @ipAddress, @userAgent)`,
      {
        organizationId: dto.organizationId || null,
        userId: dto.userId || null,
        eventType: dto.eventType,
        eventName: dto.eventName,
        eventData: dto.eventData || null,
        source: dto.source || null,
        sessionId: dto.sessionId || null,
        ipAddress: dto.ipAddress || null,
        userAgent: dto.userAgent || null,
      }
    );
    return result[0];
  }

  async findAll(organizationId?: number, limit: number = 100) {
    let query = 'SELECT * FROM system_events';
    const params: any = { limit };

    if (organizationId) {
      query += ' WHERE organization_id = @organizationId';
      params.organizationId = organizationId;
    }

    query += ' ORDER BY created_at DESC OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY';

    return this.sqlService.query(query, params);
  }
}