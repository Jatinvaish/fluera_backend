
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
  async getMyTenants(@CurrentUser('id') userId: bigint) {
    return this.tenantsService.getUserTenants(userId);
  }

  @Get(':id')
  async getTenant(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint
  ) {
    return this.tenantsService.getTenantById(BigInt(id), userId);
  }

  @Put(':id')
  async updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
    @Body() dto: UpdateTenantDto
  ) {
    return this.tenantsService.updateTenant(BigInt(id), userId, dto);
  }

  @Get(':id/members')
  async getTenantMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint
  ) {
    return this.tenantsService.getTenantMembers(BigInt(id), userId);
  }

  @Get(':id/usage')
  async getTenantUsage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint
  ) {
    return this.tenantsService.getTenantUsage(BigInt(id), userId);
  }
  
  @Post(':id/rotate-keys')
  @Roles('owner', 'admin')
  async rotateTenantKeys(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint
  ) {
    return this.tenantsService.rotateTenantKeys(BigInt(id), userId);
  }
}