// src/modules/social-platforms/services/base-platform.service.ts
import { Injectable } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import * as platformTypes from './platform.types';
 

@Injectable()
export abstract class BasePlatformService {
  constructor(
    protected sqlService: SqlServerService,
    protected config: platformTypes.PlatformConfig
  ) {}

  // Abstract methods each platform must implement
  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForToken(code: string): Promise<platformTypes.OAuthTokens>;
  abstract refreshAccessToken(refreshToken: string): Promise<platformTypes.OAuthTokens>;
  abstract fetchAccountInfo(accessToken: string): Promise<platformTypes.PlatformAccountInfo>;
  abstract fetchContent(accessToken: string, options?: any): Promise<platformTypes.ContentItem[]>;
  abstract fetchContentMetrics(accessToken: string, contentId: string): Promise<any>;
  
  // Optional methods
  async fetchAudienceDemographics?(accessToken: string): Promise<platformTypes.AudienceDemographic[]> {
    throw new Error('Audience demographics not supported');
  }
  
  async fetchRevenue?(accessToken: string, startDate: Date, endDate: Date): Promise<any> {
    throw new Error('Revenue tracking not supported');
  }

  // ============================================
  // Database Operations (Reusable)
  // ============================================

  /**
   * Save or update social account
   */
  async saveSocialAccount(
    creatorProfileId: number,
    tenantId: number,
    accountInfo: platformTypes.PlatformAccountInfo,
    userId: number
  ): Promise<number> {
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
         updated_at = GETUTCDATE(),
         updated_by = @userId
         WHERE id = @id`,
        {
          id: existing[0].id,
          platformUserId: accountInfo.platformUserId,
          username: accountInfo.username,
          displayName: accountInfo.displayName,
          profilePicture: accountInfo.profilePicture,
          followerCount: accountInfo.followerCount,
          bio: accountInfo.bio,
          accountType: accountInfo.accountType,
          verified: accountInfo.verified || false,
          userId
        }
      );
      return existing[0].id;
    }

    const result = await this.sqlService.query(
      `INSERT INTO creator_social_accounts (
        tenant_id, creator_profile_id, platform, platform_user_id, 
        username, display_name, profile_picture_url, follower_count, 
        bio, account_type, is_verified, account_status,
        created_by, updated_by
      ) OUTPUT INSERTED.id VALUES (
        @tenantId, @creatorProfileId, @platform, @platformUserId,
        @username, @displayName, @profilePicture, @followerCount,
        @bio, @accountType, @verified, 'active',
        @userId, @userId
      )`,
      {
        tenantId,
        creatorProfileId,
        platform: this.config.name,
        platformUserId: accountInfo.platformUserId,
        username: accountInfo.username,
        displayName: accountInfo.displayName,
        profilePicture: accountInfo.profilePicture,
        followerCount: accountInfo.followerCount,
        bio: accountInfo.bio,
        accountType: accountInfo.accountType,
        verified: accountInfo.verified || false,
        userId
      }
    );

    return result[0].id;
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
    const existing = await this.sqlService.query(
      `SELECT id FROM oauth_tokens WHERE social_account_id = @socialAccountId`,
      { socialAccountId }
    );

    if (existing.length > 0) {
      await this.sqlService.query(
        `UPDATE oauth_tokens SET
         access_token = @accessToken,
         refresh_token = @refreshToken,
         expires_at = @expiresAt,
         scope = @scope,
         last_refreshed_at = GETUTCDATE(),
         updated_at = GETUTCDATE(),
         updated_by = @userId
         WHERE id = @id`,
        {
          id: existing[0].id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
          userId
        }
      );
    } else {
      await this.sqlService.query(
        `INSERT INTO oauth_tokens (
          tenant_id, social_account_id, platform, access_token, 
          refresh_token, expires_at, scope, created_by, updated_by
        ) VALUES (
          @tenantId, @socialAccountId, @platform, @accessToken,
          @refreshToken, @expiresAt, @scope, @userId, @userId
        )`,
        {
          tenantId,
          socialAccountId,
          platform: this.config.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
          userId
        }
      );
    }
  }

  /**
   * Get stored tokens
   */
  async getTokens(socialAccountId: number): Promise<platformTypes.OAuthTokens | null> {
    const result = await this.sqlService.query(
      `SELECT access_token, refresh_token, expires_at, scope 
       FROM oauth_tokens 
       WHERE social_account_id = @socialAccountId AND is_active = 1`,
      { socialAccountId }
    );

    if (result.length === 0) return null;

    return {
      accessToken: result[0].access_token,
      refreshToken: result[0].refresh_token,
      expiresAt: result[0].expires_at,
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
    const existing = await this.sqlService.query(
      `SELECT id FROM creator_content 
       WHERE platform = @platform AND content_id = @contentId`,
      { platform: this.config.name, contentId: content.contentId }
    );

    if (existing.length > 0) {
      await this.sqlService.query(
        `UPDATE creator_content SET
         title = @title,
         description = @description,
         content_url = @contentUrl,
         thumbnail_url = @thumbnailUrl,
         published_at = @publishedAt,
         updated_at = GETUTCDATE(),
         updated_by = @userId
         WHERE id = @id`,
        {
          id: existing[0].id,
          title: content.title,
          description: content.description,
          contentUrl: content.url,
          thumbnailUrl: content.thumbnailUrl,
          publishedAt: content.publishedAt,
          userId
        }
      );
      return existing[0].id;
    }

    const result = await this.sqlService.query(
      `INSERT INTO creator_content (
        tenant_id, social_account_id, platform, content_id, 
        content_type, title, description, content_url, 
        thumbnail_url, published_at, created_by, updated_by
      ) OUTPUT INSERTED.id VALUES (
        @tenantId, @socialAccountId, @platform, @contentId,
        @contentType, @title, @description, @contentUrl,
        @thumbnailUrl, @publishedAt, @userId, @userId
      )`,
      {
        tenantId,
        socialAccountId,
        platform: this.config.name,
        contentId: content.contentId,
        contentType: content.contentType,
        title: content.title,
        description: content.description,
        contentUrl: content.url,
        thumbnailUrl: content.thumbnailUrl,
        publishedAt: content.publishedAt,
        userId
      }
    );

    return result[0].id;
  }

  /**
   * Save content metrics
   */
  async saveContentMetrics(
    contentId: number,
    metrics: any,
    metricDate: Date
  ): Promise<void> {
    await this.sqlService.query(
      `MERGE INTO creator_content_metrics AS target
       USING (SELECT @contentId AS content_id, @metricDate AS metric_date) AS source
       ON target.content_id = source.content_id AND target.metric_date = source.metric_date
       WHEN MATCHED THEN UPDATE SET
         views = @views,
         likes = @likes,
         comments = @comments,
         shares = @shares,
         engagement_rate = @engagementRate
       WHEN NOT MATCHED THEN INSERT (
         content_id, platform, metric_date, views, likes, 
         comments, shares, engagement_rate, created_at
       ) VALUES (
         @contentId, @platform, @metricDate, @views, @likes,
         @comments, @shares, @engagementRate, GETUTCDATE()
       );`,
      {
        contentId,
        platform: this.config.name,
        metricDate,
        views: metrics.views || 0,
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        engagementRate: metrics.engagementRate || 0
      }
    );
  }
}