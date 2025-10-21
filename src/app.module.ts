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
import { LoggerMiddleware } from './core/middlewares/logger.middleware';
import { CorrelationIdMiddleware } from './core/middlewares/correlation-id.middleware';
import { DecryptionMiddleware } from './core/middlewares/decryption.middleware';
import { EncryptionDefaultMiddleware } from './core/middlewares/encryption-default.middleware';

// Interceptors
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';

// Guards
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { RolesGuard } from './core/guards/roles.guard';
import { PermissionsGuard } from './core/guards/permissions.guard';
import { AbacGuard } from './core/guards/abac.guard';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { SystemConfigModule } from './modules/global-modules/system-config/system-config.module';
import { AuditLogsModule } from './modules/global-modules/audit-logs/audit-logs.module';
import { SystemEventsModule } from './modules/global-modules/system-events/system-events.module';
import { AbacModule } from './modules/abac/abac.module';
import { CommonModule } from './common/common.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { EmailModule } from './modules/email-templates/email.module';
import { ChatModule } from './modules/message-system/chat.module';
import { FeatureLimitGuard } from './core/guards/feature-limit.guard';
import { OrganizationsModule } from './modules/organizations/organization-features.module';
import { PermissionsModule } from './modules/permissions/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, encryptionConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    DatabaseModule,
    CommonModule,
    AuthModule,
    PermissionsModule,
    SystemConfigModule,
    AuditLogsModule,
    SystemEventsModule,
    AbacModule,
    RbacModule,
    EmailModule,
    OrganizationsModule,
    ChatModule
  ],
  providers: [
    // Interceptors
    ResponseInterceptor,
    LoggingInterceptor,

    // Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CorrelationIdMiddleware,
        EncryptionDefaultMiddleware,
        LoggerMiddleware,
      )
      .forRoutes('*');
  }
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //     .apply(
  //       CorrelationIdMiddleware,
  //       EncryptionDefaultMiddleware,
  //       DecryptionMiddleware,
  //       LoggerMiddleware,
  //     )
  //     .forRoutes('*');
  // }
}