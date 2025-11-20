// ============================================
// src/modules/message-system/chat.module.ts - COMPLETE v5.0
// ============================================
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { CollaborationController } from './collaboration.controller';
import { PresenceService } from './presence.service';
import { OptimizedChatService } from './chat-optimized.service';
import { MessageQueueService } from './message-queue.service';
import { OptimizedChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { UltraFastChatService } from './ehnaced_chat/chat-ultra-fast.service';
import { UltraFastChatGateway } from './ehnaced_chat/chat-ultra-fast.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ChatController, CollaborationController],
  providers: [
    OptimizedChatService,
    UltraFastChatService,
    ChatService,
    OptimizedChatGateway,
    UltraFastChatGateway,
    PresenceService,
    MessageQueueService,
  ],
  exports: [OptimizedChatService, ChatService,OptimizedChatGateway,UltraFastChatGateway,UltraFastChatService, PresenceService],
})
export class ChatModule {}