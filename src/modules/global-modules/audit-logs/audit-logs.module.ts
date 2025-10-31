// ============================================
// src/modules/audit-logs/* - COMPLETE
// ============================================

// src/modules/audit-logs/audit-logs.module.ts
import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLoggerService } from './audit-logs.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditLogsModule {}