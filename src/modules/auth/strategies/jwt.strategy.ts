// ============================================
// modules/auth/strategies/jwt.strategy.ts - ENHANCED
// ============================================
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SqlServerService } from '../../../core/database/sql-server.service';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly sqlService: SqlServerService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: configService.get<string>('jwt.issuer') || undefined,
      audience: configService.get<string>('jwt.audience') || undefined,
    });
  }

  async validate(payload: any) {
    console.log("🚀 ~ JwtStrategy ~ validate ~ payload:", payload);

    const result = await this.sqlService.execute('sp_GetUserAuthData', {
      userId: payload.sub
    });


    let user, roles, perms;

    if (Array.isArray(result) && Array.isArray(result[0])) {
      user = result[0];
      roles = result[1] || [];
      perms = result[2] || [];
    } else {
      user = result;
      roles = [];
      perms = [];
    }

    if (!user || user.length === 0) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const userData = user[0];

    return {
      id: userData.id,
      email: userData.email,
      userType: userData.user_type,
      firstName: userData.first_name,
      lastName: userData.last_name,
      organizationId: payload.organizationId,
      roles: roles[0]?.roles ? roles[0].roles.split(',') : [],
      permissions: perms[0]?.permissions ? perms[0].permissions.split(',') : [],
      onboardingRequired: payload.onboardingRequired || false,
    };
  }
}