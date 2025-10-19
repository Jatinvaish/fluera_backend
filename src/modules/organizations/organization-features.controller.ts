// modules/organizations/organization-features.controller.ts
import { Controller, Get, Post, Put, Body, Param, ParseIntPipe } from '@nestjs/common';
import { OrganizationFeaturesService } from './organization-features.service';
import { CreateOrganizationFeatureDto, UpdateOrganizationFeatureDto } from './dto/organization-features.dto';
import { Permissions, CurrentUser } from '../../core/decorators';

@Controller('organizations/:orgId/features')
export class OrganizationFeaturesController {
  constructor(private featuresService: OrganizationFeaturesService) {}

  @Get()
  @Permissions('organization:read')
  async getFeatures(@Param('orgId', ParseIntPipe) orgId: number) {
    return this.featuresService.getOrganizationFeatures(BigInt(orgId));
  }

  @Post()
  @Permissions('organization:manage')
  async createFeature(
    @Body() dto: CreateOrganizationFeatureDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.featuresService.createFeature(dto, userId);
  }

  @Put(':featureKey')
  @Permissions('organization:manage')
  async updateFeature(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('featureKey') featureKey: string,
    @Body() dto: UpdateOrganizationFeatureDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.featuresService.updateFeature(BigInt(orgId), featureKey, dto, userId);
  }

  @Post(':featureKey/check')
  @Permissions('organization:read')
  async checkFeature(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('featureKey') featureKey: string,
  ) {
    return this.featuresService.checkFeature(BigInt(orgId), featureKey);
  }

  @Post('sync-from-plan')
  @Permissions('organization:manage')
  async syncFromPlan(@Param('orgId', ParseIntPipe) orgId: number) {
    await this.featuresService.syncFeaturesFromPlan(BigInt(orgId));
    return { message: 'Features synced from subscription plan' };
  }
}