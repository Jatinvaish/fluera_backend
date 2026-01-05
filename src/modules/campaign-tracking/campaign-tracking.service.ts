// src/modules/campaigns/campaign-tracking.service.ts
import { Injectable } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';

/**
 * Campaign tracking using EXISTING tables + metadata JSON
 * No new tables needed!
 */
@Injectable()
export class CampaignTrackingService {
  constructor(private sqlService: SqlServerService) {}

  /**
   * Tag content as part of a brand campaign
   * Uses creator_content.metadata field
   */
  async tagContentAsCampaign(dto: {
    contentId: number;
    brandName: string;
    campaignName: string;
    campaignType: string; // 'sponsored_post', 'brand_ambassador', 'affiliate'
    compensationAmount?: number;
    compensationType?: string;
    notes?: string;
    userId: number;
  }) {
    // Get existing metadata
    const content = await this.sqlService.query(
      'SELECT metadata FROM creator_content WHERE id = @id',
      { id: dto.contentId }
    );

    let metadata = {};
    if (content[0]?.metadata) {
      try {
        metadata = JSON.parse(content[0].metadata);
      } catch (e) {
        metadata = {};
      }
    }

    // Add campaign info
    metadata['campaign'] = {
      brandName: dto.brandName,
      campaignName: dto.campaignName,
      campaignType: dto.campaignType,
      compensationAmount: dto.compensationAmount,
      compensationType: dto.compensationType,
      taggedAt: new Date().toISOString(),
      taggedBy: dto.userId,
      notes: dto.notes
    };

    // Update content
    await this.sqlService.query(
      `UPDATE creator_content 
       SET metadata = @metadata, 
           is_sponsored = 1,
           updated_at = GETUTCDATE(),
           updated_by = @userId
       WHERE id = @id`,
      {
        id: dto.contentId,
        metadata: JSON.stringify(metadata),
        userId: dto.userId
      }
    );

    return { success: true };
  }

