// ============================================
// src/app.module.ts - FIXED & CLEANED
// ============================================

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import encryptionConfig from './config/encryption.config';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import { CommonModule } from './common/common.module';
import { LoggerMiddleware } from './core/middlewares/logger.middleware';
import { CorrelationIdMiddleware } from './core/middlewares/correlation-id.middleware';
import { EncryptionDefaultMiddleware } from './core/middlewares/encryption-default.middleware';
import { TenantContextMiddleware } from './core/middlewares/tenant-context.middleware';
import { SessionActivityMiddleware } from './core/middlewares/session-activity.middleware';

import { RedisModule } from './core/redis/redis.module';

// Guards
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { RolesGuard } from './core/guards/roles.guard';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { SystemConfigModule } from './modules/global-modules/system-config/system-config.module';
import { AuditLogsModule } from './modules/global-modules/audit-logs/audit-logs.module';
import { SystemEventsModule } from './modules/global-modules/system-events/system-events.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { EmailModule } from './modules/email-templates/email.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ChatModule } from './modules/message-system/chat.module';

// Chat components
import { ChatService } from './modules/message-system/chat.service';
import { PresenceService } from './modules/message-system/presence.service';
import { ChatController } from './modules/message-system/chat.controller';
import { CollaborationController } from './modules/message-system/collaboration.controller';

// Ultra-fast chat

import { JwtService } from '@nestjs/jwt';
import { ResourcePermissionGuard } from './core/guards/permissions.guard';
import { TenantsController } from './modules/tenants/tenant.controller';
import { TenantsModule } from './modules/tenants/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, encryptionConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Core
    DatabaseModule,
    RedisModule,
    CommonModule,

    // Features
    AuthModule,
    PermissionsModule,
    SystemConfigModule,
    AuditLogsModule,
    SystemEventsModule,
    RbacModule,
    EmailModule,
    ChatModule,
    TenantsModule, //(Assuming TenantsModule is imported elsewhere if needed)
  ],

  providers: [
    // Global guards (execution order matters)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ResourcePermissionGuard },


    ChatService,

    PresenceService,

    JwtService,
  ],

  controllers: [
    //  UltraFastChatController,
    //  TenantsController,
    // ChatController,
    // CollaborationController,
  ],

  exports: [
    // UltraFastChatService,
    ChatService,
    PresenceService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CorrelationIdMiddleware,
        EncryptionDefaultMiddleware,
        TenantContextMiddleware,
        SessionActivityMiddleware,
        LoggerMiddleware,
      )
      .forRoutes('*');
  }
}
