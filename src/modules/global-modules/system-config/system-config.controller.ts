

// ============================================
// modules/global-modules/system-config/system-config.controller.ts
// ============================================
import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { CreateSystemConfigDto, UpdateSystemConfigDto } from './dto/system-config.dto';
import { Roles } from '../../../core/decorators/roles.decorator';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { ApiVersion } from '../../../core/decorators/api-version.decorator';
import { CurrentUser } from 'src/core/decorators/public.decorator';

@Controller('system-config')
@Roles('admin', 'super_admin')
export class SystemConfigController {
  constructor(private configService: SystemConfigService) {}

  @Get()
  @Permissions('system_config:read')
  async findAll() {
    return this.configService.findAll();
  }

  @Get(':id')
  @Permissions('system_config:read')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.configService.findOne(BigInt(id));
  }

  @Post()
  @Permissions('system_config:create')
  async create(
    @Body() dto: CreateSystemConfigDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.configService.create(dto, userId);
  }

  @Put(':id')
  @Permissions('system_config:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.configService.update(BigInt(id), dto, userId);
  }

  @Delete(':id')
  @Permissions('system_config:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.configService.remove(BigInt(id));
  }
}
