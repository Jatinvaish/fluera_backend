// src/modules/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SqlServerService } from 'src/core/database';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private databaseService: SqlServerService,
    private configService: ConfigService,
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

  // Send Email Verification
  async sendVerificationEmail(
    email: string,
    firstName: string,
    code: string,
  ): Promise<void> {
    const template = await this.getEmailTemplate(null, 'email_verification');

    const variables = {
      firstName,
      code,
      expiryMinutes: 15,
      currentYear: new Date().getFullYear(),
    };

    const htmlContent = this.replaceVariables(template.body_html, variables);

    await this.sendEmail({
      to: email,
      subject: this.replaceVariables(template.subject, variables),
      html: htmlContent,
    });

    // Increment template usage
    await this.databaseService.execute('[dbo].[sp_IncrementTemplateUsage]', {
      template_id: template.id,
    });
  }

  // Send Welcome Email
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const template = await this.getEmailTemplate(null, 'welcome');

    const variables = {
      firstName,
      loginUrl: this.configService.get<string>('APP_URL') + '/login',
      currentYear: new Date().getFullYear(),
    };

    const htmlContent = this.replaceVariables(template.body_html, variables);

    await this.sendEmail({
      to: email,
      subject: this.replaceVariables(template.subject, variables),
      html: htmlContent,
    });

    await this.databaseService.execute('[dbo].[sp_IncrementTemplateUsage]', {
      template_id: template.id,
    });
  }

  // Send Password Reset Email
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const template = await this.getEmailTemplate(null, 'password_reset');

    const resetLink = `${this.configService.get<string>('APP_URL')}/reset-password?token=${token}`;

    const variables = {
      resetLink,
      currentYear: new Date().getFullYear(),
    };

    const htmlContent = this.replaceVariables(template.body_html, variables);

    await this.sendEmail({
      to: email,
      subject: this.replaceVariables(template.subject, variables),
      html: htmlContent,
    });

    await this.databaseService.execute('[dbo].[sp_IncrementTemplateUsage]', {
      template_id: template.id,
    });
  }

  // Send Invitation Email
  async sendInvitationEmail(
    email: string,
    inviterName: string,
    tenantName: string,
    inviteLink: string,
  ): Promise<void> {
    const template = await this.getEmailTemplate(null, 'invitation');

    const variables = {
      inviterName,
      tenantName,
      inviteLink,
      currentYear: new Date().getFullYear(),
    };

    const htmlContent = this.replaceVariables(template.body_html, variables);
    const subject = this.replaceVariables(template.subject, variables);

    await this.sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });

    await this.databaseService.execute('[dbo].[sp_IncrementTemplateUsage]', {
      template_id: template.id,
    });
  }

  // Send 2FA Code Email
  async send2FACodeEmail(
    email: string,
    firstName: string,
    code: string,
  ): Promise<void> {
    const template = await this.getEmailTemplate(null, '2fa_code');

    const variables = {
      firstName,
      code,
      expiryMinutes: 10,
      currentYear: new Date().getFullYear(),
    };

    const htmlContent = this.replaceVariables(template.body_html, variables);

    await this.sendEmail({
      to: email,
      subject: this.replaceVariables(template.subject, variables),
      html: htmlContent,
    });

    await this.databaseService.execute('[dbo].[sp_IncrementTemplateUsage]', {
      template_id: template.id,
    });
  }

  // Get Email Template
  private async getEmailTemplate(tenantId: number | null, category: string) {
    const result = await this.databaseService.execute(
      '[dbo].[sp_GetEmailTemplate]',
      {
        tenant_id: tenantId,
        category,
      },
    );

    if (!result || result.length === 0) {
      throw new Error(`Email template not found for category: ${category}`);
    }

    return result[0];
  }

  // Replace Variables in Template
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key]);
    });

    return result;
  }

  // Send Email
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      console.log("🚀 ~ EmailService ~ sendEmail ~ options:", options)

      // await this.transporter.sendMail({
      //   from: `${this.configService.get<string>('SMTP_FROM_NAME')} <${this.configService.get<string>('SMTP_FROM_EMAIL')}>`,
      //   to: options.to,
      //   subject: options.subject,
      //   html: options.html,
      // });

      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.html,
      });
      console.log(`✅ Email sent to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }
}
