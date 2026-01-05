// src/modules/message-system/chat-notification.service.ts
import { Injectable, Logger,   } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { ModuleRef } from '@nestjs/core';
import type { ChatGateway } from './chat.gateway';

export enum ChatNotificationType {
  NEW_MESSAGE = 'chat.new_message',
  MENTION = 'chat.mention',
  REPLY = 'chat.reply',
  REACTION = 'chat.reaction',
  CHANNEL_INVITE = 'chat.channel_invite',
  CHANNEL_UPDATE = 'chat.channel_update',
  FILE_SHARED = 'chat.file_shared',
  THREAD_REPLY = 'chat.thread_reply',
}

@Injectable()
export class ChatNotificationService {
  private readonly logger = new Logger(ChatNotificationService.name);

  constructor(
    private sqlService: SqlServerService,
    private moduleRef: ModuleRef, // ✅ ADD: For lazy gateway access
  ) {}

  // ✅ ADD: Lazy gateway getter to avoid circular dependency
  private get gateway(): ChatGateway | null {
    try {
      return this.moduleRef.get('ChatGateway', { strict: false });
    } catch {
      return null;
    }
  }

  /**
   * ✅ UPDATED: Broadcast real-time notification
   */
  private async broadcastNotification(recipientId: number, notification: any) {
    try {
      const gateway = this.gateway;
      if (gateway?.server) {
        // Broadcast to user's socket(s)
        gateway['broadcastToUser'](recipientId, {
          event: 'notification',
          data: notification,
        });
        
        this.logger.debug(
          `🔔 Broadcasted ${notification.event_type} notification to user ${recipientId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to broadcast notification: ${error.message}`,
      );
    }
  }

  /**
   * Create notification for new message
   */
  async notifyNewMessage(params: {
    channelId: number;
    messageId: number;
    senderId: number;
    senderName: string;
    recipientIds: number[];
    tenantId: number;
    messagePreview: string;
    channelName: string;
  }): Promise<void> {
    try {
      for (const recipientId of params.recipientIds) {
        if (recipientId === params.senderId) continue;

        const isMuted = await this.isChannelMuted(params.channelId, recipientId);
        if (isMuted) continue;

        const notification = {
          recipientId,
          tenantId: params.tenantId,
          eventType: ChatNotificationType.NEW_MESSAGE,
          channel: 'in_app',
          subject: `New message in ${params.channelName}`,
          message: `${params.senderName}: ${params.messagePreview}`,
          data: {
            channelId: params.channelId,
            messageId: params.messageId,
            senderId: params.senderId,
          },
          priority: 'normal',
        };

        await this.createNotification(notification);
        
        // ✅ ADD: Broadcast real-time
        await this.broadcastNotification(recipientId, {
          id: null, // Will be set after DB insert
          event_type: notification.eventType,
          subject: notification.subject,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          read_at: null,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify new message: ${error.message}`);
    }
  }

  /**
   * Create notification for mention
   */
  async notifyMention(params: {
    channelId: number;
    messageId: number;
    senderId: number;
    senderName: string;
    mentionedUserId: number;
    tenantId: number;
    messagePreview: string;
    channelName: string;
  }): Promise<void> {
    try {
      const notification = {
        recipientId: params.mentionedUserId,
        tenantId: params.tenantId,
        eventType: ChatNotificationType.MENTION,
        channel: 'in_app',
        subject: `You were mentioned in ${params.channelName}`,
        message: `${params.senderName} mentioned you: ${params.messagePreview}`,
        data: {
          channelId: params.channelId,
          messageId: params.messageId,
          senderId: params.senderId,
        },
        priority: 'high',
      };

      await this.createNotification(notification);
      
      // ✅ ADD: Broadcast real-time
      await this.broadcastNotification(params.mentionedUserId, {
        id: null,
        event_type: notification.eventType,
        subject: notification.subject,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        read_at: null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to notify mention: ${error.message}`);
    }
  }

  /**
   * Create notification for thread reply
   */
  async notifyThreadReply(params: {
    channelId: number;
    messageId: number;
    threadId: number;
    senderId: number;
    senderName: string;
    recipientIds: number[];
    tenantId: number;
    messagePreview: string;
  }): Promise<void> {
    try {
      for (const recipientId of params.recipientIds) {
        if (recipientId === params.senderId) continue;

        const notification = {
          recipientId,
          tenantId: params.tenantId,
          eventType: ChatNotificationType.THREAD_REPLY,
          channel: 'in_app',
          subject: 'New reply in thread',
          message: `${params.senderName} replied: ${params.messagePreview}`,
          data: {
            channelId: params.channelId,
            messageId: params.messageId,
            threadId: params.threadId,
            senderId: params.senderId,
          },
          priority: 'normal',
        };

        await this.createNotification(notification);
        
        // ✅ ADD: Broadcast real-time
        await this.broadcastNotification(recipientId, {
          id: null,
          event_type: notification.eventType,
          subject: notification.subject,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          read_at: null,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify thread reply: ${error.message}`);
    }
  }

  /**
   * Create notification for channel invite
   */
  async notifyChannelInvite(params: {
    channelId: number;
    channelName: string;
    invitedUserId: number;
    invitedBy: number;
    inviterName: string;
    tenantId: number;
  }): Promise<void> {
    try {
      const notification = {
        recipientId: params.invitedUserId,
        tenantId: params.tenantId,
        eventType: ChatNotificationType.CHANNEL_INVITE,
        channel: 'in_app',
        subject: `You've been added to ${params.channelName}`,
        message: `${params.inviterName} added you to ${params.channelName}`,
        data: {
          channelId: params.channelId,
          invitedBy: params.invitedBy,
        },
        priority: 'high',
      };

      await this.createNotification(notification);
      
      // ✅ ADD: Broadcast real-time
      await this.broadcastNotification(params.invitedUserId, {
        id: null,
        event_type: notification.eventType,
        subject: notification.subject,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        read_at: null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to notify channel invite: ${error.message}`);
    }
  }

  /**
   * Create notification for reaction
   */
  async notifyReaction(params: {
    messageId: number;
    channelId: number;
    reactorId: number;
    reactorName: string;
    messageAuthorId: number;
    tenantId: number;
    emoji: string;
  }): Promise<void> {
    try {
      if (params.reactorId === params.messageAuthorId) return;

      const notification = {
        recipientId: params.messageAuthorId,
        tenantId: params.tenantId,
        eventType: ChatNotificationType.REACTION,
        channel: 'in_app',
        subject: 'Someone reacted to your message',
        message: `${params.reactorName} reacted with ${params.emoji}`,
        data: {
          channelId: params.channelId,
          messageId: params.messageId,
          reactorId: params.reactorId,
          emoji: params.emoji,
        },
        priority: 'low',
      };

      await this.createNotification(notification);
      
      // ✅ ADD: Broadcast real-time
      await this.broadcastNotification(params.messageAuthorId, {
        id: null,
        event_type: notification.eventType,
        subject: notification.subject,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        read_at: null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to notify reaction: ${error.message}`);
    }
  }

  /**
   * Base notification creation using stored procedure
   */
  private async createNotification(params: {
    recipientId: number;
    tenantId: number;
    eventType: string;
    channel: string;
    subject: string;
    message: string;
    data: any;
    priority: string;
  }): Promise<void> {
    try {
      await this.sqlService.execute('sp_CreateNotification', {
        recipient_id: params.recipientId,
        tenant_id: params.tenantId,
        event_type: params.eventType,
        channel: params.channel,
        subject: params.subject,
        message: params.message,
        data: JSON.stringify(params.data),
        priority: params.priority,
      });
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if channel is muted for user
   */
  private async isChannelMuted(channelId: number, userId: number): Promise<boolean> {
    try {
      const result = await this.sqlService.query(
        `SELECT is_muted, mute_until
         FROM chat_participants
         WHERE channel_id = @channelId
           AND user_id = @userId
           AND is_active = 1`,
        { channelId, userId }
      );

      if (result.length === 0) return false;

      const { is_muted, mute_until } = result[0];
      
      if (!is_muted) return false;
      
      if (mute_until && new Date(mute_until) < new Date()) {
        await this.sqlService.query(
          `UPDATE chat_participants
           SET is_muted = 0, mute_until = NULL
           WHERE channel_id = @channelId AND user_id = @userId`,
          { channelId, userId }
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to check mute status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const result = await this.sqlService.query(
        `SELECT COUNT(*) as count
         FROM notifications
         WHERE recipient_id = @userId
           AND read_at IS NULL
           AND event_type LIKE 'chat.%'`,
        { userId }
      );

      return result[0]?.count || 0;
    } catch (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: number[]): Promise<void> {
    try {
      if (notificationIds.length === 0) return;

      const ids = notificationIds.join(',');
      await this.sqlService.query(
        `UPDATE notifications
         SET read_at = GETUTCDATE()
         WHERE id IN (${ids})`,
        {}
      );
    } catch (error) {
      this.logger.error(`Failed to mark notifications as read: ${error.message}`);
    }
  }
}