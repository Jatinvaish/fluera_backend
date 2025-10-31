
// ============================================
// core/middlewares/encryption-default.middleware.ts (NEW)
// ============================================
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class EncryptionDefaultMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Enable encryption by default for all requests
    if (!req.headers['x-encryption-enabled']) {
      req.headers['x-encryption-enabled'] = 'true';
    }
    next();
  }
}
