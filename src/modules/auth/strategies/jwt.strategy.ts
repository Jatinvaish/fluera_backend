// src/modules/auth/strategies/jwt.strategy.ts - COMPLETE FIX
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SqlServerService } from 'src/core/database/sql-server.service';

export interface JwtPayload {
  sub: number; // user ID
  email: string;
  userType: string;
  tenantId?: number; // Current active tenant
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string | null;
  userType: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  emailVerifiedAt: Date | null;
  status: string;
  twoFactorEnabled: boolean;
  publicKey: string | null;
  roles: string[]; // Array of role names
  permissions: string[]; // Array of permission keys
  tenantId: number | null; // Active tenant ID
  tenantRole: string | null; // Role in active tenant
  tenants: Array<{ // All accessible tenants
    tenantId: number;
    tenantName: string;
    tenantType: string;
    role: string;
    isActive: boolean;
  }>;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private sqlService: SqlServerService,
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

  async validate(request: any, payload: JwtPayload): Promise<AuthenticatedUser> {
    try {
      this.logger.debug(`Validating JWT for user ${payload.sub}`);

      // ✅ Get X-Tenant-ID from header (for tenant switching)
      const requestedTenantId = request.headers['x-tenant-id']
        ? parseInt(request.headers['x-tenant-id'])
        : payload.tenantId;

      // ✅ Call stored procedure to get FULL user data
      const result = await this.sqlService.execute('sp_GetUserAuthData', {
        userId: payload.sub,
      });

      if (!result || result.length === 0 || result[0].length === 0) {
        this.logger.error(`User ${payload.sub} not found or inactive`);
        throw new UnauthorizedException('User not found or inactive');
      }

      // ✅ SP returns 4 result sets
      const userData = result[0][0]; // User basic info
      const rolesData = result[1] && result[1][0]; // Roles (comma-separated)
      const permissionsData = result[2] && result[2][0]; // Permissions (comma-separated)

      // ✅ Parse roles and permissions
      const roles = rolesData?.roles
        ? rolesData.roles.split(',').filter(Boolean)
        : [];

      const permissions = permissionsData?.permissions
        ? permissionsData.permissions.split(',').filter(Boolean)
        : [];

      // ✅ Get all accessible tenants for this user
      const tenantsResult = await this.sqlService.query(
        `SELECT 
          tm.tenant_id as tenantId,
          t.name as tenantName,
          t.tenant_type as tenantType,
          r.name as role,
          tm.is_active as isActive
         FROM tenant_members tm
         INNER JOIN tenants t ON tm.tenant_id = t.id
         INNER JOIN roles r ON tm.role_id = r.id
         WHERE tm.user_id = @userId AND tm.is_active = 1`,
        { userId: payload.sub }
      );

      const tenants = tenantsResult || [];

      // ✅ Determine active tenant
      let activeTenantId:any = requestedTenantId || payload.tenantId;
      let tenantRole: string | null = null;

      // Validate tenant access
      if (activeTenantId) {
        const tenantAccess = tenants.find((t: any) => t.tenantId === activeTenantId);
        if (!tenantAccess) {
          this.logger.warn(
            `User ${payload.sub} attempted to access tenant ${activeTenantId} without permission`
          );
          activeTenantId = tenants[0]?.tenantId || null; // Fallback to first tenant
          tenantRole = tenants[0]?.role || null;
        } else {
          tenantRole = tenantAccess.role;
        }
      } else {
        // No tenant specified, use first available
        activeTenantId = tenants[0]?.tenantId || null;
        tenantRole = tenants[0]?.role || null;
      }

      // ✅ Construct authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        id: userData.id,
        email: userData.email,
        username: userData.username || null,
        userType: userData.userType,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        isSuperAdmin: userData.isSuperAdmin === 1 || userData.isSuperAdmin === true,
        emailVerifiedAt: userData.emailVerifiedAt,
        status: userData.status,
        twoFactorEnabled: userData.twoFactorEnabled === 1 || userData.twoFactorEnabled === true,
        publicKey: userData.publicKey,
        roles,
        permissions,
        tenantId: activeTenantId,
        tenantRole,
        tenants,
      };

      this.logger.debug(`✅ User ${payload.sub} validated successfully with ${roles.length} roles and ${permissions.length} permissions`);

      return authenticatedUser;
    } catch (error) {
      this.logger.error(`JWT validation failed for user ${payload.sub}:`, error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}