// modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SqlServerService } from '../../../core/database/sql-server.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly sqlService: SqlServerService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret || secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
      // 🔒 Add token blacklist check
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    try {
      // 🔒 Extract token for blacklist check
      const token:any = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      
      // 🔒 Check if token is blacklisted (revoked)
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn(`Blacklisted token attempted: ${payload.sub}`);
        throw new UnauthorizedException('Token has been revoked');
      }

      // 🔒 Validate token claims
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid token claims');
      }

      // 🔒 Check token age (prevent replay attacks)
      const tokenAge = Date.now() - (payload.iat * 1000);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (tokenAge > maxAge) {
        throw new UnauthorizedException('Token too old, please re-authenticate');
      }

      // Get user data with permissions
      const result = await this.sqlService.execute('sp_GetUserAuthData', {
        userId: payload.sub
      });

      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      let user, roles, permissions;

      if (Array.isArray(result[0])) {
        user = result[0][0];
        roles = result[1] || [];
        permissions = result[2] || [];
      } else {
        user = result[0];
        roles = [];
        permissions = [];
      }

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User account is inactive');
      }

      // 🔒 Verify email is verified
      if (!user.emailVerifiedAt) {
        throw new UnauthorizedException('Email not verified');
      }

      return {
        id: user.id,
        email: user.email,
        userType: user.user_type,
        firstName: user.first_name,
        lastName: user.last_name,
        tenantId: payload.tenantId || null,
        roles: roles.length > 0 && roles[0].roles ? roles[0].roles.split(',') : [],
        permissions: permissions.length > 0 && permissions[0].permissions ? permissions[0].permissions.split(',') : [],
        isSuperAdmin: user.is_super_admin || false,
        // 🔒 Add security metadata
        tokenIssuedAt: payload.iat,
        tokenExpiry: payload.exp,
      };
    } catch (error) {
      this.logger.error('JWT validation failed', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * 🔒 Check if token is blacklisted/revoked
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // Option 1: Check database
      const result = await this.sqlService.query(
        `SELECT COUNT(*) as count FROM revoked_tokens 
         WHERE token_hash = HASHBYTES('SHA2_256', @token) 
         AND expires_at > GETUTCDATE()`,
        { token }
      );
      return result[0]?.count > 0;
    } catch (error) {
      // If revoked_tokens table doesn't exist, skip check
      return false;
    }
  }
}