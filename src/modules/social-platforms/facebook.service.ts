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


// ============================================
// src/modules/social-platforms/services/facebook.service.ts
// ============================================
@Injectable()
export class FacebookService extends BasePlatformService {
  private credentials = getEnvCredentials(SocialPlatform.FACEBOOK);

  constructor(sqlService: SqlServerService) {
    super(sqlService, PLATFORM_CONFIGS[SocialPlatform.FACEBOOK]);
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
    const response = await axios.get(this.config.tokenUrl, {
      params: {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        redirect_uri: this.credentials.redirectUri,
        code
      }
    });

    // Exchange for long-lived token
    const longLivedResponse = await axios.get(`${this.config.apiBaseUrl}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        fb_exchange_token: response.data.access_token
      }
    });

    return {
      accessToken: longLivedResponse.data.access_token,
      expiresAt: new Date(Date.now() + longLivedResponse.data.expires_in * 1000)
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // Facebook uses token extension
    const response = await axios.get(`${this.config.apiBaseUrl}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        fb_exchange_token: refreshToken
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    // Get user's pages
    const pagesResponse = await axios.get(`${this.config.apiBaseUrl}/me/accounts`, {
      params: { access_token: accessToken }
    });

    const page = pagesResponse.data.data[0]; // First page

    const pageInfo = await axios.get(`${this.config.apiBaseUrl}/${page.id}`, {
      params: {
        fields: 'id,name,username,picture,followers_count,about',
        access_token: accessToken
      }
    });

    return {
      platformUserId: pageInfo.data.id,
      username: pageInfo.data.username || pageInfo.data.name,
      displayName: pageInfo.data.name,
      bio: pageInfo.data.about,
      profilePicture: pageInfo.data.picture?.data?.url,
      followerCount: pageInfo.data.followers_count
    };
  }

  async fetchContent(accessToken: string, options?: any): Promise<ContentItem[]> {
    const pagesResponse = await axios.get(`${this.config.apiBaseUrl}/me/accounts`, {
      params: { access_token: accessToken }
    });

    const pageId = pagesResponse.data.data[0].id;

    const response = await axios.get(`${this.config.apiBaseUrl}/${pageId}/posts`, {
      params: {
        fields: 'id,message,created_time,full_picture,permalink_url,insights.metric(post_impressions,post_engaged_users)',
        limit: options?.limit || 25,
        access_token: accessToken
      }
    });

    return response.data.data.map((post: any) => ({
      contentId: post.id,
      contentType: 'post',
      title: post.message?.substring(0, 100),
      description: post.message,
      url: post.permalink_url,
      thumbnailUrl: post.full_picture,
      publishedAt: new Date(post.created_time)
    }));
  }

  async fetchContentMetrics(accessToken: string, postId: string): Promise<any> {
    const response = await axios.get(`${this.config.apiBaseUrl}/${postId}/insights`, {
      params: {
        metric: 'post_impressions,post_engaged_users,post_clicks',
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