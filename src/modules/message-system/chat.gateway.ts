 
// ============================================
// src/modules/message-system/chat.gateway.ts
// WEBSOCKET - OPTIMIZED FOR SPEED
// ============================================
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

interface AuthSocket extends Socket {
  userId: number;
  tenantId: number;
  user: any;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
  transports: ['websocket'],
  perMessageDeflate: false,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  private userSockets = new Map<number, Set<string>>();
  private channelMembers = new Map<number, Set<number>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  @SubscribeMessage('send_message')
  async handleSendMessage(@ConnectedSocket() client: AuthSocket, @MessageBody() data: SendMessageDto) {
    const start = Date.now();

    try {
      const message = await this.chatService.sendMessage(data, client.userId, client.tenantId);

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
      client.emit('error', { event: 'send_message', message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { channelId: number }) {
    client.to(`channel-${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: client.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { channelId: number }) {
    client.to(`channel-${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: client.userId,
      isTyping: false,
    });
  }

  async handleConnection(client: AuthSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return client.disconnect();

      const user = this.jwtService.verify(token);
      if (!user) return client.disconnect();

      client.userId = user.sub || user.id;
      client.tenantId = user.tenantId;
      client.user = user;

      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      await this.joinUserChannels(client);

      client.emit('connected', { userId: client.userId, timestamp: new Date().toISOString() });
      this.logger.log(`User ${client.userId} connected`);
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(client.userId);
      }
      this.logger.log(`User ${client.userId} disconnected`);
    }
  }

  private async broadcastMessage(channelId: number, payload: any): Promise<void> {
    let members = this.channelMembers.get(channelId);

    if (!members || members.size === 0) {
      const result = await this.chatService['sqlService'].execute('sp_GetChannelMembers_Fast', { channelId });
      members = new Set(result.map((r: any) => r.user_id));
      this.channelMembers.set(channelId, members);
    }

    members.forEach(userId => {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.forEach(socketId => this.server.to(socketId).emit('message', payload));
      }
    });
  }

  private async joinUserChannels(client: AuthSocket) {
    try {
      const channels = await this.chatService.getUserChannels(client.userId);
      channels.forEach((ch: any) => {
        client.join(`channel-${ch.channel_id}`);
        if (!this.channelMembers.has(ch.channel_id)) {
          this.channelMembers.set(ch.channel_id, new Set());
        }
        this.channelMembers.get(ch.channel_id)!.add(client.userId);
      });
    } catch (error) {
      this.logger.error(`Failed to join channels: ${error.message}`);
    }
  }
}