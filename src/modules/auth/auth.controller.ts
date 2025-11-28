// ============================================
// src/modules/auth/auth.controller.ts - V3.0 COMPLETE
// ============================================
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Query,
  Res,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvitationService } from './invitation.service';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendVerificationDto,
  VerifyRegistrationDto,
  CreateAgencyDto,
  CreateBrandDto,
  CreateCreatorDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
  ReSendInvitationDto,
  CancelInvitationDto,
} from './dto/auth.dto';
import {
  Public,
  CurrentUser,
  TenantId,
  Unencrypted,
} from '../../core/decorators';
import { VerificationService } from '../../common/verification.service';
import axios from 'axios';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { RateLimit } from '../../core/guards/rate-limit.guard';
import { SendInvitationDto, AcceptInvitationDto } from '../rbac/dto/rbac.dto';
import { PkceService } from 'src/core/redis/pkce.service';
import * as crypto from 'crypto';

@Controller('auth')
@Unencrypted() // Default: all endpoints unencrypted unless specified
export class AuthController {
  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private pkceService: PkceService,
    private invitationService: InvitationService,
  ) {}

  // ============================================
  // MANUAL REGISTRATION & VERIFICATION
  // ============================================

  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-registration')
  @Public()
  async verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(dto.email, dto.code);
  }

  @Post('resend-verification')
  @Public()
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  // ============================================
  // LOGIN & LOGOUT
  // ============================================

  @Public()
  @Post('login')
  @RateLimit(5, 300) // 🔒 5 attempts per 5 minutes
  @Unencrypted()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const deviceInfo = this.extractDeviceInfo(req);
    return this.authService.login(loginDto, deviceInfo);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return { user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Unencrypted() // IMPORTANT: Disable encryption for refresh endpoint
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    try {
      const result = await this.authService.refreshToken(
        refreshDto.refreshToken,
      );

      // Return in a simple format without encryption wrapper
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: number) {
    return this.authService.logout(userId);
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  @Post('password-reset/request')
  @Public()
  async requestPasswordReset(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @Public()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ============================================
  // ENTITY CREATION (ONBOARDING)
  // ============================================

  @Post('create-agency')
  async createAgency(
    @Body() dto: CreateAgencyDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.authService.createAgency(dto, userId);
  }

  @Post('create-brand')
  async createBrand(
    @Body() dto: CreateBrandDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.authService.createBrand(dto, userId);
  }

  @Post('create-creator')
  async createCreator(
    @Body() dto: CreateCreatorDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.authService.createCreator(dto, userId);
  }

  // ============================================
  // INVITATION SYSTEM
  // ============================================

  @Post('invitation/resend')
  async reSendInvitation(
    @Body() dto: ReSendInvitationDto,
    @TenantId() tenantId: number,
  ) {
    console.log('Received resend invitation request:', dto);
    return this.invitationService.resendInvitation(
      Number(dto.invitationId),
      tenantId,
    );
  }

  @Post('invitation/send')
  async sendInvitation(
    @Body() dto: SendInvitationDto,
    @TenantId() tenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.invitationService.sendInvitation(tenantId, userId, dto);
  }

  @Post('invitation/accept')
  @Public()
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    console.log('🚀 ~ AuthController ~ acceptInvitation ~ dto:', dto);
    const result = await this.invitationService.acceptInvitation(
      dto.token,
      dto.password,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    );

    // ✅ Generate tokens for auto-login
    const tokens = await this.authService['generateTokens']({
      id: parseInt(result.data.user.id),
      email: result.data.user.email,
      userType: result.data.user.userType,
      tenantId: parseInt(result.data.tenant.id),
      onboardingRequired: false, // ✅ CRITICAL: Set to false
    });

    // ✅ Create session
    await this.authService['createSession'](
      parseInt(result.data.user.id),
      tokens.refreshToken,
      undefined,
      parseInt(result.data.tenant.id),
    );

    return {
      success: true,
      message: 'Invitation accepted successfully',
      user: {
        ...result.data.user,
        tenantId: result.data.tenant.id,
        onboardingRequired: false, // ✅ Explicitly set
        onboardingCompleted: true,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
  @Get('invitation/details')
  @Public()
  @Unencrypted()
  async getInvitationDetails(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Invitation token is required');
    }

    try {
      const details = await this.invitationService.getInvitationByToken(token);

      // Check if invitation is still valid
      if (details.status !== 'pending') {
        throw new BadRequestException('This invitation has already been used');
      }

      const now = new Date();
      if (new Date(details.expires_at) < now) {
        throw new BadRequestException('This invitation has expired');
      }

      return {
        success: true,
        data: {
          invitee_email: details.invitee_email,
          invitee_name: details.invitee_name,
          invitee_type: details.invitee_type,
          tenant_name: details.tenant_name,
          role_name: details.role_name,
          role_display_name: details.role_display_name,
          invitation_message: details.invitation_message,
          expires_at: details.expires_at,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch invitation details',
      );
    }
  }

  @Post('invitation/cancel')
  async cancelInvitation(
    @Body() dto: CancelInvitationDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    console.log(
      'Received cancel invitation request:',
      Number(dto.invitationId),
      userId,
      tenantId,
    );
    return this.invitationService.cancelInvitation(
      Number(dto.invitationId),
      userId,
      tenantId,
    );
  }
  // ============================================
  // GOOGLE OAUTH FLOW
  // ============================================

  @Get('google')
  @Public()
  async googleLogin(@Res() res: FastifyReply) {
    const redirectUri = `${process.env.APP_URL}/api/v1/auth/google/callback`;
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('email profile')}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return res.redirect(authUrl, 302);
  }

  @Get('google/callback')
  @Public()
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: FastifyReply,
    @Req() req: any,
  ) {
    if (error || !code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=google_auth_cancelled`,
        302,
      );
    }

    try {
      const redirectUri = `${process.env.APP_URL}/api/v1/auth/google/callback`;

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        },
      );

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user info
      const userInfoResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${access_token}` } },
      );

      const profile = userInfoResponse.data;
      const deviceInfo = this.extractDeviceInfo(req);

      // Handle social login
      const result = await this.authService.loginWithSocial(
        'google',
        {
          providerId: profile.id,
          email: profile.email,
          firstName: profile.given_name,
          lastName: profile.family_name,
          avatar: profile.picture,
          accessToken: access_token,
          refreshToken: refresh_token,
        },
        deviceInfo,
      );

      // Redirect to frontend with tokens
      const redirectUrl =
        `${process.env.FRONTEND_URL}/auth/google/callback?` +
        `accessToken=${result.accessToken}` +
        `&refreshToken=${result.refreshToken}` +
        `&user=${encodeURIComponent(JSON.stringify(result.user))}`;

      return res.redirect(redirectUrl, 302);
    } catch (err: any) {
      console.error('Google auth failed:', err.response?.data || err.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=google_auth_failed`,
        302,
      );
    }
  }
  // ============================================
  // MICROSOFT OAUTH FLOW WITH PKCE
  // ============================================

  @Get('microsoft')
  @Public()
  async microsoftLogin(@Res() res: FastifyReply) {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = this.pkceService.generateCodeVerifier();
      const codeChallenge =
        this.pkceService.generateCodeChallenge(codeVerifier);

      // Generate state for CSRF protection
      const state = crypto.randomBytes(16).toString('hex');

      // Store code verifier with state as key (10 minute TTL)
      await this.pkceService.storeCodeVerifier(state, codeVerifier, 600);

      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
      const redirectUri = `${process.env.APP_URL}/api/v1/auth/microsoft/callback`;

      const authUrl =
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${process.env.MICROSOFT_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid profile email offline_access User.Read')}` +
        `&response_mode=query` +
        `&state=${state}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      return res.redirect(authUrl, 302);
    } catch (error) {
      console.error('Error initiating Microsoft OAuth:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=microsoft_auth_failed`,
        302,
      );
    }
  }

  @Get('microsoft/callback')
  @Public()
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: FastifyReply,
    @Req() req: FastifyRequest,
  ) {
    // Handle errors
    if (error) {
      console.error('Microsoft auth error:', error, errorDescription);
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=microsoft_auth_cancelled&message=${encodeURIComponent(errorDescription || error)}`,
        302,
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state parameter');
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=microsoft_auth_failed&message=Missing+parameters`,
        302,
      );
    }

    try {
      // Retrieve code verifier using state
      const codeVerifier = await this.pkceService.getCodeVerifier(state);

      if (!codeVerifier) {
        console.error('Code verifier not found or expired for state:', state);
        return res.redirect(
          `${process.env.FRONTEND_URL}/sign-in?error=microsoft_auth_failed&message=Session+expired`,
          302,
        );
      }

      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
      const redirectUri = `${process.env.APP_URL}/api/v1/auth/microsoft/callback`;

      console.log('Exchanging code for tokens with PKCE...');

      // Exchange code for tokens with PKCE
      // Note: With PKCE, we don't send client_secret for public clients
      const tokenParams: any = {
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier, // Include PKCE verifier
      };

      // Only include client_secret if it's a confidential client (Web app)
      // For public clients (SPA, Mobile), PKCE replaces the client secret
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const useClientSecret =
        process.env.MICROSOFT_USE_CLIENT_SECRET === 'true';

      if (useClientSecret && clientSecret) {
        tokenParams.client_secret = clientSecret;
      }

      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams(tokenParams),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const { access_token, refresh_token } = tokenResponse.data;
      console.log('✅ Token exchange successful');

      // Get user info from Microsoft Graph
      const userInfoResponse = await axios.get(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );

      const profile = userInfoResponse.data;
      console.log(
        '✅ User info retrieved:',
        profile.mail || profile.userPrincipalName,
      );

      const deviceInfo = this.extractDeviceInfo(req);

      // Handle social login
      const result = await this.authService.loginWithSocial(
        'microsoft',
        {
          providerId: profile.id,
          email: profile.mail || profile.userPrincipalName,
          firstName: profile.givenName,
          lastName: profile.surname,
          avatar: null,
          accessToken: access_token,
          refreshToken: refresh_token,
        },
        deviceInfo,
      );

      console.log('✅ Social login successful for user:', result.user.email);

      // Redirect to frontend with tokens
      const redirectUrl =
        `${process.env.FRONTEND_URL}/auth/microsoft/callback?` +
        `accessToken=${result.accessToken}` +
        `&refreshToken=${result.refreshToken}` +
        `&user=${encodeURIComponent(JSON.stringify(result.user))}`;

      return res.redirect(redirectUrl, 302);
    } catch (err: any) {
      console.error(
        'Microsoft auth failed:',
        err.response?.data || err.message,
      );

      const errorMessage =
        err.response?.data?.error_description ||
        err.response?.data?.error ||
        err.message ||
        'Authentication failed';

      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=microsoft_auth_failed&message=${encodeURIComponent(errorMessage)}`,
        302,
      );
    }
  }

  // // ============================================
  // // HELPER METHODS
  // // ============================================

  // private extractDeviceInfo(req: FastifyRequest): any {
  //   const userAgent = req.headers['user-agent'] || '';
  //   const ip = (req.ip ||
  //     req.headers['x-forwarded-for'] ||
  //     req.headers['x-real-ip']) as string;

  //   return {
  //     userAgent,
  //     ip,
  //     deviceType: this.detectDeviceType(userAgent),
  //     browser: this.detectBrowser(userAgent),
  //     os: this.detectOS(userAgent),
  //   };
  // }

  // private detectDeviceType(userAgent: string): string {
  //   if (/mobile/i.test(userAgent)) return 'mobile';
  //   if (/tablet/i.test(userAgent)) return 'tablet';
  //   return 'desktop';
  // }

  // private detectBrowser(userAgent: string): string {
  //   if (/edg/i.test(userAgent)) return 'Edge';
  //   if (/chrome/i.test(userAgent)) return 'Chrome';
  //   if (/firefox/i.test(userAgent)) return 'Firefox';
  //   if (/safari/i.test(userAgent)) return 'Safari';
  //   return 'Unknown';
  // }

  // private detectOS(userAgent: string): string {
  //   if (/windows/i.test(userAgent)) return 'Windows';
  //   if (/mac/i.test(userAgent)) return 'macOS';
  //   if (/linux/i.test(userAgent)) return 'Linux';
  //   if (/android/i.test(userAgent)) return 'Android';
  //   if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
  //   return 'Unknown';
  // }
  
  // ============================================
  @Get('sessions')
  async getUserSessions(@CurrentUser('id') userId: number) {
    return this.authService.getUserSessions(userId);
  }
  // ============================================
  // HELPER: Extract Device Info
  // ============================================
  private extractDeviceInfo(req: any) {
    const userAgent = req.headers['user-agent'] || '';
    const ip =
      req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;

    return {
      deviceFingerprint: req.headers['x-device-fingerprint'] || null,
      deviceName: req.headers['x-device-name'] || null,
      deviceType: this.getDeviceType(userAgent),
      browserName: this.getBrowserName(userAgent),
      browserVersion: this.getBrowserVersion(userAgent),
      osName: this.getOSName(userAgent),
      osVersion: this.getOSVersion(userAgent),
      ipAddress: Array.isArray(ip) ? ip[0] : ip,
    };
  }

  private getDeviceType(ua: string): string {
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  private getBrowserName(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getBrowserVersion(ua: string): string {
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private getOSName(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private getOSVersion(ua: string): string {
    const match = ua.match(/(Windows NT|Mac OS X|Android|iOS) ([\d._]+)/);
    return match ? match[2] : 'Unknown';
  }
}
