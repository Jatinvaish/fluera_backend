
// ============================================
// BACKEND: core/guards/encryption.guard.ts
// ============================================
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRE_ENCRYPTION = 'requireEncryption';
export const RequireEncryption = () => SetMetadata(REQUIRE_ENCRYPTION, true);

@Injectable()
export class EncryptionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireEncryption = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ENCRYPTION,
      [context.getHandler(), context.getClass()],
    );

    if (!requireEncryption) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const encryptionEnabled = request.headers['x-encryption-enabled'] === 'true';

    if (!encryptionEnabled) {
      throw new ForbiddenException(
        'This endpoint requires encrypted communication. Set X-Encryption-Enabled header.'
      );
    }

    return true;
  }
}
