// ============================================
// src/modules/auth/auth.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { InvitationService } from './invitation.service';
import { VerificationService } from 'src/common/verification.service';
import { AuditLoggerService } from '../global-modules/audit-logs/audit-logs.service';
import { RbacService } from '../rbac/rbac.service';
import { RbacPermissionFilterService } from '../rbac/rbac-permission-filter.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: {
          expiresIn: config.get('jwt.accessTokenExpiry'),
          issuer: config.get('jwt.issuer'),
          audience: config.get('jwt.audience'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, VerificationService, RbacPermissionFilterService, AuditLoggerService, InvitationService,RbacService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}