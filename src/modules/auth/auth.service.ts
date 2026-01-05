// src/modules/auth/auth.service.ts - UPDATED FOR E2E ENCRYPTION
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SqlServerService } from '../../core/database/sql-server.service';
import { HashingService } from '../../common/hashing.service';
import { EnhancedEncryptionService } from '../../common/enhanced-encryption.service';
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
    private encryptionService: EnhancedEncryptionService, // Updated to use EnhancedEncryptionService
    private verificationService: VerificationService,
    private configService: ConfigService,
    private redisService: RedisService,
    private auditLogger: AuditLoggerService,
    private emailService: EmailService,
  ) { }

  /**
   * Register new user with E2E encryption keys
   */
  async register(registerDto: RegisterDto) {
    // Check for existing user
    const existing = await this.sqlService.query(
      'SELECT id, email_verified_at, status FROM users WHERE email = @email',
      { email: registerDto.email },
    );

    if (existing.length > 0 && existing[0].email_verified_at) {
      throw new ConflictException('Email already registered and verified');
    }

    // Hash password for authentication
    const passwordHash = await this.hashingService.hashPassword(
      registerDto.password,
    );

    // Begin transaction
    return this.sqlService.transaction(async (transaction) => {
      let userId: number;

      if (existing.length > 0) {
        // Update existing unverified user
        userId = existing[0].id;
        await transaction
          .request()
          .input('userId', userId)
          .input('passwordHash', passwordHash).query(`
            UPDATE users 
            SET password_hash = @passwordHash, 
                updated_at = GETUTCDATE()
            WHERE id = @userId
          `);

        // Delete any existing verification codes
        await this.verificationService.deleteVerificationCodes(
          registerDto.email,
          'email_verify',
        );
      } else {
        // Create new user
        const userResult = await transaction
          .request()
          .input('email', registerDto.email)
          .input('passwordHash', passwordHash).query(`
            INSERT INTO users (
              email, password_hash, user_type, status
            )
            OUTPUT INSERTED.id
            VALUES (
              @email, @passwordHash, 'pending', 'pending'
            )
          `);
        userId = userResult.recordset[0].id;
      }

      // Generate E2E encryption keys
      try {
        const keyData = await this.encryptionService.generateUserKeyPair(
          userId,
          registerDto.password,
        );

        // Store encryption keys using stored procedure
        const keyId = await this.encryptionService.storeUserEncryptionKey(
          userId,
          keyData,
        );

        this.logger.log(
          `User ${userId} registered with encryption key ID: ${keyId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate encryption keys for user ${userId}`,
          error,
        );
        throw new Error('Failed to set up encryption');
      }

      // Send verification code
      const { code, expiresAt } =
        await this.verificationService.sendVerificationCode(
          registerDto.email,
          'email_verify',
          userId,
        );

      // Log system event
      await this.logSystemEvent(userId, 'user.registered', {
        email: registerDto.email,
        hasEncryptionKeys: true,
        keyVersion: 1,
      });

      return {
        message:
          'Registration initiated. Please check your email for verification code.',
        email: registerDto.email,
        requiresVerification: true,
      };
    });
  }

  /**
   * Verify email registration
   */
  async verifyRegistration(email: string, code: string) {
    await this.verificationService.verifyCode(email, code, 'email_verify');

    const users = await this.sqlService.query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name,
              u.status, u.email_verified_at, u.user_type, u.is_super_admin, 
              vc.user_id AS vc_user_id,
              STRING_AGG(r.name, ',') AS roles
       FROM users u
       JOIN verification_codes vc ON u.id = vc.user_id
       LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = @email AND vc.code = @code AND vc.used_at IS NOT NULL
       GROUP BY u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name,
                u.status, u.email_verified_at, u.user_type, u.is_super_admin, vc.user_id`,
      { email, code },
    );

    if (users.length === 0) {
      throw new BadRequestException('User not found');
    }

    const user = users[0];

    // Update user status
    await this.sqlService.query(
      `UPDATE users 
       SET email_verified_at = GETUTCDATE(), status = 'active'
       WHERE id = @userId`,
      { userId: user.id },
    );

    // Check if user has encryption keys
    const userKey = await this.encryptionService.getUserActiveKey(user.id);
    if (!userKey) {
      this.logger.warn(`User ${user.id} verified but has no encryption keys`);
    }

    // Check if user is SaaS owner
    const userRoles = user.roles ? user.roles.split(',') : [];
    const isSaaSOwner =
      userRoles.includes('super_admin') ||
      userRoles.includes('saas_admin') ||
      user.is_super_admin;

    // Log event
    await this.logSystemEvent(user.id, 'user.email_verified', {
      email,
      hasEncryptionKeys: !!userKey,
    });
    await this.sqlService.query(
      `UPDATE notifications
       SET recipient_id = @userId,
           updated_at = GETUTCDATE()
       WHERE JSON_VALUE(data, '$.inviteeEmail') = @email
         AND recipient_id IS NULL
         AND event_type = 'agency_invitation_to_creator_for_join'`,
      {
        userId: user.id,
        email: user.email
      },
    );
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
        hasEncryptionKeys: !!userKey,
      },
      ...tokens,
    };
  }

  /**
   * Login user and verify encryption keys
   */
  async login(loginDto: LoginDto, deviceInfo?: DeviceInfo) {
    const requestId = crypto.randomUUID();

    try {
      // Rate limiting
      const { allowed } = await this.redisService.checkRateLimit(
        `login:${loginDto.email}`,
        5,
        300,
      );

      if (!allowed) {
        await this.auditLogger.logSecurityEvent(
          'BRUTE_FORCE',
          null,
          { email: loginDto.email, ip: deviceInfo?.ipAddress },
          deviceInfo?.ipAddress,
        );
        throw new UnauthorizedException(
          'Too many login attempts. Please try again later.',
        );
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
        { email: loginDto.email },
      );

      if (users.length === 0) {
        await this.auditLogger.logAuth(
          0,
          'FAILED_LOGIN',
          { reason: 'user_not_found', email: loginDto.email },
          deviceInfo?.ipAddress,
          deviceInfo?.userAgent,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      const user = users[0];

      // Verify password
      if (!user?.password_hash) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await this.hashingService.comparePassword(
        loginDto.password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        await this.auditLogger.logAuth(
          user.id,
          'FAILED_LOGIN',
          { reason: 'invalid_password' },
          deviceInfo?.ipAddress,
          deviceInfo?.userAgent,
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

      // Check encryption keys
      const userKey = await this.encryptionService.getUserActiveKey(user.id);
      if (!userKey) {
        this.logger.warn(
          `User ${user.id} logged in but has no encryption keys`,
        );
        // Optionally generate keys here for backward compatibility
      }

      // Update login stats
      this.sqlService
        .query(
          `UPDATE users 
         SET last_login_at = GETUTCDATE(), 
             login_count = login_count + 1,
             last_active_at = GETUTCDATE()
         WHERE id = @userId`,
          { userId: user.id },
        )
        .catch((err) => this.logger.error('Failed to update login stats', err));

      // Check roles
      const userRoles = user.roles ? user.roles.split(',') : [];
      const isSaaSOwner =
        userRoles.includes('super_admin') ||
        userRoles.includes('saas_admin') ||
        user.is_super_admin;

      let primaryTenant = null;
      let tenants: any = [];

      // Get tenants if not SaaS owner
      if (!isSaaSOwner) {
        const tenantCacheKey = `user:${user.id}:tenants`;
        tenants = await this.redisService.getCachedQuery(tenantCacheKey);

        if (!tenants) {
          tenants = await this.sqlService.query(
            `SELECT tm.tenant_id, t.name, t.tenant_type, tm.role_id
             FROM tenant_members tm
             JOIN tenants t ON tm.tenant_id = t.id
             WHERE tm.user_id = @userId AND tm.is_active = 1`,
            { userId: user.id },
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
      await this.createSession(
        user.id,
        tokens.refreshToken,
        deviceInfo,
        primaryTenant,
      );

      // Cache session data
      await this.redisService.cacheUserSession(
        user.id,
        {
          ...user,
          tenantId: primaryTenant,
          loginAt: new Date(),
          hasEncryptionKeys: !!userKey,
          keyVersion: userKey?.key_version || 0,
        },
        900,
      );

      // Audit log
      this.auditLogger
        .logAuth(
          user.id,
          'LOGIN',
          {
            tenantId: primaryTenant,
            deviceInfo,
            isSaaSOwner,
            hasEncryptionKeys: !!userKey,
          },
          deviceInfo?.ipAddress,
          deviceInfo?.userAgent,
        )
        .catch((err) => this.logger.error('Failed to log auth event', err));
      const userEmail = user.email;
      await this.sqlService.query(
        `UPDATE notifications
        SET recipient_id = @userId,
            tenant_id = CASE 
              WHEN @primaryTenant IS NOT NULL THEN @primaryTenant 
              ELSE tenant_id 
            END,
            updated_at = GETUTCDATE()
        WHERE JSON_VALUE(data, '$.inviteeEmail') = @userEmail
     AND recipient_id IS NULL`,
        {
          userId: user.id,
          userEmail,
          primaryTenant: primaryTenant || null
        },
      );
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          tenantId: primaryTenant,
          tenants: tenants.map((t) => ({
            id: t.tenant_id,
            name: t.name,
            type: t.tenant_type,
          })),
          isSuperAdmin: user.is_super_admin || false,
          isSaaSOwner,
          onboardingRequired: !isSaaSOwner && user.user_type === 'pending',
          hasEncryptionKeys: !!userKey,
          publicKeyFingerprint: userKey?.key_fingerprint_short || null,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Login failed [${requestId}]`, error);
      throw error;
    }
  }

  /**
   * Reset password and rotate encryption keys
   */
  async resetPassword(token: string, newPassword: string) {
    const result = await this.sqlService.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = @token AND expires_at > GETUTCDATE() AND used_at IS NULL`,
      { token },
    );

    if (result.length === 0) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const resetToken = result[0];
    const passwordHash = await this.hashingService.hashPassword(newPassword);

    await this.sqlService.transaction(async (transaction) => {
      // Update password
      await transaction
        .request()
        .input('userId', resetToken.user_id)
        .input('passwordHash', passwordHash).query(`
          UPDATE users 
          SET password_hash = @passwordHash, 
              password_changed_at = GETUTCDATE()
          WHERE id = @userId
        `);

      // Rotate encryption keys with new password
      try {
        await this.encryptionService.rotateUserKey(
          resetToken.user_id,
          newPassword,
          'password_reset',
        );
        this.logger.log(
          `Encryption keys rotated for user ${resetToken.user_id} after password reset`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to rotate keys for user ${resetToken.user_id}`,
          error,
        );
        // Don't fail the password reset if key rotation fails
        // Keys can be rotated later
      }

      // Mark reset token as used
      await transaction
        .request()
        .input('tokenId', resetToken.id)
        .query(
          `UPDATE password_reset_tokens SET used_at = GETUTCDATE() WHERE id = @tokenId`,
        );
    });

    await this.logSystemEvent(resetToken.user_id, 'user.password_reset', {
      keysRotated: true,
    });

    return { message: 'Password reset successful' };
  }

  /**
   * Social login with key generation
   */
  async loginWithSocial(
    provider: string,
    profile: any,
    deviceInfo?: DeviceInfo,
  ) {
    return this.sqlService.transaction(async (transaction) => {
      const socialAccount = await transaction
        .request()
        .input('provider', provider)
        .input('providerId', profile.providerId).query(`
          SELECT sa.*, u.* 
          FROM user_social_accounts sa
          JOIN users u ON sa.user_id = u.id
          WHERE sa.provider = @provider AND sa.provider_user_id = @providerId
        `);

      let user;
      let isNewUser = false;
      let hasEncryptionKeys = false;

      if (socialAccount.recordset.length > 0) {
        user = socialAccount.recordset[0];

        // Check if user has encryption keys
        const userKey = await this.encryptionService.getUserActiveKey(
          user.user_id,
        );
        hasEncryptionKeys = !!userKey;

        // Update tokens
        await transaction
          .request()
          .input('id', user.user_id)
          .input('accessToken', profile.accessToken)
          .input('refreshToken', profile.refreshToken || null).query(`
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
        const existingUser = await transaction
          .request()
          .input('email', profile.email)
          .query('SELECT * FROM users WHERE email = @email');

        if (existingUser.recordset.length > 0) {
          user = existingUser.recordset[0];
        } else {
          // Create new user
          const userResult = await transaction
            .request()
            .input('email', profile.email)
            .input('firstName', profile.firstName)
            .input('lastName', profile.lastName)
            .input('avatarUrl', profile.avatar || null).query(`
              INSERT INTO users (
                email, first_name, last_name, avatar_url,
                user_type, status, email_verified_at
              ) OUTPUT INSERTED.*
              VALUES (
                @email, @firstName, @lastName, @avatarUrl,
                'pending', 'active', GETUTCDATE()
              )
            `);

          user = userResult.recordset[0];

          // Generate encryption keys with temporary password
          const tempPassword = this.hashingService.generateRandomToken(32);
          try {
            const keyData = await this.encryptionService.generateUserKeyPair(
              user.id,
              tempPassword,
            );
            await this.encryptionService.storeUserEncryptionKey(
              user.id,
              keyData,
            );
            hasEncryptionKeys = true;

            // TODO: Send email to user about setting up their password
            // to properly encrypt their private key
          } catch (error) {
            this.logger.error(
              `Failed to generate keys for social user ${user.id}`,
              error,
            );
          }
        }

        // Create social account link
        await transaction
          .request()
          .input('userId', user.id)
          .input('provider', provider)
          .input('providerId', profile.providerId)
          .input('email', profile.email)
          .input('accessToken', profile.accessToken)
          .input('refreshToken', profile.refreshToken || null).query(`
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
      const tenants = await transaction
        .request()
        .input('userId', Number(user.user_id || user.id)).query(`
          SELECT tm.tenant_id, t.name, t.tenant_type
          FROM tenant_members tm
          JOIN tenants t ON tm.tenant_id = t.id
          WHERE tm.user_id = @userId AND tm.is_active = 1
        `);

      const primaryTenant =
        tenants.recordset.length > 0 ? tenants.recordset[0].tenant_id : null;

      const tokens = await this.generateTokens({
        id: user.user_id || user.id,
        email: user.email,
        userType: user.user_type || 'pending',
        tenantId: primaryTenant,
        onboardingRequired: user.user_type === 'pending',
      });

      await this.createSession(
        user.user_id || user.id,
        tokens.refreshToken,
        deviceInfo,
        primaryTenant,
      );

      // Log event
      await this.logSystemEvent(
        user.user_id || user.id,
        `user.social_login.${provider}`,
        {
          email: user.email,
          isNewUser,
          hasEncryptionKeys,
        },
        primaryTenant,
      );

      return {
        user: {
          id: user.user_id || user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type || 'pending',
          tenantId: primaryTenant,
          onboardingRequired: user.user_type === 'pending',
          hasEncryptionKeys,
        },
        ...tokens,
      };
    });
  }

  // ============================================
  // HELPER METHODS (unchanged)
  // ============================================

  private async generateTokens(user: any) {
    const skipOnboarding = ['super_admin', 'saas_admin'].includes(
      user.userType,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      tenantId: user.tenantId || null,
      onboardingRequired: skipOnboarding
        ? false
        : user.onboardingRequired !== false,
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
    tenantId?: number | null,
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
      },
    );
  }

  private async logSystemEvent(
    userId: number,
    eventName: string,
    eventData: any,
    tenantId?: number | null,
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
        },
      );
    } catch (error) {
      this.logger.error('Failed to log system event', error);
    }
  }

  async getUserSessions(userId: number) {
    const sessions = await this.sqlService.execute('sp_GetUserSessions', {
      userId,
    });

    return {
      sessions: sessions.map((session) => ({
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
        { token: refreshToken },
      );

      if (session.length === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const users = await this.sqlService.query(
        "SELECT * FROM users WHERE id = @userId AND status = 'active'",
        { userId: payload.sub },
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
        { newToken: tokens.refreshToken, sessionId: session[0].id },
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
      { userId },
    );

    await this.logSystemEvent(userId, 'user.logged_out', {});

    return { message: 'Logged out successfully' };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const users = await this.sqlService.query(
      "SELECT id FROM users WHERE email = @email AND status = 'active'",
      { email },
    );

    if (users.length === 0) {
      return { message: 'If email exists, reset link will be sent' };
    }

    const token = this.hashingService.generateRandomToken(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.sqlService.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES (@userId, @token, @expiresAt)`,
      { userId: users[0].id, token, expiresAt },
    );

    await this.logSystemEvent(users[0].id, 'user.password_reset_requested', {
      email,
    });
    await this.emailService.sendPasswordResetEmail(email, token);
    return { message: 'If email exists, reset link will be sent', token };
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string) {
    const users = await this.sqlService.query(
      'SELECT id, email_verified_at FROM users WHERE email = @email',
      { email },
    );

    if (users.length === 0) {
      throw new BadRequestException('User not found');
    }

    if (users[0].email_verified_at) {
      throw new BadRequestException('Email already verified');
    }

    await this.verificationService.deleteVerificationCodes(
      email,
      'email_verify',
    );
    await this.verificationService.sendVerificationCode(
      email,
      'email_verify',
      users[0].id,
    );

    return { message: 'Verification code sent successfully' };
  }

  private generateSlug(text: string): string {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.random().toString(36).substring(7)
    );
  }

  // Keep createAgency, createBrand, createCreator methods unchanged

  async createAgency(dto: CreateAgencyDto, userId: number) {
    return this.sqlService.transaction(async (transaction) => {
      const slug = this.generateSlug(dto.name);

      const tenantResult = await this.sqlService.execute('sp_CreateTenant', {
        tenant_type: 'agency',
        name: dto.name,
        slug: slug,
        owner_user_id: userId,
        timezone: dto.timezone || 'UTC',
        locale: 'en-US',
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      });

      const tenantId = tenantResult[0].id;

      await this.assignDefaultFreePlan(tenantId, 'agency');

      await this.sqlService.query(
        `INSERT INTO agency_profiles (
          tenant_id, agency_name, website_url, industry_specialization, 
          description, company_size
        )
        VALUES (
          @tenantId, @agencyName, @websiteUrl, @industrySpecialization,
          @description, @companySize
        )`,
        {
          tenantId,
          agencyName: dto.name,
          websiteUrl: dto.websiteUrl || null,
          industrySpecialization: dto.industry || null,
          description: dto.description || null,
          companySize: dto.companySize || null,
        }
      );

      await this.sqlService.query(
        `UPDATE users 
        SET first_name = @firstName,
            last_name = @lastName,
            phone = @phone,
            user_type = 'agency_admin',
            onboarding_completed_at = GETUTCDATE(),
            updated_at = GETUTCDATE()
        WHERE id = @userId`,
        {
          userId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone || null,
        }
      );

      const userEmail = await this.sqlService.query(
        'SELECT email FROM users WHERE id = @userId',
        { userId }
      );

      const tokens = await this.generateTokens({
        id: userId,
        email: userEmail[0].email,
        userType: 'agency_admin',
        tenantId,
        onboardingRequired: false,
      });

      await this.createSession(
        userId,
        tokens.refreshToken,
        undefined,
        tenantId,
      );

      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'tenants',
        entityId: tenantId,
        actionType: 'CREATE',
        newValues: {
          tenantType: 'agency',
          name: dto.name,
          slug,
          timezone: dto.timezone || 'UTC',
          metadata: dto.metadata,
        },
        severity: 'medium',
      });

      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'users',
        entityId: userId,
        actionType: 'UPDATE',
        oldValues: { userType: 'pending' },
        newValues: {
          userType: 'agency_admin',
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          onboardingCompleted: true,
        },
        severity: 'medium',
      });

      await this.logSystemEvent(
        userId,
        'tenant.created',
        {
          tenantId,
          tenantType: 'agency',
          name: dto.name,
          metadata: dto.metadata,
        },
        tenantId,
      );

      return {
        message: 'Agency created successfully',
        user: {
          id: userId,
          email: userEmail[0].email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userType: 'agency_admin',
          tenantId,
          onboardingRequired: false,
          onboardingCompleted: true,
        },
        tenantId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async createBrand(dto: CreateBrandDto, userId: number) {
    return this.sqlService.transaction(async (transaction) => {
      const slug = this.generateSlug(dto.name);

      const tenantResult = await this.sqlService.execute('sp_CreateTenant', {
        tenant_type: 'brand',
        name: dto.name,
        slug: slug,
        owner_user_id: userId,
        timezone: 'UTC',
        locale: 'en-US',
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      });

      const tenantId = tenantResult[0].id;
      // ✅ ASSIGN DEFAULT FREE PLAN
      await this.assignDefaultFreePlan(tenantId, 'brand');

      // Create brand profile with onboarding data
      await transaction
        .request()
        .input('tenantId', tenantId)
        .input('website', dto.website || null)
        .input('industry', dto.industry || null)
        .input('description', dto.description || null).query(`
        INSERT INTO brand_profiles (tenant_id, website_url, industry, description)
        VALUES (@tenantId, @website, @industry, @description)
      `);

      await transaction
        .request()
        .input('userId', userId)
        .input('firstName', dto.firstName)
        .input('lastName', dto.lastName)
        .input('phone', dto.phone || null).query(`
        UPDATE users 
        SET first_name = @firstName, last_name = @lastName, phone = @phone,
            user_type = 'brand_admin', onboarding_completed_at = GETUTCDATE()
        WHERE id = @userId
      `);

      const userEmail = await transaction
        .request()
        .input('userId', userId)
        .query('SELECT email FROM users WHERE id = @userId');

      const tokens = await this.generateTokens({
        id: userId,
        email: userEmail.recordset[0].email,
        userType: 'brand_admin',
        tenantId,
        onboardingRequired: false,
      });

      await this.createSession(
        userId,
        tokens.refreshToken,
        undefined,
        tenantId,
      );

      // ✅ Audit log for tenant creation
      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'tenants',
        entityId: tenantId,
        actionType: 'CREATE',
        newValues: {
          tenantType: 'brand',
          name: dto.name,
          slug,
          website: dto.website,
          industry: dto.industry,
          metadata: dto.metadata,
        },
        severity: 'medium',
      });

      // ✅ Audit log for user role assignment
      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'users',
        entityId: userId,
        actionType: 'UPDATE',
        oldValues: { userType: 'pending' },
        newValues: {
          userType: 'brand_admin',
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          onboardingCompleted: true,
        },
        severity: 'medium',
      });

      // Log system event
      await this.logSystemEvent(
        userId,
        'tenant.created',
        {
          tenantId,
          tenantType: 'brand',
          metadata: dto.metadata,
        },
        tenantId,
      );

      return {
        message: 'Brand created successfully',
        user: {
          id: userId,
          email: userEmail.recordset[0].email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userType: 'brand_admin',
          tenantId,
          onboardingRequired: false,
          onboardingCompleted: true, // ✅ Add this
        },
        tenantId,
        accessToken: tokens.accessToken, // ✅ Ensure this is included
        refreshToken: tokens.refreshToken, // ✅ Ensure this is included
      };
    });
  }

  async createCreator(dto: CreateCreatorDto, userId: number) {
    return this.sqlService.transaction(async (transaction) => {
      const slug = this.generateSlug(
        dto.stageName || `${dto.firstName}-${dto.lastName}`,
      );

      const tenantResult = await this.sqlService.execute('sp_CreateTenant', {
        tenant_type: 'creator',
        name: dto.stageName || `${dto.firstName} ${dto.lastName}`,
        slug: slug,
        owner_user_id: userId,
        timezone: 'UTC',
        locale: 'en-US',
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      });

      const tenantId = tenantResult[0].id;
      // ✅ ASSIGN DEFAULT FREE PLAN
      await this.assignDefaultFreePlan(tenantId, 'creator');

      // Create creator profile with onboarding data
      await transaction
        .request()
        .input('tenantId', tenantId)
        .input('stageName', dto.stageName || null)
        .input('bio', dto.bio || null)
        .input('location', dto.location || null).query(`
        INSERT INTO creator_profiles (tenant_id, stage_name, bio, location, availability_status)
        VALUES (@tenantId, @stageName, @bio, @location, 'available')
      `);
      await transaction
        .request()
        .input('userId', userId)
        .input('firstName', dto.firstName)
        .input('lastName', dto.lastName)
        .input('phone', dto.phone || null).query(`
        UPDATE users 
        SET first_name = @firstName, last_name = @lastName, phone = @phone,
            user_type = 'creator', onboarding_completed_at = GETUTCDATE()
        WHERE id = @userId
      `);

      const userEmail = await transaction
        .request()
        .input('userId', userId)
        .query('SELECT email FROM users WHERE id = @userId');

      const tokens = await this.generateTokens({
        id: userId,
        email: userEmail.recordset[0].email,
        userType: 'creator',
        tenantId,
        onboardingRequired: false,
        onboardingCompleted: true,
      });

      await this.createSession(
        userId,
        tokens.refreshToken,
        undefined,
        tenantId,
      );
      await this.sqlService.query(
        `UPDATE notifications
       SET recipient_id = @userId,
           updated_at = GETUTCDATE()
       WHERE JSON_VALUE(data, '$.inviteeEmail') = @email
         AND recipient_id IS NULL
         AND event_type = 'agency_invitation_to_creator_for_join'`,
        {
          userId: userId,
          email: userEmail.recordset[0].email
        },
      );
      // ✅ Audit log for tenant creation
      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'tenants',
        entityId: tenantId,
        actionType: 'CREATE',
        newValues: {
          tenantType: 'creator',
          name: dto.stageName || `${dto.firstName} ${dto.lastName}`,
          slug,
          stageName: dto.stageName,
          bio: dto.bio,
          metadata: dto.metadata,
        },
        severity: 'medium',
      });

      // ✅ Audit log for user role assignment
      await this.auditLogger.log({
        tenantId,
        userId,
        entityType: 'users',
        entityId: userId,
        actionType: 'UPDATE',
        oldValues: { userType: 'pending' },
        newValues: {
          userType: 'creator',
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          onboardingCompleted: true,
        },
        severity: 'medium',
      });

      // Log system event
      await this.logSystemEvent(
        userId,
        'tenant.created',
        {
          tenantId,
          tenantType: 'creator',
          metadata: dto.metadata,
        },
        tenantId,
      );

      return {
        message: 'Creator profile created successfully',
        user: {
          id: userId,
          email: userEmail.recordset[0].email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userType: 'creator',
          tenantId,
          onboardingRequired: false,
          onboardingCompleted: true, // ✅ Add this
        },
        tenantId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      // Verify old password
      const users = await this.sqlService.query(
        'SELECT password_hash FROM users WHERE id = @userId',
        { userId },
      );

      if (!users?.[0]?.password_hash) {
        throw new BadRequestException('User not found');
      }

      const isValid = await this.hashingService.comparePassword(
        oldPassword,
        users[0].password_hash,
      );

      if (!isValid) {
        throw new BadRequestException('Incorrect old password');
      }

      // Hash new password
      const newPasswordHash =
        await this.hashingService.hashPassword(newPassword);

      // Update password in transaction
      await this.sqlService.transaction(async (transaction) => {
        // Update password
        await transaction
          .request()
          .input('userId', userId)
          .input('passwordHash', newPasswordHash).query(`
          UPDATE users 
          SET password_hash = @passwordHash,
              password_changed_at = GETUTCDATE()
          WHERE id = @userId
        `);

        // Rotate encryption keys
        await this.encryptionService.changeUserPassword(
          userId,
          oldPassword,
          newPassword,
        );
      });

      // Log event
      await this.logSystemEvent(userId, 'user.password_changed', {
        keysRotated: true,
      });

      return { message: 'Password changed successfully' };
    } catch (error) {
      this.logger.error(`Password change failed for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Admin recover user account
   */
  async adminRecoverUserAccount(
    userId: number,
    adminUserId: number,
    newPassword: string,
    reason: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    try {
      // Verify super admin permission
      const admin = await this.sqlService.query(
        'SELECT is_super_admin FROM users WHERE id = @userId',
        { userId: adminUserId },
      );

      if (!admin?.[0]?.is_super_admin) {
        throw new Error('Super admin permission required');
      }

      // Hash new password
      const newPasswordHash =
        await this.hashingService.hashPassword(newPassword);

      // Update password and recover keys
      await this.sqlService.transaction(async (transaction) => {
        // Update password
        await transaction
          .request()
          .input('userId', userId)
          .input('passwordHash', newPasswordHash).query(`
          UPDATE users 
          SET password_hash = @passwordHash,
              password_changed_at = GETUTCDATE()
          WHERE id = @userId
        `);

        // Recover encryption keys
        await this.encryptionService.recoverUserAccess(
          userId,
          adminUserId,
          newPassword,
        );
      });

      // Log recovery
      await this.auditLogger.log({
        userId: adminUserId,
        entityType: 'users',
        entityId: userId,
        actionType: 'PASSWORD_RECOVERY',
        newValues: { reason, recoveredBy: adminUserId },
        severity: 'high',
      });

      return { message: 'User access recovered successfully' };
    } catch (error) {
      this.logger.error('Admin recovery failed', error);
      throw error;
    }
  }

  private async assignDefaultFreePlan(
    tenantId: number,
    tenantType: string,
  ): Promise<void> {
    try {
      // Get default free plan for tenant type
      const planSlug = `${tenantType}-free`;

      const plans: any = await this.sqlService.query(
        `SELECT id, trial_days FROM subscription_plans 
       WHERE plan_slug = @planSlug AND is_active = 1`,
        { planSlug },
      );

      if (plans && plans.length > 0) {
        const plan = plans[0];
        const trialDays = plan.trial_days || 0;

        const now = new Date();
        const trialEndsAt =
          trialDays > 0
            ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
            : null;

        // Update tenant with free plan
        await this.sqlService.query(
          `UPDATE tenants
         SET 
           subscription_plan_id = @planId,
           subscription_status = @status,
           is_trial = @isTrial,
           trial_started_at = @trialStartedAt,
           trial_ends_at = @trialEndsAt,
           subscription_started_at = GETUTCDATE(),
           billing_cycle = 'monthly',
           auto_renew = 0,
           -- Set limits from plan
           max_staff = (SELECT max_staff FROM subscription_plans WHERE id = @planId),
           max_storage_gb = (SELECT max_storage_gb FROM subscription_plans WHERE id = @planId),
           max_campaigns = (SELECT max_campaigns FROM subscription_plans WHERE id = @planId),
           max_invitations = (SELECT max_invitations FROM subscription_plans WHERE id = @planId),
           max_creators = (SELECT max_creators FROM subscription_plans WHERE id = @planId),
           max_brands = (SELECT max_brands FROM subscription_plans WHERE id = @planId),
           max_integrations = (SELECT max_integrations FROM subscription_plans WHERE id = @planId),
           updated_at = GETUTCDATE()
         WHERE id = @tenantId`,
          {
            tenantId,
            planId: plan.id,
            status: trialDays > 0 ? 'trial' : 'active',
            isTrial: trialDays > 0 ? 1 : 0,
            trialStartedAt: trialDays > 0 ? now : null,
            trialEndsAt: trialEndsAt,
          },
        );

        // Record in subscription history
        await this.sqlService.query(
          `INSERT INTO subscription_history (
          tenant_id, from_plan_id, to_plan_id, change_type,
          change_reason, effective_date, created_at
        )
        VALUES (
          @tenantId, NULL, @planId, 'initial',
          'Default free plan assigned on tenant creation',
          CAST(GETUTCDATE() AS DATE), GETUTCDATE()
        )`,
          { tenantId, planId: plan.id },
        );

        this.logger.log(
          `Assigned free plan (${planSlug}) to tenant ${tenantId}`,
        );
      } else {
        this.logger.warn(`No free plan found for tenant type: ${tenantType}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to assign free plan to tenant ${tenantId}:`,
        error,
      );
      // Don't throw - tenant creation should still succeed
    }
  }
}
