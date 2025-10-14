// ============================================
// email.service.ts
// Simplified Email Service using Templates
// ============================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SqlServerService } from 'src/core/database/sql-server.service';
 
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private sqlService: SqlServerService,
  ) {
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

  /**
   * Core method to send email using database templates
   */
  private async sendTemplatedEmail(
    category: string,
    toEmail: string,
    variables: Record<string, any>,
    organizationId?: bigint,
  ): Promise<void> {
    try {
      // Get template from database
      const result = await this.sqlService.query(
        'EXEC sp_GetEmailTemplate @organizationId, @category',
        { 
          organizationId: organizationId || null, 
          category 
        }
      );

      if (!result || result.length === 0) {
        throw new Error(`Email template not found for category: ${category}`);
      }

      const template = result[0];
      
      // Replace variables in subject and body
      const subject = this.replaceVariables(template.subject, variables);
      const html = this.replaceVariables(template.body_html, variables);
      const text = template.body_text 
        ? this.replaceVariables(template.body_text, variables) 
        : undefined;

      // Send email
      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to: toEmail,
        subject,
        html,
        text,
      });

      // Increment usage count
      await this.sqlService.query(
        'EXEC sp_IncrementTemplateUsage @templateId',
        { templateId: template.id }
      );

      this.logger.log(`Email sent to ${toEmail} using template: ${category}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${toEmail}`, error.stack);
      throw new Error(`Failed to send ${category} email`);
    }
  }

  /**
   * Replace variables in template string
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    return result;
  }

  /**
   * Send invitation email
   * @param email - Recipient email
   * @param token - Invitation token
   * @param inviterName - Name of person sending invite
   * @param orgName - Organization name
   * @param organizationId - Optional organization ID for custom template
   */
  async sendInvitation(
    email: string, 
    token: string, 
    inviterName: string, 
    orgName: string, 
    organizationId?: bigint
  ): Promise<void> {
    const inviteLink = `${this.configService.get('APP_URL')}/accept-invite/${token}`;
    
    await this.sendTemplatedEmail('invitation', email, {
      inviterName,
      orgName,
      inviteLink,
    }, organizationId);
  }

  /**
   * Send password reset email
   * @param email - Recipient email
   * @param token - Reset token
   * @param organizationId - Optional organization ID for custom template
   */
  async sendPasswordReset(
    email: string, 
    token: string, 
    organizationId?: bigint
  ): Promise<void> {
    const resetLink = `${this.configService.get('APP_URL')}/reset-password/${token}`;
    
    await this.sendTemplatedEmail('password_reset', email, {
      resetLink,
    }, organizationId);
  }

  /**
   * Send verification code email
   * @param email - Recipient email
   * @param code - Verification code
   * @param firstName - Optional first name
   * @param organizationId - Optional organization ID for custom template
   */
  async sendVerificationCode(
    email: string, 
    code: string, 
    firstName?: string, 
    organizationId?: bigint
  ): Promise<void> {
    const expiryMinutes = this.configService.get('VERIFICATION_CODE_EXPIRY_MINUTES') || 10;
    
    await this.sendTemplatedEmail('email_verification', email, {
      firstName: firstName || 'there',
      code,
      expiryMinutes,
      currentYear: new Date().getFullYear(),
    }, organizationId);
  }

  /**
   * Send welcome email
   * @param email - Recipient email
   * @param firstName - User's first name
   * @param organizationId - Optional organization ID for custom template
   */
  async sendWelcomeEmail(
    email: string, 
    firstName: string, 
    organizationId?: bigint
  ): Promise<void> {
    const loginUrl = `${this.configService.get('APP_URL')}/login`;
    
    await this.sendTemplatedEmail('welcome', email, {
      firstName,
      loginUrl,
      currentYear: new Date().getFullYear(),
    }, organizationId);
  }

  /**
   * Send custom email using any template category
   * @param category - Template category
   * @param email - Recipient email
   * @param variables - Variables to replace in template
   * @param organizationId - Optional organization ID for custom template
   */
  async sendCustomEmail(
    category: string,
    email: string,
    variables: Record<string, any>,
    organizationId?: bigint
  ): Promise<void> {
    await this.sendTemplatedEmail(category, email, variables, organizationId);
  }

  /**
   * Send bulk emails using template
   * @param category - Template category
   * @param recipients - Array of {email, variables} objects
   * @param organizationId - Optional organization ID for custom template
   */
  async sendBulkEmails(
    category: string,
    recipients: Array<{ email: string; variables: Record<string, any> }>,
    organizationId?: bigint
  ): Promise<{ sent: number; failed: number; errors: any[] }> {
    let sent = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const recipient of recipients) {
      try {
        await this.sendTemplatedEmail(
          category,
          recipient.email,
          recipient.variables,
          organizationId
        );
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          email: recipient.email,
          error: error.message,
        });
        this.logger.error(`Failed to send bulk email to ${recipient.email}`, error.stack);
      }
    }

    this.logger.log(`Bulk email complete: ${sent} sent, ${failed} failed`);
    return { sent, failed, errors };
  }

  /**
   * Verify SMTP connection on startup
   */
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