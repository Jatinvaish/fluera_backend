// src/modules/social-platforms/platform.types.ts
// COMPLETE TYPE DEFINITIONS FOR ALL PLATFORMS

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
  requiresPKCE?: boolean; // For Twitter
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  tokenType?: string;
}

export interface PlatformAccountInfo {
  platformUserId: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  followerCount?: number;
  followingCount?: number;
  bio?: string;
  verified?: boolean;
  accountType?: string;
  websiteUrl?: string;
  email?: string;
}

export interface ContentItem {
  contentId: string;
  contentType: string; // video, image, reel, story, tweet, stream, post
  title?: string;
  description?: string;
  caption?: string;
  url: string;
  thumbnailUrl?: string;
  publishedAt: Date;
  durationSeconds?: number;
  isSponsored?: boolean;
  hashtags?: string[];
  mentions?: string[];
  metrics?: ContentMetrics;
  rawData?: any; // Store platform-specific data
}

export interface ContentMetrics {
  views?: number;
  likes?: number;
  dislikes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  retweets?: number;
  quotes?: number;
  impressions?: number;
  reach?: number;
  engagementRate?: number;
  watchTimeMinutes?: number;
  avgViewDurationSeconds?: number;
  completionRate?: number;
  clickThroughRate?: number;
}

export interface AudienceDemographic {
  dimensionType: string; // age_gender, country, city, device, language, interest
  dimensionValue: string; // 18-24:male, US, New York, mobile, en
  percentage: number;
  count?: number;
}

// COMPLETE PLATFORM CONFIGURATIONS
export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  [SocialPlatform.INSTAGRAM]: {
    name: 'instagram',
    displayName: 'Instagram',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    apiBaseUrl: 'https://graph.instagram.com',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'instagram_manage_insights',
      'pages_read_engagement'
    ],
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
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
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
    scopes: [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
      'video.insights'
    ],
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
    scopes: [
      'tweet.read',
      'users.read',
      'follows.read',
      'offline.access'
    ],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: false,
    supportsRevenue: false,
    requiresPKCE: true
  },
  
  [SocialPlatform.FACEBOOK]: {
    name: 'facebook',
    displayName: 'Facebook',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    apiBaseUrl: 'https://graph.facebook.com/v18.0',
    scopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_read_user_content',
      'pages_manage_posts',
      'public_profile',
      'pages_manage_metadata'
    ],
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
    scopes: [
      'user:read:email',
      'user:read:follows',
      'analytics:read:extensions',
      'channel:read:subscriptions',
      'channel:read:stream_key',
      'clips:edit'
    ],
    supportsMetrics: true,
    supportsContent: true,
    supportsAudience: true,
    supportsRevenue: true
  }
};

// Environment credentials helper
export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export const getEnvCredentials = (platform: SocialPlatform): PlatformCredentials => {
  const envPrefix = platform.toUpperCase();
  return {
    clientId: process.env[`${envPrefix}_CLIENT_ID`] || '',
    clientSecret: process.env[`${envPrefix}_CLIENT_SECRET`] || '',
    redirectUri: process.env[`${envPrefix}_REDIRECT_URI`] || 
      `${process.env.APP_URL}/api/v1/social-platforms/callback/${platform}`
  };
};

// State encoding for OAuth
export interface OAuthState {
  platform: SocialPlatform;
  creatorProfileId: number;
  userId: number;
  timestamp: number;
  codeVerifier?: string; // For PKCE
}

export const encodeState = (state: OAuthState): string => {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
};

export const decodeState = (encoded: string): OAuthState => {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString());
};