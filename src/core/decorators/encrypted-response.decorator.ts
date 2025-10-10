
// ============================================
// core/decorators/encrypted-response.decorator.ts
// ============================================
import { SetMetadata } from '@nestjs/common';

export const ENCRYPTED_RESPONSE_KEY = 'encryptedResponse';
export const EncryptedResponse = () => SetMetadata(ENCRYPTED_RESPONSE_KEY, true);