
// ============================================
// FIX 3: src/modules/global-modules/system-config/system-config.controller.ts
// ============================================
import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards';
import { SystemConfigService } from './system-config.service';

@ApiTags('System Config')
@Controller('system-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get(':key')
  async getConfig(
    @Param('key') key: string,
    @CurrentUser('tenant_id') tenantId?: number,
  ) {
    return this.systemConfigService.getConfig(key, tenantId);
  }

  @Post()
  async setConfig(
    @Body('key') key: string,
    @Body('value') value: any,
    @Body('configType') configType: string,
    @Body('isEncrypted') isEncrypted: boolean,
    @CurrentUser('id') userId: number,
    @CurrentUser('tenant_id') tenantId?: number,
  ) {
    return this.systemConfigService.setConfig(
      key,
      value,
      configType,
      isEncrypted,
      tenantId,
      userId,
    );
  }

  @Delete(':key')
  async deleteConfig(
    @Param('key') key: string,
    @CurrentUser('tenant_id') tenantId?: number,
  ) {
    return this.systemConfigService.deleteConfig(key, tenantId);
  }
}
