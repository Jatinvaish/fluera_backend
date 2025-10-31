
// ============================================
// src/modules/auth/strategies/jwt.strategy.ts - V3.0
// ============================================
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SqlServerService } from '../../../core/database/sql-server.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly sqlService: SqlServerService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
    });
  }

  async validate(payload: any) {
    // Execute stored procedure to get user data with roles and permissions
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
      throw new UnauthorizedException('User not found or inactive');
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
    };
  }
}
