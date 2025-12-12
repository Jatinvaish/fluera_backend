// src/modules/message-system/chat.module.ts - UPDATED
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { ChatGateway } from './chat.gateway';
import { ChatActivityService } from './chat-activity.service'; // ✅ NEW
import { ChatNotificationService } from './chat-notification.service'; // ✅ NEW
import { FileUploadModule } from 'src/common/file-upload.module';



@Module({
  imports: [
    ConfigModule,
    FileUploadModule,
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
    ChatActivityService,
    ChatNotificationService,
  ],
  exports: [
    ChatService, 
    ChatGateway, 
    PresenceService,
    ChatActivityService,
    ChatNotificationService,
  ],
})
export class ChatModule { }