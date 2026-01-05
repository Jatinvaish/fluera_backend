// src/modules/campaigns/campaign.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/guards';
import { CurrentUser } from 'src/core/decorators';
import { CampaignTrackingService } from './campaign-tracking.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(private campaignService: CampaignTrackingService) {}

  /**
   * POST /api/v1/campaigns/tag-content
   * Tag content as part of a brand campaign
   */
  @Post('tag-content')
  async tagContent(
    @Body() body: {
      contentId: number;
      brandName: string;
      campaignName: string;
      campaignType: string;
      compensationAmount?: number;
      compensationType?: string;
      notes?: string;
    },
    @CurrentUser('id') userId: number
  ) {
    return this.campaignService.tagContentAsCampaign({
      ...body,
      userId
    });
  }

  /**
   * GET /api/v1/campaigns/content
   * Get all campaign-tagged content for a creator
   */
  @Get('content')
  async getCampaignContent(
    @Query('creatorProfileId') creatorProfileId: number,
    @Query('brandName') brandName?: string,
    @Query('campaignName') campaignName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.campaignService.getCampaignContent({
      creatorProfileId,
      brandName,
      campaignName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });
  }

  /**
   * GET /api/v1/campaigns/report
   * Generate campaign performance report
   */
  @Get('report')
  async getCampaignReport(
    @Query('creatorProfileId') creatorProfileId: number,
    @Query('brandName') brandName: string,
    @Query('campaignName') campaignName: string
  ) {
    return this.campaignService.getCampaignReport({
      creatorProfileId,
      brandName,
      campaignName
    });
  }

  /**
   * POST /api/v1/campaigns/save-metrics
   * Save aggregated campaign metrics (for reporting)
   */
  @Post('save-metrics')
  async saveCampaignMetrics(
    @Body() body: {
      creatorProfileId: number;
      brandName: string;
      campaignName: string;
      metricDate: string;
      totalContent: number;
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      avgEngagementRate: number;
    }
  ) {
    return this.campaignService.saveCampaignMetrics({
      ...body,
      metricDate: new Date(body.metricDate)
    });
  }
} 