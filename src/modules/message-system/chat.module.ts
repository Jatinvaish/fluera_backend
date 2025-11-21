// ============================================
// src/modules/message-system/chat.module.ts
// SIMPLIFIED - NO ENCRYPTION
// ============================================
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    PresenceService,
  ],
  exports: [ChatService, ChatGateway, PresenceService],
})
export class ChatModule {}