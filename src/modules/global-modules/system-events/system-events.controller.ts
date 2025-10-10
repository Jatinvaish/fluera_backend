
// ============================================
// modules/global-modules/system-events/system-events.controller.ts
// ============================================
import { Controller, Post, Body, Get, Query, ParseIntPipe } from '@nestjs/common';
import { SystemEventsService } from './system-events.service';
import { CreateSystemEventDto } from './dto/system-events.dto';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { ApiVersion } from '../../../core/decorators/api-version.decorator';

@Controller('system-events')
export class SystemEventsController {
  constructor(private systemEventsService: SystemEventsService) {}

  @Post()
  @Permissions('system_events:create')
  async create(@Body() dto: CreateSystemEventDto) {
    return this.systemEventsService.create(dto);
  }

  @Post('query')
  @Permissions('system_events:read')
  async findAll(
    @Body('organizationId') organizationId?: number,
    @Body('limit') limit?: number,
  ) {
    return this.systemEventsService.findAll(
      organizationId ? BigInt(organizationId) : undefined,
      limit
    );
  }
}