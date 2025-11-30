// ============================================
// src/modules/message-system/chat.gateway.ts
// SOCKET.IO COMPATIBLE - NO BREAKING CHANGES
// ============================================
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit
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
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST']
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8,
  allowEIO3: true,
  cookie: false,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  private userSockets = new Map<number, Set<string>>();
  private channelMembers = new Map<number, Set<number>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  // ==================== GATEWAY INITIALIZATION ====================
  afterInit(server: Server) {
    this.logger.log('🚀 Socket.IO Gateway initialized');
    this.logger.log(`📡 Namespace: /chat`);
    this.logger.log(`🔗 Transports: websocket, polling`);
  }

  // ==================== CONNECTION HANDLING ====================
  async handleConnection(client: AuthSocket) {
    try {
      this.logger.log(`🔌 New connection attempt: ${client.id}`);

      // Extract token from multiple sources
      let token = client.handshake.auth?.token;

      if (!token && client.handshake.headers.authorization) {

        token = client.handshake.headers.authorization.replace('Bearer ', '');
      }

      if (!token && client.handshake.query?.token) {
        token = client.handshake.query.token as string;
      }

      if (!token) {
        this.logger.warn(`❌ Connection rejected - No token provided (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const jwtSecret = this.configService.get<string>('jwt.secret');

      if (!jwtSecret) {
        this.logger.error('❌ JWT_SECRET not configured!');
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
        this.logger.error(`❌ Token verification failed: ${verifyError.message}`);
        client.emit('error', { message: 'Invalid or expired token' });
        client.disconnect();
        return;
      }

      if (!user || (!user.sub && !user.id)) {
        this.logger.warn('❌ Token valid but no user ID found');
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

      // ✅ Emit connected event (Socket.IO style)
      client.emit('connected', {
        userId: client.userId,
        tenantId: client.tenantId,
        timestamp: new Date().toISOString(),
        socketId: client.id
      });

      this.logger.log(`✅ User ${client.userId} connected (Socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`, error.stack);
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
          this.logger.log(`👋 User ${client.userId} fully disconnected`);
        } else {
          this.logger.log(`🔌 User ${client.userId} disconnected (Socket: ${client.id}), ${sockets.size} connections remaining`);
        }
      }
    } else {
      this.logger.log(`🔌 Unknown user disconnected (Socket: ${client.id})`);
    }
  }

  // ==================== SEND MESSAGE ====================
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: SendMessageDto
  ) {
    console.log("🚀 ~ ChatGateway ~ handleSendMessage ~ data:", data)
    const start = Date.now();

    try {
      this.logger.log(`📤 Message from User ${client.userId} to Channel ${data.channelId}`);

      const message = await this.chatService.sendMessage(
        data,
        client.userId,
        client.tenantId
      );

      const broadcastPayload = {
        event: 'new_message',
        message: {
          ...message,
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

      const response = {
        success: true,
        messageId: message.id,
        latency: Date.now() - start
      };

      this.logger.log(`✅ Message sent: ${message.id} (${response.latency}ms)`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Send message error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== TYPING INDICATORS ====================

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number }
  ) {
    const payload = Array.isArray(data) ? data[0] : data;

    if (!payload?.channelId) {
      this.logger.warn('Invalid typing_start data');
      return;
    }

    // ✅ Get user display name from service
    const userName = await this.chatService.getUserDisplayName(client.userId);

    this.logger.log(`⌨️ User ${client.userId} (${userName}) started typing in channel ${payload.channelId}`);

    this.broadcastToChannel(payload.channelId, {
      event: 'user_typing',
      channelId: payload.channelId,
      userId: client.userId.toString(),
      userName: userName,
      isTyping: true,
    }, client.userId);

    return { success: true };
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number }
  ) {
    const payload = Array.isArray(data) ? data[0] : data;

    if (!payload?.channelId) return;

    this.logger.log(`⌨️ User ${client.userId} stopped typing in channel ${payload.channelId}`);

    this.broadcastToChannel(payload.channelId, {
      event: 'user_typing',
      channelId: payload.channelId,
      userId: client.userId.toString(),
      isTyping: false,
    }, client.userId);

    return { success: true };
  }

  // ==================== REACTIONS ====================
  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: number; emoji: string; channelId: number }
  ) {
    try {
      this.logger.log(`👍 User ${client.userId} adding reaction ${data.emoji} to message ${data.messageId}`);

      const result = await this.chatService.addReaction(
        data.messageId,
        client.userId,
        client.tenantId,
        data.emoji
      );
      const payload = Array.isArray(data) ? data[0] : data;
      const userName = await this.chatService.getUserDisplayName(client.userId);
      this.logger.log(`⌨️ User ${client.userId} (${userName}) started typing in channel ${payload.channelId}`);

      if (result.success) {
        await this.broadcastToChannel(data.channelId, {
          event: 'reaction_added',
          messageId: data.messageId,
          channelId: data.channelId,
          emoji: data.emoji,
          userId: client.userId,
          userName: `${userName}`,
          avatarUrl: client.user.avatarUrl,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Add reaction error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: number; emoji: string; channelId: number }
  ) {
    try {
      this.logger.log(`👎 User ${client.userId} removing reaction ${data.emoji} from message ${data.messageId}`);

      await this.chatService.removeReaction(data.messageId, client.userId, data.emoji);

      await this.broadcastToChannel(data.channelId, {
        event: 'reaction_removed',
        messageId: data.messageId,
        channelId: data.channelId,
        emoji: data.emoji,
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Remove reaction error: ${error.message}`);
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
      this.logger.log(`✏️ User ${client.userId} editing message ${data.messageId}`);

      await this.chatService.editMessage(data.messageId, data.content, client.userId);

      await this.broadcastToChannel(data.channelId, {
        event: 'message_edited',
        messageId: data.messageId,
        channelId: data.channelId,
        content: data.content,
        mentions: data.mentions,
        editedBy: client.userId,
        editedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Edit message error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: number; channelId: number }
  ) {
    try {
      this.logger.log(`🗑️ User ${client.userId} deleting message ${data.messageId}`);

      await this.chatService.deleteMessage(data.messageId, client.userId);

      await this.broadcastToChannel(data.channelId, {
        event: 'message_deleted',
        messageId: data.messageId,
        channelId: data.channelId,
        deletedBy: client.userId,
        deletedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Delete message error: ${error.message}`);
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
      this.logger.log(`📌 User ${client.userId} ${data.isPinned ? 'pinning' : 'unpinning'} message ${data.messageId}`);

      await this.chatService.pinMessage(data.messageId, data.isPinned, client.userId);
      const payload = Array.isArray(data) ? data[0] : data;
      const userName = await this.chatService.getUserDisplayName(client.userId);
      this.logger.log(`⌨️ User ${client.userId} (${userName}) started typing in channel ${payload.channelId}`);

      await this.broadcastToChannel(data.channelId, {
        event: data.isPinned ? 'message_pinned' : 'message_unpinned',
        messageId: data.messageId,
        channelId: data.channelId,
        pinnedBy: client.userId,
        pinnedByName: `${userName}`,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Pin message error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== THREAD REPLIES ====================
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
      this.logger.log(`🧵 User ${client.userId} replying to thread ${data.parentMessageId}`);

      const reply: EnrichedMessageResponse = await this.chatService.replyInThread(
        data.parentMessageId,
        data.content,
        client.userId,
        client.tenantId
      );

      await this.broadcastToChannel(data.channelId, {
        event: 'thread_reply',
        parentMessageId: data.parentMessageId,
        channelId: data.channelId,
        message: {
          ...reply,
          sender_first_name: reply.sender_first_name,
          sender_last_name: reply.sender_last_name,
          sender_avatar_url: reply.sender_avatar_url,
        },
        timestamp: new Date().toISOString(),
      });

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
      this.logger.error(`❌ Thread reply error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== DELIVERY & READ RECEIPTS ====================
  @SubscribeMessage('mark_as_delivered')
  async handleMarkAsDelivered(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: MessageDeliveryDto
  ) {
    try {
      await this.chatService.markAsDelivered(data.messageId, client.userId);

      const status: MessageReadStatus = await this.chatService.getMessageReadStatus(
        data.messageId
      );

      const message: EnrichedMessageResponse = await this.chatService.getMessage(
        data.messageId
      );

      this.broadcastToUser(message.sender_user_id, {
        event: 'message_delivered',
        messageId: data.messageId,
        deliveredBy: client.userId,
        deliveredCount: status.deliveredCount,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Mark as delivered error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: any
  ) {
    try {
      // Handle if data is an array (take first element)
      const payload = Array.isArray(data) ? data[0] : data;
      console.log("🚀 ~ ChatGateway ~ handleMarkAsRead ~ payload:", payload)

      if (!payload?.messageId || !payload?.channelId) {
        this.logger.warn(`❌ Invalid mark_as_read data: ${JSON.stringify(data)}`);
        return { success: false, error: 'Invalid data format' };
      }

      const messageId = payload.messageId;
      const channelId = typeof payload.channelId === 'string'
        ? parseInt(payload.channelId)
        : payload.channelId;

      await this.chatService.markAsRead(channelId, client.userId, messageId);

      const status: MessageReadStatus = await this.chatService.getMessageReadStatus(messageId);
      const message: EnrichedMessageResponse = await this.chatService.getMessage(messageId);
      const userName = await this.chatService.getUserDisplayName(client.userId);

      this.broadcastToUser(message.sender_user_id, {
        event: 'message_read',
        messageId: messageId,
        readBy: client.userId,
        readByName: `${userName}`,
        readCount: status.readCount,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Mark as read error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('bulk_mark_as_read')
  async handleBulkMarkAsRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number; upToMessageId: number }
  ) {
    try {
      this.logger.log(`📖 User ${client.userId} bulk marking as read in channel ${data.channelId} up to message ${data.upToMessageId}`);

      await this.chatService.bulkMarkAsRead(data.channelId, client.userId, data.upToMessageId);

      this.broadcastToChannel(data.channelId, {
        event: 'bulk_read_update',
        channelId: data.channelId,
        userId: client.userId,
        upToMessageId: data.upToMessageId,
        timestamp: new Date().toISOString(),
      }, client.userId);

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Bulk mark as read error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== MEMBER MANAGEMENT ====================
  @SubscribeMessage('invite_members')
  async handleInviteMembers(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { channelId: number; userIds: number[] }
  ) {
    try {
      this.logger.log(`👥 User ${client.userId} inviting ${data.userIds.length} members to channel ${data.channelId}`);

      await this.chatService.addMembers(
        data.channelId,
        data.userIds,
        client.userId,
        client.tenantId
      );

      const channel = await this.chatService.getChannelById(data.channelId, client.userId);
      const payload = Array.isArray(data) ? data[0] : data;
      const userName = await this.chatService.getUserDisplayName(client.userId);
      this.logger.log(`⌨️ User ${client.userId} (${userName}) started typing in channel ${payload.channelId}`);

      // Notify new members
      for (const userId of data.userIds) {
        this.broadcastToUser(userId, {
          event: 'member_invited',
          channelId: data.channelId,
          channelName: channel.name,
          invitedBy: client.userId,
          inviterName: `${userName}`,
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

      // Clear channel members cache
      this.channelMembers.delete(data.channelId);

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Invite members error: ${error.message}`);
      return { success: false, error: error.message };
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
      // Fetches from DB
      const result = await this.chatService['sqlService'].execute(
        'sp_GetChannelMembers_Fast',
        { channelId }
      );
      members = new Set(result.map((r: any) => r.user_id));
      this.channelMembers.set(channelId, members);
    }

    let broadcastCount = 0;
    members.forEach(userId => {
      if (excludeUserId && userId === excludeUserId) return;

      const sockets = this.userSockets.get(userId);
      if (sockets) {
        console.log("🚀 ~ sockets:", sockets)
        sockets.forEach(socketId => {
          this.server.to(socketId).emit('message', payload);
          broadcastCount++;
        });
      }
    });


    this.logger.debug(`📡 Broadcast ${payload.event} to ${broadcastCount} sockets in channel ${channelId}`);
  }

  /**
   * ✅ Broadcast message to specific user (all their sockets)
   */
  private broadcastToUser(userId: number, payload: any): void {
    console.log("🚀 ~ ChatGateway ~ broadcastToUser ~ userId:", userId)
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('message', payload);
      });
      this.logger.debug(`📡 Broadcast ${payload.event} to user ${userId} (${sockets.size} sockets)`);
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

      this.logger.log(`✅ User ${client.userId} joined ${channels.length} channels`);
    } catch (error) {
      this.logger.error(`❌ Failed to join channels: ${error.message}`);
    }
  }

  // ==================== HEALTH CHECK ====================
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthSocket) {
    return {
      event: 'pong',
      timestamp: new Date().toISOString(),
      userId: client.userId
    };
  }
}