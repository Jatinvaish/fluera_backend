// src/modules/social-platforms/instagram.service.ts - UPDATED METHODS ONLY
import { Injectable } from '@nestjs/common';
import { BasePlatformService } from './base-platform.service';
import { SqlServerService } from 'src/core/database';
import axios from 'axios';
import {
  getEnvCredentials,
  SocialPlatform,
  PLATFORM_CONFIGS,
  OAuthTokens,
  PlatformAccountInfo,
  ContentItem,
  ContentMetrics,
  AudienceDemographic
} from './platform.types';

@Injectable()
export class InstagramService extends BasePlatformService {
  private credentials = getEnvCredentials(SocialPlatform.INSTAGRAM);

  constructor(sqlService: SqlServerService) {
    super(sqlService, PLATFORM_CONFIGS[SocialPlatform.INSTAGRAM]);
  }

  // ============================================
  // KEEP EXISTING: OAuth methods unchanged
  // ============================================
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      scope: this.config.scopes.join(','),
      response_type: 'code',
      state
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokens> {
    const formData = new URLSearchParams({
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.credentials.redirectUri,
      code
    });

    const response = await axios.post(this.config.tokenUrl, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const longLivedResponse = await axios.get(`${this.config.apiBaseUrl}/access_token`, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: this.credentials.clientSecret,
        access_token: response.data.access_token
      }
    });

