// ============================================
// modules/chat/chat.module.ts - FIXED & OPTIMIZED
// ============================================
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // FIX: Import JwtModule
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SqlServerService } from '../../core/database/sql-server.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    // FIX: Register JwtModule for token validation in Gateway
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, SqlServerService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}