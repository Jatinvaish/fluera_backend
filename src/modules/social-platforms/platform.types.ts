// src/modules/social-platforms/types/platform.types.ts

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  TWITCH = 'twitch'
}

export interface PlatformConfig {
  name: string;
  displayName: string;
  authUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  scopes: string[];
  supportsMetrics: boolean;
  supportsContent: boolean;
  supportsAudience: boolean;
  supportsRevenue: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface PlatformAccountInfo {
  platformUserId: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  followerCount?: number;
  bio?: string;
  verified?: boolean;
  accountType?: string; // personal, business, creator
}

export interface ContentItem {
  contentId: string;
  contentType: string;
  title?: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  publishedAt: Date;
  metrics?: ContentMetrics;
}

export interface ContentMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  engagementRate?: number;
  reachCount?: number;
}

export interface AudienceDemographic {
  dimensionType: string; // age_gender, country, city, device
  dimensionValue: string;
  percentage: number;
  count?: number;
}

// Platform configurations
export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  [SocialPlatform.INSTAGRAM]: {
    name: 'instagram',
    displayName: 'Instagram',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    apiBaseUrl: 'https://graph.instagram.com',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'instagram_manage_insights'],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: true,
    supportsRevenue: false
  },
  
  [SocialPlatform.YOUTUBE]: {
    name: 'youtube',
    displayName: 'YouTube',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiBaseUrl: 'https://www.googleapis.com/youtube/v3',
    scopes: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly'
    ],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: true,
    supportsRevenue: true
  },
  
  [SocialPlatform.TIKTOK]: {
    name: 'tiktok',
    displayName: 'TikTok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    apiBaseUrl: 'https://open.tiktokapis.com/v2',
    scopes: ['user.info.basic', 'video.list', 'video.insights'],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: false,
    supportsRevenue: false
  },
  
  [SocialPlatform.TWITTER]: {
    name: 'twitter',
    displayName: 'Twitter/X',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    apiBaseUrl: 'https://api.twitter.com/2',
    scopes: ['tweet.read', 'users.read', 'offline.access'],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: false,
    supportsRevenue: false
  },
  
  [SocialPlatform.FACEBOOK]: {
    name: 'facebook',
    displayName: 'Facebook',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    apiBaseUrl: 'https://graph.facebook.com/v18.0',
    scopes: ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content', 'public_profile'],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: true,
    supportsRevenue: false
  },
  
  [SocialPlatform.TWITCH]: {
    name: 'twitch',
    displayName: 'Twitch',
    authUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    apiBaseUrl: 'https://api.twitch.tv/helix',
    scopes: ['user:read:email', 'analytics:read:extensions', 'channel:read:subscriptions'],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: true,
    supportsRevenue: true
  }
};

// Environment variables interface
export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Add to .env
export const getEnvCredentials = (platform: SocialPlatform): PlatformCredentials => {
  const envPrefix = platform.toUpperCase();
  return {
    clientId: process.env[`${envPrefix}_CLIENT_ID`] || '',
    clientSecret: process.env[`${envPrefix}_CLIENT_SECRET`] || '',
    redirectUri: process.env[`${envPrefix}_REDIRECT_URI`] || `${process.env.APP_URL}/api/v1/social/callback/${platform}`
  };
};