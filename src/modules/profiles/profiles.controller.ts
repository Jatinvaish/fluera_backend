import { Controller, Post, Body } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CurrentUser, TenantId } from '../../core/decorators';
import { UpdateCreatorProfileDto, UpdateBrandProfileDto, UpdateAgencyProfileDto } from './dto/profile.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  // ============================================
  // Creator Profile Routes
  // ============================================
  @Post('creator/get')
  async getCreatorProfile(
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number
  ) {
    return this.profilesService.getCreatorProfile(tenantId, userId);
  }

  @Post('creator/update')
  async updateCreatorProfile(
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateCreatorProfileDto
  ) {
    return this.profilesService.updateCreatorProfile(tenantId, userId, dto);
  }

  // ============================================
  // Brand Profile Routes
  // ============================================
  @Post('brand/get')
  async getBrandProfile(
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number
  ) {
    return this.profilesService.getBrandProfile(tenantId, userId);
  }

  @Post('brand/update')
  async updateBrandProfile(
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateBrandProfileDto
  ) {
    return this.profilesService.updateBrandProfile(tenantId, userId, dto);
  }

  // ============================================
  // Agency Profile Routes
  // ============================================
  @Post('agency/get')
  async getAgencyProfile(
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number
  ) {
    return this.profilesService.getAgencyProfile(tenantId, userId);
  }

  @Post('agency/update')
  async updateAgencyProfile(
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateAgencyProfileDto
  ) {
    return this.profilesService.updateAgencyProfile(tenantId, userId, dto);
  }
}
