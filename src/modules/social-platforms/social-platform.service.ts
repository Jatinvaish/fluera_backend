// src/modules/social-platforms/social-platform.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { SocialPlatform, encodeState, decodeState, OAuthState } from './platform.types';
import { InstagramService } from './instagram.service';
import { YouTubeService } from './youtube.service';
import { TikTokService } from './tiktok.service';
import { TwitterService } from './twitter.service';
import { FacebookService } from './facebook.service';
import * as crypto from 'crypto';
import { TwitchService } from './twitch.service';

@Injectable()
export class SocialPlatformService {
  private readonly logger = new Logger(SocialPlatformService.name);
  private platformServices: Map<SocialPlatform, any>;

  constructor(
    private sqlService: SqlServerService,
    private instagramService: InstagramService,
    private youtubeService: YouTubeService,
    private tiktokService: TikTokService,
    private twitterService: TwitterService,
    private facebookService: FacebookService,
    private twitchService: TwitchService
  ) {
    //todo
    //@ts-ignore
    this.platformServices = new Map([
      [SocialPlatform.INSTAGRAM, instagramService],
      [SocialPlatform.YOUTUBE, youtubeService],
      [SocialPlatform.TIKTOK, tiktokService],
      [SocialPlatform.TWITTER, twitterService],
      [SocialPlatform.FACEBOOK, facebookService],
      [SocialPlatform.TWITCH, twitchService]
    ]);
  }

  private getPlatformService(platform: SocialPlatform) {
    const service = this.platformServices.get(platform);
    if (!service) {
      throw new BadRequestException(`Platform ${platform} not supported`);
    }
    return service;
  }

  /**
   * STEP 1: Generate OAuth URL for creator to connect account
   */
  getAuthUrl(platform: SocialPlatform, creatorProfileId: number, userId: number): string {
    try {
      const service = this.getPlatformService(platform);
      
      // Generate code verifier for PKCE if needed (Twitter)
      let codeVerifier: string | undefined;
      if (platform === SocialPlatform.TWITTER) {
        codeVerifier = crypto.randomBytes(32).toString('base64url');
      }

      const state: OAuthState = {
        platform,
        creatorProfileId,
        userId,
        timestamp: Date.now(),
        codeVerifier
      };

      const encodedState = encodeState(state);
      const authUrl = service.getAuthorizationUrl(encodedState);

      this.logger.log(`Generated auth URL for ${platform}, creator ${creatorProfileId}`);
      return authUrl;
    } catch (error) {
      this.logger.error(`Failed to generate auth URL for ${platform}`, error);
      throw error;
    }
  }

  /**
   * STEP 2: Handle OAuth callback and connect account
   */
  async connectAccount(
    platform: SocialPlatform,
    code: string,
    state: string,
    callbackUserId?: number
  ): Promise<{ success: boolean; accountId: number; message: string }> {
    try {
      const service = this.getPlatformService(platform);
      const stateData = decodeState(state);

      // Validate state timestamp (prevent replay attacks)
      if (Date.now() - stateData.timestamp > 600000) { // 10 minutes
        throw new BadRequestException('Authorization expired, please try again');
      }

      const { creatorProfileId, userId, codeVerifier } = stateData;

      // Get creator profile and tenant
      const creator = await this.sqlService.query(
        'SELECT tenant_id FROM creator_profiles WHERE id = @id',
        { id: creatorProfileId }
      );

      if (creator.length === 0) {
        throw new BadRequestException('Creator profile not found');
      }

      const tenantId = creator[0].tenant_id;

      // Exchange code for tokens
      const tokens = await service.exchangeCodeForToken(code, codeVerifier);

      // Fetch account info from platform
      const accountInfo = await service.fetchAccountInfo(tokens.accessToken);

      // Save social account
      const accountId = await service.saveSocialAccount(
        creatorProfileId,
        tenantId,
        accountInfo,
        userId
      );

      // Save OAuth tokens
      await service.saveTokens(accountId, tenantId, tokens, userId);

      // Schedule initial content sync
      await this.scheduleSyncJob(accountId, tenantId, platform, 'full_sync', userId);

      this.logger.log(`Connected ${platform} account ${accountId} for creator ${creatorProfileId}`);

      return {
        success: true,
        accountId,
        message: `${platform} account connected successfully. Initial sync scheduled.`
      };
    } catch (error) {
      this.logger.error(`Failed to connect ${platform} account`, error);
      throw error;
    }
  }

