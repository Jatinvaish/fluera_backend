// ============================================
// core/middlewares/decryption.middleware.ts (WITH LOGGING)
// ============================================
import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EncryptionService } from 'src/common/encryption.service';

@Injectable()
export class DecryptionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DecryptionMiddleware.name);

  constructor(private encryptionService: EncryptionService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const encryptionEnabled = req.headers['x-encryption-enabled'] === 'true';
    const requestId = req.headers['x-request-id'];

    this.logger.log(`[${requestId}] DecryptionMiddleware: encryption=${encryptionEnabled}`);
    this.logger.log(`[${requestId}] Request body keys:`, Object.keys(req.body || {}));

    if (!encryptionEnabled) {
      this.logger.log(`[${requestId}] Encryption disabled, skipping decryption`);
      return next();
    }

    try {
      if (req.body && req.body.__payload) {
        this.logger.log(`[${requestId}] Found encrypted payload, decrypting...`);
        
        const checksum = req.body.__checksum;
        const payload = req.body.__payload;

        if (checksum) {
          const crypto = require('crypto');
          const calculatedChecksum = crypto
            .createHmac('sha256', process.env.ENCRYPTION_KEY || 'default')
            .update(payload)
            .digest('hex');

          if (calculatedChecksum !== checksum) {
            this.logger.error(`[${requestId}] Checksum verification failed`);
            throw new BadRequestException('Request integrity check failed');
          }
          this.logger.log(`[${requestId}] Checksum verified`);
        }

        const decrypted = this.encryptionService.decrypt(payload);
        req.body = JSON.parse(decrypted);
        
        this.logger.log(`[${requestId}] Decrypted successfully. New body keys:`, Object.keys(req.body));
      } else {
        this.logger.log(`[${requestId}] No __payload found in request body`);
      }
    } catch (error) {
      this.logger.error(
        `[${requestId}] Decryption failed: ${error.message}`,
        error.stack
      );
      throw new BadRequestException('Failed to decrypt request');
    }
    next();
  }
}