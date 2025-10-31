
// src/modules/audit-logs/audit-logs.controller.ts
import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { TenantId } from 'src/core/decorators';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Post()
  @Permissions('audit_logs:create')
  async create(@Body() dto: any, @TenantId() tenantId: bigint) {
    return this.auditLogsService.create({ ...dto, tenantId });
  }

  @Get()
  @Permissions('audit_logs:read')
  async findAll(@Query() query: any, @TenantId() tenantId: bigint) {
    return this.auditLogsService.findAll({ ...query, tenantId });
  }
}