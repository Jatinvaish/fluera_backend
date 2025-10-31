///new 
// common/audit-logger.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SqlServerService } from 'src/core/database/sql-server.service';

export interface AuditLogEntry {
  tenantId?: number;
  userId?: number;
  entityType: string;
  entityId?: number;
  actionType: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: number;
  metadata?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  // 🔒 PII fields to redact in logs
  private readonly PII_FIELDS = [
    'password',
    'password_hash',
    'ssn',
    'credit_card',
    'bank_account',
    'tax_id',
    'phone',
    'email',
    'address',
    'encrypted_private_key',
    'access_token',
    'refresh_token',
  ];

  constructor(private sqlService: SqlServerService) {}

  /**
   * 🔒 Log audit event (auto-redacts PII)
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // 🔒 Redact PII from values
      const sanitizedOldValues = entry.oldValues ? this.redactPII(entry.oldValues) : null;
      const sanitizedNewValues = entry.newValues ? this.redactPII(entry.newValues) : null;

      await this.sqlService.execute('sp_CreateAuditLog', {
        tenantId: entry.tenantId || null,
        userId: entry.userId || null,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        actionType: entry.actionType,
        oldValues: sanitizedOldValues ? JSON.stringify(sanitizedOldValues) : null,
        newValues: sanitizedNewValues ? JSON.stringify(sanitizedNewValues) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: this.sanitizeUserAgent(entry.userAgent),
      });

      // 🔒 Log critical actions to application logs
      if (entry.severity === 'critical' || entry.actionType.includes('DELETE')) {
        this.logger.warn(`AUDIT [${entry.actionType}] ${entry.entityType}:${entry.entityId} by User:${entry.userId}`, {
          tenantId: entry.tenantId,
          ipAddress: entry.ipAddress,
        });
      }
    } catch (error) {
      // 🔒 Never fail the main operation due to audit log failure
      this.logger.error('Failed to create audit log', error);
    }
  }

  /**
   * 🔒 Log authentication events
   */
  async logAuth(
    userId: number ,
    action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'PASSWORD_RESET' | 'MFA_ENABLED',
    metadata: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      entityType: 'users',
      entityId: userId,
      actionType: action,
      metadata: this.redactPII(metadata),
      ipAddress,
      userAgent,
      severity: action === 'FAILED_LOGIN' ? 'high' : 'medium',
    });
  }

  /**
   * 🔒 Log data access (GDPR compliance)
   */
  async logDataAccess(
    userId: number,
    tenantId: number,
    entityType: string,
    entityId: number,
    accessType: 'READ' | 'EXPORT' | 'DOWNLOAD',
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      tenantId,
      entityType,
      entityId,
      actionType: `DATA_${accessType}`,
      ipAddress,
      severity: accessType === 'EXPORT' ? 'high' : 'low',
    });
  }

  /**
   * 🔒 Log privilege changes
   */
  async logPrivilegeChange(
    adminUserId: number,
    targetUserId: number,
    tenantId: number,
    oldRoles: string[],
    newRoles: string[],
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId: adminUserId,
      tenantId,
      entityType: 'user_roles',
      entityId: targetUserId,
      actionType: 'ROLE_CHANGE',
      oldValues: { roles: oldRoles },
      newValues: { roles: newRoles },
      ipAddress,
      severity: 'critical',
    });
  }

  /**
   * 🔒 Log security events
   */
  async logSecurityEvent(
    eventType: 'BRUTE_FORCE' | 'SUSPICIOUS_IP' | 'TOKEN_REUSE' | 'ANOMALY',
    userId: number | null,
    details: any,
    ipAddress?: string
  ): Promise<void> {
    try {
      await this.sqlService.execute('sp_CreateSecurityEvent', {
        tenantId: null,
        userId,
        eventType,
        eventCategory: 'security',
        severity: 'critical',
        description: JSON.stringify(this.redactPII(details)),
        ipAddress,
        isAnomaly: true,
      });

      this.logger.error(`SECURITY EVENT: ${eventType}`, {
        userId,
        ipAddress,
        details,
      });
    } catch (error) {
      this.logger.error('Failed to log security event', error);
    }
  }

  /**
   * 🔒 Redact PII from objects
   */
  private redactPII(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const redacted = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.PII_FIELDS.some(field => key.toLowerCase().includes(field))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactPII(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * 🔒 Sanitize user agent string
   */
  private sanitizeUserAgent(userAgent?: string): string | null {
    if (!userAgent) return null;
    // Truncate to prevent log injection attacks
    return userAgent.substring(0, 500);
  }

  /**
   * 🔒 Query audit logs (with access control)
   */
  async queryLogs(
    userId: number,
    userRoles: string[],
    filters: {
      tenantId?: number;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    // 🔒 Only admins can query audit logs
    if (!userRoles.includes('admin') && !userRoles.includes('owner')) {
      throw new Error('Insufficient permissions to view audit logs');
    }

    const params: any = {
      userId: filters.tenantId ? null : userId, // Restrict to own logs
      tenantId: filters.tenantId || null,
      entityType: filters.entityType || null,
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      limit: filters.limit || 100,
      offset: 0,
    };

    // Use stored procedure for filtered query
    return this.sqlService.execute('sp_GetAuditLogs', params);
  }
}