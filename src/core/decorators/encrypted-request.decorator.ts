
// ============================================
// core/decorators/encrypted-request.decorator.ts
// ============================================
import { SetMetadata } from '@nestjs/common';

export const ENCRYPTED_REQUEST_KEY = 'encryptedRequest';
export const EncryptedRequest = () => SetMetadata(ENCRYPTED_REQUEST_KEY, true);