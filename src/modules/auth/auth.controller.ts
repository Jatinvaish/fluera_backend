// ============================================
// src/modules/auth/auth.controller.ts - V3.0 COMPLETE
// ============================================
import {
  Controller, Post, Body, HttpCode, HttpStatus, Get,
  UseGuards, Req, Query, Res
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
} from './dto/auth.dto';
import { Public, CurrentUser, TenantId, Unencrypted } from '../../core/decorators';
import { VerificationService } from '../../common/verification.service';
import axios from 'axios';
import type { FastifyReply } from 'fastify';
import { RateLimit } from '../../core/guards/rate-limit.guard';
import { SendInvitationDto, AcceptInvitationDto } from '../rbac/dto/rbac.dto';


@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private invitationService: InvitationService,
  ) { }

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
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshDto.refreshToken);
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
    @CurrentUser('id') userId: number
  ) {
    return this.authService.createAgency(dto, userId);
  }

  @Post('create-brand')
  async createBrand(
    @Body() dto: CreateBrandDto,
    @CurrentUser('id') userId: number
  ) {
    return this.authService.createBrand(dto, userId);
  }

  @Post('create-creator')
  async createCreator(
    @Body() dto: CreateCreatorDto,
    @CurrentUser('id') userId: number
  ) {
    return this.authService.createCreator(dto, userId);
  }

  // ============================================
  // INVITATION SYSTEM
  // ============================================

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
    return this.invitationService.acceptInvitation(
      dto.token,
      dto.password,
      { firstName: dto.firstName, lastName: dto.lastName }
    );
  }

  // ============================================
  // GOOGLE OAUTH FLOW
  // ============================================

  @Get('google')
  @Public()
  async googleLogin(@Res() res: FastifyReply) {
    const redirectUri = `${process.env.APP_URL}/api/v1/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
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
    @Req() req: any
  ) {
    if (error || !code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=google_auth_cancelled`,
        302
      );
    }

    try {
      const redirectUri = `${process.env.APP_URL}/api/v1/auth/google/callback`;

      // Exchange code for tokens
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user info
      const userInfoResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const profile = userInfoResponse.data;
      const deviceInfo = this.extractDeviceInfo(req);

      // Handle social login
      const result = await this.authService.loginWithSocial('google', {
        providerId: profile.id,
        email: profile.email,
        firstName: profile.given_name,
        lastName: profile.family_name,
        avatar: profile.picture,
        accessToken: access_token,
        refreshToken: refresh_token,
      }, deviceInfo);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/google/callback?` +
        `accessToken=${result.accessToken}` +
        `&refreshToken=${result.refreshToken}` +
        `&user=${encodeURIComponent(JSON.stringify(result.user))}`;

      return res.redirect(redirectUrl, 302);
    } catch (err: any) {
      console.error('Google auth failed:', err.response?.data || err.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=google_auth_failed`,
        302
      );
    }
  }

  // ============================================
  // MICROSOFT OAUTH FLOW
  // ============================================

  @Get('microsoft')
  @Public()
  async microsoftLogin(@Res() res: FastifyReply) {
    const redirectUri = `${process.env.APP_URL}/api/v1/auth/microsoft/callback`;
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${process.env.MICROSOFT_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid profile email')}` +
      `&response_mode=query`;

    return res.redirect(authUrl, 302);
  }

  @Get('microsoft/callback')
  @Public()
  async microsoftCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: FastifyReply,
    @Req() req: any
  ) {
    if (error || !code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=microsoft_auth_cancelled`,
        302
      );
    }

    try {
      const redirectUri = `${process.env.APP_URL}/api/v1/auth/microsoft/callback`;

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user info
      const userInfoResponse = await axios.get(
        'https://graph.microsoft.com/v1.0/me',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const profile = userInfoResponse.data;
      const deviceInfo = this.extractDeviceInfo(req);

      // Handle social login
      const result = await this.authService.loginWithSocial('microsoft', {
        providerId: profile.id,
        email: profile.mail || profile.userPrincipalName,
        firstName: profile.givenName,
        lastName: profile.surname,
        avatar: null,
        accessToken: access_token,
        refreshToken: refresh_token,
      }, deviceInfo);

      const redirectUrl = `${process.env.FRONTEND_URL}/auth/microsoft/callback?` +
        `accessToken=${result.accessToken}` +
        `&refreshToken=${result.refreshToken}` +
        `&user=${encodeURIComponent(JSON.stringify(result.user))}`;

      return res.redirect(redirectUrl, 302);
    } catch (err: any) {
      console.error('Microsoft auth failed:', err.response?.data || err.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/sign-in?error=microsoft_auth_failed`,
        302
      );
    }
  }
  @Get('sessions')
  async getUserSessions(@CurrentUser('id') userId: number) {
    return this.authService.getUserSessions(userId);
  }
  // ============================================
  // HELPER: Extract Device Info
  // ============================================
  private extractDeviceInfo(req: any) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;

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