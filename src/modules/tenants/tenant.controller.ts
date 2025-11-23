// ============================================
// src/modules/tenants/tenants.controller.ts - Enhanced
// ============================================
import { 
  Controller, 
  Get, 
  Put, 
  Body, 
  Param, 
  ParseIntPipe, 
  Post, 
  Query 
} from '@nestjs/common';
import { CurrentUser, Roles, Unencrypted } from '../../core/decorators';
import { GetTenantMembersQueryDto, UpdateTenantDto } from './dto/tenant.dto';
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
  @Unencrypted()
  async getTenantMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    const query: GetTenantMembersQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search || undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    return this.tenantsService.getTenantMembers(Number(id), userId, query);
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