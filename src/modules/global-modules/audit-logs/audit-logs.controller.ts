
// ============================================
// modules/global-modules/audit-logs/audit-logs.controller.ts
// ============================================
import { Controller, Post, Get, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto, QueryAuditLogsDto } from './dto/audit-logs.dto';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { ApiVersion } from '../../../core/decorators/api-version.decorator';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Post()
  @Permissions('audit_logs:create')
  async create(@Body() dto: CreateAuditLogDto) {
    return this.auditLogsService.createAuditLog(dto);
  }

  @Post('query')
  @Permissions('audit_logs:read')
  async findAll(@Body() query: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get(':id')
  @Permissions('audit_logs:read')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditLogsService.findOne(BigInt(id));
  }
}
