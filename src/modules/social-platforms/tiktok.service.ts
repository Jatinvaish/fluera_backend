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
  getEnvCredentials
} from './platform.types';
import axios from 'axios';

@Injectable()
export class TikTokService extends BasePlatformService {
  private credentials = getEnvCredentials(SocialPlatform.TIKTOK);

  constructor(sqlService: SqlServerService) {
    super(sqlService, PLATFORM_CONFIGS[SocialPlatform.TIKTOK]);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(','),
      state
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokens> {
    const response = await axios.post(
      this.config.tokenUrl,
      {
        client_key: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.credentials.redirectUri
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return {
      accessToken: response.data.data.access_token,
      refreshToken: response.data.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.data.expires_in * 1000),
      scope: response.data.data.scope
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await axios.post(this.config.tokenUrl, {
      client_key: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    return {
      accessToken: response.data.data.access_token,
      refreshToken: response.data.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.post(
      `${this.config.apiBaseUrl}/user/info/`,
      { fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'follower_count'] },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const user = response.data.data.user;
    return {
      platformUserId: user.open_id,
      username: user.display_name,
      displayName: user.display_name,
      profilePicture: user.avatar_url,
      followerCount: user.follower_count
    };
  }

  async fetchContent(accessToken: string, options?: any): Promise<ContentItem[]> {
    const response = await axios.post(
      `${this.config.apiBaseUrl}/video/list/`,
      {
        max_count: options?.limit || 20
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return response.data.data.videos.map((video: any) => ({
      contentId: video.id,
      contentType: 'video',
      title: video.title,
      description: video.video_description,
      url: video.share_url,
      thumbnailUrl: video.cover_image_url,
      publishedAt: new Date(video.create_time * 1000),
      metrics: {
        views: video.view_count,
        likes: video.like_count,
        comments: video.comment_count,
        shares: video.share_count
      }
    }));
  }

  async fetchContentMetrics(accessToken: string, videoId: string): Promise<any> {
    // TikTok provides metrics in the video list API
    return {};
  }
}