  /**
   * STEP 3: Sync content and metrics from platform
   */
  async syncContent(
    socialAccountId: number,
    fullSync: boolean = false
  ): Promise<{ success: boolean; contentCount: number; message: string }> {
    try {
      // Get account details
      const accounts = await this.sqlService.query(
        `SELECT sa.*, sa.tenant_id, sa.creator_profile_id
         FROM creator_social_accounts sa
         WHERE sa.id = @id AND sa.account_status = 'active'`,
        { id: socialAccountId }
      );

      if (accounts.length === 0) {
        throw new BadRequestException('Social account not found or inactive');
      }

      const account = accounts[0];
      const service = this.getPlatformService(account.platform as SocialPlatform);

      // Get valid access token (auto-refresh if expired)
      const accessToken = await service.getValidToken(socialAccountId);

      // Determine sync window
      const since = fullSync ? undefined : account.last_synced_at;

      // Fetch content from platform
      const contentItems = await service.fetchContent(accessToken, {
        limit: fullSync ? 100 : 25,
        since
      });

      let savedCount = 0;
      let failedCount = 0;

      // Save each content item
      for (const item of contentItems) {
        try {
          const contentId = await service.saveContent(
            socialAccountId,
            account.tenant_id,
            item,
            null
          );

          // Save metrics if available
          if (item.metrics) {
            await service.saveContentMetrics(contentId, item.metrics);
          }

          // Fetch detailed metrics if platform supports it
          if (service.config.supportsMetrics) {
            try {
              const detailedMetrics = await service.fetchContentMetrics(
                accessToken,
                item.contentId
              );
              await service.saveContentMetrics(contentId, detailedMetrics);
            } catch (metricsError) {
              this.logger.warn(`Failed to fetch detailed metrics for ${item.contentId}`);
            }
          }

          savedCount++;
        } catch (error) {
          this.logger.error(`Failed to save content ${item.contentId}`, error);
          failedCount++;
        }
      }

      // Update last synced timestamp
      await this.sqlService.query(
        `UPDATE creator_social_accounts 
         SET last_synced_at = GETUTCDATE(), updated_at = GETUTCDATE()
         WHERE id = @id`,
        { id: socialAccountId }
      );

      // Sync audience demographics if supported
      if (service.config.supportsAudience && service.fetchAudienceDemographics) {
        try {
          const demographics = await service.fetchAudienceDemographics(accessToken);
          if (demographics.length > 0) {
            await service.saveAudienceDemographics(
              socialAccountId,
              account.tenant_id,
              demographics
            );
          }
        } catch (demoError) {
          this.logger.warn(`Failed to sync demographics: ${demoError.message}`);
        }
      }

      this.logger.log(
        `Synced ${savedCount} content items for account ${socialAccountId} (${failedCount} failed)`
      );

      return {
        success: true,
        contentCount: savedCount,
        message: `Synced ${savedCount} content items${failedCount > 0 ? `, ${failedCount} failed` : ''}`
      };
    } catch (error) {
      this.logger.error(`Content sync failed for account ${socialAccountId}`, error);
      throw error;
    }
  }

