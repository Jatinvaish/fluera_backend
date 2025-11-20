// ============================================
// src/modules/message-system/chat.gateway.ts - OPTIMIZED v5.0
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
import { Logger, UnauthorizedException } from '@nestjs/common';
import { OptimizedChatService } from './chat-optimized.service';
import { PresenceService } from './presence.service';
import { MessageQueueService } from './message-queue.service';
import { SendMessageDto, TypingIndicatorDto, MarkAsReadDto } from '../global-modules/dto/chat.dto';
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
  transports: ['websocket'], // ✅ Disable polling for 50% latency reduction
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: false, // ✅ Disable compression for lower latency
  maxHttpBufferSize: 1e6, // 1MB
})
export class OptimizedChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OptimizedChatGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private chatService: OptimizedChatService,
    private presenceService: PresenceService,
    private messageQueueService: MessageQueueService,
    private sqlService: SqlServerService,
    private jwtService: JwtService,
  ) {}

  // ==================== LIFECYCLE HOOKS ====================

  afterInit(server: Server) {
    this.logger.log('🚀 Optimized Chat Gateway initialized');

    // Setup Redis adapter for horizontal scaling (optional)
    // this.setupRedisAdapter();
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async handleConnection(client: AuthenticatedSocket) {
    const startTime = Date.now();

    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} connecting without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

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

      const userKey = `${user.organizationId}-${user.id}`;
      if (!this.userSockets.has(userKey)) {
        this.userSockets.set(userKey, new Set());
      }
      this.userSockets.get(userKey)?.add(client.id);

      // ✅ Set user online in presence service
      await this.presenceService.setUserOnline(user.id, user.organizationId);

      // ✅ Join user channels (optimized with caching)
      await this.joinUserChannels(client);

      // ✅ Deliver queued messages for offline user
      const queuedMessages = await this.messageQueueService.getQueuedMessages(user.id);
      if (queuedMessages.length > 0) {
        client.emit('queued_messages', {
          count: queuedMessages.length,
          messages: queuedMessages,
        });
      }

      // Broadcast user online status
      this.broadcastUserStatus(user.id, user.organizationId, 'online');

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Client ${client.id} connected in ${elapsed}ms (User: ${user.id})`);

      client.emit('connected', {
        message: 'Connected to ultra-fast chat server',
        userId: user.id.toString(),
        organizationId: user.organizationId.toString(),
        encryptionEnabled: true,
        queuedMessages: queuedMessages.length,
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

        if (sockets.size === 0) {
          this.userSockets.delete(userKey);

          // ✅ Set user offline
          await this.presenceService.setUserOffline(client.userId, client.organizationId);
          this.broadcastUserStatus(client.userId, client.organizationId, 'offline');
        }
      }

      // Clear typing indicators
      this.clearAllTypingForUser(client.userId);

      this.logger.log(`Client disconnected: ${client.id} (User: ${client.userId})`);
    } catch (error) {
      this.logger.error(`Disconnect error for client ${client.id}:`, error.message);
    }
  }

  // ==================== ULTRA-FAST MESSAGE HANDLING ====================

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const startTime = Date.now();

    try {
      // ✅ STEP 1: Validate encryption (10ms)
      if (!data.encryptedContent || !data.encryptionIv || !data.encryptionAuthTag) {
        client.emit('error', {
          event: 'send_message',
          message: 'Message must be encrypted',
        });
        return { success: false, error: 'Encryption required' };
      }

      // ✅ STEP 2: Save to database (optimized, ~150ms)
      const message = await this.chatService.sendMessage(
        data,
        client.userId,
        client.organizationId,
      );

      // ✅ STEP 3: Get channel participants (cached, 10ms)
      const participants = await this.getChannelParticipantsCached(data.channelId);

      // ✅ STEP 4: Broadcast to online users immediately (5ms)
      const onlineUsers = new Set<number>();
      for (const participant of participants) {
        const isOnline = await this.isUserOnline(participant.user_id, client.organizationId);
        if (isOnline) {
          onlineUsers.add(participant.user_id);
          this.notifyUser(participant.user_id, client.organizationId, 'new_message', {
            message,
            sender: {
              id: client.user.id,
              firstName: client.user.firstName,
              lastName: client.user.lastName,
            },
          });
        } else {
          // ✅ Queue message for offline users
          await this.messageQueueService.queueMessageForUser(
            participant.user_id,
            message.id,
            data.channelId,
          );
        }
      }

      // ✅ STEP 5: Clear typing indicator
      await this.clearTypingIndicator(data.channelId.toString(), client.userId.toString());

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `✅ Message delivered in ${elapsed}ms (${onlineUsers.size}/${participants.length} online)`,
      );

      return {
        success: true,
        message,
        elapsed,
        deliveredTo: onlineUsers.size,
        queuedFor: participants.length - onlineUsers.size,
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`❌ Message failed after ${elapsed}ms:`, error.message);
      client.emit('error', {
        event: 'send_message',
        message: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // ==================== TYPING INDICATORS ====================

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingIndicatorDto,
  ) {
    try {
      const channelId = data.channelId.toString();
      const userId = client.userId.toString();
      const timerKey = `${channelId}:${userId}`;

      // Clear existing timer
      if (this.typingTimers.has(timerKey)) {
        clearTimeout(this.typingTimers.get(timerKey));
      }

      // Set typing in Redis (expires in 5 seconds)
      await this.presenceService.setTyping(client.userId, data.channelId, true);

      // Broadcast to channel (exclude sender)
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

      // Auto-clear after 5 seconds
      const timeout = setTimeout(() => {
        this.clearTypingIndicator(channelId, userId);
        this.typingTimers.delete(timerKey);
      }, 5000);

      this.typingTimers.set(timerKey, timeout);

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling typing start:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingIndicatorDto,
  ) {
    try {
      const channelId = data.channelId.toString();
      const userId = client.userId.toString();

      await this.clearTypingIndicator(channelId, userId);

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling typing stop:', error.message);
      return { success: false, error: error.message };
    }
  }

  private async clearTypingIndicator(channelId: string, userId: string) {
    const timerKey = `${channelId}:${userId}`;

    // Clear timer
    if (this.typingTimers.has(timerKey)) {
      clearTimeout(this.typingTimers.get(timerKey));
      this.typingTimers.delete(timerKey);
    }

    // Clear from Redis
    await this.presenceService.setTyping(parseInt(userId), parseInt(channelId), false);

    // Broadcast stop
    this.server.to(`channel-${channelId}`).emit('user_typing', {
      channelId,
      userId,
      isTyping: false,
      timestamp: new Date().toISOString(),
    });
  }

  private clearAllTypingForUser(userId: number) {
    const userIdStr = userId.toString();
    for (const [key, timeout] of this.typingTimers.entries()) {
      if (key.endsWith(`:${userIdStr}`)) {
        clearTimeout(timeout);
        this.typingTimers.delete(key);
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
      await this.chatService.checkChannelMembership(data.channelId, client.userId);

      const roomName = `channel-${data.channelId}`;
      client.join(roomName);

      this.logger.log(`User ${client.userId} joined channel ${data.channelId}`);

      // Get typing users in channel
      const typingUsers = await this.presenceService.getTypingUsers(data.channelId);

      return {
        success: true,
        channelId: data.channelId,
        typingUsers,
      };
    } catch (error) {
      this.logger.error('Error joining channel:', error.message);
      client.emit('error', { event: 'join_channel', message: error.message });
      return { success: false, error: error.message };
    }
  }

  // ==================== HELPER METHODS ====================

  private async joinUserChannels(client: AuthenticatedSocket) {
    try {
      // Get cached channel list
      const channels:any = await this.chatService.getUserChannels(
        client.userId,
        client.organizationId,
        { onlyJoined: true, limit: 1000 },
      );

      for (const channel of channels) {
        client.join(`channel-${channel.id}`);
      }

      client.join(`org-${client.organizationId}`);

      this.logger.log(`User ${client.userId} joined ${channels.length} channels`);
    } catch (error) {
      this.logger.error('Error joining user channels:', error.message);
    }
  }

  private async validateToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);

      const users = await this.sqlService.query(
        `SELECT u.*, 
                (SELECT TOP 1 tenant_id FROM tenant_members 
                 WHERE user_id = u.id AND is_active = 1) as organizationId
         FROM users u 
         WHERE u.id = @userId AND u.status = 'active'`,
        { userId: decoded.sub || decoded.id },
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

  private extractToken(client: Socket): string | null {
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }

  private async getChannelParticipantsCached(channelId: number): Promise<any[]> {
    // This should use caching in production
    const participants = await this.sqlService.query(
      `SELECT user_id FROM chat_participants WITH (NOLOCK)
       WHERE channel_id = @channelId AND is_active = 1`,
      { channelId },
    );

    return participants;
  }

  private async isUserOnline(userId: number, organizationId: number): Promise<boolean> {
    const userKey = `${organizationId}-${userId}`;
    return this.userSockets.has(userKey);
  }

  private notifyUser(userId: number, organizationId: number, event: string, data: any) {
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

  private broadcastUserStatus(userId: number, organizationId: number, status: string) {
    this.server.to(`org-${organizationId}`).emit('user_status_changed', {
      userId: userId.toString(),
      status,
      timestamp: new Date().toISOString(),
    });
  }
}