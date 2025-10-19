
// ============================================
// config/encryption.config.ts
// ============================================
import { registerAs } from '@nestjs/config';

export default registerAs('encryption', () => ({
  algorithm: 'aes-256-gcm',
  key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-min-length',
  ivLength: 16,
  saltLength: 64,
  tagLength: 16,
  pbkdf2Iterations: 100000,
  apiKey: {
    enabled: process.env.API_KEY_ENABLED === 'true',
    keys: process.env.API_KEYS?.split(',') || [],
  },
}));