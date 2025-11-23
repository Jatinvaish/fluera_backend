// src/modules/message-system/chat-activity.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';

export enum ChatActivityType {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_PINNED = 'message_pinned',
  MESSAGE_UNPINNED = 'message_unpinned',
  REACTION_ADDED = 'reaction_added',
  REACTION_REMOVED = 'reaction_removed',
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_UPDATED = 'channel_updated',
  CHANNEL_ARCHIVED = 'channel_archived',
  CHANNEL_UNARCHIVED = 'channel_unarchived',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_ROLE_CHANGED = 'member_role_changed',
  THREAD_STARTED = 'thread_started',
  THREAD_REPLIED = 'thread_replied',
  FILE_UPLOADED = 'file_uploaded',
  USER_MENTIONED = 'user_mentioned',
}

@Injectable()
export class ChatActivityService {
  private readonly logger = new Logger(ChatActivityService.name);

  constructor(private sqlService: SqlServerService) {}

  /**
   * Log chat activity to activities table
   */
  async logActivity(params: {
    tenantId: number;
    userId: number;
    activityType: ChatActivityType;
    subjectType: string; // 'message', 'channel', 'member'
    subjectId: number;
    action: string;
    description: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.sqlService.query(
        `INSERT INTO activities (
          tenant_id, user_id, activity_type, subject_type, subject_id,
          action, description, metadata, is_read, created_at, created_by
        )
        VALUES (
          @tenantId, @userId, @activityType, @subjectType, @subjectId,
          @action, @description, @metadata, 0, GETUTCDATE(), @userId
        )`,
        {
          tenantId: params.tenantId,
          userId: params.userId,
          activityType: params.activityType,
          subjectType: params.subjectType,
          subjectId: params.subjectId,
          action: params.action,
          description: params.description,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error.message}`);
      // Don't throw - activity logging should not break main functionality
    }
  }

  /**
   * Get recent activities for a channel
   */
  async getChannelActivities(
    channelId: number,
    userId: number,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await this.sqlService.query(
        `SELECT TOP (@limit)
          a.id,
          a.activity_type,
          a.subject_type,
          a.subject_id,
          a.action,
          a.description,
          a.metadata,
          a.created_at,
          u.first_name,
          u.last_name,
          u.avatar_url
        FROM activities a
        INNER JOIN users u ON a.user_id = u.id
        WHERE a.subject_type = 'channel'
          AND a.subject_id = @channelId
        ORDER BY a.created_at DESC`,
        { channelId, limit }
      );
    } catch (error) {
      this.logger.error(`Failed to get channel activities: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user's unread activities
   */
  async getUserUnreadActivities(userId: number, limit: number = 50): Promise<any[]> {
    try {
      return await this.sqlService.query(
        `SELECT TOP (@limit)
          a.id,
          a.activity_type,
          a.subject_type,
          a.subject_id,
          a.action,
          a.description,
          a.metadata,
          a.created_at,
          u.first_name,
          u.last_name,
          u.avatar_url
        FROM activities a
        INNER JOIN users u ON a.user_id = u.id
        WHERE a.user_id = @userId
          AND a.is_read = 0
          AND a.activity_type LIKE 'message_%' OR a.activity_type LIKE 'channel_%'
        ORDER BY a.created_at DESC`,
        { userId, limit }
      );
    } catch (error) {
      this.logger.error(`Failed to get unread activities: ${error.message}`);
      return [];
    }
  }

  /**
   * Mark activities as read
   */
  async markActivitiesAsRead(activityIds: number[]): Promise<void> {
    try {
      if (activityIds.length === 0) return;

      const ids = activityIds.join(',');
      await this.sqlService.query(
        `UPDATE activities
         SET is_read = 1, read_at = GETUTCDATE()
         WHERE id IN (${ids})`,
        {}
      );
    } catch (error) {
      this.logger.error(`Failed to mark activities as read: ${error.message}`);
    }
  }
}