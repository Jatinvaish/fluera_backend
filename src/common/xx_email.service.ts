import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendInvitation(email: string, token: string, inviterName: string, orgName: string) {
    try {
      const inviteLink = `${this.configService.get('APP_URL')}/accept-invite/${token}`;
      
      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to: email,
        subject: `You're invited to join ${orgName} on Fluera`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4F46E5;">You've been invited! 🎉</h2>
              <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Fluera Platform.</p>
              <a href="${inviteLink}" 
                 style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Accept Invitation
              </a>
              <p style="font-size: 14px; color: #6B7280;">
                Or copy this link: <br>
                <code style="background: #F3F4F6; padding: 4px 8px; border-radius: 4px;">${inviteLink}</code>
              </p>
              <p style="font-size: 12px; color: #6B7280; margin-top: 30px;">
                This invitation link will expire in 7 days.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      this.logger.log(`Invitation sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation to ${email}`, error.stack);
      throw new Error('Failed to send invitation email');
    }
  }

  async sendPasswordReset(email: string, token: string) {
    try {
      const resetLink = `${this.configService.get('APP_URL')}/reset-password/${token}`;
      
      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to: email,
        subject: 'Reset Your Password - Fluera Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4F46E5;">Password Reset Request</h2>
              <p>We received a request to reset your password.</p>
              <a href="${resetLink}" 
                 style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Reset Password
              </a>
              <p style="font-size: 14px; color: #6B7280;">
                Or copy this link: <br>
                <code style="background: #F3F4F6; padding: 4px 8px; border-radius: 4px;">${resetLink}</code>
              </p>
              <p style="font-size: 12px; color: #EF4444; margin-top: 30px;">
                This link expires in 1 hour. If you didn't request this, ignore this email.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset to ${email}`, error.stack);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendVerificationCode(email: string, code: string, firstName?: string) {
    try {
      const expiryMinutes = this.configService.get('VERIFICATION_CODE_EXPIRY_MINUTES') || 10;

      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to: email,
        subject: 'Verify Your Email - Fluera Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4F46E5;">Email Verification Required</h2>
              <p>Hello ${firstName || 'there'},</p>
              <p>Your verification code is:</p>
              <div style="background: #F3F4F6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p><strong>This code will expire in ${expiryMinutes} minutes.</strong></p>
              <p>If you didn't request this verification, please ignore this email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
              <p style="font-size: 12px; color: #6B7280;">
                © ${new Date().getFullYear()} Fluera Platform. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      this.logger.log(`Verification code sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${email}`, error.stack);
      throw new Error('Failed to send verification email');
    }
  }

  async sendWelcomeEmail(email: string, firstName: string) {
    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to: email,
        subject: 'Welcome to Fluera Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4F46E5;">Welcome to Fluera! 🎉</h2>
              <p>Hello ${firstName},</p>
              <p>Your account has been successfully verified and activated.</p>
              <p>You can now access all features of the Fluera platform.</p>
              <a href="${this.configService.get('APP_URL')}/login" 
                 style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Login to Your Account
              </a>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
              <p style="font-size: 12px; color: #6B7280;">
                © ${new Date().getFullYear()} Fluera Platform. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error.stack);
      throw new Error('Failed to send welcome email');
    }
  }

  // Verify SMTP connection on startup
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed', error.stack);
      return false;
    }
  }
}