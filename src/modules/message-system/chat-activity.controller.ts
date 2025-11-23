// src/modules/message-system/chat-activity.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  ParseIntPipe 
} from '@nestjs/common';
import { CurrentUser, TenantId, Unencrypted } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards';
import { ChatActivityService } from './chat-activity.service';
import { ChatNotificationService } from './chat-notification.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Chat Activities & Notifications')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@Unencrypted()
@ApiBearerAuth()
export class ChatActivityController {
  constructor(
    private activityService: ChatActivityService,
    private notificationService: ChatNotificationService,
  ) {}

  // ==================== ACTIVITIES ====================

  @Get('activities/channel/:channelId')
  @ApiOperation({ summary: 'Get channel activities' })
  async getChannelActivities(
    @Query('channelId', ParseIntPipe) channelId: number,
    @Query('limit') limit: number = 50,
    @CurrentUser('id') userId: number,
  ) {
    const activities = await this.activityService.getChannelActivities(
      channelId,
      userId,
      +limit,
    );

    return {
      success: true,
      data: activities,
      total: activities.length,
    };
  }

  @Get('activities/unread')
  @ApiOperation({ summary: 'Get unread activities' })
  async getUnreadActivities(
    @Query('limit') limit: number = 50,
    @CurrentUser('id') userId: number,
  ) {
    const activities = await this.activityService.getUserUnreadActivities(
      userId,
      +limit,
    );

    return {
      success: true,
      data: activities,
      total: activities.length,
    };
  }

  @Post('activities/mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark activities as read' })
  async markActivitiesAsRead(
    @Body('activityIds') activityIds: number[],
  ) {
    await this.activityService.markActivitiesAsRead(activityIds);

    return {
      success: true,
      message: 'Activities marked as read',
    };
  }

  // ==================== NOTIFICATIONS ====================

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadNotificationsCount(
    @CurrentUser('id') userId: number,
  ) {
    const count = await this.notificationService.getUnreadCount(userId);

    return {
      success: true,
      data: { count },
    };
  }

  @Post('notifications/mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  async markNotificationsAsRead(
    @Body('notificationIds') notificationIds: number[],
  ) {
    await this.notificationService.markAsRead(notificationIds);

    return {
      success: true,
      message: 'Notifications marked as read',
    };
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @Query('limit') limit: number = 50,
    @Query('page') page: number = 1,
    @CurrentUser('id') userId: number,
  ) {
    // You can implement pagination here
    // For now, returning simple query
    const notifications = await this.notificationService['sqlService'].query(
      `SELECT TOP (@limit) 
        id,
        event_type,
        channel,
        subject,
        message,
        data,
        priority,
        read_at,
        created_at
      FROM notifications
      WHERE recipient_id = @userId
        AND event_type LIKE 'chat.%'
      ORDER BY created_at DESC
      OFFSET @offset ROWS`,
      {
        userId,
        limit: +limit,
        offset: ((+page) - 1) * (+limit),
      }
    );

    return {
      success: true,
      data: notifications,
      page: +page,
      limit: +limit,
      total: notifications.length,
    };
  }

  // ==================== NOTIFICATION PREFERENCES ====================

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getNotificationPreferences(
    @CurrentUser('id') userId: number,
  ) {
    const preferences = await this.notificationService['sqlService'].query(
      `SELECT *
       FROM notification_preferences
       WHERE user_id = @userId
         AND event_type LIKE 'chat.%'`,
      { userId }
    );

    return {
      success: true,
      data: preferences,
    };
  }

  @Post('notifications/preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotificationPreferences(
    @Body() preferences: {
      eventType: string;
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
      inAppEnabled?: boolean;
    },
    @CurrentUser('id') userId: number,
  ) {
    await this.notificationService['sqlService'].query(
      `MERGE notification_preferences AS target
       USING (SELECT @userId AS user_id, @eventType AS event_type) AS source
       ON (target.user_id = source.user_id AND target.event_type = source.event_type)
       WHEN MATCHED THEN
         UPDATE SET 
           email_enabled = @emailEnabled,
           sms_enabled = @smsEnabled,
           push_enabled = @pushEnabled,
           in_app_enabled = @inAppEnabled,
           updated_at = GETUTCDATE()
       WHEN NOT MATCHED THEN
         INSERT (user_id, event_type, email_enabled, sms_enabled, push_enabled, in_app_enabled, created_at)
         VALUES (@userId, @eventType, @emailEnabled, @smsEnabled, @pushEnabled, @inAppEnabled, GETUTCDATE());`,
      {
        userId,
        eventType: preferences.eventType,
        emailEnabled: preferences.emailEnabled ?? true,
        smsEnabled: preferences.smsEnabled ?? false,
        pushEnabled: preferences.pushEnabled ?? true,
        inAppEnabled: preferences.inAppEnabled ?? true,
      }
    );

    return {
      success: true,
      message: 'Notification preferences updated',
    };
  }
}