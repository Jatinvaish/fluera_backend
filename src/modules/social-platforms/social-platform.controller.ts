// src/modules/social-platforms/social-platform.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Res,
  BadRequestException
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/guards';
import { CurrentUser, TenantId, Public } from 'src/core/decorators';
import { SocialPlatformService } from './social-platform.service';
import { SocialPlatform } from './platform.types';
import type { FastifyReply } from 'fastify';

@Controller('social-platforms')
@UseGuards(JwtAuthGuard)
export class SocialPlatformController {
  constructor(private platformService: SocialPlatformService) {}

  /**
   * GET /api/v1/social-platforms/connect/:platform
   * Initiate OAuth flow for connecting a platform
   * 
   * Query params:
   * - creatorProfileId: number (required)
   * 
   * Returns: Redirects to platform OAuth page
   */
  @Get('connect/:platform')
  async connectPlatform(
    @Param('platform') platform: string,
    @Query('creatorProfileId') creatorProfileId: string,
    @CurrentUser('id') userId: number,
    @Res() res: FastifyReply
  ) {
    if (!creatorProfileId) {
      throw new BadRequestException('creatorProfileId is required');
    }

    const platformEnum = platform.toLowerCase() as SocialPlatform;
    if (!Object.values(SocialPlatform).includes(platformEnum)) {
      throw new BadRequestException(`Platform ${platform} is not supported`);
    }

    const authUrl = this.platformService.getAuthUrl(
      platformEnum,
      parseInt(creatorProfileId),
      userId
    );

    return res.redirect(authUrl, 302);
  }

  /**
   * GET /api/v1/social-platforms/callback/:platform
   * OAuth callback handler - called by platform after authorization
   * 
   * Query params:
   * - code: string (from platform)
   * - state: string (encoded connection data)
   * - error: string (optional, if user denied)
   * 
   * Returns: Redirects to frontend with success/error
   */
  @Get('callback/:platform')
  @Public()
  async handleCallback(
    @Param('platform') platform: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: FastifyReply
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Handle user denial or errors
    if (error) {
      const message = errorDescription || error;
      return res.redirect(
        `${frontendUrl}/creator/social-accounts?error=${encodeURIComponent(message)}`,
        302
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/creator/social-accounts?error=Missing authorization code`,
        302
      );
    }

    try {
      const platformEnum = platform.toLowerCase() as SocialPlatform;
      const result = await this.platformService.connectAccount(
        platformEnum,
        code,
        state
      );

      return res.redirect(
        `${frontendUrl}/creator/social-accounts?success=true&platform=${platform}&accountId=${result.accountId}`,
        302
      );
    } catch (err: any) {
      return res.redirect(
        `${frontendUrl}/creator/social-accounts?error=${encodeURIComponent(err.message || 'Connection failed')}`,
        302
      );
    }
  }

  /**
   * GET /api/v1/social-platforms/accounts
   * Get all connected social accounts for the current user's creator profile
   * 
   * Query params:
   * - creatorProfileId: number (required)
   * 
   * Response:
   * {
   *   success: true,
   *   accounts: [
   *     {
   *       id: number,
   *       platform: string,
   *       username: string,
   *       followerCount: number,
   *       lastSyncedAt: date,
   *       needsReconnect: boolean,
   *       contentCount: number
   *     }
   *   ]
   * }
   */
  @Get('accounts')
  async getConnectedAccounts(
    @Query('creatorProfileId') creatorProfileId: string
  ) {
    if (!creatorProfileId) {
      throw new BadRequestException('creatorProfileId is required');
    }

    return this.platformService.getConnectedAccounts(parseInt(creatorProfileId));
  }

  /**
   * POST /api/v1/social-platforms/sync/:accountId
   * Manually trigger content sync for a connected account
   * 
   * Query params:
   * - fullSync: boolean (optional, default false)
   * 
   * Response:
   * {
   *   success: true,
   *   contentCount: number,
   *   message: string
   * }
   */
  @Post('sync/:accountId')
  async syncAccount(
    @Param('accountId') accountId: string,
    @Query('fullSync') fullSync?: string
  ) {
    const isFullSync = fullSync === 'true';
    return this.platformService.syncContent(parseInt(accountId), isFullSync);
  }

  /**
   * DELETE /api/v1/social-platforms/disconnect/:accountId
   * Disconnect and deactivate a social account
   * 
   * Response:
   * {
   *   success: true,
   *   message: string
   * }
   */
  @Delete('disconnect/:accountId')
  async disconnectAccount(
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: number
  ) {
    return this.platformService.disconnectAccount(parseInt(accountId), userId);
  }

  /**
   * GET /api/v1/social-platforms/stats
   * Get aggregated statistics across all connected platforms
   * 
   * Query params:
   * - creatorProfileId: number (required)
   * 
   * Response:
   * {
   *   success: true,
   *   totals: {
   *     totalFollowers: number,
   *     totalContent: number,
   *     totalViews: number,
   *     totalEngagements: number,
   *     platformCount: number
   *   },
   *   byPlatform: [...]
   * }
   */
  @Get('stats')
  async getStats(
    @Query('creatorProfileId') creatorProfileId: string
  ) {
    if (!creatorProfileId) {
      throw new BadRequestException('creatorProfileId is required');
    }

    return this.platformService.getCreatorStats(parseInt(creatorProfileId));
  }

  /**
   * GET /api/v1/social-platforms/reauthenticate/:accountId
   * Get new authorization URL for expired account
   * 
   * Response:
   * {
   *   authUrl: string
   * }
   */
  @Get('reauthenticate/:accountId')
  async reauthenticate(
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: number
  ) {
    return this.platformService.reauthenticate(parseInt(accountId), userId);
  }

  /**
   * GET /api/v1/social-platforms/supported
   * Get list of supported platforms
   * 
   * Response:
   * {
   *   platforms: [
   *     {
   *       id: string,
   *       name: string,
   *       icon: string,
   *       supportsMetrics: boolean,
   *       supportsRevenue: boolean
   *     }
   *   ]
   * }
   */
  @Get('supported')
  @Public()
  async getSupportedPlatforms() {
    return {
      platforms: [
        {
          id: SocialPlatform.INSTAGRAM,
          name: 'Instagram',
          icon: 'instagram',
          supportsMetrics: true,
          supportsRevenue: false,
          description: 'Connect your Instagram account to track posts, reels, and stories'
        },
        {
          id: SocialPlatform.YOUTUBE,
          name: 'YouTube',
          icon: 'youtube',
          supportsMetrics: true,
          supportsRevenue: true,
          description: 'Connect your YouTube channel to track videos and revenue'
        },
        {
          id: SocialPlatform.TIKTOK,
          name: 'TikTok',
          icon: 'tiktok',
          supportsMetrics: true,
          supportsRevenue: false,
          description: 'Connect your TikTok account to track videos and engagement'
        },
        {
          id: SocialPlatform.TWITTER,
          name: 'Twitter/X',
          icon: 'twitter',
          supportsMetrics: true,
          supportsRevenue: false,
          description: 'Connect your Twitter/X account to track tweets and engagement'
        },
        {
          id: SocialPlatform.FACEBOOK,
          name: 'Facebook',
          icon: 'facebook',
          supportsMetrics: true,
          supportsRevenue: false,
          description: 'Connect your Facebook page to track posts and engagement'
        },
        {
          id: SocialPlatform.TWITCH,
          name: 'Twitch',
          icon: 'twitch',
          supportsMetrics: true,
          supportsRevenue: true,
          description: 'Connect your Twitch channel to track streams and subscriptions'
        }
      ]
    };
  }
}