// src/common/twilio.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: ReturnType<typeof twilio> | null = null;
  private readonly enabled: boolean;
  private readonly fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER') || '';
    this.enabled = this.configService.get<string>('TWILIO_ENABLED') === 'true';

    if (this.enabled && accountSid && authToken) {
      try {
        this.client = twilio(accountSid, authToken);
        this.logger.log('✅ Twilio client initialized successfully');
      } catch (error) {
        this.logger.error('❌ Failed to initialize Twilio client:', error.message);
        this.enabled = false;
      }
    } else {
      this.logger.warn('⚠️ Twilio is disabled or credentials not configured');
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(params: {
    to: string;
    message: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      this.logger.warn('Twilio is disabled - SMS not sent');
      return { success: false, error: 'Twilio is disabled' };
    }

    if (!this.client) {
      this.logger.error('Twilio client not initialized');
      return { success: false, error: 'Twilio client not initialized' };
    }

    try {
      // Format phone number (add + if not present)
      const phoneNumber = params.to.startsWith('+') ? params.to : `+${params.to}`;

      const result = await this.client.messages.create({
        body: params.message,
        from: this.fromNumber,
        to: phoneNumber,
      });

      this.logger.log(`✅ SMS sent successfully: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to send SMS: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send chat notification via SMS
   */
  async sendChatNotification(params: {
    to: string;
    senderName: string;
    channelName: string;
    messagePreview: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `New message from ${params.senderName} in ${params.channelName}: "${params.messagePreview}"`;
    
    return this.sendSMS({
      to: params.to,
      message: message.substring(0, 160), // SMS limit
    });
  }

  /**
   * Send mention notification via SMS
   */
  async sendMentionNotification(params: {
    to: string;
    senderName: string;
    channelName: string;
    messagePreview: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `@${params.senderName} mentioned you in ${params.channelName}: "${params.messagePreview}"`;
    
    return this.sendSMS({
      to: params.to,
      message: message.substring(0, 160),
    });
  }

  /**
   * Check if Twilio is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Get Twilio status
   */
  getStatus(): { enabled: boolean; configured: boolean } {
    return {
      enabled: this.enabled,
      configured: this.client !== null,
    };
  }
}