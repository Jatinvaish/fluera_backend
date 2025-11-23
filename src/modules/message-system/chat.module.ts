// src/modules/message-system/chat.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    ConfigModule, // ✅ Import ConfigModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessTokenExpiry') || '15m',
          issuer: configService.get<string>('jwt.issuer'),
          audience: configService.get<string>('jwt.audience'),
        },
      }),
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
export class ChatModule { }