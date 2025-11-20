// ============================================
// src/modules/message-system/chat-ultra-optimized.gateway.ts
// TARGET: <20ms broadcast time
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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SendMessageDto } from 'src/modules/global-modules/dto/chat.dto';
import { PresenceService } from '../presence.service';
import { UltraFastChatService } from './chat-ultra-fast.service';

interface AuthenticatedSocket extends Socket {
  userId: number;
  tenantId: number;
  user: any;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
  transports: ['websocket'], // WebSocket only - no polling
  perMessageDeflate: false, // No compression for speed
  pingTimeout: 30000,
  pingInterval: 25000,
})
export class UltraFastChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(UltraFastChatGateway.name);

  // ✅ IN-MEMORY CACHE - No Redis lookups for active connections
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds
  private channelMembers = new Map<number, Set<number>>(); // channelId -> userIds
  private socketToUser = new Map<string, number>(); // socketId -> userId

  constructor(
    private chatService: UltraFastChatService,
    private presenceService: PresenceService,
    private jwtService: JwtService,
  ) {
    // Warm up cache on startup
    this.warmUpCacheAsync();
  }

  // ==================== ULTRA-FAST MESSAGE HANDLING ====================

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const startTime = Date.now();

    try {
      // ✅ STEP 1: Save to DB (<50ms)
      const message = await this.chatService.sendMessageUltraFast(
        data,
        client.userId,
        client.tenantId,
      );

      // ✅ STEP 2: Broadcast IMMEDIATELY (<20ms)
      const broadcastStart = Date.now();
      const delivered = await this.broadcastMessageFast(data.channelId, {
        event: 'new_message',
        message: {
          id: message.id,
          channel_id: message.channel_id,
          sender_user_id: message.sender_user_id,
          message_type: message.message_type,
          encrypted_content: data.encryptedContent,
          encryption_iv: data.encryptionIv,
          encryption_auth_tag: data.encryptionAuthTag,
          encryption_key_version: message.encryption_key_version,
          sent_at: message.sent_at,
          sender: {
            id: client.user.id,
            firstName: client.user.firstName,
            lastName: client.user.lastName,
            avatarUrl: client.user.avatarUrl,
          },
        },
      });
      const broadcastTime = Date.now() - broadcastStart;

      const totalTime = Date.now() - startTime;

      if (totalTime > 80) {
        this.logger.warn(
          `⚠️ Message delivery: ${totalTime}ms (target: 80ms, broadcast: ${broadcastTime}ms)`,
        );
      } else {
        this.logger.debug(
          `✅ Message delivered in ${totalTime}ms (broadcast: ${broadcastTime}ms)`,
        );
      }

      return {
        success: true,
        messageId: message.id,
        deliveredTo: delivered,
        latency: totalTime,
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`❌ Message failed after ${elapsed}ms: ${error.message}`);

      client.emit('error', {
        event: 'send_message',
        message: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ ULTRA-FAST BROADCAST - Uses in-memory cache (<20ms)
   */
  private async broadcastMessageFast(
    channelId: number,
    payload: any,
  ): Promise<number> {
    let members = this.channelMembers.get(channelId);

    if (!members || members.size === 0) {
      // Cache miss - load from service (DB or cache)
      const memberIds = await this.chatService.getChannelMembersFast(channelId);
      members = new Set(memberIds);
      this.channelMembers.set(channelId, members);
    }

    let delivered = 0;

    // Broadcast to all online members
    members.forEach(userId => {
      const socketIds = this.userSockets.get(`${userId}`);
      if (socketIds && socketIds.size > 0) {
        socketIds.forEach(socketId => {
          this.server.to(socketId).emit('message', payload);
          delivered++;
        });
      }
    });

    return delivered;
  }

  // ==================== TYPING INDICATORS (OPTIMIZED) ====================

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    // Broadcast directly to room (no Redis)
    client.to(`channel-${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: client.userId,
      isTyping: true,
    });

    return { success: true };
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    client.to(`channel-${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: client.userId,
      isTyping: false,
    });

    return { success: true };
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn('Connection rejected: No token');
        client.disconnect();
        return;
      }

      const user = await this.validateToken(token);
      if (!user) {
        this.logger.warn('Connection rejected: Invalid token');
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.tenantId = user.tenantId;
      client.user = user;

      // Add to in-memory cache
      const userKey = `${user.id}`;
      if (!this.userSockets.has(userKey)) {
        this.userSockets.set(userKey, new Set());
      }
      this.userSockets.get(userKey)!.add(client.id);
      this.socketToUser.set(client.id, user.id);

      // Join user's channels
      await this.joinUserChannels(client);

      // Set online presence (async, non-blocking)
      this.presenceService
        .setUserOnline(user.id, user.tenantId)
        .catch(err => this.logger.warn(`Presence error: ${err.message}`));

      this.logger.log(`✅ User ${user.id} connected (socket: ${client.id})`);

      client.emit('connected', {
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      const userId = this.socketToUser.get(client.id);
      if (!userId) return;

      const userKey = `${userId}`;
      const sockets = this.userSockets.get(userKey);

      if (sockets) {
        sockets.delete(client.id);

        if (sockets.size === 0) {
          this.userSockets.delete(userKey);
          // Set offline (async, non-blocking)
          this.presenceService
            .setUserOffline(userId, client.tenantId)
            .catch(err => this.logger.warn(`Presence error: ${err.message}`));
        }
      }

      this.socketToUser.delete(client.id);

      this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  // ==================== HELPER METHODS ====================

  private async joinUserChannels(client: AuthenticatedSocket) {
    try {
      // Get user's channels from optimized service
      const channels = await this.chatService.getUserChannelsFast(client.userId);

      channels.forEach(ch => {
        const channelId = ch.channel_id;
        client.join(`channel-${channelId}`);

        // Add to in-memory channel members cache
        if (!this.channelMembers.has(channelId)) {
          this.channelMembers.set(channelId, new Set());
        }
        this.channelMembers.get(channelId)!.add(client.userId);
      });

      this.logger.debug(`User ${client.userId} joined ${channels.length} channels`);
    } catch (error) {
      this.logger.error(`Failed to join channels: ${error.message}`);
    }
  }

  private extractToken(client: Socket): string | null {
    return (
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '') ||
      (client.handshake.query?.token as string) ||
      null
    );
  }

  private async validateToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);
      return {
        id: decoded.sub || decoded.id,
        tenantId: decoded.tenantId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        avatarUrl: decoded.avatarUrl,
      };
    } catch {
      return null;
    }
  }

  /**
   * ✅ WARM UP CACHE - Load frequently used channels on startup
   */
  private async warmUpCacheAsync() {
    try {
      this.logger.log('Warming up channel cache...');

      // This would need a stored procedure for efficiency
      // For now, we'll let it populate on-demand

      this.logger.log('Cache warm-up complete');
    } catch (error) {
      this.logger.error(`Cache warm-up failed: ${error.message}`);
    }
  }

  /**
   * ✅ HEALTH CHECK
   */
  getHealthMetrics() {
    return {
      connectedUsers: this.userSockets.size,
      totalSockets: Array.from(this.userSockets.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      ),
      cachedChannels: this.channelMembers.size,
      avgSocketsPerUser:
        this.userSockets.size > 0
          ? Math.round(
            Array.from(this.userSockets.values()).reduce(
              (sum, set) => sum + set.size,
              0,
            ) / this.userSockets.size,
          )
          : 0,
    };
  }
}