  /**
   * Get all campaign-tagged content for a creator
   */
  async getCampaignContent(dto: {
    creatorProfileId: number;
    brandName?: string;
    campaignName?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    let query = `
      SELECT 
        c.id,
        c.platform,
        c.content_id,
        c.content_type,
        c.title,
        c.content_url,
        c.thumbnail_url,
        c.published_at,
        c.metadata,
        sa.username as account_username,
        sa.platform,
        -- Aggregate metrics
        SUM(cm.views) as total_views,
        SUM(cm.likes) as total_likes,
        SUM(cm.comments) as total_comments,
        SUM(cm.shares) as total_shares,
        AVG(cm.engagement_rate) as avg_engagement_rate
      FROM creator_content c
      JOIN creator_social_accounts sa ON c.social_account_id = sa.id
      LEFT JOIN creator_content_metrics cm ON c.id = cm.content_id
      WHERE sa.creator_profile_id = @creatorProfileId
        AND c.is_sponsored = 1
    `;

    const params: any = { creatorProfileId: dto.creatorProfileId };

    if (dto.startDate) {
      query += ' AND c.published_at >= @startDate';
      params.startDate = dto.startDate;
    }

    if (dto.endDate) {
      query += ' AND c.published_at <= @endDate';
      params.endDate = dto.endDate;
    }

    query += ` 
      GROUP BY c.id, c.platform, c.content_id, c.content_type, c.title,
               c.content_url, c.thumbnail_url, c.published_at, c.metadata,
               sa.username, sa.platform
      ORDER BY c.published_at DESC
    `;

    const results = await this.sqlService.query(query, params);

    // Parse metadata and filter by campaign name/brand if provided
    let filtered = results.map(row => {
      let campaign = null;
      if (row.metadata) {
        try {
          const meta = JSON.parse(row.metadata);
          campaign = meta.campaign || null;
        } catch (e) {}
      }
      return { ...row, campaign };
    });

    if (dto.brandName) {
      filtered = filtered.filter(r => 
        r.campaign?.brandName?.toLowerCase().includes(dto && dto?.brandName?.toLowerCase())
      );
    }

    if (dto.campaignName) {
      filtered = filtered.filter(r => 
        r.campaign?.campaignName?.toLowerCase().includes(dto && dto?.campaignName?.toLowerCase())
      );
    }

    return {
      success: true,
      content: filtered,
      summary: this.calculateCampaignSummary(filtered)
    };
  }

  /**
   * Get campaign report for brand collaboration
   */
  async getCampaignReport(dto: {
    creatorProfileId: number;
    brandName: string;
    campaignName: string;
  }) {
    const data = await this.getCampaignContent(dto);

    const report = {
      campaign: {
        brandName: dto.brandName,
        campaignName: dto.campaignName,
        creatorProfileId: dto.creatorProfileId
      },
      summary: data.summary,
      contentBreakdown: this.groupByPlatform(data.content),
      timeline: this.createTimeline(data.content),
      topPerformingContent: this.getTopContent(data.content, 5)
    };

    return { success: true, report };
  }

  /**
   * Track campaign using creator_metrics table
   * Store campaign summary metrics
   */
  async saveCampaignMetrics(dto: {
    creatorProfileId: number;
    brandName: string;
    campaignName: string;
    metricDate: Date;
    totalContent: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
  }) {
    const tenantId = await this.getTenantIdFromCreator(dto.creatorProfileId);

    // Use metadata field to store campaign details
    const metadata = JSON.stringify({
      campaignType: 'brand_collaboration',
      brandName: dto.brandName,
      campaignName: dto.campaignName,
      totalContent: dto.totalContent
    });

    await this.sqlService.query(
      `INSERT INTO creator_metrics (
        tenant_id, creator_profile_id, metric_date,
        views, likes, comments, shares, 
        engagement_rate, metadata, created_at
      ) VALUES (
        @tenantId, @creatorProfileId, @metricDate,
        @views, @likes, @comments, @shares,
        @engagementRate, @metadata, GETUTCDATE()
      )`,
      {
        tenantId,
        creatorProfileId: dto.creatorProfileId,
        metricDate: dto.metricDate,
        views: dto.totalViews,
        likes: dto.totalLikes,
        comments: dto.totalComments,
        shares: dto.totalShares,
        engagementRate: dto.avgEngagementRate,
        metadata
      }
    );

    return { success: true };
  }

  // Helper methods
  private calculateCampaignSummary(content: any[]) {
    return {
      totalPosts: content.length,
      totalViews: content.reduce((sum, c) => sum + (c.total_views || 0), 0),
      totalLikes: content.reduce((sum, c) => sum + (c.total_likes || 0), 0),
      totalComments: content.reduce((sum, c) => sum + (c.total_comments || 0), 0),
      totalShares: content.reduce((sum, c) => sum + (c.total_shares || 0), 0),
      avgEngagementRate: content.length > 0
        ? content.reduce((sum, c) => sum + (c.avg_engagement_rate || 0), 0) / content.length
        : 0
    };
  }

  private groupByPlatform(content: any[]) {
    const grouped = {};
    content.forEach(item => {
      if (!grouped[item.platform]) {
        grouped[item.platform] = {
          platform: item.platform,
          postCount: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0
        };
      }
      grouped[item.platform].postCount++;
      grouped[item.platform].totalViews += item.total_views || 0;
      grouped[item.platform].totalLikes += item.total_likes || 0;
      grouped[item.platform].totalComments += item.total_comments || 0;
    });
    return Object.values(grouped);
  }

  private createTimeline(content: any[]) {
    const timeline = {};
    content.forEach(item => {
      const date = new Date(item.published_at).toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = { date, posts: 0, views: 0, engagement: 0 };
      }
      timeline[date].posts++;
      timeline[date].views += item.total_views || 0;
      timeline[date].engagement += item.total_likes + item.total_comments;
    });
    return Object.values(timeline).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private getTopContent(content: any[], limit: number) {
    return content
      .sort((a, b) => (b.total_views || 0) - (a.total_views || 0))
      .slice(0, limit)
      .map(c => ({
        id: c.id,
        platform: c.platform,
        title: c.title,
        url: c.content_url,
        views: c.total_views,
        likes: c.total_likes,
        engagementRate: c.avg_engagement_rate
      }));
  }

  private async getTenantIdFromCreator(creatorProfileId: number): Promise<number> {
    const result = await this.sqlService.query(
      'SELECT tenant_id FROM creator_profiles WHERE id = @id',
      { id: creatorProfileId }
    );
    return result[0]?.tenant_id;
  }
}