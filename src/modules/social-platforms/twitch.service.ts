// src/modules/social-platforms/services/tiktok.service.ts
import { Injectable } from '@nestjs/common';
import { BasePlatformService } from './base-platform.service';
import { SqlServerService } from 'src/core/database';
import {
  PLATFORM_CONFIGS,
  SocialPlatform,
  OAuthTokens,
  PlatformAccountInfo,
  ContentItem,
  getEnvCredentials,
  ContentMetrics
} from './platform.types';
import axios from 'axios';

@Injectable()
export class TwitchService extends BasePlatformService {
  private credentials = getEnvCredentials(SocialPlatform.TWITCH);

  constructor(sqlService: SqlServerService) {
    super(sqlService, PLATFORM_CONFIGS[SocialPlatform.TWITCH]);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokens> {
    const response = await axios.post(this.config.tokenUrl, {
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.credentials.redirectUri
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await axios.post(this.config.tokenUrl, {
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.get(`${this.config.apiBaseUrl}/users`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': this.credentials.clientId
      }
    });

    const user = response.data.data[0];
    return {
      platformUserId: user.id,
      username: user.login,
      displayName: user.display_name,
      bio: user.description,
      profilePicture: user.profile_image_url,
      followerCount: 0, // Requires additional API call
      verified: false
    };
  }

  async fetchContent(accessToken: string, options?: { limit?: number }): Promise<ContentItem[]> {
    const userResponse = await axios.get(`${this.config.apiBaseUrl}/users`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': this.credentials.clientId
      }
    });
    const userId = userResponse.data.data[0].id;

    const response = await axios.get(`${this.config.apiBaseUrl}/videos`, {
      params: {
        user_id: userId,
        first: options?.limit || 20
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': this.credentials.clientId
      }
    });

    return response.data.data.map((video: any) => ({
      contentId: video.id,
      contentType: video.type,
      title: video.title,
      description: video.description,
      url: video.url,
      thumbnailUrl: video.thumbnail_url,
      publishedAt: new Date(video.created_at),
      durationSeconds: this.parseTwitchDuration(video.duration),
      metrics: {
        views: video.view_count || 0
      }
    }));
  }

  async fetchContentMetrics(accessToken: string, videoId: string): Promise<ContentMetrics> {
    return {}; // Metrics in video list
  }

  private parseTwitchDuration(duration: string): number {
    const match = duration.match(/(\d+)h(\d+)m(\d+)s/);
    if (!match) return 0;
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
  }
}
