// src/modules/system/system.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SystemService } from './system.service';
import { Roles, CurrentUser } from 'src/core/decorators';
import { JwtAuthGuard, RolesGuard } from 'src/core/guards';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemController {
  constructor(private systemService: SystemService) {}

  // ==================== AUDIT LOGS ====================
  @Get('audit-logs')
  @Roles('admin', 'owner')
  async getAuditLogs(@Query() query: any) {
    return this.systemService.getAuditLogs({
      userId: query.userId,
      tenantId: query.tenantId,
      entityType: query.entityType,
      actionType: query.actionType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });
  }

  // ==================== SYSTEM EVENTS ====================
  @Get('events')
  @Roles('admin', 'owner')
  async getSystemEvents(@Query() query: any) {
    return this.systemService.getSystemEvents({
      tenantId: query.tenantId,
      userId: query.userId,
      eventType: query.eventType,
      severity: query.severity,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });
  }

  // ==================== ERROR LOGS ====================
  @Get('error-logs')
  @Roles('admin', 'owner')
  async getErrorLogs(@Query() query: any) {
    return this.systemService.getErrorLogs({
      tenantId: query.tenantId,
      userId: query.userId,
      errorType: query.errorType,
      severity: query.severity,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });
  }

  // ==================== SYSTEM CONFIG ====================
  @Get('config/:key')
  @Roles('admin', 'owner')
  async getSystemConfig(@Query('key') key: string) {
    return this.systemService.getSystemConfig(key);
  }

  @Get('config')
  async getAllSystemConfigs(@CurrentUser() user: any) {
    if (!user.isSuperAdmin) {
      return { success: false, message: 'Unauthorized' };
    }
    return this.systemService.getAllSystemConfigs();
  }

  @Post('config')
  async setSystemConfig(@Body() dto: any, @CurrentUser() user: any) {
    if (!user.isSuperAdmin) {
      return { success: false, message: 'Unauthorized' };
    }

    return this.systemService.setSystemConfig({
      ...dto,
      created_by: user.id,
    });
  }
}
