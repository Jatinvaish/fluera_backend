// src/modules/social-platforms/services/youtube.service.ts
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
export class YouTubeService extends BasePlatformService {
  private credentials = getEnvCredentials(SocialPlatform.YOUTUBE);

  constructor(sqlService: SqlServerService) {
    super(sqlService, PLATFORM_CONFIGS[SocialPlatform.YOUTUBE]);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
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
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      scope: response.data.scope
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
      refreshToken: refreshToken, // Reuse existing
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.get(`${this.config.apiBaseUrl}/channels`, {
      params: {
        part: 'snippet,statistics',
        mine: true
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const channel = response.data.items[0];
    return {
      platformUserId: channel.id,
      username: channel.snippet.customUrl || channel.snippet.title,
      displayName: channel.snippet.title,
      bio: channel.snippet.description,
      profilePicture: channel.snippet.thumbnails.default.url,
      followerCount: parseInt(channel.statistics.subscriberCount),
      verified: channel.status?.isLinked || false
    };
  }

  async fetchContent(accessToken: string, options?: any): Promise<ContentItem[]> {
    // Get channel ID first
    const channelResponse = await axios.get(`${this.config.apiBaseUrl}/channels`, {
      params: { part: 'contentDetails', mine: true },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Get videos from uploads playlist
    const videosResponse = await axios.get(`${this.config.apiBaseUrl}/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: options?.limit || 25
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return videosResponse.data.items.map((item: any) => ({
      contentId: item.contentDetails.videoId,
      contentType: 'video',
      title: item.snippet.title,
      description: item.snippet.description,
      url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      publishedAt: new Date(item.snippet.publishedAt)
    }));
  }

  async fetchContentMetrics(accessToken: string, videoId: string): Promise<any> {
    const response = await axios.get(`${this.config.apiBaseUrl}/videos`, {
      params: {
        part: 'statistics',
        id: videoId
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const stats = response.data.items[0].statistics;
    return {
      views: parseInt(stats.viewCount),
      likes: parseInt(stats.likeCount),
      comments: parseInt(stats.commentCount)
    };
  }

  async fetchRevenue(accessToken: string, startDate: Date, endDate: Date): Promise<any> {
    // YouTube Analytics API
    const response = await axios.get('https://youtubeanalytics.googleapis.com/v2/reports', {
      params: {
        ids: 'channel==MINE',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        metrics: 'estimatedRevenue,estimatedAdRevenue,estimatedRedPartnerRevenue',
        dimensions: 'day'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return response.data;
  }
}