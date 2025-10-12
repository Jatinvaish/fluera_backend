// ============================================
// modules/chat/chat.gateway.ts
// ============================================
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, TypingIndicatorDto, MarkAsReadDto } from './dto/chat.dto';
import { SqlServerService } from 'src/core/database/sql-server.service';

interface AuthenticatedSocket extends Socket {
  userId: bigint;
  organizationId: bigint;
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on your needs
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private typingUsers: Map<string, Map<string, NodeJS.Timeout>> = new Map(); // channelId -> userId -> timeout

  constructor(private chatService: ChatService,    private sqlService: SqlServerService,
  ) {}

  // ==================== CONNECTION MANAGEMENT ====================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user info from token (implement your auth logic)
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connecting without token`);
        client.disconnect();
        return;
      }

      // Validate token and extract user info
      const user = await this.validateToken(token);
      
      if (!user) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.organizationId = user.organizationId;
      client.user = user;

      // Track user socket
      const userKey = `${user.organizationId}-${user.id}`;
      if (!this.userSockets.has(userKey)) {
        this.userSockets.set(userKey, new Set());
      }
//@ts-ignore

      this.userSockets.get(userKey).add(client.id);

      // Join user's channels
      await this.joinUserChannels(client);

      // Broadcast user online status
      this.broadcastUserStatus(user.id, user.organizationId, 'online');

      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to chat server',
        userId: user.id.toString(),
        organizationId: user.organizationId.toString(),
      });

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const userKey = `${client.organizationId}-${client.userId}`;
    const sockets = this.userSockets.get(userKey);

    if (sockets) {
      sockets.delete(client.id);
      
      // If user has no more active sockets, broadcast offline status
      if (sockets.size === 0) {
        this.userSockets.delete(userKey);
        this.broadcastUserStatus(client.userId, client.organizationId, 'offline');
      }
    }

    this.logger.log(`Client disconnected: ${client.id} (User: ${client.userId})`);
  }

  // ==================== MESSAGE HANDLERS ====================

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    try {
      const message = await this.chatService.sendMessage(
        data,
        client.userId,
        client.organizationId,
      );

      // Broadcast to channel
      this.server.to(`channel-${data.channelId}`).emit('new_message', {
        message,
        sender: {
          id: client.user.id,
          firstName: client.user.firstName,
          lastName: client.user.lastName,
          avatarUrl: client.user.avatarUrl,
        },
      });

      // Send notifications to mentioned users
      if (data.mentions && data.mentions.length > 0) {
        this.notifyMentionedUsers(data.mentions, message, client.organizationId);
      }

      // Clear typing indicator
      this.clearTypingIndicator(data.channelId.toString(), client.userId.toString());

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', {
        event: 'send_message',
        message: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number; content: string; formattedContent?: string },
  ) {
    try {
      const message = await this.chatService.editMessage(
        BigInt(data.messageId),
        {
          content: data.content, formattedContent: data.formattedContent,
          messageId: data.messageId?.toString()
        },
        client.userId,
      );

      // Get channel ID
      const originalMessage = await this.sqlService.query(
        'SELECT channel_id FROM messages WHERE id = @id',
        { id: BigInt(data.messageId) }
      );

      if (originalMessage.length > 0) {
        this.server.to(`channel-${originalMessage[0].channel_id}`).emit('message_edited', {
          messageId: data.messageId,
          message,
        });
      }

      return { success: true, message };
    } catch (error) {
      client.emit('error', { event: 'edit_message', message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number; hardDelete?: boolean },
  ) {
    try {
      const originalMessage = await this.sqlService.query(
        'SELECT channel_id FROM messages WHERE id = @id',
        { id: BigInt(data.messageId) }
      );

      await this.chatService.deleteMessage(
        BigInt(data.messageId),
        client.userId,
        data.hardDelete,
      );

      if (originalMessage.length > 0) {
        this.server.to(`channel-${originalMessage[0].channel_id}`).emit('message_deleted', {
          messageId: data.messageId,
          hardDelete: data.hardDelete,
        });
      }

      return { success: true };
    } catch (error) {
      client.emit('error', { event: 'delete_message', message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('react_to_message')
  async handleReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number; emoji: string },
  ) {
    try {
      const result = await this.chatService.reactToMessage(
        BigInt(data.messageId),
        data.emoji,
        client.userId,
        client.organizationId,
      );

      const message = await this.sqlService.query(
        'SELECT channel_id FROM messages WHERE id = @id',
        { id: BigInt(data.messageId) }
      );

      if (message.length > 0) {
        this.server.to(`channel-${message[0].channel_id}`).emit('message_reaction', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId: client.userId.toString(),
          action: result.action,
          user: {
            id: client.user.id,
            firstName: client.user.firstName,
            lastName: client.user.lastName,
          },
        });
      }

      return { success: true, ...result };
    } catch (error) {
      client.emit('error', { event: 'react_to_message', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== TYPING INDICATORS ====================

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingIndicatorDto,
  ) {
    const channelId = data.channelId.toString();
    const userId = client.userId.toString();

    // Clear existing timeout
    this.clearTypingIndicator(channelId, userId);

    // Set new timeout (auto-clear after 5 seconds)
    if (!this.typingUsers.has(channelId)) {
      this.typingUsers.set(channelId, new Map());
    }

    const timeout = setTimeout(() => {
      this.clearTypingIndicator(channelId, userId);
    }, 5000);
//@ts-ignore
    this.typingUsers.get(channelId).set(userId, timeout);

    // Broadcast typing indicator (exclude sender)
    client.to(`channel-${channelId}`).emit('user_typing', {
      channelId,
      userId,
      user: {
        id: client.user.id,
        firstName: client.user.firstName,
        lastName: client.user.lastName,
      },
      isTyping: true,
    });

    return { success: true };
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingIndicatorDto,
  ) {
    const channelId = data.channelId.toString();
    const userId = client.userId.toString();

    this.clearTypingIndicator(channelId, userId);

    return { success: true };
  }

  private clearTypingIndicator(channelId: string, userId: string) {
    const channelTyping = this.typingUsers.get(channelId);
    if (channelTyping) {
      const timeout = channelTyping.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        channelTyping.delete(userId);
      }

      // Broadcast stop typing
      this.server.to(`channel-${channelId}`).emit('user_typing', {
        channelId,
        userId,
        isTyping: false,
      });
    }
  }

  // ==================== CHANNEL MANAGEMENT ====================

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    try {
      // Verify membership
      await this.chatService.checkChannelMembership(
        BigInt(data.channelId),
        client.userId,
      );

      const roomName = `channel-${data.channelId}`;
      client.join(roomName);

      this.logger.log(`User ${client.userId} joined channel ${data.channelId}`);

      // Notify channel members
      client.to(roomName).emit('user_joined_channel', {
        channelId: data.channelId,
        user: {
          id: client.user.id,
          firstName: client.user.firstName,
          lastName: client.user.lastName,
        },
      });

      return { success: true, channelId: data.channelId };
    } catch (error) {
      client.emit('error', { event: 'join_channel', message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    const roomName = `channel-${data.channelId}`;
    client.leave(roomName);

    client.to(roomName).emit('user_left_channel', {
      channelId: data.channelId,
      userId: client.userId.toString(),
    });

    return { success: true };
  }

  // ==================== READ RECEIPTS ====================

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: MarkAsReadDto,
  ) {
    try {
      await this.chatService.markAsRead(data, client.userId);

      // Broadcast read receipt
      this.server.to(`channel-${data.channelId}`).emit('message_read', {
        channelId: data.channelId,
        userId: client.userId.toString(),
        messageId: data.messageId,
      });

      return { success: true };
    } catch (error) {
      client.emit('error', { event: 'mark_as_read', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== PRESENCE & STATUS ====================

  @SubscribeMessage('update_status')
  handleUpdateStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: string },
  ) {
    this.broadcastUserStatus(client.userId, client.organizationId, data.status);
    return { success: true };
  }

  private broadcastUserStatus(userId: bigint, organizationId: bigint, status: string) {
    this.server.to(`org-${organizationId}`).emit('user_status_changed', {
      userId: userId.toString(),
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== HELPER METHODS ====================

  private async joinUserChannels(client: AuthenticatedSocket) {
    try {
      const channels = await this.chatService.getUserChannels(
        client.userId,
        client.organizationId,
        { onlyJoined: true, limit: 1000 }
      );

      for (const channel of channels) {
        client.join(`channel-${channel.id}`);
      }

      // Join organization room
      client.join(`org-${client.organizationId}`);

      this.logger.log(`User ${client.userId} joined ${channels.length} channels`);
    } catch (error) {
      this.logger.error('Error joining user channels:', error);
    }
  }

  private async validateToken(token: string): Promise<any> {
    // Implement your JWT validation logic here
    // This is a placeholder - integrate with your auth service
    try {
      // Example: 
      // const decoded = this.jwtService.verify(token);
      // const user = await this.userService.findById(decoded.userId);
      // return user;
      
      // For now, return null - implement your actual token validation
      // You should inject your AuthService or JwtService here
      return null;
    } catch (error) {
      return null;
    }
  }

  private notifyMentionedUsers(userIds: number[], message: any, organizationId: bigint) {
    for (const userId of userIds) {
      const userKey = `${organizationId}-${userId}`;
      const sockets = this.userSockets.get(userKey);

      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('mentioned', {
            message,
            mentionedBy: message.sender_id,
          });
        });
      }
    }
  }

  // ==================== PUBLIC METHODS FOR EXTERNAL USE ====================

  public broadcastToChannel(channelId: number, event: string, data: any) {
    this.server.to(`channel-${channelId}`).emit(event, data);
  }

  public notifyUser(userId: bigint, organizationId: bigint, event: string, data: any) {
    const userKey = `${organizationId}-${userId}`;
    const sockets = this.userSockets.get(userKey);

    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  public broadcastToOrganization(organizationId: bigint, event: string, data: any) {
    this.server.to(`org-${organizationId}`).emit(event, data);
  }

  public getOnlineUsers(organizationId: bigint): string[] {
    const onlineUsers: string[] = [];
    for (const [userKey, sockets] of this.userSockets.entries()) {
      if (userKey.startsWith(`${organizationId}-`) && sockets.size > 0) {
        const userId = userKey.split('-')[1];
        onlineUsers.push(userId);
      }
    }
    return onlineUsers;
  }

  public isUserOnline(userId: bigint, organizationId: bigint): boolean {
    const userKey = `${organizationId}-${userId}`;
    const sockets = this.userSockets.get(userKey);
    return sockets ? sockets.size > 0 : false;
  }
}