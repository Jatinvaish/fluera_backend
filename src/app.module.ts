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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, encryptionConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Database
    DatabaseModule,

    // Common services
    CommonModule,

    // Core modules
    AuthModule,
    
    // Global CRUD modules
    SystemConfigModule,
    AuditLogsModule,
    SystemEventsModule,
    AbacModule,
    RbacModule,
  ],
  providers: [
    // Global guards
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, LoggerMiddleware)
      .forRoutes('*');
  }
}
