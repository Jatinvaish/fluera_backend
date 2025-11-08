import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class EncryptionDefaultMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Only enable encryption if explicitly configured
    const encryptionEnabled = this.configService.get('ENCRYPTION_ENABLED_BY_DEFAULT', 'false');
    
    if (!req.headers['x-encryption-enabled'] && encryptionEnabled === 'true') {
      req.headers['x-encryption-enabled'] = 'true';
    }
    next();
  }
}