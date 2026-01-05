
// ============================================
// src/modules/campaigns/campaign.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignTrackingService } from './campaign-tracking.service';

@Module({
  controllers: [CampaignController],
  providers: [CampaignTrackingService],
  exports: [CampaignTrackingService]
})
export class CampaignModule {}
