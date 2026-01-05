// src/modules/social-platforms/social-platform.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { SocialPlatform } from './platform.types';
import { InstagramService } from './instagram.service';
import { YouTubeService } from './youtube.service';
import { TikTokService,      } from './tiktok.service';
import { TwitterService } from './twitter.service';
import { FacebookService } from './facebook.service';
// Import others as you implement them

@Injectable()
export class SocialPlatformService {
  private platformServices: Map<SocialPlatform, any>;

  constructor(
    private sqlService: SqlServerService,
    private instagramService: InstagramService,
    private youtubeService: YouTubeService,
    private tiktokService: TikTokService,
    private twitterService: TwitterService,
    private facebookService: FacebookService
  ) {
    //todo 
    //@ts-ignore
    this.platformServices = new Map([
      [SocialPlatform.INSTAGRAM, instagramService],
      [SocialPlatform.YOUTUBE, youtubeService],
      [SocialPlatform.TIKTOK, tiktokService],
      [SocialPlatform.TWITTER, twitterService],
      [SocialPlatform.FACEBOOK, facebookService]
    ]);
  }

  private getPlatformService(platform: SocialPlatform) {
    const service = this.platformServices.get(platform);
    if (!service) {
      throw new BadRequestException(`Platform ${platform} not supported yet`);
    }
    return service;
  }

  /**
   * Step 1: Get authorization URL for creator to connect account
   */
  getAuthUrl(platform: SocialPlatform, creatorProfileId: number): string {
    const service = this.getPlatformService(platform);
    const state = Buffer.from(
      JSON.stringify({ platform, creatorProfileId, timestamp: Date.now() })
    ).toString('base64');

    return service.getAuthorizationUrl(state);
  }

  /**
   * Step 2: Handle OAuth callback and connect account
   */
  async connectAccount(
    platform: SocialPlatform,
    code: string,
    state: string,
    userId: number
  ): Promise<{ success: boolean; accountId: number }> {
    const service = this.getPlatformService(platform);

    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { creatorProfileId } = stateData;

    // Get tenant ID from creator profile
    const creator = await this.sqlService.query(
      'SELECT tenant_id FROM creator_profiles WHERE id = @id',
      { id: creatorProfileId }
    );

    if (creator.length === 0) {
      throw new BadRequestException('Creator profile not found');
    }

    const tenantId = creator[0].tenant_id;

    // Exchange code for tokens
    const tokens = await service.exchangeCodeForToken(code);

    // Fetch account info
    const accountInfo = await service.fetchAccountInfo(tokens.accessToken);

    // Save account
    const accountId = await service.saveSocialAccount(
      creatorProfileId,
      tenantId,
      accountInfo,
      userId
    );

    // Save tokens
    await service.saveTokens(accountId, tenantId, tokens, userId);

    // Schedule initial sync
    await this.scheduleSync(accountId, tenantId, platform, 'full_sync', userId);

    return { success: true, accountId };
  }

  /**
   * Step 3: Sync content from platform
   */
  async syncContent(socialAccountId: number): Promise<{ success: boolean; contentCount: number }> {
    // Get account details
    const account = await this.sqlService.query(
      `SELECT sa.*, t.access_token, sa.tenant_id, sa.creator_profile_id
       FROM creator_social_accounts sa
       JOIN oauth_tokens t ON sa.id = t.social_account_id
       WHERE sa.id = @id AND sa.account_status = 'active'`,
      { id: socialAccountId }
    );

    if (account.length === 0) {
      throw new BadRequestException('Social account not found or inactive');
    }

    const { platform, access_token, tenant_id, creator_profile_id } = account[0];
    const service = this.getPlatformService(platform as SocialPlatform);

    // Check if token needs refresh
    const tokens = await service.getTokens(socialAccountId);
    let accessToken = tokens.accessToken;

    if (tokens.expiresAt && new Date() >= tokens.expiresAt && tokens.refreshToken) {
      const newTokens = await service.refreshAccessToken(tokens.refreshToken);
      await service.saveTokens(socialAccountId, tenant_id, newTokens, null);
      accessToken = newTokens.accessToken;
    }

    // Fetch content
    const content = await service.fetchContent(accessToken);

    // Save content to database
    let savedCount = 0;
    for (const item of content) {
      try {
        const contentId = await service.saveContent(
          socialAccountId,
          tenant_id,
          item,
          null
        );

        // Fetch and save metrics
        if (item.metrics) {
          await service.saveContentMetrics(
            contentId,
            item.metrics,
            new Date()
          );
        }

        savedCount++;
      } catch (error) {
        console.error(`Failed to save content ${item.contentId}:`, error);
      }
    }

    return { success: true, contentCount: savedCount };
  }

  /**
   * Get creator's connected accounts
   */
  async getConnectedAccounts(creatorProfileId: number) {
    const accounts = await this.sqlService.query(
      `SELECT 
        sa.id,
        sa.platform,
        sa.username,
        sa.display_name,
        sa.follower_count,
        sa.profile_picture_url,
        sa.account_status,
        sa.is_verified,
        sa.last_synced_at,
        t.expires_at as token_expires_at
       FROM creator_social_accounts sa
       LEFT JOIN oauth_tokens t ON sa.id = t.social_account_id
       WHERE sa.creator_profile_id = @creatorProfileId
       ORDER BY sa.created_at DESC`,
      { creatorProfileId }
    );

    return {
      success: true,
      accounts: accounts.map(acc => ({
        ...acc,
        needsReconnect: acc.token_expires_at && new Date(acc.token_expires_at) < new Date()
      }))
    };
  }

  /**
   * Disconnect account
   */
  async disconnectAccount(socialAccountId: number, userId: number) {
    await this.sqlService.query(
      `UPDATE creator_social_accounts 
       SET account_status = 'disconnected', updated_by = @userId, updated_at = GETUTCDATE()
       WHERE id = @id`,
      { id: socialAccountId, userId }
    );

    await this.sqlService.query(
      `UPDATE oauth_tokens SET is_active = 0 WHERE social_account_id = @id`,
      { id: socialAccountId }
    );

    return { success: true };
  }

  /**
   * Schedule sync job
   */
  private async scheduleSync(
    socialAccountId: number,
    tenantId: number,
    platform: string,
    jobType: string,
    userId: number
  ) {
    await this.sqlService.query(
      `INSERT INTO platform_sync_jobs (
        tenant_id, social_account_id, platform, job_type, 
        sync_scope, status, created_by
      ) VALUES (
        @tenantId, @socialAccountId, @platform, @jobType,
        'content', 'pending', @userId
      )`,
      { tenantId, socialAccountId, platform, jobType, userId }
    );
  }

  /**
   * Get platform statistics for a creator
   */
  async getCreatorStats(creatorProfileId: number) {
    const stats = await this.sqlService.query(
      `SELECT 
        sa.platform,
        sa.follower_count,
        COUNT(DISTINCT c.id) as total_content,
        SUM(cm.views) as total_views,
        SUM(cm.likes) as total_likes,
        SUM(cm.comments) as total_comments
       FROM creator_social_accounts sa
       LEFT JOIN creator_content c ON sa.id = c.social_account_id
       LEFT JOIN creator_content_metrics cm ON c.id = cm.content_id
       WHERE sa.creator_profile_id = @creatorProfileId
       AND sa.account_status = 'active'
       GROUP BY sa.platform, sa.follower_count`,
      { creatorProfileId }
    );

    return { success: true, stats };
  }
}