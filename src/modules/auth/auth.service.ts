// ============================================
// modules/auth/auth.service.ts - UPDATED WITH DEVICE INFO
// ============================================
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SqlServerService } from '../../core/database/sql-server.service';
import { LoginDto, RegisterDto } from './dto/register.dto';
import { HashingService } from 'src/common/hashing.service';
import { EmailService } from '../email-templates/email.service';
import { CreateAgencyDto, CreateBrandDto, CreateCreatorDto } from './dto/auth.dto';

interface DeviceInfo {
  deviceFingerprint?: string;
  deviceName?: string;
  deviceType?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private sqlService: SqlServerService,
    private jwtService: JwtService,
    private hashingService: HashingService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.sqlService.query(
      'SELECT id, email_verified_at, status FROM users WHERE email = @email',
      { email: registerDto.email }
    );

    if (existingUser.length > 0 && existingUser[0].email_verified_at) {
      throw new ConflictException('Email already registered and verified');
    }

    const passwordHash = await this.hashingService.hashPassword(registerDto.password);
    let userId: bigint;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      await this.sqlService.query(
        `UPDATE users SET password_hash = @passwordHash, updated_at = GETUTCDATE()
         WHERE id = @userId`,
        { userId, passwordHash }
      );
      await this.sqlService.query(
        `DELETE FROM verification_codes WHERE email = @email`,
        { email: registerDto.email }
      );
    } else {
      const result = await this.sqlService.query(
        `INSERT INTO users (email, password_hash, user_type, status)
         OUTPUT INSERTED.id
         VALUES (@email, @passwordHash, 'pending', 'pending')`,
        { email: registerDto.email, passwordHash }
      );
      userId = result[0].id;
    }

    const code = this.hashingService.generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.sqlService.query(
      `INSERT INTO verification_codes (user_id, email, code, code_type, expires_at, max_attempts)
       VALUES (@userId, @email, @code, 'email_verify', @expiresAt, 5)`,
      { userId, email: registerDto.email, code, expiresAt }
    );

    await this.emailService.sendVerificationCode(
      registerDto.email,
      code,
      registerDto.email.split('@')[0]
    );

    return {
      message: 'Registration initiated. Please check your email for verification code.',
      email: registerDto.email,
      requiresVerification: true,
    };
  }

  async verifyRegistration(email: string, code: string) {
    const verification = await this.sqlService.query(
      `SELECT vc.*   
       FROM verification_codes vc
       INNER JOIN users u ON vc.user_id = u.id
       WHERE vc.email = @email AND vc.code = @code 
       AND vc.code_type = 'email_verify'
       AND vc.expires_at > GETUTCDATE() 
       AND vc.used_at IS NULL`,
      { email, code }
    );

    if (verification.length === 0) {
      await this.sqlService.query(
        `UPDATE verification_codes 
         SET attempts = attempts + 1 
         WHERE email = @email AND code_type = 'email_verify' AND used_at IS NULL`,
        { email }
      );
      throw new BadRequestException('Invalid or expired verification code');
    }

    const verif = verification[0];

    if (verif.attempts >= verif.max_attempts) {
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    await this.sqlService.transaction(async (transaction) => {
      await transaction.request()
        .input('id', verif.id)
        .query(`UPDATE verification_codes SET used_at = GETUTCDATE() WHERE id = @id`);

      await transaction.request()
        .input('userId', verif.user_id)
        .query(`
          UPDATE users 
          SET email_verified_at = GETUTCDATE(), 
              status = 'active'
          WHERE id = @userId
        `);
    });

    await this.emailService.sendWelcomeEmail(email, email.split('@')[0]);

    const users = await this.sqlService.query(
      'SELECT * FROM users WHERE id = @userId',
      { userId: verif.user_id }
    );

    const user = users[0];

    const tokens = await this.generateTokens({
      ...user,
      userType: user.user_type,
      onboardingRequired: true,
    });

    await this.createSession(user.id, tokens.refreshToken);

    return {
      message: 'Email verified successfully. Please complete your profile.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        onboardingRequired: true,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, deviceInfo?: DeviceInfo) {
    const users = await this.sqlService.query(
      `SELECT id, email, password_hash, first_name, last_name, 
              status, email_verified_at, user_type
       FROM users WHERE email = @email`,
      { email: loginDto.email }
    );

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = users[0];

    if (!user.email_verified_at) {
      await this.resendVerificationCode(loginDto.email);
      throw new UnauthorizedException(
        'Email not verified. A new verification code has been sent to your email.'
      );
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await this.hashingService.comparePassword(
      loginDto.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.sqlService.query(
      `UPDATE users 
       SET last_login_at = GETUTCDATE(), login_count = login_count + 1
       WHERE id = @userId`,
      { userId: user.id }
    );

    const tokens = await this.generateTokens({
      ...user,
      userType: user.user_type,
      onboardingRequired: true,
    });

    await this.createSession(user.id, tokens.refreshToken, deviceInfo);

    const onboardingRequired = !user.first_name || user.user_type === 'pending';

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        onboardingRequired,
      },
      ...tokens,
    };
  }

  async loginWithSocial(provider: string, profile: any, deviceInfo?: DeviceInfo) {
    return this.sqlService.transaction(async (transaction) => {
      // Check if social account exists
      let socialAccount = await transaction.request()
        .input('provider', provider)
        .input('providerId', profile.providerId)
        .query(`
          SELECT 
            sa.id AS social_id,
            sa.user_id AS linked_user_id,
            sa.provider,
            sa.provider_user_id,
            sa.provider_email,
            sa.access_token,
            sa.refresh_token,
            sa.token_expires_at,
            sa.created_at AS social_created_at,
            sa.updated_at AS social_updated_at,
            u.id AS user_id,
            u.email,
            u.username,
            u.first_name,
            u.last_name,
            u.user_type,
            u.status,
            u.avatar_url,
            u.email_verified_at,
            u.last_login_at,
            u.login_count,
            u.last_active_at
          FROM user_social_accounts sa
          JOIN users u ON sa.user_id = u.id
          WHERE sa.provider = @provider AND sa.provider_user_id = @providerId
        `);

      let user;
      if (socialAccount.recordset.length > 0) {
        const existingRecord = socialAccount.recordset[0];

        // Use consistent fields — no arrays now
        const userId = existingRecord.user_id;
        const socialId = existingRecord.social_id;
        user = existingRecord;
        await transaction.request()
          .input('id', socialId)
          .input('accessToken', profile?.accessToken)
          .input('refreshToken', profile?.refreshToken || null)
          .query(`
          UPDATE user_social_accounts 
          SET access_token = @accessToken, 
              refresh_token = @refreshToken,
              token_expires_at = DATEADD(hour, 1, GETUTCDATE()),
              updated_at = GETUTCDATE()
          WHERE id = @id
        `);

        await transaction.request()
          .input('userId', userId)
          .query(`
          UPDATE users 
          SET last_login_at = GETUTCDATE(), 
              login_count = login_count + 1,
              last_active_at = GETUTCDATE()
          WHERE id = @userId
        `);
        console.log('user', user)
        const onboardingRequired = !user?.first_name || user?.user_type === 'pending';
        const tokens = await this.generateTokens({
          id: user.user_id,
          email: user.email,
          user_type: user.user_type || 'pending',
          onboardingRequired,
        });

        await this.createSession(user.user_id, tokens.refreshToken, deviceInfo);

        return {
          user: {
            id: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type || 'pending',
            onboardingRequired,
          },
          ...tokens,
        };
      }
      else {
        // NEW USER - Check if email exists
        const existingUser = await transaction.request()
          .input('email', profile.email)
          .query('SELECT * FROM users WHERE email = @email');

        if (existingUser.recordset.length > 0) {
          // Link social account to existing user
          user = existingUser.recordset[0];

          await transaction.request()
            .input('userId', user.id)
            .input('avatarUrl', profile.avatar || null)
            .query(`
              UPDATE users 
              SET email_verified_at = COALESCE(email_verified_at, GETUTCDATE()), 
                  status = 'active',
                  avatar_url = COALESCE(avatar_url, @avatarUrl),
                  last_login_at = GETUTCDATE(),
                  login_count = login_count + 1
              WHERE id = @userId
            `);
        } else {
          // Create new user
          const userResult = await transaction.request()
            .input('email', profile.email)
            .input('firstName', profile.firstName)
            .input('lastName', profile.lastName)
            .input('avatarUrl', profile.avatar || null)
            .query(`
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
        }
        // Create social account
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

        const tokens = await this.generateTokens({
          ...user,
          userType: 'pending',
          onboardingRequired: true,
        });
        console.log('tokens', tokens)
        await this.createSession(user.id, tokens.refreshToken, deviceInfo);

        return {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: 'pending',
            onboardingRequired: true,
          },
          ...tokens,
        };
      }
    });
  }

  async resendVerificationCode(email: string) {
    const users = await this.sqlService.query(
      'SELECT id, email_verified_at, first_name, status FROM users WHERE email = @email',
      { email }
    );

    if (users.length === 0) {
      throw new BadRequestException('User not found');
    }

    const user = users[0];

    if (user.email_verified_at) {
      throw new BadRequestException('Email already verified');
    }

    await this.sqlService.query(
      'DELETE FROM verification_codes WHERE email = @email AND code_type = \'email_verify\'',
      { email }
    );

    const code = this.hashingService.generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.sqlService.query(
      `INSERT INTO verification_codes (user_id, email, code, code_type, expires_at, max_attempts)
       VALUES (@userId, @email, @code, 'email_verify', @expiresAt, 5)`,
      { userId: user.id, email, code, expiresAt }
    );

    await this.emailService.sendVerificationCode(
      email,
      code,
      user.first_name || email.split('@')[0]
    );

    return { message: 'Verification code sent successfully' };
  }

  async createAgency(dto: CreateAgencyDto, userId: bigint) {
    return this.sqlService.transaction(async (transaction) => {
      const orgResult = await transaction.request()
        .input('name', dto.organizationName)
        .input('owner_user_id', userId)
        .input('slug', this.generateSlug(dto.organizationName))
        .input('industry', dto.industry || null)
        .input('companySize', dto.companySize || null)
        .input('timezone', dto.timezone || 'UTC')
        .query(`
          INSERT INTO organizations (
            name, owner_user_id, slug, industry, company_size, timezone,
            is_trial, trial_started_at, trial_ends_at,
            subscription_status, max_users, max_creators, max_brands, max_campaigns
          ) OUTPUT INSERTED.id
          VALUES (
            @name, @owner_user_id, @slug, @industry, @companySize, @timezone,
            1, GETUTCDATE(), DATEADD(day, 14, GETUTCDATE()),
            'trial', 10, 100, 50, 100
          )
        `);

      const organizationId = orgResult.recordset[0].id;

      const roleResult = await transaction.request()
        .query(`SELECT id FROM roles WHERE name = 'agency_admin' AND is_system_role = 1`);

      if (roleResult.recordset.length > 0) {
        await transaction.request()
          .input('userId', userId)
          .input('roleId', roleResult.recordset[0].id)
          .query(`INSERT INTO user_roles (user_id, role_id, is_active) VALUES (@userId, @roleId, 1)`);
      }

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

      const users = await transaction.request()
        .input('userId', userId)
        .query('SELECT * FROM users WHERE id = @userId');

      const user = users.recordset[0];

      const tokens = await this.generateTokens({
        ...user,
        userType: 'agency_admin',
        organizationId,
        onboardingRequired: false,
      });

      await this.createSession(userId, tokens.refreshToken);

      return {
        message: 'Agency created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          organizationId,
          userType: 'agency_admin',
          onboardingRequired: false,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async createBrand(dto: CreateBrandDto, userId: bigint) {
    return this.sqlService.transaction(async (transaction) => {
      const brandResult = await transaction.request()
        .input('userId', userId)
        .input('name', dto.brandName)
        .input('slug', this.generateSlug(dto.brandName))
        .input('website', dto.website || null)
        .input('industry', dto.industry || null)
        .input('description', dto.description || null)
        .query(`
          INSERT INTO brands (
            owner_user_id, name, slug, website_url, industry, description,
            is_direct_brand, subscription_status, is_trial,
            trial_started_at, trial_ends_at,
            max_users, max_campaigns, max_invitations, status
          ) OUTPUT INSERTED.id
          VALUES (
            @userId, @name, @slug, @website, @industry, @description,
            1, 'trial', 1,
            GETUTCDATE(), DATEADD(day, 14, GETUTCDATE()),
            5, 50, 20, 'active'
          )
        `);

      const brandId = brandResult.recordset[0].id;

      const roleResult = await transaction.request()
        .query(`SELECT id FROM roles WHERE name = 'brand_admin' AND is_system_role = 1`);

      if (roleResult.recordset.length > 0) {
        await transaction.request()
          .input('userId', userId)
          .input('roleId', roleResult.recordset[0].id)
          .query(`INSERT INTO user_roles (user_id, role_id, is_active) VALUES (@userId, @roleId, 1)`);
      }

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
              user_type = 'brand_admin',
              onboarding_completed_at = GETUTCDATE(),
              updated_at = GETUTCDATE()
          WHERE id = @userId
        `);

      const users = await transaction.request()
        .input('userId', userId)
        .query('SELECT * FROM users WHERE id = @userId');

      const user = users.recordset[0];

      const tokens = await this.generateTokens({
        ...user,
        userType: 'brand_admin',
        brandId,
        onboardingRequired: false,
      });

      await this.createSession(userId, tokens.refreshToken);

      return {
        message: 'Brand created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          brandId,
          userType: 'brand_admin',
          onboardingRequired: false,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async createCreator(dto: CreateCreatorDto, userId: bigint) {
    return this.sqlService.transaction(async (transaction) => {
      const creatorResult = await transaction.request()
        .input('userId', userId)
        .input('firstName', dto.firstName)
        .input('lastName', dto.lastName)
        .input('stageName', dto.stageName || null)
        .input('phone', dto.phone || null)
        .input('bio', dto.bio || null)
        .query(`
          INSERT INTO creators (
            user_id, first_name, last_name, stage_name, phone, bio,
            status, onboarding_status, availability_status
          ) OUTPUT INSERTED.id
          VALUES (
            @userId, @firstName, @lastName, @stageName, @phone, @bio,
            'active', 'completed', 'available'
          )
        `);

      const creatorId = creatorResult.recordset[0].id;

      const roleResult = await transaction.request()
        .query(`SELECT id FROM roles WHERE name = 'creator' AND is_system_role = 1`);

      if (roleResult.recordset.length > 0) {
        await transaction.request()
          .input('userId', userId)
          .input('roleId', roleResult.recordset[0].id)
          .query(`INSERT INTO user_roles (user_id, role_id, is_active) VALUES (@userId, @roleId, 1)`);
      }

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
              user_type = 'creator',
              onboarding_completed_at = GETUTCDATE(),
              updated_at = GETUTCDATE()
          WHERE id = @userId
        `);

      const users = await transaction.request()
        .input('userId', userId)
        .query('SELECT * FROM users WHERE id = @userId');

      const user = users.recordset[0];

      const tokens = await this.generateTokens({
        ...user,
        userType: 'creator',
        creatorId,
        onboardingRequired: false,
      });

      await this.createSession(userId, tokens.refreshToken);

      return {
        message: 'Creator profile created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          creatorId,
          userType: 'creator',
          onboardingRequired: false,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

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

      const tokens = await this.generateTokens(users[0]);

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

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.user_type || user.userType,
      organizationId: user.organization_id || user.organizationId,
      onboardingRequired: user.onboardingRequired !== false,
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

  private async createSession(userId: bigint, refreshToken: string, deviceInfo?: DeviceInfo) {
    const sessionToken = this.hashingService.generateRandomToken();

    await this.sqlService.query(
      `INSERT INTO user_sessions (
        user_id, session_token, refresh_token, expires_at, is_active,
        device_fingerprint, device_name, device_type,
        browser_name, browser_version, os_name, os_version, ip_address
      ) VALUES (
        @userId, @sessionToken, @refreshToken, DATEADD(day, 7, GETUTCDATE()), 1,
        @deviceFingerprint, @deviceName, @deviceType,
        @browserName, @browserVersion, @osName, @osVersion, @ipAddress
      )`,
      {
        userId,
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

  async logout(userId: bigint) {
    await this.sqlService.query(
      'UPDATE user_sessions SET is_active = 0 WHERE user_id = @userId',
      { userId }
    );
    return { message: 'Logged out successfully' };
  }

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

    await this.emailService.sendPasswordReset(email, token);

    return { message: 'If email exists, reset link will be sent' };
  }

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

    await this.sqlService.transaction(async (transaction) => {
      await transaction.request()
        .input('userId', resetToken.user_id)
        .input('passwordHash', passwordHash)
        .query(`
          UPDATE users 
          SET password_hash = @passwordHash, password_changed_at = GETUTCDATE()
          WHERE id = @userId
        `);

      await transaction.request()
        .input('tokenId', resetToken.id)
        .query(`
          UPDATE password_reset_tokens 
          SET used_at = GETUTCDATE()
          WHERE id = @tokenId
        `);
    });

    return { message: 'Password reset successful' };
  }
}