// src/modules/social-platforms/metrics-history.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';

@Injectable()
export class MetricsHistoryService {
  private readonly logger = new Logger(MetricsHistoryService.name);

  constructor(private sqlService: SqlServerService) {}

  // ============================================
  // DAILY SNAPSHOT: Save Content Metrics History
  // ============================================
  async saveDailySnapshot(
    contentId: number,
    platform: string,
    metrics: any,
    metricDate: Date = new Date()
  ): Promise<void> {
    const dateOnly = metricDate.toISOString().split('T')[0];

    await this.sqlService.query(
      `MERGE INTO creator_content_metrics AS target
       USING (SELECT @contentId AS content_id, @metricDate AS metric_date) AS source
       ON target.content_id = source.content_id AND target.metric_date = source.metric_date
       WHEN MATCHED THEN UPDATE SET
         views = @views, likes = @likes, dislikes = @dislikes,
         comments = @comments, shares = @shares, saves = @saves,
         retweets = @retweets, quotes = @quotes,
         impressions = @impressions, reach = @reach,
         watch_time_minutes = @watchTimeMinutes,
         avg_view_duration_seconds = @avgViewDuration,
         completion_rate = @completionRate,
         click_through_rate = @clickThroughRate,
         engagement_rate = @engagementRate,
         profile_visits = @profileVisits,
         website_clicks = @websiteClicks,
         subscribers_gained = @subscribersGained,
         metadata = @metadata
       WHEN NOT MATCHED THEN INSERT (
         content_id, platform, metric_date, views, likes, dislikes,
         comments, shares, saves, retweets, quotes, impressions, reach,
         watch_time_minutes, avg_view_duration_seconds, completion_rate,
         click_through_rate, engagement_rate, profile_visits, website_clicks,
         subscribers_gained, metadata, created_at
       ) VALUES (
         @contentId, @platform, @metricDate, @views, @likes, @dislikes,
         @comments, @shares, @saves, @retweets, @quotes, @impressions, @reach,
         @watchTimeMinutes, @avgViewDuration, @completionRate,
         @clickThroughRate, @engagementRate, @profileVisits, @websiteClicks,
         @subscribersGained, @metadata, GETUTCDATE()
       );`,
      {
        contentId, platform, metricDate: dateOnly,
        views: metrics.views || 0,
        likes: metrics.likes || 0,
        dislikes: metrics.dislikes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        saves: metrics.saves || 0,
        retweets: metrics.retweets || 0,
        quotes: metrics.quotes || 0,
        impressions: metrics.impressions || 0,
        reach: metrics.reach || 0,
        watchTimeMinutes: metrics.watchTimeMinutes || 0,
        avgViewDuration: metrics.avgViewDurationSeconds || null,
        completionRate: metrics.completionRate || null,
        clickThroughRate: metrics.clickThroughRate || null,
        engagementRate: metrics.engagementRate || null,
        profileVisits: metrics.profileVisits || 0,
        websiteClicks: metrics.websiteClicks || 0,
        subscribersGained: metrics.subscribersGained || 0,
        metadata: JSON.stringify(metrics.additionalData || {})
      }
    );
  }

  // ============================================
  // TRACK FOLLOWER GROWTH: Daily Snapshot
  // ============================================
  async trackFollowerGrowth(
    socialAccountId: number,
    tenantId: number,
    platform: string,
    currentFollowers: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const yesterday = await this.sqlService.query(
      `SELECT TOP 1 followers_end 
       FROM creator_growth_tracking
       WHERE social_account_id = @socialAccountId
       ORDER BY tracking_date DESC`,
      { socialAccountId }
    );

    const followersStart = yesterday.length > 0 ? yesterday[0].followers_end : currentFollowers;
    const netGrowth = currentFollowers - followersStart;
    const growthRate = followersStart > 0 ? (netGrowth / followersStart) * 100 : 0;

    await this.sqlService.query(
      `MERGE INTO creator_growth_tracking AS target
       USING (SELECT @socialAccountId AS sid, @trackingDate AS td) AS source
       ON target.social_account_id = source.sid AND target.tracking_date = source.td
       WHEN MATCHED THEN UPDATE SET
         followers_end = @followersEnd, net_growth = @netGrowth, growth_rate = @growthRate
       WHEN NOT MATCHED THEN INSERT (
         tenant_id, social_account_id, platform, tracking_date,
         followers_start, followers_end, net_growth, growth_rate, created_at
       ) VALUES (
         @tenantId, @socialAccountId, @platform, @trackingDate,
         @followersStart, @followersEnd, @netGrowth, @growthRate, GETUTCDATE()
       );`,
      { tenantId, socialAccountId, platform, trackingDate: today, 
        followersStart, followersEnd: currentFollowers, netGrowth, growthRate }
    );
  }

  // ============================================
  // CALCULATE DERIVED METRICS
  // ============================================
  async calculateDerivedMetrics(contentId: number, followerCount: number): Promise<any> {
    const metrics = await this.sqlService.query(
      `SELECT TOP 1 views, likes, comments, shares, saves, impressions, reach
       FROM creator_content_metrics
       WHERE content_id = @contentId
       ORDER BY metric_date DESC`,
      { contentId }
    );

    if (metrics.length === 0) return null;

    const m = metrics[0];
    const totalEngagements = (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);

    return {
      engagementRate: {
        byFollowers: followerCount > 0 ? (totalEngagements / followerCount) * 100 : 0,
        byReach: m.reach > 0 ? (totalEngagements / m.reach) * 100 : 0,
        byImpressions: m.impressions > 0 ? (totalEngagements / m.impressions) * 100 : 0
      },
      viralityScore: m.reach && followerCount > 0 ? (m.reach / followerCount) * 100 : 0,
      shareRate: m.views > 0 ? (m.shares / m.views) * 100 : 0
    };
  }

  // ============================================
  // AUTHENTICITY SCORE
  // ============================================
  async calculateAuthenticityScore(socialAccountId: number): Promise<number> {
    const account = await this.sqlService.query(
      `SELECT sa.follower_count,
        AVG(cm.likes) as avg_likes,
        AVG(cm.comments) as avg_comments
       FROM creator_social_accounts sa
       LEFT JOIN creator_content c ON sa.id = c.social_account_id
       LEFT JOIN creator_content_metrics cm ON c.id = cm.content_id
       WHERE sa.id = @socialAccountId
       GROUP BY sa.follower_count`,
      { socialAccountId }
    );

    if (account.length === 0) return 50;

    const a = account[0];
    let score = 100;

    // Low engagement check
    const engagementRate = a.follower_count > 0 
      ? ((a.avg_likes + a.avg_comments) / a.follower_count) * 100 
      : 0;

    if (engagementRate < 1) score -= 30;
    else if (engagementRate < 2) score -= 15;

    // Comment-to-like ratio check
    const commentRatio = a.avg_likes > 0 ? (a.avg_comments / a.avg_likes) : 0;
    if (commentRatio < 0.02) score -= 20;

    return Math.max(0, Math.min(100, score));
  }
}