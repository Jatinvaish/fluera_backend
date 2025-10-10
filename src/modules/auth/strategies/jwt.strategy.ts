// ============================================
// modules/auth/strategies/jwt.strategy.ts
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
      issuer: configService.get<string>('jwt.issuer') || undefined,
      audience: configService.get<string>('jwt.audience') || undefined,
    });
  }

  async validate(payload: any) {
    const result = await this.sqlService.execute('sp_GetUserAuthData', { 
      userId: payload.sub 
    });

    const user = result.recordsets[0];
    const roles = result.recordsets[1];
    const perms = result.recordsets[2];

    console.log("🚀 ~ JwtStrategy ~ validate ~ user:", user);

    if (!user || user.length === 0) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const userData = user[0];
    console.log("🚀 ~ JwtStrategy ~ validate ~ userData:", userData);
    console.log("🚀 ~ JwtStrategy ~ validateroles:", roles);
    console.log("🚀 ~ JwtStrategy ~ perms:", perms);

    return {
      id: userData.id,
      email: userData.email,
      organizationId: userData.organization_id,
      userType: userData.user_type,
      firstName: userData.first_name,
      lastName: userData.last_name,
      roles: roles[0]?.roles ? roles[0].roles.split(',') : [],
      permissions: perms[0]?.permissions ? perms[0].permissions.split(',') : [],
    };
  }
}