
// ============================================
// src/modules/auth/auth.service.ts - V3.0 COMPLETE
// ============================================
import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SqlServerService } from '../../core/database/sql-server.service';
import { HashingService } from '../../common/hashing.service';
import { EncryptionService } from '../../common/encryption.service';
import { VerificationService } from '../../common/verification.service';
import {
  RegisterDto,
  LoginDto,
  CreateAgencyDto,
  CreateBrandDto,
  CreateCreatorDto,
} from './dto/auth.dto';
import { RedisService } from 'src/core/redis/redis.service';
import { AuditLoggerService } from '../global-modules/audit-logs/audit-logs.service';
import { EmailService } from '../email-templates/email.service';

interface DeviceInfo {
  deviceFingerprint?: string;
  deviceName?: string;
  deviceType?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private sqlService: SqlServerService,
    private jwtService: JwtService,
    private hashingService: HashingService,
    private encryptionService: EncryptionService,
    private verificationService: VerificationService,
    private configService: ConfigService,
    private redisService: RedisService, // ✅ ADD
    private auditLogger: AuditLoggerService, // ✅ ADD
    private emailService: EmailService, // ✅ ADD
  ) { }

  /**
   * Register new user
   */
  async register(registerDto: RegisterDto) {
    const existing = await this.sqlService.query(
      'SELECT id, email_verified_at, status FROM users WHERE email = @email',
      { email: registerDto.email }
    );

    if (existing.length > 0 && existing[0].email_verified_at) {
      throw new ConflictException('Email already registered and verified');
    }

    const passwordHash = await this.hashingService.hashPassword(registerDto.password);

    // Generate E2E encryption keys for user
    const userKeys = this.encryptionService.generateUserKey(registerDto.password);

    let userId: number;
    if (existing.length > 0) {
      userId = existing[0].id;
      await this.sqlService.query(
        `UPDATE users 
         SET password_hash = @passwordHash, 
             public_key = @publicKey,
             encrypted_private_key = @encryptedPrivateKey,
             key_version = 1,
             key_created_at = GETUTCDATE(),
             updated_at = GETUTCDATE()
         WHERE id = @userId`,
        {
          userId,
          passwordHash,
          publicKey: userKeys.publicKey,
          encryptedPrivateKey: userKeys.encryptedPrivateKey,
        }
      );
      await this.verificationService.deleteVerificationCodes(registerDto.email, 'email_verify');
    } else {
      const result = await this.sqlService.query(
        `INSERT INTO users (
          email, password_hash, user_type, status,
          public_key, encrypted_private_key, key_version, key_created_at
        )
         OUTPUT INSERTED.id
         VALUES (
          @email, @passwordHash, 'pending', 'pending',
          @publicKey, @encryptedPrivateKey, 1, GETUTCDATE()
        )`,
        {
          email: registerDto.email,
          passwordHash,
          publicKey: userKeys.publicKey,
          encryptedPrivateKey: userKeys.encryptedPrivateKey,
        }
      );
      userId = result[0].id;
    }

    // Send verification code
    const { code, expiresAt } = await this.verificationService.sendVerificationCode(
      registerDto.email,
      'email_verify',
      userId
    );

    // Log system event
    await this.logSystemEvent(userId, 'user.registered', {
      email: registerDto.email,
      hasEncryptionKeys: true,
    });

    return {
      message: 'Registration initiated. Please check your email for verification code.',
      email: registerDto.email,
      requiresVerification: true,
    };
  }

  /**
   * Verify email registration
   */
  async verifyRegistration(email: string, code: string) {
    await this.verificationService.verifyCode(email, code, 'email_verify');

    const users = await this.sqlService.query(
      `SELECT u.id,u.username, u.email, u.password_hash, u.first_name, u.last_name,
                u.status, u.email_verified_at, u.user_type, u.is_super_admin, vc.user_id AS vc_user_id,
              STRING_AGG(r.name, ',') AS roles
       FROM users u
       JOIN verification_codes vc ON u.id = vc.user_id
       LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = @email AND vc.code = @code AND vc.used_at IS NOT NULL
       GROUP BY u.id,u.username, u.email, u.password_hash, u.first_name, u.last_name,
                u.status, u.email_verified_at, u.user_type, u.is_super_admin, vc.user_id`,
      { email, code }
    );

    if (users.length === 0) {
      throw new BadRequestException('User not found');
    }

    const user = users[0];

    await this.sqlService.query(
      `UPDATE users 
       SET email_verified_at = GETUTCDATE(), status = 'active'
       WHERE id = @userId`,
      { userId: user.id }
    );

    // FIX: Check if user is SaaS owner
    const userRoles = user.roles ? user.roles.split(',') : [];
    const isSaaSOwner = userRoles.includes('super_admin') || userRoles.includes('saas_admin') || user.is_super_admin;

    // Log event
    await this.logSystemEvent(user.id, 'user.email_verified', { email });

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      userType: user.user_type,
      onboardingRequired: !isSaaSOwner,
    });

    await this.createSession(user.id, tokens.refreshToken);

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        userType: user.user_type,
        onboardingRequired: !isSaaSOwner,
        isSaaSOwner,
      },
      ...tokens,
    };
  }


  /**
   * Login user
   */
  async login(loginDto: LoginDto, deviceInfo?: DeviceInfo) {
    const requestId = crypto.randomUUID();

    try {
      // Rate limit check
      const { allowed } = await this.redisService.checkRateLimit(
        `login:${loginDto.email}`,
        5,
        300
      );

      if (!allowed) {
        await this.auditLogger.logSecurityEvent(
          'BRUTE_FORCE',
          null,
          { email: loginDto.email, ip: deviceInfo?.ipAddress },
          deviceInfo?.ipAddress
        );
        throw new UnauthorizedException('Too many login attempts. Please try again later.');
      }

      // Get user with roles
      const users = await this.sqlService.query(
        `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
                u.status, u.email_verified_at, u.user_type, u.is_super_admin,
                STRING_AGG(r.name, ',') AS roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.email = @email
         GROUP BY u.id, u.email, u.password_hash, u.first_name, u.last_name, 
                  u.status, u.email_verified_at, u.user_type, u.is_super_admin`,
        { email: loginDto.email }
      );

      if (users.length === 0) {
        await this.auditLogger.logAuth(
          0,
          'FAILED_LOGIN',
          { reason: 'user_not_found', email: loginDto.email },
          deviceInfo?.ipAddress,
          deviceInfo?.userAgent
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      const user = users[0];
      if (!user?.password_hash) {
        throw new UnauthorizedException('Invalid credentials');
      }
      // Verify password
      const isPasswordValid = await this.hashingService.comparePassword(
        loginDto.password,
        user?.password_hash
      );

      if (!isPasswordValid) {
        await this.auditLogger.logAuth(
          user.id,
          'FAILED_LOGIN',
          { reason: 'invalid_password' },
          deviceInfo?.ipAddress,
          deviceInfo?.userAgent
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check email verification
      if (!user.email_verified_at) {
        throw new UnauthorizedException('Please verify your email first');
      }

      // Check account status
      if (user.status !== 'active') {
        throw new UnauthorizedException('Account is not active');
      }

      // Update login stats (async, non-blocking)
      this.sqlService.query(
        `UPDATE users 
         SET last_login_at = GETUTCDATE(), 
             login_count = login_count + 1,
             last_active_at = GETUTCDATE()
         WHERE id = @userId`,
        { userId: user.id }
      ).catch(err => this.logger.error('Failed to update login stats', err));

      // FIX: Check if user is super_admin or saas_admin
      const userRoles = user.roles ? user.roles.split(',') : [];
      const isSaaSOwner = userRoles.includes('super_admin') || userRoles.includes('saas_admin') || user.is_super_admin;

      let primaryTenant = null;
      let tenants: any = [];

      // Only get tenants if NOT SaaS owner
      if (!isSaaSOwner) {
        const tenantCacheKey = `user:${user.id}:tenants`;
        tenants = await this.redisService.getCachedQuery(tenantCacheKey);

        if (!tenants) {
          tenants = await this.sqlService.query(
            `SELECT tm.tenant_id, t.name, t.tenant_type, tm.role_id
             FROM tenant_members tm
             JOIN tenants t ON tm.tenant_id = t.id
             WHERE tm.user_id = @userId AND tm.is_active = 1`,
            { userId: user.id }
          );
          await this.redisService.cacheQuery(tenantCacheKey, tenants, 600);
        }

        primaryTenant = tenants.length > 0 ? tenants[0].tenant_id : null;
      }

      // Generate tokens
      const tokens = await this.generateTokens({
        id: user.id,
        email: user.email,
        userType: user.user_type,
        tenantId: primaryTenant,
        onboardingRequired: !isSaaSOwner && user.user_type === 'pending',
      });

      // Create session
      await this.createSession(user.id, tokens.refreshToken, deviceInfo, primaryTenant);

      // Cache session data
      await this.redisService.cacheUserSession(
        user.id,
        {
          ...user,
          tenantId: primaryTenant,
          loginAt: new Date(),
        },
        900
      );

      // Audit log
      this.auditLogger.logAuth(
        user.id,
        'LOGIN',
        { tenantId: primaryTenant, deviceInfo, isSaaSOwner },
        deviceInfo?.ipAddress,
        deviceInfo?.userAgent
      ).catch(err => this.logger.error('Failed to log auth event', err));

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          tenantId: primaryTenant,
          tenants: tenants.map(t => ({
            id: t.tenant_id,
            name: t.name,
            type: t.tenant_type,
          })),
          isSuperAdmin: user.is_super_admin || false,
          isSaaSOwner,
          onboardingRequired: !isSaaSOwner && user.user_type === 'pending',
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Login failed [${requestId}]`, error);
      throw error;
    }
  }


  /**
   * Social login (Google/Microsoft)
   */
  async loginWithSocial(provider: string, profile: any, deviceInfo?: DeviceInfo) {
    console.log("🚀 ~ AuthService ~ loginWithSocial ~ provider:", provider)
    return this.sqlService.transaction(async (transaction) => {
      const socialAccount = await transaction.request()
        .input('provider', provider)
        .input('providerId', profile.providerId)
        .query(`
          SELECT sa.*, u.* 
          FROM user_social_accounts sa
          JOIN users u ON sa.user_id = u.id
          WHERE sa.provider = @provider AND sa.provider_user_id = @providerId
        `);

      let user;
      let isNewUser = false;

      if (socialAccount.recordset.length > 0) {
        user = socialAccount.recordset[0];
        // Update tokens
        await transaction.request()
          .input('id', user.user_id)
          .input('accessToken', profile.accessToken)
          .input('refreshToken', profile.refreshToken || null)
          .query(`
            UPDATE user_social_accounts 
            SET access_token = @accessToken, 
                refresh_token = @refreshToken,
                token_expires_at = DATEADD(hour, 1, GETUTCDATE()),
                updated_at = GETUTCDATE()
            WHERE user_id = @id AND provider = '${provider}'
          `);
      } else {
        isNewUser = true;

        // Check if email exists
        const existingUser = await transaction.request()
          .input('email', profile.email)
          .query('SELECT * FROM users WHERE email = @email');

        if (existingUser.recordset.length > 0) {
          user = existingUser.recordset[0];
        } else {
          // Create new user with E2E keys
          const tempPassword = this.hashingService.generateRandomToken(32);
          const userKeys = this.encryptionService.generateUserKey(tempPassword);

          const userResult = await transaction.request()
            .input('email', profile.email)
            .input('firstName', profile.firstName)
            .input('lastName', profile.lastName)
            .input('avatarUrl', profile.avatar || null)
            .input('publicKey', userKeys.publicKey)
            .input('encryptedPrivateKey', userKeys.encryptedPrivateKey)
            .query(`
              INSERT INTO users (
                email, first_name, last_name, avatar_url,
                user_type, status, email_verified_at,
                public_key, encrypted_private_key, key_version, key_created_at
              ) OUTPUT INSERTED.*
              VALUES (
                @email, @firstName, @lastName, @avatarUrl,
                'pending', 'active', GETUTCDATE(),
                @publicKey, @encryptedPrivateKey, 1, GETUTCDATE()
              )
            `);

          user = userResult.recordset[0];
        }
        // Create social account link
        await transaction.request()
          .input('userId', user.id)
          .input('provider', provider)
          .input('providerId', profile.providerId)
          .input('email', profile.email)
          .input('accessToken', profile.accessToken)
          .input('refreshToken', profile.refreshToken || null)
          .query(`
            INSERT INTO user_social_accounts (
              user_id, provider, provider_user_id, provider_email,
              access_token, refresh_token, token_expires_at
            ) VALUES (
              @userId, @provider, @providerId, @email,
              @accessToken, @refreshToken, DATEADD(hour, 1, GETUTCDATE())
            )
          `);
      }

      // Get tenant memberships
      const tenants = await transaction.request()
        .input('userId', Number(user.user_id))
        .query(`
          SELECT tm.tenant_id, t.name, t.tenant_type
          FROM tenant_members tm
          JOIN tenants t ON tm.tenant_id = t.id
          WHERE tm.user_id = @userId AND tm.is_active = 1
        `);

      const primaryTenant = tenants.recordset.length > 0 ? tenants.recordset[0].tenant_id : null;

      const tokens = await this.generateTokens({
        id: user.user_id,
        email: user.email,
        userType: user.user_type || 'pending',
        tenantId: primaryTenant,
        onboardingRequired: user.user_type === 'pending',
      });

      await this.createSession(user.user_id, tokens.refreshToken, deviceInfo, primaryTenant);
      // Log event
      await this.logSystemEvent(user.user_id, `user.social_login.${provider}`, {
        email: user.email,
        isNewUser,
      }, primaryTenant);

      return {
        user: {
          id: user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type || 'pending',
          tenantId: primaryTenant,
          onboardingRequired: user.user_type === 'pending',
        },
        ...tokens,
      };
    });
  }

  /**
   * Create Agency (Multi-tenant)
   */
  async createAgency(dto: CreateAgencyDto, userId: number) {
    return this.sqlService.transaction(async (transaction) => {
      const slug = this.generateSlug(dto.name);

      // Generate tenant encryption keys
      const tenantKeys = this.encryptionService.generateTenantKey();

      // ✅ USE SP INSTEAD OF INLINE SQL
      const tenantResult = await this.sqlService.execute('sp_CreateTenant', {
        tenant_type: 'agency',
        name: dto.name,
        slug: slug,
        owner_user_id: userId,
        timezone: dto.timezone || 'UTC',
        locale: 'en-US',
      });

      const tenantId = tenantResult[0].id;

      // Create agency profile
      await transaction.request()
        .input('tenantId', tenantId)
        .input('industry', dto.industry || null)
        .query(`
        INSERT INTO agency_profiles (tenant_id, industry)
        VALUES (@tenantId, @industry)
      `);

      // Update user details
      await transaction.request()
        .input('userId', userId)
        .input('firstName', dto.firstName)
        .input('lastName', dto.lastName)
        .input('phone', dto.phone || null)
        .query(`
        UPDATE users 
        SET first_name = @firstName,
            last_name = @lastName,
            phone = @phone,
            user_type = 'agency_admin',
            onboarding_completed_at = GETUTCDATE(),
            updated_at = GETUTCDATE()
        WHERE id = @userId
      `);

      const tokens = await this.generateTokens({
        id: userId,
        email: (await transaction.request().input('userId', userId).query('SELECT email FROM users WHERE id = @userId')).recordset[0].email,
        userType: 'agency_admin',
        tenantId,
        onboardingRequired: false,
      });

      await this.createSession(userId, tokens.refreshToken, undefined, tenantId);

      // Log events
      await this.logSystemEvent(userId, 'tenant.created', {
        tenantId,
        tenantType: 'agency',
        name: dto.name,
      }, tenantId);

      await this.createAuditLog(userId, 'tenants', tenantId, 'CREATE', null, { name: dto.name }, tenantId);

      return {
        message: 'Agency created successfully',
        tenantId,
        ...tokens,
      };
    });
  }

  /**
   * Create Brand
   */
  async createBrand(dto: CreateBrandDto, userId: number) {
    return this.sqlService.transaction(async (transaction) => {
      const slug = this.generateSlug(dto.name);
      const tenantKeys = this.encryptionService.generateTenantKey();

      // ✅ USE SP
      const tenantResult = await this.sqlService.execute('sp_CreateTenant', {
        tenant_type: 'brand',
        name: dto.name,
        slug: slug,
        owner_user_id: userId,
        timezone: 'UTC',
        locale: 'en-US',
      });

      const tenantId = tenantResult[0].id;

      // Create brand_profile
      await transaction.request()
        .input('tenantId', tenantId)
        .input('website', dto.website || null)
        .input('industry', dto.industry || null)
        .query(`
        INSERT INTO brand_profiles (tenant_id, website_url, industry)
        VALUES (@tenantId, @website, @industry)
      `);

      const roleResult = await transaction.request()
        .query(`SELECT id FROM roles WHERE name = 'brand_admin' AND is_system_role = 1`);

      let roleId = null;
      if (roleResult.recordset.length > 0) {
        roleId = roleResult.recordset[0].id;

        await transaction.request()
          .input('userId', userId)
          .input('roleId', roleId)
          .query(`INSERT INTO user_roles (user_id, role_id, is_active) VALUES (@userId, @roleId, 1)`);
      }

      await transaction.request()
        .input('tenantId', tenantId)
        .input('userId', userId)
        .input('roleId', roleId)
        .query(`
          INSERT INTO tenant_members (tenant_id, user_id, role_id, member_type, is_active)
          VALUES (@tenantId, @userId, @roleId, 'staff', 1)
        `);

      await transaction.request()
        .input('userId', userId)
        .input('firstName', dto.firstName)
        .input('lastName', dto.lastName)
        .input('phone', dto.phone || null)
        .query(`
          UPDATE users 
          SET first_name = @firstName, last_name = @lastName, phone = @phone,
              user_type = 'brand_admin', onboarding_completed_at = GETUTCDATE()
          WHERE id = @userId
        `);

      const tokens = await this.generateTokens({
        id: userId,
        email: (await transaction.request().input('userId', userId).query('SELECT email FROM users WHERE id = @userId')).recordset[0].email,
        userType: 'brand_admin',
        tenantId,
        onboardingRequired: false,
      });

      await this.createSession(
        userId,
        tokens.refreshToken,
        undefined, // ✅ Changed from null
        tenantId
      ); await this.logSystemEvent(userId, 'tenant.created', { tenantId, tenantType: 'brand' }, tenantId);

      return {
        message: 'Brand created successfully',
        tenantId,
        ...tokens,
      };
    });
  }

  /**
   * Create Creator
   */
  async createCreator(dto: CreateCreatorDto, userId: number) {
    return this.sqlService.transaction(async (transaction) => {
      const slug = this.generateSlug(dto.stageName || `${dto.firstName}-${dto.lastName}`);
      const tenantKeys = this.encryptionService.generateTenantKey();

      const tenantResult = await this.sqlService.execute('sp_CreateTenant', {
        tenant_type: 'creator',
        name: dto.stageName || `${dto.firstName} ${dto.lastName}`,
        slug: slug,
        owner_user_id: userId,
        timezone: 'UTC',
        locale: 'en-US',
      });

      const tenantId = tenantResult[0].id;

      // Create creator_profile
      await transaction.request()
        .input('tenantId', tenantId)
        .input('stageName', dto.stageName || null)
        .input('bio', dto.bio || null)
        .query(`
          INSERT INTO creator_profiles (tenant_id, stage_name, bio, availability_status)
          VALUES (@tenantId, @stageName, @bio, 'available')
        `);

      const roleResult = await transaction.request()
        .query(`SELECT id FROM roles WHERE name = 'creator' AND is_system_role = 1`);

      let roleId = null;
      if (roleResult.recordset.length > 0) {
        roleId = roleResult.recordset[0].id;
        await transaction.request()
          .input('userId', userId)
          .input('roleId', roleId)
          .query(`INSERT INTO user_roles (user_id, role_id, is_active) VALUES (@userId, @roleId, 1)`);
      }

      await transaction.request()
        .input('tenantId', tenantId)
        .input('userId', userId)
        .input('roleId', roleId)
        .query(`
          INSERT INTO tenant_members (tenant_id, user_id, role_id, member_type, is_active)
          VALUES (@tenantId, @userId, @roleId, 'staff', 1)
        `);

      await transaction.request()
        .input('userId', userId)
        .input('firstName', dto.firstName)
        .input('lastName', dto.lastName)
        .input('phone', dto.phone || null)
        .query(`
          UPDATE users 
          SET first_name = @firstName, last_name = @lastName, phone = @phone,
              user_type = 'creator', onboarding_completed_at = GETUTCDATE()
          WHERE id = @userId
        `);

      const tokens = await this.generateTokens({
        id: userId,
        email: (await transaction.request().input('userId', userId).query('SELECT email FROM users WHERE id = @userId')).recordset[0].email,
        userType: 'creator',
        tenantId,
        onboardingRequired: false,
      });

      await this.createSession(
        userId,
        tokens.refreshToken,
        undefined, // ✅ Changed from null
        tenantId
      ); await this.logSystemEvent(userId, 'tenant.created', { tenantId, tenantType: 'creator' }, tenantId);

      return {
        message: 'Creator profile created successfully',
        tenantId,
        ...tokens,
      };
    });
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.secret'),
      });

      const session = await this.sqlService.query(
        `SELECT * FROM user_sessions 
         WHERE refresh_token = @token AND is_active = 1 AND expires_at > GETUTCDATE()`,
        { token: refreshToken }
      );

      if (session.length === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const users = await this.sqlService.query(
        'SELECT * FROM users WHERE id = @userId AND status = \'active\'',
        { userId: payload.sub }
      );

      if (users.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens({
        id: users[0].id,
        email: users[0].email,
        userType: users[0].user_type,
        tenantId: session[0].active_tenant_id,
      });

      await this.sqlService.query(
        `UPDATE user_sessions 
         SET refresh_token = @newToken, expires_at = DATEADD(day, 7, GETUTCDATE())
         WHERE id = @sessionId`,
        { newToken: tokens.refreshToken, sessionId: session[0].id }
      );

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout
   */
  async logout(userId: number) {
    await this.sqlService.query(
      'UPDATE user_sessions SET is_active = 0 WHERE user_id = @userId',
      { userId }
    );

    await this.logSystemEvent(userId, 'user.logged_out', {});

    return { message: 'Logged out successfully' };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const users = await this.sqlService.query(
      'SELECT id FROM users WHERE email = @email AND status = \'active\'',
      { email }
    );

    if (users.length === 0) {
      return { message: 'If email exists, reset link will be sent' };
    }

    const token = this.hashingService.generateRandomToken(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.sqlService.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES (@userId, @token, @expiresAt)`,
      { userId: users[0].id, token, expiresAt }
    );

    await this.logSystemEvent(users[0].id, 'user.password_reset_requested', { email });
    await this.emailService.sendPasswordResetEmail(email, token);
    return { message: 'If email exists, reset link will be sent', token };
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    const result = await this.sqlService.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = @token AND expires_at > GETUTCDATE() AND used_at IS NULL`,
      { token }
    );

    if (result.length === 0) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const resetToken = result[0];
    const passwordHash = await this.hashingService.hashPassword(newPassword);

    // Regenerate user encryption keys with new password
    const userKeys = this.encryptionService.generateUserKey(newPassword);

    await this.sqlService.transaction(async (transaction) => {
      await transaction.request()
        .input('userId', resetToken.user_id)
        .input('passwordHash', passwordHash)
        .input('publicKey', userKeys.publicKey)
        .input('encryptedPrivateKey', userKeys.encryptedPrivateKey)
        .query(`
          UPDATE users 
          SET password_hash = @passwordHash, 
              password_changed_at = GETUTCDATE(),
              public_key = @publicKey,
              encrypted_private_key = @encryptedPrivateKey,
              key_version = key_version + 1,
              key_rotated_at = GETUTCDATE()
          WHERE id = @userId
        `);

      await transaction.request()
        .input('tokenId', resetToken.id)
        .query(`UPDATE password_reset_tokens SET used_at = GETUTCDATE() WHERE id = @tokenId`);
    });

    await this.logSystemEvent(resetToken.user_id, 'user.password_reset', {});

    return { message: 'Password reset successful' };
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string) {
    const users = await this.sqlService.query(
      'SELECT id, email_verified_at FROM users WHERE email = @email',
      { email }
    );

    if (users.length === 0) {
      throw new BadRequestException('User not found');
    }

    if (users[0].email_verified_at) {
      throw new BadRequestException('Email already verified');
    }

    await this.verificationService.deleteVerificationCodes(email, 'email_verify');
    await this.verificationService.sendVerificationCode(email, 'email_verify', users[0].id);

    return { message: 'Verification code sent successfully' };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async generateTokens(user: any) {
    // Check if user is super_admin or saas_admin (no onboarding needed)
    const skipOnboarding = ['super_admin', 'saas_admin'].includes(user.userType);

    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      tenantId: user.tenantId || null,
      onboardingRequired: skipOnboarding ? false : (user.onboardingRequired !== false),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.accessTokenExpiry'),
        issuer: this.configService.get('jwt.issuer'),
        audience: this.configService.get('jwt.audience'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.refreshTokenExpiry'),
        issuer: this.configService.get('jwt.issuer'),
        audience: this.configService.get('jwt.audience'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: number,
    refreshToken: string,
    deviceInfo?: DeviceInfo,
    tenantId?: number | null
  ) {
    const sessionToken = this.hashingService.generateRandomToken();

    await this.sqlService.query(
      `INSERT INTO user_sessions (
        user_id, active_tenant_id, session_token, refresh_token, expires_at, is_active,
        device_fingerprint, device_name, device_type,
        browser_name, browser_version, os_name, os_version, ip_address
      ) VALUES (
        @userId, @tenantId, @sessionToken, @refreshToken, DATEADD(day, 7, GETUTCDATE()), 1,
        @deviceFingerprint, @deviceName, @deviceType,
        @browserName, @browserVersion, @osName, @osVersion, @ipAddress
      )`,
      {
        userId,
        tenantId: tenantId || null,
        sessionToken,
        refreshToken,
        deviceFingerprint: deviceInfo?.deviceFingerprint || null,
        deviceName: deviceInfo?.deviceName || null,
        deviceType: deviceInfo?.deviceType || null,
        browserName: deviceInfo?.browserName || null,
        browserVersion: deviceInfo?.browserVersion || null,
        osName: deviceInfo?.osName || null,
        osVersion: deviceInfo?.osVersion || null,
        ipAddress: deviceInfo?.ipAddress || null,
      }
    );
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Math.random().toString(36).substring(7);
  }

  private async logSystemEvent(
    userId: number,
    eventName: string,
    eventData: any,
    tenantId?: number | null
  ) {
    try {
      await this.sqlService.query(
        `INSERT INTO system_events (
          tenant_id, user_id, event_type, event_name, event_data
        ) VALUES (@tenantId, @userId, @eventType, @eventName, @eventData)`,
        {
          tenantId: tenantId || null,
          userId,
          eventType: eventName.split('.')[0],
          eventName,
          eventData: JSON.stringify(eventData),
        }
      );
    } catch (error) {
      this.logger.error('Failed to log system event', error);
    }
  }

  private async createAuditLog(
    userId: number,
    entityType: string,
    entityId: number,
    actionType: string,
    oldValues: any,
    newValues: any,
    tenantId?: number | null
  ) {
    try {
      await this.sqlService.query(
        `INSERT INTO audit_logs (
          tenant_id, user_id, entity_type, entity_id, action_type, 
          old_values, new_values
        ) VALUES (@tenantId, @userId, @entityType, @entityId, @actionType, @oldValues, @newValues)`,
        {
          tenantId: tenantId || null,
          userId,
          entityType,
          entityId,
          actionType,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
        }
      );
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
    }
  }

  async getUserSessions(userId: number) {
    const sessions = await this.sqlService.execute('sp_GetUserSessions', {
      userId,
    });

    return {
      sessions: sessions.map(session => ({
        id: session.id,
        deviceName: session.device_name,
        deviceType: session.device_type,
        browserName: session.browser_name,
        osName: session.os_name,
        ipAddress: session.ip_address,
        lastActivityAt: session.last_activity_at,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
      })),
    };
  }

}
