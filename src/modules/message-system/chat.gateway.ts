// ============================================
// modules/chat/chat.gateway.ts - FIXED & OPTIMIZED
// ============================================
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, TypingIndicatorDto, MarkAsReadDto } from './dto/chat.dto';
import { SqlServerService } from 'src/core/database/sql-server.service';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId: number;
  organizationId: number;
  user: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS || '*',
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private typingUsers: Map<string, Map<string, NodeJS.Timeout>> = new Map();
  
  // FIX: Add cleanup interval to prevent memory leaks
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private chatService: ChatService,
    private sqlService: SqlServerService,
    private jwtService: JwtService, // FIX: Inject JwtService for token validation
  ) {}

  // ==================== LIFECYCLE HOOKS ====================

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
    
    // FIX: Setup periodic cleanup of stale typing indicators
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleTypingIndicators();
    }, 30000); // Every 30 seconds
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connecting without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // FIX: Implement proper token validation
      const user = await this.validateToken(token);
      
      if (!user) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.emit('error', { message: 'Invalid authentication token' });
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
      const sockets = this.userSockets.get(userKey);
      if (sockets) {
        sockets.add(client.id);
      }

      // Join user's channels
      await this.joinUserChannels(client);

      // Update user presence
      await this.updateUserPresence(user.id, 'online');

      // Broadcast user online status
      this.broadcastUserStatus(user.id, user.organizationId, 'online');

      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`);

      // Send connection confirmation with user info
      client.emit('connected', {
        message: 'Connected to chat server',
        userId: user.id.toString(),
        organizationId: user.organizationId.toString(),
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error.message);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      if (!client.userId) return;

      const userKey = `${client.organizationId}-${client.userId}`;
      const sockets = this.userSockets.get(userKey);

      if (sockets) {
        sockets.delete(client.id);
        
        // If user has no more active sockets
        if (sockets.size === 0) {
          this.userSockets.delete(userKey);
          
          // Update user presence to offline
          await this.updateUserPresence(client.userId, 'offline');
          
          // Broadcast offline status
          this.broadcastUserStatus(client.userId, client.organizationId, 'offline');
        }
      }

      // FIX: Cleanup all typing indicators for this user
      this.cleanupUserTypingIndicators(client.userId.toString());

      this.logger.log(`Client disconnected: ${client.id} (User: ${client.userId})`);
    } catch (error) {
      this.logger.error(`Disconnect error for client ${client.id}:`, error.message);
    }
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
        timestamp: new Date().toISOString(),
      });

      // Send notifications to mentioned users
      if (data.mentions && data.mentions.length > 0) {
        this.notifyMentionedUsers(data.mentions, message, client.organizationId);
      }

      // Clear typing indicator
      this.clearTypingIndicator(data.channelId.toString(), client.userId.toString());

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error sending message:', error.message);
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
        Number(data.messageId),
        {
          content: data.content,
          formattedContent: data.formattedContent,
          messageId: data.messageId?.toString()
        },
        client.userId,
      );

      // Get channel ID
      const originalMessage = await this.sqlService.query(
        'SELECT channel_id FROM messages WHERE id = @id',
        { id: Number(data.messageId) }
      );

      if (originalMessage.length > 0) {
        this.server.to(`channel-${originalMessage[0].channel_id}`).emit('message_edited', {
          messageId: data.messageId,
          message,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error editing message:', error.message);
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
        { id: Number(data.messageId) }
      );

      await this.chatService.deleteMessage(
        Number(data.messageId),
        client.userId,
        data.hardDelete,
      );

      if (originalMessage.length > 0) {
        this.server.to(`channel-${originalMessage[0].channel_id}`).emit('message_deleted', {
          messageId: data.messageId,
          hardDelete: data.hardDelete,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting message:', error.message);
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
        Number(data.messageId),
        data.emoji,
        client.userId,
        client.organizationId,
      );

      const message = await this.sqlService.query(
        'SELECT channel_id FROM messages WHERE id = @id',
        { id: Number(data.messageId) }
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
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true, ...result };
    } catch (error) {
      this.logger.error('Error reacting to message:', error.message);
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
    try {
      const channelId = data.channelId.toString();
      const userId = client.userId.toString();

      // Clear existing timeout
      this.clearTypingIndicator(channelId, userId);

      // Set new timeout (auto-clear after 5 seconds)
      let channelMap = this.typingUsers.get(channelId);
      if (!channelMap) {
        channelMap = new Map<string, NodeJS.Timeout>();
        this.typingUsers.set(channelId, channelMap);
      }

      const timeout = setTimeout(() => {
        this.clearTypingIndicator(channelId, userId);
      }, 5000);

      channelMap.set(userId, timeout);

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
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling typing start:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingIndicatorDto,
  ) {
    try {
      const channelId = data.channelId.toString();
      const userId = client.userId.toString();

      this.clearTypingIndicator(channelId, userId);

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling typing stop:', error.message);
      return { success: false, error: error.message };
    }
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
        timestamp: new Date().toISOString(),
      });

      // FIX: Clean up empty channel maps
      if (channelTyping.size === 0) {
        this.typingUsers.delete(channelId);
      }
    }
  }

  // FIX: New method to cleanup all typing indicators for a user
  private cleanupUserTypingIndicators(userId: string) {
    for (const [channelId, users] of this.typingUsers.entries()) {
      if (users.has(userId)) {
        this.clearTypingIndicator(channelId, userId);
      }
    }
  }

  // FIX: New method to cleanup stale typing indicators
  private cleanupStaleTypingIndicators() {
    const now = Date.now();
    for (const [channelId, users] of this.typingUsers.entries()) {
      for (const [userId, timeout] of users.entries()) {
        // If timeout is older than 10 seconds, clear it
        if (timeout && (now - timeout['_idleStart']) > 10000) {
          this.clearTypingIndicator(channelId, userId);
        }
      }
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
        Number(data.channelId),
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
        timestamp: new Date().toISOString(),
      });

      return { success: true, channelId: data.channelId };
    } catch (error) {
      this.logger.error('Error joining channel:', error.message);
      client.emit('error', { event: 'join_channel', message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    try {
      const roomName = `channel-${data.channelId}`;
      client.leave(roomName);

      client.to(roomName).emit('user_left_channel', {
        channelId: data.channelId,
        userId: client.userId.toString(),
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error leaving channel:', error.message);
      return { success: false, error: error.message };
    }
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
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking as read:', error.message);
      client.emit('error', { event: 'mark_as_read', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== PRESENCE & STATUS ====================

  @SubscribeMessage('update_status')
  async handleUpdateStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: 'online' | 'away' | 'offline' },
  ) {
    try {
      await this.updateUserPresence(client.userId, data.status);
      this.broadcastUserStatus(client.userId, client.organizationId, data.status);
      return { success: true };
    } catch (error) {
      this.logger.error('Error updating status:', error.message);
      return { success: false, error: error.message };
    }
  }

  private broadcastUserStatus(userId: number, organizationId: number, status: string) {
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
      this.logger.error('Error joining user channels:', error.message);
    }
  }

  // FIX: Implement proper token validation
  private async validateToken(token: string): Promise<any> {
    try {
      // Verify JWT token
      const decoded = this.jwtService.verify(token);
      
      // Get user from database with organization info
      const users = await this.sqlService.query(
        `SELECT u.*, 
                (SELECT TOP 1 tenant_id FROM tenant_members 
                 WHERE user_id = u.id AND is_active = 1) as organizationId
         FROM users u 
         WHERE u.id = @userId AND u.status = 'active'`,
        { userId: decoded.sub || decoded.id }
      );

      if (users.length === 0) {
        return null;
      }

      return {
        id: users[0].id,
        email: users[0].email,
        firstName: users[0].first_name,
        lastName: users[0].last_name,
        avatarUrl: users[0].avatar_url,
        organizationId: users[0].organizationId || decoded.organizationId,
      };
    } catch (error) {
      this.logger.error('Token validation error:', error.message);
      return null;
    }
  }

  // FIX: Helper to extract token from various sources
  private extractToken(client: Socket): string | null {
    // Try auth object first
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Try authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    // Try query parameters
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }

  private notifyMentionedUsers(userIds: number[], message: any, organizationId: number) {
    for (const userId of userIds) {
      const userKey = `${organizationId}-${userId}`;
      const sockets = this.userSockets.get(userKey);

      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('mentioned', {
            message,
            mentionedBy: message.sender_user_id,
            timestamp: new Date().toISOString(),
          });
        });
      }
    }
  }

  private async updateUserPresence(userId: number, status: 'online' | 'away' | 'offline') {
    try {
      await this.chatService.updateUserPresence(userId, status);
    } catch (error) {
      this.logger.error('Error updating user presence:', error.message);
    }
  }

  // ==================== PUBLIC METHODS FOR EXTERNAL USE ====================

  public broadcastToChannel(channelId: number, event: string, data: any) {
    this.server.to(`channel-${channelId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public notifyUser(userId: number, organizationId: number, event: string, data: any) {
    const userKey = `${organizationId}-${userId}`;
    const sockets = this.userSockets.get(userKey);

    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, {
          ...data,
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  public broadcastToOrganization(organizationId: number, event: string, data: any) {
    this.server.to(`org-${organizationId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public getOnlineUsers(organizationId: number): string[] {
    const onlineUsers: string[] = [];
    for (const [userKey, sockets] of this.userSockets.entries()) {
      if (userKey.startsWith(`${organizationId}-`) && sockets.size > 0) {
        const userId = userKey.split('-')[1];
        onlineUsers.push(userId);
      }
    }
    return onlineUsers;
  }

  public isUserOnline(userId: number, organizationId: number): boolean {
    const userKey = `${organizationId}-${userId}`;
    const sockets = this.userSockets.get(userKey);
    return sockets ? sockets.size > 0 : false;
  }

  // FIX: Cleanup on module destroy
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all typing timeouts
    for (const [_, users] of this.typingUsers.entries()) {
      for (const [_, timeout] of users.entries()) {
        clearTimeout(timeout);
      }
    }
  }
}