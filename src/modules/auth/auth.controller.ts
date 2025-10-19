// ============================================
// modules/auth/auth.controller.ts
// ============================================
import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { 
  LoginDto, 
  RefreshTokenDto, 
  RegisterDto, 
  ResendVerificationDto, 
  VerifyRegistrationDto,
  CompleteOnboardingDto 
} from './dto/register.dto';
import { Public, CurrentUser } from 'src/core/decorators';
import { VerificationService } from 'src/common/verification.service';
import { InvitationService } from './invitation.service';
import { AuthGuard } from '@nestjs/passport';
import { 
  SendVerificationDto, 
  VerifyCodeDto, 
  ResetPasswordRequestDto, 
  ResetPasswordDto, 
  SendInvitationDto, 
  AcceptInvitationDto 
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private invitationService: InvitationService,
  ) { }

  // STEP 1: Register with email and password only
  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // STEP 2: Verify email with code
  @Post('verify-registration')
  @Public()
  async verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(dto.email, dto.code);
  }

  // Resend verification code
  @Post('resend-verification')
  @Public()
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  // STEP 3: Login (after email verification)
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // STEP 4: Complete onboarding (after login)
  @Post('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @CurrentUser('id') userId: bigint,
    @Body() onboardingDto: CompleteOnboardingDto
  ) {
    return this.authService.completeOnboarding(userId, onboardingDto);
  }

  // Get current user profile (includes onboarding status)
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
  async logout(@CurrentUser('id') userId: bigint) {
    return this.authService.logout(userId);
  }

  @Post('send-verification')
  @Public()
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.verificationService.sendVerificationCode(dto.email, dto.codeType);
  }

  @Post('verify-code')
  @Public()
  async verifyCode(@Body() dto: VerifyCodeDto) {
    await this.verificationService.verifyCode(dto.email, dto.code, dto.codeType);
    return { message: 'Verification successful' };
  }

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

  @Post('invitation/send')
  async sendInvitation(
    @Body() dto: SendInvitationDto,
    @CurrentUser('organizationId') organizationId: bigint,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.invitationService.sendInvitation(organizationId, userId, dto);
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

  // Social login routes
  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleLogin() { }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req) {
    return this.authService.loginWithSocial('google', req.user);
  }

  @Get('microsoft')
  @Public()
  @UseGuards(AuthGuard('microsoft'))
  microsoftLogin() { }

  @Get('microsoft/callback')
  @Public()
  @UseGuards(AuthGuard('microsoft'))
  async microsoftCallback(@Req() req) {
    return this.authService.loginWithSocial('microsoft', req.user);
  }

  @Get('twitter')
  @Public()
  @UseGuards(AuthGuard('twitter'))
  twitterLogin() { }

  @Get('twitter/callback')
  @Public()
  @UseGuards(AuthGuard('twitter'))
  async twitterCallback(@Req() req) {
    return this.authService.loginWithSocial('twitter', req.user);
  }
}