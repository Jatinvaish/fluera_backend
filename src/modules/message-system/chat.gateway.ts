// ============================================
// src/modules/message-system/chat.gateway.ts
// FIXED WEBSOCKET WITH PROPER AUTH
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
import { SendMessageDto } from './dto/chat.dto';

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
  allowEIO3: true, // Add compatibility
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  private userSockets = new Map<number, Set<string>>();
  private channelMembers = new Map<number, Set<number>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService, // ✅ ADD THIS
  ) {}

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

      // Broadcast immediately
      await this.broadcastMessage(data.channelId, {
        event: 'new_message',
        message: {
          ...message,
          content: data.content,
          sender: {
            id: client.user.id,
            firstName: client.user.firstName,
            lastName: client.user.lastName,
            avatarUrl: client.user.avatarUrl,
          },
        },
      });

      this.logger.debug(`Message delivered in ${Date.now() - start}ms`);
      return { success: true, messageId: message.id, latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Send message error:', error.message);
      client.emit('error', { event: 'send_message', message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthSocket, 
    @MessageBody() data: { channelId: number }
  ) {
    client.to(`channel-${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: client.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthSocket, 
    @MessageBody() data: { channelId: number }
  ) {
    client.to(`channel-${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: client.userId,
      isTyping: false,
    });
  }

  async handleConnection(client: AuthSocket) {
    try {
      // ✅ EXTRACT TOKEN FROM MULTIPLE SOURCES
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

      this.logger.log(`Attempting to verify token: ${token.substring(0, 20)}...`);

      // ✅ VERIFY TOKEN WITH PROPER SECRET
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
        this.logger.log(`✅ Token verified for user: ${user.sub || user.id}`);
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

      // ✅ SET USER DATA
      client.userId = user.sub || user.id;
      client.tenantId = user.tenantId || null;
      client.user = user;

      // ✅ TRACK USER SOCKET
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      // ✅ JOIN USER CHANNELS
      await this.joinUserChannels(client);

      // ✅ SEND CONFIRMATION
      client.emit('connected', { 
        userId: client.userId, 
        tenantId: client.tenantId,
        timestamp: new Date().toISOString() 
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
        }
      }
      this.logger.log(`User ${client.userId} disconnected (Socket: ${client.id})`);
    } else {
      this.logger.log(`Unknown user disconnected (Socket: ${client.id})`);
    }
  }

  private async broadcastMessage(channelId: number, payload: any): Promise<void> {
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
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.forEach(socketId => {
          this.server.to(socketId).emit('message', payload);
        });
      }
    });
  }

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
}