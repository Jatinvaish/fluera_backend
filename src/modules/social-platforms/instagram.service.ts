// src/modules/social-platforms/instagram.service.ts
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
    // Short-lived token
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

    // Exchange for long-lived token
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
        fields: 'id,username,account_type,media_count,followers_count,follows_count,name,biography,profile_picture_url,website',
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
      verified: false // Not provided by basic API
    };
  }

  async fetchContent(
    accessToken: string,
    options?: { limit?: number; since?: Date }
  ): Promise<ContentItem[]> {
    const response = await axios.get(`${this.config.apiBaseUrl}/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,is_shared_to_feed',
        access_token: accessToken,
        limit: options?.limit || 25
      }
    });

    return response.data.data.map((item: any) => {
      // Extract hashtags and mentions
      const caption = item.caption || '';
      const hashtags = caption.match(/#[\w]+/g) || [];
      const mentions = caption.match(/@[\w]+/g) || [];

      return {
        contentId: item.id,
        contentType: item.media_type?.toLowerCase() || 'image',
        title: caption.substring(0, 100),
        description: caption,
        caption: caption,
        url: item.permalink,
        thumbnailUrl: item.thumbnail_url || item.media_url,
        publishedAt: new Date(item.timestamp),
        hashtags: hashtags.map(h => h.substring(1)),
        mentions: mentions.map(m => m.substring(1)),
        isSponsored: false,
        metrics: {
          likes: item.like_count || 0,
          comments: item.comments_count || 0
        }
      };
    });
  }

  async fetchContentMetrics(accessToken: string, contentId: string): Promise<ContentMetrics> {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/${contentId}/insights`, {
        params: {
          metric: 'impressions,reach,engagement,saved,profile_visits,follows',
          access_token: accessToken
        }
      });

      const metrics: any = {};
      response.data.data.forEach((item: any) => {
        metrics[item.name] = item.values[0].value;
      });

      return {
        impressions: metrics.impressions || 0,
        reach: metrics.reach || 0,
        saves: metrics.saved || 0,
        engagementRate: metrics.engagement ? 
          (metrics.engagement / metrics.impressions) * 100 : 0
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch metrics for ${contentId}: ${error.message}`);
      return {};
    }
  }

  async fetchAudienceDemographics(accessToken: string): Promise<AudienceDemographic[]> {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/me/insights`, {
        params: {
          metric: 'audience_city,audience_country,audience_gender_age',
          period: 'lifetime',
          access_token: accessToken
        }
      });

      const demographics: AudienceDemographic[] = [];

      response.data.data.forEach((metric: any) => {
        const values = metric.values[0].value;
        let dimensionType = '';

        if (metric.name === 'audience_gender_age') {
          dimensionType = 'age_gender';
        } else if (metric.name === 'audience_country') {
          dimensionType = 'country';
        } else if (metric.name === 'audience_city') {
          dimensionType = 'city';
        }

        Object.entries(values).forEach(([key, count]: [string, any]) => {
          demographics.push({
            dimensionType,
            dimensionValue: key,
            count: count,
            percentage: 0 // Calculate later if needed
          });
        });
      });

      return demographics;
    } catch (error) {
      this.logger.warn(`Failed to fetch audience demographics: ${error.message}`);
      return [];
    }
  }
}