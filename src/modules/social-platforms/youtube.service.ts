// src/modules/social-platforms/youtube.service.ts - UPDATED METHODS ONLY
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
  private analyticsBaseUrl = 'https://youtubeanalytics.googleapis.com/v2';

  constructor(sqlService: SqlServerService) {
    super(sqlService, PLATFORM_CONFIGS[SocialPlatform.YOUTUBE]);
  }

  // ============================================
  // KEEP EXISTING: OAuth methods unchanged
  // ============================================
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
      refreshToken: refreshToken,
      tokenType: response.data.token_type,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.get(`${this.config.apiBaseUrl}/channels`, {
      params: {
        part: 'snippet,statistics,contentDetails,brandingSettings',
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
      profilePicture: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
      followerCount: parseInt(channel.statistics.subscriberCount),
      verified: false,
      accountType: 'creator'
    };
  }

  // ============================================
  // ✅ UPDATED: Fetch ALL videos with pagination
  // ============================================
  async fetchContent(
    accessToken: string,
    options?: { limit?: number; since?: Date }
  ): Promise<ContentItem[]> {
    const allVideos: ContentItem[] = [];
    
    const channelResponse = await axios.get(`${this.config.apiBaseUrl}/channels`, {
      params: { part: 'contentDetails', mine: true },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const uploadsPlaylistId = 
      channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    let nextPageToken: string | undefined = undefined;
    const maxResults = options?.limit || 100;

    // ✅ PAGINATION LOOP
    do {
      const videosResponse = await axios.get(`${this.config.apiBaseUrl}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(50, maxResults - allVideos.length),
          pageToken: nextPageToken
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const videoIds = videosResponse.data.items
        .map((item: any) => item.contentDetails.videoId)
        .join(',');

      if (videoIds) {
        const detailsResponse = await axios.get(`${this.config.apiBaseUrl}/videos`, {
          params: {
            part: 'snippet,statistics,contentDetails,status',
            id: videoIds
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const videos = detailsResponse.data.items.map((video: any) => {
          const description = video.snippet.description || '';
          const hashtags = description.match(/#[\w]+/g) || [];
          const duration = this.parseDuration(video.contentDetails.duration);

          return {
            contentId: video.id,
            contentType: duration <= 60 ? 'short' : 'video',
            title: video.snippet.title,
            description: description,
            caption: video.snippet.description,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
            publishedAt: new Date(video.snippet.publishedAt),
            durationSeconds: duration,
            hashtags: hashtags.map(h => h.substring(1)),
            isSponsored: this.detectSponsorship(video.snippet.description),
            metrics: {
              views: parseInt(video.statistics.viewCount) || 0,
              likes: parseInt(video.statistics.likeCount) || 0,
              comments: parseInt(video.statistics.commentCount) || 0
            },
            rawData: {
              categoryId: video.snippet.categoryId,
              tags: video.snippet.tags || [],
              privacyStatus: video.status.privacyStatus
            }
          };
        });

        allVideos.push(...videos);
      }

      nextPageToken = videosResponse.data.nextPageToken;

      if (!nextPageToken || allVideos.length >= maxResults) break;

    } while (nextPageToken);

    this.logger.log(`Fetched ${allVideos.length} videos from YouTube`);
    return allVideos;
  }

  // ============================================
  // ✅ UPDATED: Use YouTube Analytics API
  // ============================================
  async fetchContentMetrics(accessToken: string, videoId: string): Promise<ContentMetrics> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const response = await axios.get(`${this.analyticsBaseUrl}/reports`, {
        params: {
          ids: 'channel==MINE',
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
          metrics: [
            'views',
            'likes',
            'comments',
            'shares',
            'estimatedMinutesWatched',
            'averageViewDuration',
            'averageViewPercentage',
            'impressions',
            'impressionClickThroughRate'
          ].join(','),
          filters: `video==${videoId}`
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.data.rows || response.data.rows.length === 0) {
        return {};
      }

      const row = response.data.rows[0];
      const views = row[0] || 0;
      const likes = row[1] || 0;
      const comments = row[2] || 0;
      const shares = row[3] || 0;
      const watchTimeMinutes = row[4] || 0;
      const avgViewDuration = row[5] || 0;
      const avgViewPercentage = row[6] || 0;
      const impressions = row[7] || 0;
      const ctr = row[8] || 0;

      return {
        views,
        likes,
        comments,
        shares,
        impressions,
        watchTimeMinutes,
        avgViewDurationSeconds: avgViewDuration,
        completionRate: avgViewPercentage,
        clickThroughRate: ctr,
        engagementRate: views > 0 ? ((likes + comments + shares) / views) * 100 : 0
      };
    } catch (error) {
      this.logger.warn(`Analytics API failed for ${videoId}, using Data API fallback`);
      
      // Fallback to Data API
      const response = await axios.get(`${this.config.apiBaseUrl}/videos`, {
        params: { part: 'statistics', id: videoId },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const stats = response.data.items[0]?.statistics;
      if (!stats) return {};

      const views = parseInt(stats.viewCount) || 0;
      const likes = parseInt(stats.likeCount) || 0;
      const comments = parseInt(stats.commentCount) || 0;

      return {
        views,
        likes,
        comments,
        engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0
      };
    }
  }

  // ============================================
  // ✅ NEW: Fetch daily time-series analytics
  // ============================================
  async fetchDailyAnalytics(
    accessToken: string,
    videoId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const response = await axios.get(`${this.analyticsBaseUrl}/reports`, {
        params: {
          ids: 'channel==MINE',
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
          metrics: [
            'views',
            'likes',
            'comments',
            'shares',
            'estimatedMinutesWatched',
            'averageViewDuration',
            'impressions',
            'impressionClickThroughRate',
            'subscribersGained',
            'subscribersLost'
          ].join(','),
          dimensions: 'day',
          filters: `video==${videoId}`,
          sort: 'day'
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      return (response.data.rows || []).map((row: any) => ({
        date: row[0],
        views: row[1] || 0,
        likes: row[2] || 0,
        comments: row[3] || 0,
        shares: row[4] || 0,
        watchTimeMinutes: row[5] || 0,
        avgViewDuration: row[6] || 0,
        impressions: row[7] || 0,
        ctr: row[8] || 0,
        subscribersGained: row[9] || 0,
        subscribersLost: row[10] || 0
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch daily analytics for ${videoId}:`, error.message);
      return [];
    }
  }

  // ============================================
  // ✅ UPDATED: Enhanced demographics
  // ============================================
  async fetchAudienceDemographics(accessToken: string): Promise<AudienceDemographic[]> {
    const demographics: AudienceDemographic[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    try {
      // Age & Gender
      const ageGenderResponse = await axios.get(`${this.analyticsBaseUrl}/reports`, {
        params: {
          ids: 'channel==MINE',
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
          metrics: 'viewerPercentage',
          dimensions: 'ageGroup,gender',
          sort: '-viewerPercentage'
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      ageGenderResponse.data.rows?.forEach((row: any) => {
        demographics.push({
          dimensionType: 'age_gender',
          dimensionValue: `${row[0]}:${row[1]}`,
          percentage: row[2],
          count: 0
        });
      });

      // Country
      const countryResponse = await axios.get(`${this.analyticsBaseUrl}/reports`, {
        params: {
          ids: 'channel==MINE',
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
          metrics: 'viewerPercentage',
          dimensions: 'country',
          sort: '-viewerPercentage',
          maxResults: 50
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      countryResponse.data.rows?.forEach((row: any) => {
        demographics.push({
          dimensionType: 'country',
          dimensionValue: row[0],
          percentage: row[1],
          count: 0
        });
      });

      // Device Type
      const deviceResponse = await axios.get(`${this.analyticsBaseUrl}/reports`, {
        params: {
          ids: 'channel==MINE',
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
          metrics: 'viewerPercentage',
          dimensions: 'deviceType',
          sort: '-viewerPercentage'
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      deviceResponse.data.rows?.forEach((row: any) => {
        demographics.push({
          dimensionType: 'device',
          dimensionValue: row[0],
          percentage: row[1],
          count: 0
        });
      });

    } catch (error) {
      this.logger.error(`Failed to fetch demographics:`, error.message);
    }

    return demographics;
  }

  // ============================================
  // Helper methods
  // ============================================
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  }

  private detectSponsorship(description: string): boolean {
    const keywords = ['#ad', '#sponsored', '#partner', 'sponsored by'];
    const lower = description.toLowerCase();
    return keywords.some(k => lower.includes(k));
  }
}