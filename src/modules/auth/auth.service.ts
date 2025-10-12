
// ============================================
// modules/auth/auth.service.ts
// ============================================
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SqlServerService } from '../../core/database/sql-server.service';
import { LoginDto, RegisterDto } from './dto/register.dto';
import { HashingService } from 'src/common/hashing.service';
import { EmailService } from '../email-templates/email.service';

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

    // If user exists and already verified
    if (existingUser.length > 0 && existingUser[0].email_verified_at) {
      throw new ConflictException('Email already registered and verified');
    }

    const passwordHash = await this.hashingService.hashPassword(registerDto.password);
    const orgType = registerDto.organizationType || 'agency_admin';

    // If user exists but not verified, delete old verification codes
    if (existingUser.length > 0) {
      await this.sqlService.query(
        `DELETE FROM verification_codes WHERE email = @email`,
        { email: registerDto.email }
      );
    }

    // Determine user type and limits
    let userType = orgType;
    let maxUsers = 10, maxCreators = 100, maxBrands = 50, maxCampaigns = 100;

    if (orgType === 'creator') {
      userType = 'creator';
      maxUsers = 3;
      maxCreators = 1;
      maxBrands = 0;
      maxCampaigns = 50;
    } else if (orgType === 'brand_admin') {
      userType = 'brand_admin';
      maxUsers = 5;
      maxCreators = 0;
      maxBrands = 1;
      maxCampaigns = 100;
    }

    let userId: bigint;
    let organizationId: bigint;

    if (existingUser.length > 0) {
      // User exists but not verified - update password
      userId = existingUser[0].id;

      await this.sqlService.query(
        `UPDATE users 
       SET password_hash = @passwordHash, 
           first_name = @firstName, 
           last_name = @lastName,
           updated_at = GETUTCDATE()
       WHERE id = @userId`,
        {
          userId,
          passwordHash,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        }
      );

      // Get organization ID
      const userOrg = await this.sqlService.query(
        'SELECT organization_id FROM users WHERE id = @userId',
        { userId }
      );
      organizationId = userOrg[0].organization_id;
    } else {
      // Create new user and organization
      const result = await this.sqlService.transaction(async (transaction) => {
        // Create organization
        const orgResult = await transaction.request()
          .input('name', registerDto.organizationName || `${registerDto.firstName}'s ${orgType.charAt(0).toUpperCase() + orgType.slice(1)}`)
          .input('slug', this.generateSlug(registerDto.organizationName || registerDto.firstName))
          .input('maxUsers', maxUsers)
          .input('maxCreators', maxCreators)
          .input('maxBrands', maxBrands)
          .input('maxCampaigns', maxCampaigns)
          .query(`
          INSERT INTO organizations (
            name, slug, is_trial, trial_started_at, trial_ends_at,
            subscription_status, max_users, max_creators, max_brands, max_campaigns
          )
          OUTPUT INSERTED.id
          VALUES (
            @name, @slug, 1, GETUTCDATE(), DATEADD(day, 14, GETUTCDATE()),
            'trial', @maxUsers, @maxCreators, @maxBrands, @maxCampaigns
          )
        `);

        const orgId = orgResult.recordset[0].id;

        // Create user (email_verified_at is NULL)
        const userResult = await transaction.request()
          .input('organizationId', orgId)
          .input('email', registerDto.email)
          .input('passwordHash', passwordHash)
          .input('firstName', registerDto.firstName)
          .input('lastName', registerDto.lastName)
          .input('userType', userType)
          .query(`
          INSERT INTO users (
            organization_id, email, password_hash, first_name, last_name,
            user_type, status
          )
          OUTPUT INSERTED.id, INSERTED.organization_id
          VALUES (
            @organizationId, @email, @passwordHash, @firstName, @lastName,
            @userType, 'pending'
          )
        `);

        return {
          userId: userResult.recordset[0].id,
          organizationId: userResult.recordset[0].organization_id,
        };
      });

      userId = result.userId;
      organizationId = result.organizationId;
    }

    // Generate and send verification code
    const code = this.hashingService.generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.sqlService.query(
      `INSERT INTO verification_codes (user_id, email, code, code_type, expires_at, max_attempts)
     VALUES (@userId, @email, @code, 'email_verify', @expiresAt, 5)`,
      { userId, email: registerDto.email, code, expiresAt }
    );

    // Send verification email
    await this.emailService.sendVerificationCode(
      registerDto.email,
      code,
      registerDto.firstName
    );

    return {
      message: 'Registration initiated. Please check your email for verification code.',
      email: registerDto.email,
      requiresVerification: true,
    };
  }

  async verifyRegistration(email: string, code: string) {
    // Verify code
    const verification = await this.sqlService.query(
      `SELECT vc.*, u.first_name, u.organization_id, u.user_type
     FROM verification_codes vc
     INNER JOIN users u ON vc.user_id = u.id
     WHERE vc.email = @email AND vc.code = @code 
     AND vc.code_type = 'email_verify'
     AND vc.expires_at > GETUTCDATE() 
     AND vc.used_at IS NULL`,
      { email, code }
    );

    if (verification.length === 0) {
      // Increment attempt count
      await this.sqlService.query(
        `UPDATE verification_codes 
       SET attempts = attempts + 1 
       WHERE email = @email AND code_type = 'email_verify' AND used_at IS NULL`,
        { email }
      );
      throw new BadRequestException('Invalid or expired verification code');
    }

    const verif = verification[0];
    console.log("🚀 ~ AuthService ~ verifyRegistration ~ verif:", verif)

    if (verif.attempts >= verif.max_attempts) {
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Mark code as used and activate user
    await this.sqlService.transaction(async (transaction) => {
      // Mark verification code as used
      await transaction.request()
        .input('id', verif.id)
        .query(`UPDATE verification_codes SET used_at = GETUTCDATE() WHERE id = @id`);

      // Activate user
      await transaction.request()
        .input('userId', verif.user_id)
        .query(`
        UPDATE users 
        SET email_verified_at = GETUTCDATE(), status = 'active'
        WHERE id = @userId
      `);

      // Assign role
      const roleName = verif.user_type === 'creator' ? 'creator' :
        verif.user_type === 'brand_admin' ? 'brand_admin' : 'admin';

      await transaction.request()
        .input('userId', verif.user_id)
        .input('roleName', roleName)
        .query(`
        DECLARE @roleId BIGINT
        SELECT @roleId = id FROM roles WHERE name = @roleName AND is_system_role = 1
        
        IF @roleId IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = @userId AND role_id = @roleId
        )
        BEGIN
          INSERT INTO user_roles (user_id, role_id, is_active)
          VALUES (@userId, @roleId, 1)
        END
      `);

      // Create creator/brand profiles if needed
      if (verif.user_type === 'creator') {
        await transaction.request()
          .input('organizationId', verif.organization_id)
          .input('userId', verif.user_id)
          .input('email', email)
          .input('firstName', verif.first_name)
          .query(`
          IF NOT EXISTS (SELECT 1 FROM creators WHERE user_id = @userId)
          BEGIN
            INSERT INTO creators (
              organization_id, user_id, email, first_name, status, onboarding_status
            )
            VALUES (@organizationId, @userId, @email, @firstName, 'active', 'pending')
          END
        `);
      }
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail(email, verif.first_name);

    // Get full user details
    const users = await this.sqlService.query(
      'SELECT * FROM users WHERE id = @userId',
      { userId: verif.user_id }
    );

    const user = users[0];

    // Generate tokens
    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        organizationId: user.organization_id,
      },
      ...tokens,
    };
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

    // Delete old codes
    await this.sqlService.query(
      'DELETE FROM verification_codes WHERE email = @email AND code_type = \'email_verify\'',
      { email }
    );

    // Generate new code
    const code = this.hashingService.generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.sqlService.query(
      `INSERT INTO verification_codes (user_id, email, code, code_type, expires_at, max_attempts)
     VALUES (@userId, @email, @code, 'email_verify', @expiresAt, 5)`,
      { userId: user.id, email, code, expiresAt }
    );

    await this.emailService.sendVerificationCode(email, code, user.first_name);

    return { message: 'Verification code sent successfully' };
  }

  async login(loginDto: LoginDto) {
    const users = await this.sqlService.query(
      `SELECT id, email, password_hash, organization_id, first_name, last_name, 
            status, email_verified_at
     FROM users WHERE email = @email`,
      { email: loginDto.email }
    );

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = users[0];

    // Check if email is verified
    if (!user.email_verified_at) {
      // Resend verification code
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

    // Update last login
    await this.sqlService.query(
      `UPDATE users 
     SET last_login_at = GETUTCDATE(), login_count = login_count + 1
     WHERE id = @userId`,
      { userId: user.id }
    );

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        organizationId: user.organization_id,
      },
      ...tokens,
    };
  }

  async loginWithSocial(provider: string, profile: any) {
    return this.sqlService.transaction(async (transaction) => {
      // Check if social account exists
      let socialAccount = await transaction.request()
        .input('provider', provider)
        .input('providerId', profile.providerId)
        .query(`
        SELECT sa.*, u.* 
        FROM user_social_accounts sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.provider = @provider AND sa.provider_user_id = @providerId
      `);

      let user;

      if (socialAccount.recordset.length > 0) {
        // Existing user - update tokens
        user = socialAccount.recordset[0];

        await transaction.request()
          .input('id', user.id)
          .input('accessToken', profile.accessToken)
          .input('refreshToken', profile.refreshToken || null)
          .query(`
          UPDATE user_social_accounts 
          SET access_token = @accessToken, 
              refresh_token = @refreshToken,
              token_expires_at = DATEADD(hour, 1, GETUTCDATE())
          WHERE id = @id
        `);

        await transaction.request()
          .input('userId', user.user_id)
          .query(`
          UPDATE users 
          SET last_login_at = GETUTCDATE(), 
              login_count = login_count + 1
          WHERE id = @userId
        `);
      } else {
        // Check if user exists with email
        const existingUser = await transaction.request()
          .input('email', profile.email)
          .query('SELECT * FROM users WHERE email = @email');

        if (existingUser.recordset.length > 0) {
          // Link social account to existing user and verify email
          user = existingUser.recordset[0];

          await transaction.request()
            .input('userId', user.id)
            .query(`
            UPDATE users 
            SET email_verified_at = GETUTCDATE(), 
                status = 'active',
                avatar_url = @avatarUrl
            WHERE id = @userId AND email_verified_at IS NULL
          `);

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
        } else {
          // Create new organization and user (auto-verified)
          const orgResult = await transaction.request()
            .input('name', `${profile.firstName}'s Organization`)
            .input('slug', this.generateSlug(profile.firstName))
            .query(`
            INSERT INTO organizations (name, slug, subscription_status)
            OUTPUT INSERTED.id
            VALUES (@name, @slug, 'trial')
          `);

          const organizationId = orgResult.recordset[0].id;

          const userResult = await transaction.request()
            .input('organizationId', organizationId)
            .input('email', profile.email)
            .input('firstName', profile.firstName)
            .input('lastName', profile.lastName)
            .input('avatarUrl', profile.avatar || null)
            .input('userType', 'owner')
            .query(`
            INSERT INTO users (
              organization_id, email, first_name, last_name, avatar_url,
              user_type, status, email_verified_at
            ) OUTPUT INSERTED.*
            VALUES (
              @organizationId, @email, @firstName, @lastName, @avatarUrl,
              @userType, 'active', GETUTCDATE()
            )
          `);

          user = userResult.recordset[0];

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

          // Assign admin role
          await transaction.request()
            .input('userId', user.id)
            .query(`
            DECLARE @roleId BIGINT
            SELECT @roleId = id FROM roles WHERE name = 'admin' AND is_system_role = 1
            
            IF @roleId IS NOT NULL
            BEGIN
              INSERT INTO user_roles (user_id, role_id, is_active)
              VALUES (@userId, @roleId, 1)
            END
          `);

          // Send welcome email
          await this.emailService.sendWelcomeEmail(user.email, user.first_name);
        }
      }

      const tokens = await this.generateTokens(user);
      await this.createSession(user.id || user.user_id, tokens.refreshToken);

      return {
        user: {
          id: user.id || user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          organizationId: user.organization_id,
        },
        ...tokens,
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

      // Update session
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
      organizationId: user.organization_id,
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

  private async createSession(userId: bigint, refreshToken: string) {
    const sessionToken = this.hashingService.generateRandomToken();

    await this.sqlService.query(
      `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, is_active)
       VALUES (@userId, @sessionToken, @refreshToken, DATEADD(day, 7, GETUTCDATE()), 1)`,
      { userId, sessionToken, refreshToken }
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
      // Don't reveal if email exists
      return { message: 'If email exists, reset link will be sent' };
    }

    const token = this.hashingService.generateRandomToken(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.sqlService.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES (@userId, @token, @expiresAt)`,
      { userId: users[0].id, token, expiresAt }
    );

    // Send email (implement with your email service)
    console.log(`Password reset token for ${email}: ${token}`);
    await this.emailService.sendPasswordReset(email,token);

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
