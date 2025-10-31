// src/modules/system/system.service.ts
import { Injectable } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';

@Injectable()
export class SystemService {
  constructor(private databaseService: SqlServerService) {}

  // ==================== AUDIT LOGS ====================
  async createAuditLog(dto: {
    user_id?: string;
    tenant_id?: string;
    entity_type: string;
    entity_id?: string;
    action_type: string;
    old_values?: string;
    new_values?: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    metadata?: string;
  }) {
    await this.databaseService.execute('[dbo].[sp_CreateAuditLog]', {
      user_id: dto.user_id ? parseInt(dto.user_id) : null,
      tenant_id: dto.tenant_id ? parseInt(dto.tenant_id) : null,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id ? parseInt(dto.entity_id) : null,
      action_type: dto.action_type,
      old_values: dto.old_values || null,
      new_values: dto.new_values || null,
      ip_address: dto.ip_address || null,
      user_agent: dto.user_agent || null,
      session_id: dto.session_id ? parseInt(dto.session_id) : null,
      metadata: dto.metadata || null,
    });
  }

  async getAuditLogs(filters: {
    userId?: string;
    tenantId?: string;
    entityType?: string;
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    let query = `
      SELECT * FROM [dbo].[audit_logs]
      WHERE 1=1
    `;

    const params: any = {};

    if (filters.userId) {
      query += ' AND user_id = @userId';
      params.userId = parseInt(filters.userId);
    }

    if (filters.tenantId) {
      query += ' AND tenant_id = @tenantId';
      params.tenantId = parseInt(filters.tenantId);
    }

    if (filters.entityType) {
      query += ' AND entity_type = @entityType';
      params.entityType = filters.entityType;
    }

    if (filters.actionType) {
      query += ' AND action_type = @actionType';
      params.actionType = filters.actionType;
    }

    if (filters.startDate) {
      query += ' AND created_at >= @startDate';
      params.startDate = filters.startDate;
    }

    if (filters.endDate) {
      query += ' AND created_at <= @endDate';
      params.endDate = filters.endDate;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      params.offset = filters.offset || 0;
      params.limit = filters.limit;
    }

    const result = await this.databaseService.query(query, params);

    return {
      success: true,
      logs: result,
    };
  }

  // ==================== SYSTEM EVENTS ====================
  async logSystemEvent(dto: {
    tenant_id?: string;
    user_id?: string;
    event_type: string;
    event_name: string;
    event_data?: string;
    source?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    severity?: string;
  }) {
    await this.databaseService.execute('[dbo].[sp_CreateSystemEvent]', {
      tenant_id: dto.tenant_id ? parseInt(dto.tenant_id) : null,
      user_id: dto.user_id ? parseInt(dto.user_id) : null,
      event_type: dto.event_type,
      event_name: dto.event_name,
      event_data: dto.event_data || null,
      source: dto.source || null,
      session_id: dto.session_id ? parseInt(dto.session_id) : null,
      ip_address: dto.ip_address || null,
      user_agent: dto.user_agent || null,
      severity: dto.severity || 'info',
    });
  }

  async getSystemEvents(filters: {
    tenantId?: string;
    userId?: string;
    eventType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    let query = `
      SELECT * FROM [dbo].[system_events]
      WHERE 1=1
    `;

    const params: any = {};

    if (filters.tenantId) {
      query += ' AND tenant_id = @tenantId';
      params.tenantId = parseInt(filters.tenantId);
    }

    if (filters.userId) {
      query += ' AND user_id = @userId';
      params.userId = parseInt(filters.userId);
    }

    if (filters.eventType) {
      query += ' AND event_type = @eventType';
      params.eventType = filters.eventType;
    }

    if (filters.severity) {
      query += ' AND severity = @severity';
      params.severity = filters.severity;
    }

    if (filters.startDate) {
      query += ' AND created_at >= @startDate';
      params.startDate = filters.startDate;
    }

    if (filters.endDate) {
      query += ' AND created_at <= @endDate';
      params.endDate = filters.endDate;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      params.offset = filters.offset || 0;
      params.limit = filters.limit;
    }

    const result = await this.databaseService.query(query, params);

    return {
      success: true,
      events: result,
    };
  }

  // ==================== ERROR LOGS ====================
  async logError(dto: {
    tenant_id?: string;
    user_id?: string;
    error_type: string;
    error_message: string;
    stack_trace?: string;
    request_url?: string;
    request_method?: string;
    request_body?: string;
    severity?: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: string;
  }) {
    await this.databaseService.execute('[dbo].[sp_CreateErrorLog]', {
      tenant_id: dto.tenant_id ? parseInt(dto.tenant_id) : null,
      user_id: dto.user_id ? parseInt(dto.user_id) : null,
      error_type: dto.error_type,
      error_message: dto.error_message,
      stack_trace: dto.stack_trace || null,
      request_url: dto.request_url || null,
      request_method: dto.request_method || null,
      request_body: dto.request_body || null,
      severity: dto.severity || 'error',
      ip_address: dto.ip_address || null,
      user_agent: dto.user_agent || null,
      metadata: dto.metadata || null,
    });
  }

  async getErrorLogs(filters: {
    tenantId?: string;
    userId?: string;
    errorType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    let query = `
      SELECT * FROM [dbo].[error_logs]
      WHERE 1=1
    `;

    const params: any = {};

    if (filters.tenantId) {
      query += ' AND tenant_id = @tenantId';
      params.tenantId = parseInt(filters.tenantId);
    }

    if (filters.userId) {
      query += ' AND user_id = @userId';
      params.userId = parseInt(filters.userId);
    }

    if (filters.errorType) {
      query += ' AND error_type = @errorType';
      params.errorType = filters.errorType;
    }

    if (filters.severity) {
      query += ' AND severity = @severity';
      params.severity = filters.severity;
    }

    if (filters.startDate) {
      query += ' AND created_at >= @startDate';
      params.startDate = filters.startDate;
    }

    if (filters.endDate) {
      query += ' AND created_at <= @endDate';
      params.endDate = filters.endDate;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      params.offset = filters.offset || 0;
      params.limit = filters.limit;
    }

    const result = await this.databaseService.query(query, params);

    return {
      success: true,
      errors: result,
    };
  }

  // ==================== SYSTEM CONFIG ====================
  async getSystemConfig(configKey: string) {
    const result = await this.databaseService.execute(
      '[dbo].[sp_GetSystemConfigByKey]',
      { config_key: configKey },
    );

    if (!result || result.length === 0) {
      return null;
    }

    const config = result[0];

    // Parse config value based on type
    let value = config.config_value;
    if (config.config_type === 'json') {
      value = JSON.parse(value);
    } else if (config.config_type === 'number') {
      value = parseFloat(value);
    } else if (config.config_type === 'boolean') {
      value = value === 'true' || value === '1';
    }

    return {
      success: true,
      config: {
        key: config.config_key,
        value,
        type: config.config_type,
        description: config.description,
      },
    };
  }

  async setSystemConfig(dto: {
    config_key: string;
    config_value: any;
    config_type?: string;
    is_encrypted?: boolean;
    environment?: string;
    description?: string;
    created_by?: string;
  }) {
    // Convert value to string
    let valueString = dto.config_value;
    if (typeof dto.config_value === 'object') {
      valueString = JSON.stringify(dto.config_value);
    } else {
      valueString = String(dto.config_value);
    }

    await this.databaseService.execute('[dbo].[sp_UpsertSystemConfig]', {
      config_key: dto.config_key,
      config_value: valueString,
      config_type: dto.config_type || 'string',
      is_encrypted: dto.is_encrypted || false,
      environment: dto.environment || 'production',
      description: dto.description || null,
      created_by: dto.created_by ? parseInt(dto.created_by) : null,
    });

    return {
      success: true,
      message: 'System config updated',
    };
  }

  async getAllSystemConfigs() {
    const result = await this.databaseService.query(
      'SELECT * FROM [dbo].[system_config] WHERE is_active = 1 ORDER BY config_key',
    );

    return {
      success: true,
      configs: result,
    };
  }
}
