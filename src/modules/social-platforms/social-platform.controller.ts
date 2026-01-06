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
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/guards';
import { CurrentUser, TenantId, Public } from 'src/core/decorators';
import { SocialPlatformService } from './social-platform.service';
import { SocialPlatform } from './platform.types';
import type { FastifyReply } from 'fastify';
import { SqlServerService } from 'src/core/database';

@Controller('social-platforms')
@UseGuards(JwtAuthGuard)
export class SocialPlatformController {
  constructor(
    private platformService: SocialPlatformService,
    private sqlService: SqlServerService
  ) {}

  @Get('connect/:platform')
  async connectPlatform(
    @Param('platform') platform: string,
    @Query('creatorProfileId') creatorProfileId: string,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Res() res: FastifyReply
  ) {
    if (!creatorProfileId) {
      throw new BadRequestException('creatorProfileId is required');
    }

    // ✅ Verify creator profile belongs to user's tenant
    const creator = await this.sqlService.query(
      `SELECT id FROM creator_profiles 
       WHERE id = @id AND tenant_id = @tenantId`,
      { id: parseInt(creatorProfileId), tenantId }
    );

    if (creator.length === 0) {
      throw new ForbiddenException('Creator profile not found or access denied');
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

    if (error) {
      return res.redirect(
        `${frontendUrl}/creator/social-accounts?error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/creator/social-accounts?error=Missing+authorization+code`,
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
        `${frontendUrl}/creator/social-accounts?error=${encodeURIComponent(err.message || 'Connection+failed')}`,
        302
      );
    }
  }

  @Post('accounts')
  async getConnectedAccounts(
    @Query('creatorProfileId') creatorProfileId: string,
    @TenantId() tenantId: number
  ) {
    if (!creatorProfileId) {
      throw new BadRequestException('creatorProfileId is required');
    }

    // ✅ Verify access
    const creator = await this.sqlService.query(
      `SELECT id FROM creator_profiles 
       WHERE id = @id AND tenant_id = @tenantId`,
      { id: parseInt(creatorProfileId), tenantId }
    );

    if (creator.length === 0) {
      throw new ForbiddenException('Creator profile not found or access denied');
    }

    return this.platformService.getConnectedAccounts(parseInt(creatorProfileId));
  }

  @Post('sync/:accountId')
  async syncAccount(
    @Param('accountId') accountId: string,
    @Query('fullSync') fullSync?: string,
    @TenantId() tenantId?: number
  ) {
    // ✅ Verify account belongs to tenant
    const account = await this.sqlService.query(
      `SELECT id FROM creator_social_accounts 
       WHERE id = @id AND tenant_id = @tenantId`,
      { id: parseInt(accountId), tenantId }
    );

    if (account.length === 0) {
      throw new ForbiddenException('Social account not found or access denied');
    }

    const isFullSync = fullSync === 'true';
    return this.platformService.syncContent(parseInt(accountId), isFullSync);
  }

  @Post('disconnect/:accountId')
  async disconnectAccount(
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number
  ) {
    // ✅ Verify account belongs to tenant
    const account = await this.sqlService.query(
      `SELECT id FROM creator_social_accounts 
       WHERE id = @id AND tenant_id = @tenantId`,
      { id: parseInt(accountId), tenantId }
    );

    if (account.length === 0) {
      throw new ForbiddenException('Social account not found or access denied');
    }

    return this.platformService.disconnectAccount(parseInt(accountId), userId);
  }

  @Post('stats')
  async getStats(
    @Query('creatorProfileId') creatorProfileId: string,
    @TenantId() tenantId: number
  ) {
    if (!creatorProfileId) {
      throw new BadRequestException('creatorProfileId is required');
    }

    // ✅ Verify access
    const creator = await this.sqlService.query(
      `SELECT id FROM creator_profiles 
       WHERE id = @id AND tenant_id = @tenantId`,
      { id: parseInt(creatorProfileId), tenantId }
    );

    if (creator.length === 0) {
      throw new ForbiddenException('Creator profile not found or access denied');
    }

    return this.platformService.getCreatorStats(parseInt(creatorProfileId));
  }

  @Post('reauthenticate/:accountId')
  async reauthenticate(
    @Param('accountId') accountId: string,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number
  ) {
    // ✅ Verify account belongs to tenant
    const account = await this.sqlService.query(
      `SELECT id FROM creator_social_accounts 
       WHERE id = @id AND tenant_id = @tenantId`,
      { id: parseInt(accountId), tenantId }
    );

    if (account.length === 0) {
      throw new ForbiddenException('Social account not found or access denied');
    }

    return this.platformService.reauthenticate(parseInt(accountId), userId);
  }

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
          description: 'Connect Instagram to track posts, reels, and stories'
        },
        {
          id: SocialPlatform.YOUTUBE,
          name: 'YouTube',
          icon: 'youtube',
          supportsMetrics: true,
          supportsRevenue: true,
          description: 'Connect YouTube to track videos and revenue'
        },
        {
          id: SocialPlatform.TIKTOK,
          name: 'TikTok',
          icon: 'tiktok',
          supportsMetrics: true,
          supportsRevenue: false,
          description: 'Connect TikTok to track videos and engagement'
        },
        {
          id: SocialPlatform.TWITTER,
          name: 'Twitter/X',
          icon: 'twitter',
          supportsMetrics: true,
          supportsRevenue: false,
          description: 'Connect Twitter/X to track tweets and engagement'
        },
        {
          id: SocialPlatform.FACEBOOK,
          name: 'Facebook',
          icon: 'facebook',
          supportsMetrics: true,
          supportsRevenue: false,
          description: 'Connect Facebook page to track posts and engagement'
        },
        {
          id: SocialPlatform.TWITCH,
          name: 'Twitch',
          icon: 'twitch',
          supportsMetrics: true,
          supportsRevenue: true,
          description: 'Connect Twitch to track streams and subscriptions'
        }
      ]
    };
  }
}