// ============================================
// modules/chat/chat.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

import { SqlServerService } from '../../core/database/sql-server.service';
import { ChatGateway } from './chat.gateway';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, SqlServerService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}