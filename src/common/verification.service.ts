
// ============================================
// 2. VERIFICATION CODE SERVICE (New)
// ============================================
// modules/auth/services/verification.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { SqlServerService } from 'src/core/database';
import { EmailService } from './email.service';
import { HashingService } from './hashing.service';

@Injectable()
export class VerificationService {
  constructor(
    private sqlService: SqlServerService,
    private hashingService: HashingService,
    private emailService: EmailService,
  ) {}

  async sendVerificationCode(email: string, codeType: string, userId?: bigint) {
    const code = this.hashingService.generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.sqlService.query(
      `INSERT INTO verification_codes (user_id, email, code, code_type, expires_at, max_attempts)
       VALUES (@userId, @email, @code, @codeType, @expiresAt, 5)`,
      { userId: userId || null, email, code, codeType, expiresAt }
    );

    await this.emailService.sendVerificationCode(email, code, codeType);
    return { message: 'Verification code sent' };
  }

  async verifyCode(email: string, code: string, codeType: string): Promise<boolean> {
    const result = await this.sqlService.query(
      `SELECT * FROM verification_codes 
       WHERE email = @email AND code = @code AND code_type = @codeType 
       AND expires_at > GETUTCDATE() AND used_at IS NULL`,
      { email, code, codeType }
    );

    if (result.length === 0) {
      await this.sqlService.query(
        `UPDATE verification_codes 
         SET attempts = attempts + 1 
         WHERE email = @email AND code_type = @codeType AND used_at IS NULL`,
        { email, codeType }
      );
      throw new BadRequestException('Invalid or expired verification code');
    }

    const codeRecord = result[0];
    if (codeRecord.attempts >= codeRecord.max_attempts) {
      throw new BadRequestException('Maximum verification attempts exceeded');
    }

    await this.sqlService.query(
      `UPDATE verification_codes SET used_at = GETUTCDATE() WHERE id = @id`,
      { id: codeRecord.id }
    );

    return true;
  }
}