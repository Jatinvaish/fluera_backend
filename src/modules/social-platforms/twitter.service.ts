// src/modules/social-platforms/social-platform.service.ts
import { Injectable, } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { ContentItem, ContentMetrics, getEnvCredentials, OAuthTokens, PLATFORM_CONFIGS, PlatformAccountInfo, SocialPlatform } from './platform.types';
import axios from 'axios';
import { BasePlatformService } from './base-platform.service';
import * as crypto from 'crypto';

// ============================================
// src/modules/social-platforms/services/twitter.service.ts
// ============================================
@Injectable()
export class TwitterService extends BasePlatformService {
  private credentials = getEnvCredentials(SocialPlatform.TWITTER);

  constructor(sqlService: SqlServerService) {
    super(sqlService, PLATFORM_CONFIGS[SocialPlatform.TWITTER]);
  }

  getAuthorizationUrl(state: string): string {
    // Twitter requires PKCE - code challenge will be in state
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: this.extractCodeChallenge(state),
      code_challenge_method: 'S256'
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const response = await axios.post(this.config.tokenUrl, new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      code_verifier: codeVerifier || ''
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await axios.post(this.config.tokenUrl, new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: this.credentials.clientId
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
    };
  }

  async fetchAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const response = await axios.get(`${this.config.apiBaseUrl}/users/me`, {
      params: { 'user.fields': 'id,name,username,profile_image_url,description,public_metrics,verified' },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = response.data.data;
    return {
      platformUserId: user.id,
      username: user.username,
      displayName: user.name,
      bio: user.description,
      profilePicture: user.profile_image_url,
      followerCount: user.public_metrics.followers_count,
      followingCount: user.public_metrics.following_count,
      verified: user.verified
    };
  }

  async fetchContent(accessToken: string, options?: { limit?: number }): Promise<ContentItem[]> {
    const userResponse = await axios.get(`${this.config.apiBaseUrl}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userId = userResponse.data.data.id;

    const response = await axios.get(`${this.config.apiBaseUrl}/users/${userId}/tweets`, {
      params: {
        'tweet.fields': 'created_at,public_metrics,text',
        max_results: options?.limit || 10
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return response.data.data.map((tweet: any) => ({
      contentId: tweet.id,
      contentType: 'tweet',
      title: tweet.text.substring(0, 100),
      description: tweet.text,
      caption: tweet.text,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
      publishedAt: new Date(tweet.created_at),
      isSponsored: false,
      metrics: {
        likes: tweet.public_metrics.like_count,
        comments: tweet.public_metrics.reply_count,
        retweets: tweet.public_metrics.retweet_count,
        quotes: tweet.public_metrics.quote_count,
        impressions: tweet.public_metrics.impression_count
      }
    }));
  }

  async fetchContentMetrics(accessToken: string, tweetId: string): Promise<ContentMetrics> {
    return {}; // Metrics included in fetch
  }

  private extractCodeChallenge(state: string): string {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      if (decoded.codeVerifier) {
        return crypto.createHash('sha256').update(decoded.codeVerifier).digest('base64url');
      }
    } catch (e) { }
    return '';
  }
}