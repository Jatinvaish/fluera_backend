// src/modules/social-platforms/base-platform.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import * as platformTypes from './platform.types';

@Injectable()
export abstract class BasePlatformService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected sqlService: SqlServerService,
    protected config: platformTypes.PlatformConfig
  ) {}

  // ============================================
  // ABSTRACT METHODS - Must implement per platform
  // ============================================
  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForToken(code: string, codeVerifier?: string): Promise<platformTypes.OAuthTokens>;
  abstract refreshAccessToken(refreshToken: string): Promise<platformTypes.OAuthTokens>;
  abstract fetchAccountInfo(accessToken: string): Promise<platformTypes.PlatformAccountInfo>;
  abstract fetchContent(accessToken: string, options?: { limit?: number; since?: Date }): Promise<platformTypes.ContentItem[]>;
  abstract fetchContentMetrics(accessToken: string, contentId: string): Promise<platformTypes.ContentMetrics>;

  // Optional methods - override if platform supports
  async fetchAudienceDemographics?(accessToken: string): Promise<platformTypes.AudienceDemographic[]> {
    throw new Error(`${this.config.name} does not support audience demographics`);
  }
  
  async fetchRevenue?(accessToken: string, startDate: Date, endDate: Date): Promise<any> {
    throw new Error(`${this.config.name} does not support revenue tracking`);
  }

  // ============================================
  // DATABASE OPERATIONS (Reusable across all platforms)
  // ============================================

  /**
   * Save or update social account with platform data
   */
  async saveSocialAccount(
    creatorProfileId: number,
    tenantId: number,
    accountInfo: platformTypes.PlatformAccountInfo,
    userId: number
  ): Promise<number> {
    try {
      const existing = await this.sqlService.query(
        `SELECT id FROM creator_social_accounts 
         WHERE creator_profile_id = @creatorProfileId 
         AND platform = @platform`,
        { creatorProfileId, platform: this.config.name }
      );

      if (existing.length > 0) {
        await this.sqlService.query(
          `UPDATE creator_social_accounts SET
           platform_user_id = @platformUserId,
           username = @username,
           display_name = @displayName,
           profile_picture_url = @profilePicture,
           follower_count = @followerCount,
           bio = @bio,
           account_type = @accountType,
           account_status = 'active',
           is_verified = @verified,
           last_synced_at = GETUTCDATE(),
           updated_at = GETUTCDATE(),
           updated_by = @userId,
           metadata = @metadata
           WHERE id = @id`,
          {
            id: existing[0].id,
            platformUserId: accountInfo.platformUserId,
            username: accountInfo.username,
            displayName: accountInfo.displayName,
            profilePicture: accountInfo.profilePicture || null,
            followerCount: accountInfo.followerCount || 0,
            bio: accountInfo.bio || null,
            accountType: accountInfo.accountType || 'personal',
            verified: accountInfo.verified || false,
            userId,
            metadata: JSON.stringify({
              followingCount: accountInfo.followingCount,
              websiteUrl: accountInfo.websiteUrl,
              email: accountInfo.email
            })
          }
        );
        this.logger.log(`Updated social account ${existing[0].id} for ${this.config.name}`);
        return existing[0].id;
      }

      const result = await this.sqlService.query(
        `INSERT INTO creator_social_accounts (
          tenant_id, creator_profile_id, platform, platform_user_id, 
          username, display_name, profile_picture_url, follower_count, 
          bio, account_type, is_verified, account_status,
          last_synced_at, created_by, updated_by, metadata
        ) OUTPUT INSERTED.id VALUES (
          @tenantId, @creatorProfileId, @platform, @platformUserId,
          @username, @displayName, @profilePicture, @followerCount,
          @bio, @accountType, @verified, 'active',
          GETUTCDATE(), @userId, @userId, @metadata
        )`,
        {
          tenantId,
          creatorProfileId,
          platform: this.config.name,
          platformUserId: accountInfo.platformUserId,
          username: accountInfo.username,
          displayName: accountInfo.displayName,
          profilePicture: accountInfo.profilePicture || null,
          followerCount: accountInfo.followerCount || 0,
          bio: accountInfo.bio || null,
          accountType: accountInfo.accountType || 'personal',
          verified: accountInfo.verified || false,
          userId,
          metadata: JSON.stringify({
            followingCount: accountInfo.followingCount,
            websiteUrl: accountInfo.websiteUrl,
            email: accountInfo.email
          })
        }
      );

      this.logger.log(`Created social account ${result[0].id} for ${this.config.name}`);
      return result[0].id;
    } catch (error) {
      this.logger.error(`Failed to save social account for ${this.config.name}`, error);
      throw error;
    }
  }

  /**
   * Save OAuth tokens securely
   */
  async saveTokens(
    socialAccountId: number,
    tenantId: number,
    tokens: platformTypes.OAuthTokens,
    userId: number
  ): Promise<void> {
    try {
      const existing = await this.sqlService.query(
        `SELECT id FROM oauth_tokens WHERE social_account_id = @socialAccountId`,
        { socialAccountId }
      );

      if (existing.length > 0) {
        await this.sqlService.query(
          `UPDATE oauth_tokens SET
           access_token = @accessToken,
           refresh_token = @refreshToken,
           token_type = @tokenType,
           expires_at = @expiresAt,
           scope = @scope,
           is_active = 1,
           last_refreshed_at = GETUTCDATE(),
           updated_at = GETUTCDATE(),
           updated_by = @userId
           WHERE id = @id`,
          {
            id: existing[0].id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || null,
            tokenType: tokens.tokenType || 'Bearer',
            expiresAt: tokens.expiresAt || null,
            scope: tokens.scope || null,
            userId
          }
        );
      } else {
        await this.sqlService.query(
          `INSERT INTO oauth_tokens (
            tenant_id, social_account_id, platform, access_token, 
            refresh_token, token_type, expires_at, scope, 
            is_active, created_by, updated_by
          ) VALUES (
            @tenantId, @socialAccountId, @platform, @accessToken,
            @refreshToken, @tokenType, @expiresAt, @scope,
            1, @userId, @userId
          )`,
          {
            tenantId,
            socialAccountId,
            platform: this.config.name,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || null,
            tokenType: tokens.tokenType || 'Bearer',
            expiresAt: tokens.expiresAt || null,
            scope: tokens.scope || null,
            userId
          }
        );
      }
      this.logger.log(`Saved tokens for account ${socialAccountId}`);
    } catch (error) {
      this.logger.error(`Failed to save tokens for account ${socialAccountId}`, error);
      throw error;
    }
  }

  /**
   * Get stored tokens and refresh if expired
   */
  async getValidToken(socialAccountId: number): Promise<string> {
    const tokens = await this.getTokens(socialAccountId);
    if (!tokens) throw new Error('No tokens found');

    // Check if expired
    if (tokens.expiresAt && new Date() >= tokens.expiresAt) {
      if (!tokens.refreshToken) throw new Error('Token expired and no refresh token available');
      
      this.logger.log(`Token expired for account ${socialAccountId}, refreshing...`);
      const newTokens = await this.refreshAccessToken(tokens.refreshToken);
      
      // Get tenant ID
      const account = await this.sqlService.query(
        'SELECT tenant_id FROM creator_social_accounts WHERE id = @id',
        { id: socialAccountId }
      );
      //todo
      //@ts-ignore
      await this.saveTokens(socialAccountId, account[0].tenant_id, newTokens, null);
      return newTokens.accessToken;
    }

    return tokens.accessToken;
  }

  /**
   * Get stored tokens
   */
  async getTokens(socialAccountId: number): Promise<platformTypes.OAuthTokens | null> {
    const result = await this.sqlService.query(
      `SELECT access_token, refresh_token, token_type, expires_at, scope 
       FROM oauth_tokens 
       WHERE social_account_id = @socialAccountId AND is_active = 1`,
      { socialAccountId }
    );

    if (result.length === 0) return null;

    return {
      accessToken: result[0].access_token,
      refreshToken: result[0].refresh_token,
      tokenType: result[0].token_type,
      expiresAt: result[0].expires_at ? new Date(result[0].expires_at) : undefined,
      scope: result[0].scope
    };
  }

  /**
   * Save content to database
   */
  async saveContent(
    socialAccountId: number,
    tenantId: number,
    content: platformTypes.ContentItem,
    userId: number
  ): Promise<number> {
    try {
      const existing = await this.sqlService.query(
        `SELECT id FROM creator_content 
         WHERE platform = @platform AND content_id = @contentId`,
        { platform: this.config.name, contentId: content.contentId }
      );

      const metadata = JSON.stringify({
        hashtags: content.hashtags || [],
        mentions: content.mentions || [],
        rawData: content.rawData || {}
      });

      if (existing.length > 0) {
        await this.sqlService.query(
          `UPDATE creator_content SET
           title = @title,
           description = @description,
           caption = @caption,
           content_url = @contentUrl,
           thumbnail_url = @thumbnailUrl,
           duration_seconds = @durationSeconds,
           is_sponsored = @isSponsored,
           published_at = @publishedAt,
           metadata = @metadata,
           updated_at = GETUTCDATE(),
           updated_by = @userId
           WHERE id = @id`,
          {
            id: existing[0].id,
            title: content.title?.substring(0, 500) || null,
            description: content.description || null,
            caption: content.caption || null,
            contentUrl: content.url,
            thumbnailUrl: content.thumbnailUrl || null,
            durationSeconds: content.durationSeconds || null,
            isSponsored: content.isSponsored || false,
            publishedAt: content.publishedAt,
            metadata,
            userId
          }
        );
        return existing[0].id;
      }

      const result = await this.sqlService.query(
        `INSERT INTO creator_content (
          tenant_id, social_account_id, platform, content_id, 
          content_type, title, description, caption, content_url, 
          thumbnail_url, duration_seconds, is_sponsored,
          published_at, metadata, created_by, updated_by
        ) OUTPUT INSERTED.id VALUES (
          @tenantId, @socialAccountId, @platform, @contentId,
          @contentType, @title, @description, @caption, @contentUrl,
          @thumbnailUrl, @durationSeconds, @isSponsored,
          @publishedAt, @metadata, @userId, @userId
        )`,
        {
          tenantId,
          socialAccountId,
          platform: this.config.name,
          contentId: content.contentId,
          contentType: content.contentType,
          title: content.title?.substring(0, 500) || null,
          description: content.description || null,
          caption: content.caption || null,
          contentUrl: content.url,
          thumbnailUrl: content.thumbnailUrl || null,
          durationSeconds: content.durationSeconds || null,
          isSponsored: content.isSponsored || false,
          publishedAt: content.publishedAt,
          metadata,
          userId
        }
      );

      return result[0].id;
    } catch (error) {
      this.logger.error(`Failed to save content ${content.contentId}`, error);
      throw error;
    }
  }

  /**
   * Save content metrics (daily snapshots)
   */
  async saveContentMetrics(
    contentId: number,
    metrics: platformTypes.ContentMetrics,
    metricDate: Date = new Date()
  ): Promise<void> {
    try {
      const dateOnly = metricDate.toISOString().split('T')[0];
      
      await this.sqlService.query(
        `MERGE INTO creator_content_metrics AS target
         USING (SELECT @contentId AS content_id, @metricDate AS metric_date) AS source
         ON target.content_id = source.content_id AND target.metric_date = source.metric_date
         WHEN MATCHED THEN UPDATE SET
           views = @views,
           likes = @likes,
           dislikes = @dislikes,
           comments = @comments,
           shares = @shares,
           saves = @saves,
           retweets = @retweets,
           quotes = @quotes,
           impressions = @impressions,
           reach = @reach,
           watch_time_minutes = @watchTimeMinutes,
           avg_view_duration_seconds = @avgViewDuration,
           completion_rate = @completionRate,
           click_through_rate = @clickThroughRate,
           engagement_rate = @engagementRate
         WHEN NOT MATCHED THEN INSERT (
           content_id, platform, metric_date, views, likes, dislikes,
           comments, shares, saves, retweets, quotes, impressions, reach,
           watch_time_minutes, avg_view_duration_seconds, completion_rate,
           click_through_rate, engagement_rate, created_at
         ) VALUES (
           @contentId, @platform, @metricDate, @views, @likes, @dislikes,
           @comments, @shares, @saves, @retweets, @quotes, @impressions, @reach,
           @watchTimeMinutes, @avgViewDuration, @completionRate,
           @clickThroughRate, @engagementRate, GETUTCDATE()
         );`,
        {
          contentId,
          platform: this.config.name,
          metricDate: dateOnly,
          views: metrics.views || 0,
          likes: metrics.likes || 0,
          dislikes: metrics.dislikes || 0,
          comments: metrics.comments || 0,
          shares: metrics.shares || 0,
          saves: metrics.saves || 0,
          retweets: metrics.retweets || 0,
          quotes: metrics.quotes || 0,
          impressions: metrics.impressions || 0,
          reach: metrics.reach || 0,
          watchTimeMinutes: metrics.watchTimeMinutes || 0,
          avgViewDuration: metrics.avgViewDurationSeconds || null,
          completionRate: metrics.completionRate || null,
          clickThroughRate: metrics.clickThroughRate || null,
          engagementRate: metrics.engagementRate || null
        }
      );
    } catch (error) {
      this.logger.error(`Failed to save metrics for content ${contentId}`, error);
      throw error;
    }
  }

  /**
   * Save audience demographics
   */
  async saveAudienceDemographics(
    socialAccountId: number,
    tenantId: number,
    demographics: platformTypes.AudienceDemographic[]
  ): Promise<void> {
    const snapshotDate = new Date().toISOString().split('T')[0];
    
    for (const demo of demographics) {
      try {
        await this.sqlService.query(
          `MERGE INTO creator_audience_demographics AS target
           USING (SELECT @socialAccountId AS sid, @dimensionType AS dt, 
                  @dimensionValue AS dv, @snapshotDate AS sd) AS source
           ON target.social_account_id = source.sid 
              AND target.dimension_type = source.dt
              AND target.dimension_value = source.dv
              AND target.snapshot_date = source.sd
           WHEN MATCHED THEN UPDATE SET
             percentage = @percentage,
             count = @count
           WHEN NOT MATCHED THEN INSERT (
             tenant_id, social_account_id, platform, dimension_type,
             dimension_value, percentage, count, snapshot_date, created_at
           ) VALUES (
             @tenantId, @socialAccountId, @platform, @dimensionType,
             @dimensionValue, @percentage, @count, @snapshotDate, GETUTCDATE()
           );`,
          {
            tenantId,
            socialAccountId,
            platform: this.config.name,
            dimensionType: demo.dimensionType,
            dimensionValue: demo.dimensionValue,
            percentage: demo.percentage,
            count: demo.count || null,
            snapshotDate
          }
        );
      } catch (error) {
        this.logger.error(`Failed to save demographic ${demo.dimensionType}:${demo.dimensionValue}`, error);
      }
    }
  }
}