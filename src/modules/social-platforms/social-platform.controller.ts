// src/modules/social-platforms/social-platform.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Redirect
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/guards';
import { CurrentUser } from 'src/core/decorators';
import { SocialPlatformService } from './social-platform.service';
import { SocialPlatform } from './platform.types';

@Controller('social-platforms')
@UseGuards(JwtAuthGuard)
export class SocialPlatformController {
  constructor(private platformService: SocialPlatformService) {}

  /**
   * GET /api/v1/social-platforms/connect/:platform
   * Get OAuth URL to connect a platform
   */
  @Get('connect/:platform')
  @Redirect()
  async connectPlatform(
    @Param('platform') platform: SocialPlatform,
    @Query('creatorProfileId') creatorProfileId: number
  ) {
    const url = this.platformService.getAuthUrl(platform, creatorProfileId);
    return { url };
  }

  /**
   * GET /api/v1/social-platforms/callback/:platform
   * OAuth callback handler
   */
  @Get('callback/:platform')
  async handleCallback(
    @Param('platform') platform: SocialPlatform,
    @Query('code') code: string,
    @Query('state') state: string,
    @CurrentUser('id') userId: number
  ) {
    return this.platformService.connectAccount(platform, code, state, userId);
  }

  /**
   * GET /api/v1/social-platforms/accounts/:creatorProfileId
   * Get all connected accounts for a creator
   */
  @Get('accounts/:creatorProfileId')
  async getConnectedAccounts(
    @Param('creatorProfileId') creatorProfileId: number
  ) {
    return this.platformService.getConnectedAccounts(creatorProfileId);
  }

  /**
   * POST /api/v1/social-platforms/sync/:accountId
   * Manually trigger content sync
   */
  @Post('sync/:accountId')
  async syncAccount(
    @Param('accountId') accountId: number
  ) {
    return this.platformService.syncContent(accountId);
  }

  /**
   * DELETE /api/v1/social-platforms/disconnect/:accountId
   * Disconnect a social account
   */
  @Delete('disconnect/:accountId')
  async disconnectAccount(
    @Param('accountId') accountId: number,
    @CurrentUser('id') userId: number
  ) {
    return this.platformService.disconnectAccount(accountId, userId);
  }

  /**
   * GET /api/v1/social-platforms/stats/:creatorProfileId
   * Get aggregated statistics across all platforms
   */
  @Get('stats/:creatorProfileId')
  async getStats(
    @Param('creatorProfileId') creatorProfileId: number
  ) {
    return this.platformService.getCreatorStats(creatorProfileId);
  }
}