  /**
   * Get all connected accounts for a creator
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
        sa.created_at,
        t.expires_at as token_expires_at,
        COUNT(DISTINCT c.id) as content_count
       FROM creator_social_accounts sa
       LEFT JOIN oauth_tokens t ON sa.id = t.social_account_id AND t.is_active = 1
       LEFT JOIN creator_content c ON sa.id = c.social_account_id
       WHERE sa.creator_profile_id = @creatorProfileId
       GROUP BY sa.id, sa.platform, sa.username, sa.display_name, sa.follower_count,
                sa.profile_picture_url, sa.account_status, sa.is_verified, 
                sa.last_synced_at, sa.created_at, t.expires_at
       ORDER BY sa.created_at DESC`,
      { creatorProfileId }
    );

    return {
      success: true,
      accounts: accounts.map(acc => ({
        ...acc,
        needsReconnect: acc.token_expires_at && 
          new Date(acc.token_expires_at) < new Date(),
        isSyncing: false // TODO: Check platform_sync_jobs table
      }))
    };
  }

  /**
   * Disconnect and deactivate account
   */
  async disconnectAccount(
    socialAccountId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    await this.sqlService.query(
      `UPDATE creator_social_accounts 
       SET account_status = 'disconnected', 
           updated_by = @userId, 
           updated_at = GETUTCDATE()
       WHERE id = @id`,
      { id: socialAccountId, userId }
    );

    await this.sqlService.query(
      `UPDATE oauth_tokens 
       SET is_active = 0, 
           updated_at = GETUTCDATE()
       WHERE social_account_id = @id`,
      { id: socialAccountId }
    );

    this.logger.log(`Disconnected social account ${socialAccountId}`);

    return {
      success: true,
      message: 'Account disconnected successfully'
    };
  }

  /**
   * Get aggregated statistics across all platforms
   */
  async getCreatorStats(creatorProfileId: number) {
    const stats = await this.sqlService.query(
      `SELECT 
        sa.platform,
        sa.follower_count,
        sa.is_verified,
        COUNT(DISTINCT c.id) as total_content,
        SUM(cm.views) as total_views,
        SUM(cm.likes) as total_likes,
        SUM(cm.comments) as total_comments,
        SUM(cm.shares) as total_shares,
        AVG(cm.engagement_rate) as avg_engagement_rate
       FROM creator_social_accounts sa
       LEFT JOIN creator_content c ON sa.id = c.social_account_id
       LEFT JOIN (
         SELECT content_id, 
                MAX(views) as views,
                MAX(likes) as likes,
                MAX(comments) as comments,
                MAX(shares) as shares,
                AVG(engagement_rate) as engagement_rate
         FROM creator_content_metrics
         GROUP BY content_id
       ) cm ON c.id = cm.content_id
       WHERE sa.creator_profile_id = @creatorProfileId
       AND sa.account_status = 'active'
       GROUP BY sa.platform, sa.follower_count, sa.is_verified
       ORDER BY sa.follower_count DESC`,
      { creatorProfileId }
    );

    // Calculate totals
    const totals = {
      totalFollowers: stats.reduce((sum, s) => sum + (s.follower_count || 0), 0),
      totalContent: stats.reduce((sum, s) => sum + (s.total_content || 0), 0),
      totalViews: stats.reduce((sum, s) => sum + (s.total_views || 0), 0),
      totalEngagements: stats.reduce((sum, s) => 
        sum + (s.total_likes || 0) + (s.total_comments || 0) + (s.total_shares || 0), 0
      ),
      platformCount: stats.length
    };

    return {
      success: true,
      totals,
      byPlatform: stats
    };
  }

  /**
   * Schedule sync job in background
   */
  private async scheduleSyncJob(
    socialAccountId: number,
    tenantId: number,
    platform: string,
    jobType: string,
    userId: number
  ): Promise<void> {
    await this.sqlService.query(
      `INSERT INTO platform_sync_jobs (
        tenant_id, social_account_id, platform, job_type, 
        sync_scope, status, priority, created_by
      ) VALUES (
        @tenantId, @socialAccountId, @platform, @jobType,
        'content', 'pending', 5, @userId
      )`,
      { tenantId, socialAccountId, platform, jobType, userId }
    );
  }

  /**
   * Re-authenticate expired account
   */
  async reauthenticate(
    socialAccountId: number,
    userId: number
  ): Promise<{ authUrl: string }> {
    const accounts = await this.sqlService.query(
      `SELECT sa.platform, sa.creator_profile_id
       FROM creator_social_accounts sa
       WHERE sa.id = @id`,
      { id: socialAccountId }
    );

    if (accounts.length === 0) {
      throw new BadRequestException('Account not found');
    }

    const { platform, creator_profile_id } = accounts[0];
    const authUrl = this.getAuthUrl(
      platform as SocialPlatform,
      creator_profile_id,
      userId
    );

    return { authUrl };
  }
}