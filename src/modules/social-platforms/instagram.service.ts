// src/modules/social-platforms/services/instagram.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BasePlatformService } from './base-platform.service';
import { SqlServerService } from 'src/core/database';
import axios from 'axios';
import { getEnvCredentials, SocialPlatform, PLATFORM_CONFIGS, OAuthTokens, PlatformAccountInfo, ContentItem } from './platform.types';

@Injectable()
export class InstagramService extends BasePlatformService {
  private credentials = getEnvCredentials(SocialPlatform.INSTAGRAM);

  constructor(
    sqlService: SqlServerService,
    private configService: ConfigService
  ) {
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
    const response = await axios.post(this.config.tokenUrl, {
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.credentials.redirectUri,
      code
    });

    // Exchange short-lived for long-lived token
    const longLivedResponse = await axios.get(`${this.config.apiBaseUrl}/access_token`, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: this.credentials.clientSecret,
        access_token: response.data.access_token
      }
    });

    return {
      accessToken: longLivedResponse.data.access_token,
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
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.get(`${this.config.apiBaseUrl}/me`, {
      params: {
        fields: 'id,username,account_type,media_count,followers_count,follows_count',
        access_token: accessToken
      }
    });

    return {
      platformUserId: response.data.id,
      username: response.data.username,
      displayName: response.data.username,
      followerCount: response.data.followers_count,
      accountType: response.data.account_type
    };
  }

  async fetchContent(accessToken: string, options?: any): Promise<ContentItem[]> {
    const response = await axios.get(`${this.config.apiBaseUrl}/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        access_token: accessToken,
        limit: options?.limit || 25
      }
    });

    return response.data.data.map((item: any) => ({
      contentId: item.id,
      contentType: item.media_type.toLowerCase(),
      title: item.caption?.substring(0, 100),
      description: item.caption,
      url: item.permalink,
      thumbnailUrl: item.thumbnail_url || item.media_url,
      publishedAt: new Date(item.timestamp),
      metrics: {
        likes: item.like_count,
        comments: item.comments_count
      }
    }));
  }

  async fetchContentMetrics(accessToken: string, contentId: string): Promise<any> {
    const response = await axios.get(`${this.config.apiBaseUrl}/${contentId}/insights`, {
      params: {
        metric: 'impressions,reach,engagement,saved',
        access_token: accessToken
      }
    });

    const metrics: any = {};
    response.data.data.forEach((item: any) => {
      metrics[item.name] = item.values[0].value;
    });

    return metrics;
  }
}