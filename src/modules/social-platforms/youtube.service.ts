// src/modules/social-platforms/youtube.service.ts
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
      tokenType: response.data.token_type,
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
      refreshToken: refreshToken, // Reuse existing refresh token
      tokenType: response.data.token_type,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.get(`${this.config.apiBaseUrl}/channels`, {
      params: {
        part: 'snippet,statistics,contentDetails',
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
      verified: false, // Not directly available
      accountType: 'creator'
    };
  }

  async fetchContent(
    accessToken: string,
    options?: { limit?: number; since?: Date }
  ): Promise<ContentItem[]> {
    // Get channel's uploads playlist
    const channelResponse = await axios.get(`${this.config.apiBaseUrl}/channels`, {
      params: { part: 'contentDetails', mine: true },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const uploadsPlaylistId = 
      channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Get videos from uploads playlist
    const videosResponse = await axios.get(`${this.config.apiBaseUrl}/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: options?.limit || 25
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Get video details with statistics
    const videoIds = videosResponse.data.items
      .map((item: any) => item.contentDetails.videoId)
      .join(',');

    const detailsResponse = await axios.get(`${this.config.apiBaseUrl}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoIds
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return detailsResponse.data.items.map((video: any) => {
      const description = video.snippet.description || '';
      const hashtags = description.match(/#[\w]+/g) || [];
      const duration = this.parseDuration(video.contentDetails.duration);

      return {
        contentId: video.id,
        contentType: 'video',
        title: video.snippet.title,
        description: description,
        caption: video.snippet.description,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnailUrl: video.snippet.thumbnails.medium.url,
        publishedAt: new Date(video.snippet.publishedAt),
        durationSeconds: duration,
        hashtags: hashtags.map(h => h.substring(1)),
        isSponsored: false,
        metrics: {
          views: parseInt(video.statistics.viewCount) || 0,
          likes: parseInt(video.statistics.likeCount) || 0,
          comments: parseInt(video.statistics.commentCount) || 0
        },
        rawData: {
          categoryId: video.snippet.categoryId,
          tags: video.snippet.tags || []
        }
      };
    });
  }

  async fetchContentMetrics(accessToken: string, videoId: string): Promise<ContentMetrics> {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/videos`, {
        params: {
          part: 'statistics',
          id: videoId
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const stats = response.data.items[0].statistics;
      const views = parseInt(stats.viewCount) || 0;
      const likes = parseInt(stats.likeCount) || 0;
      const comments = parseInt(stats.commentCount) || 0;

      return {
        views,
        likes,
        comments,
        engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch metrics for ${videoId}: ${error.message}`);
      return {};
    }
  }

  async fetchRevenue(accessToken: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const response = await axios.get(
        'https://youtubeanalytics.googleapis.com/v2/reports',
        {
          params: {
            ids: 'channel==MINE',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            metrics: 'estimatedRevenue,estimatedAdRevenue,estimatedRedPartnerRevenue',
            dimensions: 'day'
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return response.data.rows?.map((row: any) => ({
        date: row[0],
        totalRevenue: row[1],
        adRevenue: row[2],
        premiumRevenue: row[3]
      })) || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch revenue: ${error.message}`);
      return [];
    }
  }

  async fetchAudienceDemographics(accessToken: string): Promise<AudienceDemographic[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28); // Last 28 days

      // Age & Gender
      const ageGenderResponse = await axios.get(
        'https://youtubeanalytics.googleapis.com/v2/reports',
        {
          params: {
            ids: 'channel==MINE',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            metrics: 'viewerPercentage',
            dimensions: 'ageGroup,gender',
            sort: '-viewerPercentage'
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      // Country
      const countryResponse = await axios.get(
        'https://youtubeanalytics.googleapis.com/v2/reports',
        {
          params: {
            ids: 'channel==MINE',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            metrics: 'viewerPercentage',
            dimensions: 'country',
            sort: '-viewerPercentage',
            maxResults: 10
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const demographics: AudienceDemographic[] = [];

      // Process age/gender data
      ageGenderResponse.data.rows?.forEach((row: any) => {
        demographics.push({
          dimensionType: 'age_gender',
          dimensionValue: `${row[0]}:${row[1]}`,
          percentage: row[2],
          count: 0
        });
      });

      // Process country data
      countryResponse.data.rows?.forEach((row: any) => {
        demographics.push({
          dimensionType: 'country',
          dimensionValue: row[0],
          percentage: row[1],
          count: 0
        });
      });

      return demographics;
    } catch (error) {
      this.logger.warn(`Failed to fetch audience demographics: ${error.message}`);
      return [];
    }
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration (PT1H2M10S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }
}