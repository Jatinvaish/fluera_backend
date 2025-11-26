// ============================================
// src/modules/message-system/chat.gateway.ts
// ENHANCED WITH REAL-TIME REACTIONS, DELIVERY, THREADS
// ============================================
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { EnrichedMessageResponse, MessageDeliveryDto, MessageReadStatus, SendMessageDto } from './dto/chat.dto';

interface AuthSocket extends Socket {
  userId: number;
  tenantId: number;
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  perMessageDeflate: false,
  allowEIO3: true,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  private userSockets = new Map<number, Set<string>>();
  private channelMembers = new Map<number, Set<number>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  // ==================== BULK READ ====================
  @SubscribeMessage('bulk_mark_as_read')
  async handleBulkMarkAsRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number; upToMessageId: number }
  ) {
    try {
      await this.chatService.bulkMarkAsRead(data.channelId, client.userId, data.upToMessageId);

      // ✅ Notify channel of bulk read
      this.broadcastToChannel(data.channelId, {
        event: 'bulk_read_update',
        channelId: data.channelId,
        userId: client.userId,
        upToMessageId: data.upToMessageId,
        timestamp: new Date().toISOString(),
      }, client.userId);

      return { success: true };
    } catch (error) {
      this.logger.error('Bulk mark as read error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== MESSAGE EDITING ====================
  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: {
      messageId: number;
      content: string;
      channelId: number;
      mentions?: number[];
    }
  ) {
    try {
      await this.chatService.editMessage(data.messageId, data.content, client.userId);

      // ✅ Broadcast message edit
      await this.broadcastToChannel(data.channelId, {
        event: 'message_edited',
        messageId: data.messageId,
        content: data.content,
        mentions: data.mentions,
        editedBy: client.userId,
        editedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Edit message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: number; channelId: number }
  ) {
    try {
      await this.chatService.deleteMessage(data.messageId, client.userId);

      // ✅ Broadcast message deletion
      await this.broadcastToChannel(data.channelId, {
        event: 'message_deleted',
        messageId: data.messageId,
        deletedBy: client.userId,
        deletedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Delete message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== MESSAGE PINNING ====================
  @SubscribeMessage('pin_message')
  async handlePinMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: number; channelId: number; isPinned: boolean }
  ) {
    try {
      await this.chatService.pinMessage(data.messageId, data.isPinned, client.userId);

      // ✅ Broadcast pin status change
      await this.broadcastToChannel(data.channelId, {
        event: data.isPinned ? 'message_pinned' : 'message_unpinned',
        messageId: data.messageId,
        pinnedBy: client.userId,
        pinnedByName: `${client.user.firstName} ${client.user.lastName}`,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Pin message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== CONNECTION HANDLING ====================
  async handleConnection(client: AuthSocket) {
    try {
      let token = client.handshake.auth?.token;

      if (!token && client.handshake.headers.authorization) {
        token = client.handshake.headers.authorization.replace('Bearer ', '');
      }

      if (!token && client.handshake.query?.token) {
        token = client.handshake.query.token as string;
      }

      if (!token) {
        this.logger.warn(`Connection rejected - No token provided`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const jwtSecret = this.configService.get<string>('jwt.secret');

      if (!jwtSecret) {
        this.logger.error('JWT_SECRET not configured!');
        client.emit('error', { message: 'Server configuration error' });
        client.disconnect();
        return;
      }

      let user;
      try {
        user = this.jwtService.verify(token, {
          secret: jwtSecret,
          issuer: this.configService.get<string>('jwt.issuer'),
          audience: this.configService.get<string>('jwt.audience'),
        });
      } catch (verifyError) {
        this.logger.error(`Token verification failed: ${verifyError.message}`);
        client.emit('error', { message: 'Invalid or expired token' });
        client.disconnect();
        return;
      }

      if (!user || (!user.sub && !user.id)) {
        this.logger.warn('Token valid but no user ID found');
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      client.userId = user.sub || user.id;
      client.tenantId = user.tenantId || null;
      client.user = user;

      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      await this.joinUserChannels(client);

      client.emit('connected', {
        userId: client.userId,
        tenantId: client.tenantId,
        timestamp: new Date().toISOString()
      });

      this.logger.log(`✅ User ${client.userId} connected (Socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      client.emit('error', { message: 'Connection failed: ' + error.message });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(`User ${client.userId} disconnected (Socket: ${client.id})`);
    } else {
      this.logger.log(`Unknown user disconnected (Socket: ${client.id})`);
    }
  }

  // ==================== HELPER METHODS ====================
  /**
   * ✅ Broadcast message to all members of a channel
   */
  private async broadcastToChannel(
    channelId: number,
    payload: any,
    excludeUserId?: number
  ): Promise<void> {
    let members = this.channelMembers.get(channelId);

    if (!members || members.size === 0) {
      try {
        const result = await this.chatService['sqlService'].execute(
          'sp_GetChannelMembers_Fast',
          { channelId }
        );
        members = new Set(result.map((r: any) => r.user_id));
        this.channelMembers.set(channelId, members);
      } catch (error) {
        this.logger.error(`Failed to get channel members: ${error.message}`);
        return;
      }
    }

    members.forEach(userId => {
      if (excludeUserId && userId === excludeUserId) return;

      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.forEach(socketId => {
          this.server.to(socketId).emit('message', payload);
        });
      }
    });
  }

  /**
   * ✅ Broadcast message to specific user (all their sockets)
   */
  private broadcastToUser(userId: number, payload: any): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('message', payload);
      });
    }
  }

  /**
   * ✅ Join user to all their channels
   */
  private async joinUserChannels(client: AuthSocket) {
    try {
      const channels = await this.chatService.getUserChannels(client.userId);

      channels.forEach((ch: any) => {
        const channelRoom = `channel-${ch.channel_id}`;
        client.join(channelRoom);

        if (!this.channelMembers.has(ch.channel_id)) {
          this.channelMembers.set(ch.channel_id, new Set());
        }
        this.channelMembers.get(ch.channel_id)!.add(client.userId);
      });

      this.logger.log(`User ${client.userId} joined ${channels.length} channels`);
    } catch (error) {
      this.logger.error(`Failed to join channels: ${error.message}`);
    }
  }

  // ==================== DELIVERY TRACKING ====================
  @SubscribeMessage('mark_as_delivered')
  async handleMarkAsDelivered(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: MessageDeliveryDto
  ) {
    try {
      await this.chatService.markAsDelivered(data.messageId, client.userId);

      // ✅ Get status with proper typing
      const status: MessageReadStatus = await this.chatService.getMessageReadStatus(
        data.messageId
      );

      // ✅ Get message with proper typing
      const message: EnrichedMessageResponse = await this.chatService.getMessage(
        data.messageId
      );

      // ✅ Notify sender with typed payload
      this.broadcastToUser(message.sender_user_id, {
        event: 'message_delivered',
        messageId: data.messageId,
        deliveredBy: client.userId,
        deliveredCount: status.deliveredCount,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Mark as delivered error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== SEND MESSAGE ====================
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: SendMessageDto
  ) {
    const start = Date.now();

    try {
      const message = await this.chatService.sendMessage(
        data,
        client.userId,
        client.tenantId
      );

      // ✅ Broadcast with complete message object including sender info
      const broadcastPayload = {
        event: 'new_message',
        message: {
          ...message,
          // Ensure sender info is always included
          sender_first_name: message.sender_first_name || client.user.firstName,
          sender_last_name: message.sender_last_name || client.user.lastName,
          sender_avatar_url: message.sender_avatar_url || client.user.avatarUrl,
        },
      };

      await this.broadcastToChannel(data.channelId, broadcastPayload);

      // Handle mentions
      if (data.mentions && data.mentions.length > 0) {
        for (const mentionedUserId of data.mentions) {
          this.broadcastToUser(mentionedUserId, {
            event: 'user_mentioned',
            channelId: data.channelId,
            messageId: message.id,
            mentionedBy: client.userId,
            mentionedByName: `${client.user.firstName} ${client.user.lastName}`,
            messagePreview: data.content.substring(0, 100),
            timestamp: new Date().toISOString(),
          });
        }
      }

      return {
        success: true,
        messageId: message.id,
        latency: Date.now() - start
      };
    } catch (error) {
      this.logger.error('Send message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== TYPING INDICATORS ====================
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number }
  ) {
    if (!data.channelId) return;

    this.broadcastToChannel(data.channelId, {
      event: 'user_typing',
      channelId: data.channelId,
      userId: client.userId,
      userName: `${client.user.firstName} ${client.user.lastName}`,
      isTyping: true,
    }, client.userId); // Exclude sender
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number }
  ) {
    if (!data.channelId) return;

    this.broadcastToChannel(data.channelId, {
      event: 'user_typing',
      channelId: data.channelId,
      userId: client.userId,
      isTyping: false,
    }, client.userId);
  }

  // ==================== REACTIONS ====================
  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: number; emoji: string; channelId: number }
  ) {
    try {
      const result = await this.chatService.addReaction(
        data.messageId,
        client.userId,
        client.tenantId,
        data.emoji
      );

      if (result.success) {
        // ✅ Broadcast reaction with user info
        await this.broadcastToChannel(data.channelId, {
          event: 'reaction_added',
          messageId: data.messageId,
          emoji: data.emoji,
          userId: client.userId,
          userName: `${client.user.firstName} ${client.user.lastName}`,
          avatarUrl: client.user.avatarUrl,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Add reaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: number; emoji: string; channelId: number }
  ) {
    try {
      await this.chatService.removeReaction(data.messageId, client.userId, data.emoji);

      // ✅ Broadcast reaction removal
      await this.broadcastToChannel(data.channelId, {
        event: 'reaction_removed',
        messageId: data.messageId,
        emoji: data.emoji,
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Remove reaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== THREAD REPLIES (FIXED) ====================
  @SubscribeMessage('thread_reply')
  async handleThreadReply(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: {
      parentMessageId: number;
      content: string;
      channelId: number;
      mentions?: number[];
    }
  ) {
    try {
      // ✅ FIX: replyInThread now returns EnrichedMessageResponse with all sender fields
      const reply: EnrichedMessageResponse = await this.chatService.replyInThread(
        data.parentMessageId,
        data.content,
        client.userId,
        client.tenantId
      );

      // ✅ Broadcast thread reply with complete info
      await this.broadcastToChannel(data.channelId, {
        event: 'thread_reply',
        parentMessageId: data.parentMessageId,
        message: {
          ...reply,
          // These fields now come from the database query in replyInThread
          sender_first_name: reply.sender_first_name,
          sender_last_name: reply.sender_last_name,
          sender_avatar_url: reply.sender_avatar_url,
        },
        timestamp: new Date().toISOString(),
      });

      // Handle mentions in thread
      if (data.mentions && data.mentions.length > 0) {
        for (const mentionedUserId of data.mentions) {
          this.broadcastToUser(mentionedUserId, {
            event: 'mentioned_in_thread',
            channelId: data.channelId,
            messageId: reply.id,
            parentMessageId: data.parentMessageId,
            mentionedBy: client.userId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return { success: true, messageId: reply.id };
    } catch (error) {
      this.logger.error('Thread reply error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== MEMBER INVITATION ====================
  @SubscribeMessage('invite_members')
  async handleInviteMembers(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number; userIds: number[] }
  ) {
    try {
      await this.chatService.addMembers(
        data.channelId,
        data.userIds,
        client.userId,
        client.tenantId
      );

      const channel = await this.chatService.getChannelById(data.channelId, client.userId);

      // Notify new members
      for (const userId of data.userIds) {
        this.broadcastToUser(userId, {
          event: 'member_invited',
          channelId: data.channelId,
          channelName: channel.name,
          invitedBy: client.userId,
          inviterName: `${client.user.firstName} ${client.user.lastName}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Notify existing channel members
      await this.broadcastToChannel(data.channelId, {
        event: 'members_added',
        channelId: data.channelId,
        userIds: data.userIds,
        addedBy: client.userId,
        timestamp: new Date().toISOString(),
      }, client.userId);

      return { success: true };
    } catch (error) {
      this.logger.error('Invite members error:', error.message);
      return { success: false, error: error.message };
    }
  }
}