    return {
      accessToken: longLivedResponse.data.access_token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + longLivedResponse.data.expires_in * 1000)
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await axios.get(`${this.config.apiBaseUrl}/refresh_access_token`, {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: refreshToken
      }
    });

    return {
      accessToken: response.data.access_token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.get(`${this.config.apiBaseUrl}/me`, {
      params: {
        fields: [
          'id', 'username', 'account_type', 'media_count',
          'followers_count', 'follows_count', 'name', 'biography',
          'profile_picture_url', 'website'
        ].join(','),
        access_token: accessToken
      }
    });

    return {
      platformUserId: response.data.id,
      username: response.data.username,
      displayName: response.data.name || response.data.username,
      followerCount: response.data.followers_count,
      followingCount: response.data.follows_count,
      bio: response.data.biography,
      profilePicture: response.data.profile_picture_url,
      accountType: response.data.account_type,
      websiteUrl: response.data.website,
      verified: false
    };
  }

  // ============================================
  // ✅ UPDATED: Fetch ALL content with pagination
  // ============================================
  async fetchContent(
    accessToken: string,
    options?: { limit?: number; since?: Date }
  ): Promise<ContentItem[]> {
    const allContent: ContentItem[] = [];
    let after: string | undefined = undefined;
    const maxLimit = options?.limit || 100;

    do {
      const params: any = {
        fields: [
          'id', 'caption', 'media_type', 'media_url',
          'thumbnail_url', 'permalink', 'timestamp',
          'like_count', 'comments_count', 'is_shared_to_feed'
        ].join(','),
        access_token: accessToken,
        limit: Math.min(25, maxLimit - allContent.length)
      };

      if (after) params.after = after;

      const response = await axios.get(`${this.config.apiBaseUrl}/me/media`, { params });

      const items = response.data.data.map((item: any) => {
        const caption = item.caption || '';
        const hashtags = caption.match(/#[\w]+/g) || [];
        const mentions = caption.match(/@[\w]+/g) || [];

        return {
          contentId: item.id,
          contentType: this.mapMediaType(item.media_type),
          title: caption.substring(0, 100),
          description: caption,
          caption: caption,
          url: item.permalink,
          thumbnailUrl: item.thumbnail_url || item.media_url,
          publishedAt: new Date(item.timestamp),
          hashtags: hashtags.map(h => h.substring(1)),
          mentions: mentions.map(m => m.substring(1)),
          isSponsored: this.detectSponsorship(caption),
          metrics: {
            likes: item.like_count || 0,
            comments: item.comments_count || 0
          }
        };
      });

      allContent.push(...items);
      after = response.data.paging?.cursors?.after;

      if (!after || allContent.length >= maxLimit) break;

    } while (after);

    this.logger.log(`Fetched ${allContent.length} media items from Instagram`);
    return allContent;
  }

  // ============================================
  // ✅ UPDATED: Complete content metrics
  // ============================================
  async fetchContentMetrics(accessToken: string, contentId: string): Promise<ContentMetrics> {
    try {
      // Determine media type
      const mediaResponse = await axios.get(`${this.config.apiBaseUrl}/${contentId}`, {
        params: {
          fields: 'media_type,media_product_type',
          access_token: accessToken
        }
      });

      const isStory = mediaResponse.data.media_product_type === 'STORY';
      const isReel = mediaResponse.data.media_product_type === 'REELS';

      let metrics: string[];

      if (isStory) {
        metrics = ['impressions', 'reach', 'replies', 'exits', 'taps_forward', 'taps_back'];
      } else if (isReel) {
        metrics = ['impressions', 'reach', 'plays', 'likes', 'comments', 'shares', 'saved'];
      } else {
        metrics = ['impressions', 'reach', 'engagement', 'saved', 'likes', 'comments', 'shares', 'video_views'];
      }

      const response = await axios.get(`${this.config.apiBaseUrl}/${contentId}/insights`, {
        params: {
          metric: metrics.join(','),
          access_token: accessToken
        }
      });

      const metricsData: any = {};
      response.data.data.forEach((item: any) => {
        metricsData[item.name] = item.values[0].value;
      });

      const totalEngagements = 
        (metricsData.likes || 0) + 
        (metricsData.comments || 0) + 
        (metricsData.shares || 0) + 
        (metricsData.saved || 0);

      return {
        impressions: metricsData.impressions || 0,
        reach: metricsData.reach || 0,
        saves: metricsData.saved || 0,
        views: metricsData.video_views || metricsData.plays || 0,
        likes: metricsData.likes || 0,
        comments: metricsData.comments || 0,
        shares: metricsData.shares || 0,
        engagementRate: metricsData.impressions > 0 
          ? (totalEngagements / metricsData.impressions) * 100 
          : 0
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch metrics for ${contentId}:`, error.message);
      return {};
    }
  }

  // ============================================
  // ✅ UPDATED: Enhanced demographics
  // ============================================
  async fetchAudienceDemographics(accessToken: string): Promise<AudienceDemographic[]> {
    const demographics: AudienceDemographic[] = [];

    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/me/insights`, {
        params: {
          metric: [
            'audience_city',
            'audience_country',
            'audience_gender_age',
            'audience_locale'
          ].join(','),
          period: 'lifetime',
          access_token: accessToken
        }
      });

      response.data.data.forEach((metric: any) => {
        const values = metric.values[0].value;
        let dimensionType = '';

        if (metric.name === 'audience_gender_age') {
          dimensionType = 'age_gender';
        } else if (metric.name === 'audience_country') {
          dimensionType = 'country';
        } else if (metric.name === 'audience_city') {
          dimensionType = 'city';
        } else if (metric.name === 'audience_locale') {
          dimensionType = 'language';
        }

        const total = Object.values(values).reduce((sum: number, val: any) => sum + val, 0) as number;

        Object.entries(values).forEach(([key, count]: [string, any]) => {
          demographics.push({
            dimensionType,
            dimensionValue: key,
            count: count,
            percentage: total > 0 ? (count / total) * 100 : 0
          });
        });
      });

      return demographics;
    } catch (error) {
      this.logger.error('Failed to fetch audience demographics:', error.message);
      return [];
    }
  }

  // ============================================
  // ✅ NEW: Fetch account-level insights
  // ============================================
  async fetchAccountInsights(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/me/insights`, {
        params: {
          metric: [
            'impressions',
            'reach',
            'profile_views',
            'website_clicks',
            'follower_count'
          ].join(','),
          period: 'day',
          since: Math.floor(Date.now() / 1000) - (28 * 24 * 60 * 60),
          until: Math.floor(Date.now() / 1000),
          access_token: accessToken
        }
      });

      const insights: any = {};
      response.data.data.forEach((metric: any) => {
        insights[metric.name] = metric.values;
      });

      return insights;
    } catch (error) {
      this.logger.error('Failed to fetch account insights:', error.message);
      return {};
    }
  }

  // ============================================
  // Helper methods
  // ============================================
  private mapMediaType(igType: string): string {
    const mapping: any = {
      'IMAGE': 'image',
      'VIDEO': 'video',
      'CAROUSEL_ALBUM': 'carousel',
      'STORY': 'story',
      'REELS': 'reel'
    };
    return mapping[igType] || 'image';
  }

  private detectSponsorship(caption: string): boolean {
    const keywords = ['#ad', '#sponsored', '#partnership', 'paid partnership'];
    const lower = caption.toLowerCase();
    return keywords.some(k => lower.includes(k));
  }
}