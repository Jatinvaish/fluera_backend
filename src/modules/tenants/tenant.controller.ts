
// ============================================
// src/modules/tenants/tenants.controller.ts
// ============================================
import { Controller, Get, Put, Body, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser, Roles, TenantId } from '../../core/decorators';
import { UpdateTenantDto } from './dto/tenant.dto';
import { TenantsService } from './tenant.service';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) { }

  @Get('my-tenants')
  async getMyTenants(@CurrentUser('id') userId: number) {
    return this.tenantsService.getUserTenants(userId);
  }

  @Get(':id')
  async getTenant(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number
  ) {
    return this.tenantsService.getTenantById(Number(id), userId);
  }

  @Put(':id')
  async updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateTenantDto
  ) {
    return this.tenantsService.updateTenant(Number(id), userId, dto);
  }

  @Get(':id/members')
  async getTenantMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number
  ) {
    return this.tenantsService.getTenantMembers(Number(id), userId);
  }

  @Get(':id/usage')
  async getTenantUsage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number
  ) {
    return this.tenantsService.getTenantUsage(Number(id), userId);
  }
  
  @Post(':id/rotate-keys')
  @Roles('owner', 'admin')
  async rotateTenantKeys(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number
  ) {
    return this.tenantsService.rotateTenantKeys(Number(id), userId);
  }
}