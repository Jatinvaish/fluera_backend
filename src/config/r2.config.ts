// ============================================
// config/r2.config.ts - Cloudflare R2 Configuration
// ============================================
import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => ({
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'fluera-storage',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || 
    `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || 
    `https://files.fluera.com`, // Your custom domain
  region: 'auto',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '100') * 1024 * 1024, // 100MB default
  allowedMimeTypes: [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/csv', 'text/html',
    // Archives
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed', 'application/x-7z-compressed',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    // Video
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
  ],
}));