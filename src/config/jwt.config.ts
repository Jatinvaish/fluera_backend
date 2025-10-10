
// ============================================
// config/jwt.config.ts
// ============================================
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  issuer: process.env.JWT_ISSUER || 'fluera-platform',
  audience: process.env.JWT_AUDIENCE || 'fluera-api',
  algorithm: 'HS256',
}));
