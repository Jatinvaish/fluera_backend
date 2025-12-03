// ============================================
// src/common/services/r2.service.ts - Cloudflare R2 File Service
// UPDATED: Added chat attachment support
// ============================================
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as mime from 'mime-types';
import { SqlServerService } from 'src/core/database';
import { Readable } from 'stream';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  thumbnailUrl?: string;
  key: string;
}

export interface UploadOptions {
  folder?: string;
  tenantId?: number;
  userId?: number;
  isPublic?: boolean;
  generateThumbnail?: boolean;
  metadata?: Record<string, string>;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    private configService: ConfigService,
    private sqlService: SqlServerService,
  ) {
    const accountId = this.configService.get<string>('r2.accountId');
    const accessKeyId = this.configService.get<string>('r2.accessKeyId');
    const secretAccessKey = this.configService.get<string>('r2.secretAccessKey');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('❌ Cloudflare R2 credentials not configured');
    }

    this.bucketName = this.configService.get<string>('r2.bucketName')!;
    this.publicUrl = this.configService.get<string>('r2.publicUrl')!;
    this.maxFileSize = this.configService.get<number>('r2.maxFileSize') || 100 * 1024 * 1024; // 100MB default
    this.allowedMimeTypes = this.configService.get<string[]>('r2.allowedMimeTypes') || ['*/*'];

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('✅ Cloudflare R2 Service initialized');
  }

  // ==================== UPLOAD METHODS ====================

  /**
   * ✅ Upload single file
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    this.validateFile(file);

    const fileHash = this.generateFileHash(file.buffer);
    const key = this.generateFileKey(file.originalname, options.folder, options.tenantId);
    const mimeType = file.mimetype || mime.lookup(file.originalname) || 'application/octet-stream';

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: mimeType,
          ContentLength: file.size,
          Metadata: {
            originalName: file.originalname,
            uploadedBy: options.userId?.toString() || 'system',
            tenantId: options.tenantId?.toString() || '0',
            fileHash,
            ...options.metadata,
          },
        }),
      );

      const fileUrl = `${this.publicUrl}/${key}`;

      const result: UploadResult = {
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType,
        fileHash,
        key,
      };

      // Generate thumbnail for images
      if (options.generateThumbnail && this.isImage(mimeType)) {
        result.thumbnailUrl = await this.generateThumbnail(key);
      }

      this.logger.log(`✅ File uploaded: ${key} (${this.formatBytes(file.size)})`);

      return result;
    } catch (error) {
      this.logger.error(`❌ Upload failed: ${error.message}`);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * ✅ Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results: UploadResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error) {
        errors.push(`${file.originalname}: ${error.message}`);
        this.logger.error(`Failed to upload ${file.originalname}: ${error.message}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new BadRequestException(`All uploads failed: ${errors.join(', ')}`);
    }

    if (errors.length > 0) {
      this.logger.warn(`Partial upload success. Errors: ${errors.join(', ')}`);
    }

    return results;
  }

  /**
   * ✅ Upload file from buffer
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const fileHash = this.generateFileHash(buffer);
    const key = this.generateFileKey(filename, options.folder, options.tenantId);
    const mimeType = mime.lookup(filename) || 'application/octet-stream';

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ContentLength: buffer.length,
          Metadata: {
            originalName: filename,
            uploadedBy: options.userId?.toString() || 'system',
            tenantId: options.tenantId?.toString() || '0',
            fileHash,
            ...options.metadata,
          },
        }),
      );

      const fileUrl = `${this.publicUrl}/${key}`;

      this.logger.log(`✅ Buffer uploaded: ${key} (${this.formatBytes(buffer.length)})`);

      return {
        fileUrl,
        fileName: filename,
        fileSize: buffer.length,
        mimeType,
        fileHash,
        key,
      };
    } catch (error) {
      this.logger.error(`❌ Buffer upload failed: ${error.message}`);
      throw new BadRequestException(`Buffer upload failed: ${error.message}`);
    }
  }

  // ==================== CHAT ATTACHMENT METHODS (NEW) ====================

  /**
   * ✅ Upload file for chat message (returns attachment ID)
   */
  async uploadChatAttachment(
    file: Express.Multer.File,
    options: {
      tenantId: number;
      userId: number;
      messageId?: number;
    },
  ): Promise<{ 
    attachmentId: number; 
    fileUrl: string; 
    fileName: string; 
    fileSize: number; 
    mimeType: string;
    thumbnailUrl?: string;
  }> {
    // Upload to R2
    const uploadResult = await this.uploadFile(file, {
      folder: 'chat-attachments',
      tenantId: options.tenantId,
      userId: options.userId,
      generateThumbnail: this.isImage(file.mimetype),
    });

    // Save to database
    const attachmentId = await this.saveFileRecord(uploadResult, {
      tenantId: options.tenantId,
      userId: options.userId,
      messageId: options.messageId,
    });

    return {
      attachmentId,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      thumbnailUrl: uploadResult.thumbnailUrl,
    };
  }

  /**
   * ✅ Upload multiple files for chat message
   */
  async uploadChatAttachments(
    files: Express.Multer.File[],
    options: {
      tenantId: number;
      userId: number;
      messageId?: number;
    },
  ): Promise<Array<{ 
    attachmentId: number; 
    fileUrl: string; 
    fileName: string; 
    fileSize: number; 
    mimeType: string;
    thumbnailUrl?: string;
  }>> {
    const results:any = [];

    for (const file of files) {
      try {
        const result = await this.uploadChatAttachment(file, options);
        if(result) {
          results.push(result);
        }
      } catch (error) {
        this.logger.error(`Failed to upload ${file.originalname}: ${error.message}`);
        // Continue with other files
      }
    }

    if (results.length === 0) {
      throw new BadRequestException('All file uploads failed');
    }

    return results;
  }

  // ==================== DOWNLOAD METHODS ====================

  /**
   * ✅ Get file buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      // Handle stream conversion properly
      if (response.Body instanceof Readable) {
        return await this.streamToBuffer(response.Body);
      } else if (response.Body) {
        // @ts-ignore - AWS SDK types can be tricky
        return Buffer.from(await response.Body.transformToByteArray());
      }
      
      throw new Error('Invalid response body');
    } catch (error) {
      this.logger.error(`❌ Get file failed: ${error.message}`);
      throw new BadRequestException(`File not found: ${key}`);
    }
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * ✅ Generate signed URL for temporary access (expires in 1 hour)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`❌ Generate signed URL failed: ${error.message}`);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  /**
   * ✅ Get file metadata
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`❌ Get metadata failed: ${error.message}`);
      throw new BadRequestException('File not found');
    }
  }

  // ==================== DELETE METHODS ====================

  /**
   * ✅ Delete single file
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.log(`🗑️  File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Delete failed: ${error.message}`);
      throw new BadRequestException(`Failed to delete file: ${key}`);
    }
  }

  /**
   * ✅ Delete multiple files
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;

    try {
      await this.s3Client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );

      this.logger.log(`🗑️  Deleted ${keys.length} files`);
    } catch (error) {
      this.logger.error(`❌ Bulk delete failed: ${error.message}`);
      throw new BadRequestException('Failed to delete files');
    }
  }

  /**
   * ✅ Delete files by prefix (folder)
   */
  async deleteFolder(prefix: string): Promise<void> {
    try {
      const files = await this.listFiles(prefix);
      const keys = files.map((f) => f.Key!).filter(Boolean);

      if (keys.length > 0) {
        await this.deleteMultipleFiles(keys);
      }

      this.logger.log(`🗑️  Deleted folder: ${prefix} (${keys.length} files)`);
    } catch (error) {
      this.logger.error(`❌ Delete folder failed: ${error.message}`);
      throw new BadRequestException('Failed to delete folder');
    }
  }

  // ==================== LIST METHODS ====================

  /**
   * ✅ List files by prefix
   */
  async listFiles(prefix?: string, maxKeys: number = 1000): Promise<any[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);
      return response.Contents || [];
    } catch (error) {
      this.logger.error(`❌ List files failed: ${error.message}`);
      return [];
    }
  }

  /**
   * ✅ Get folder size
   */
  async getFolderSize(prefix: string): Promise<number> {
    const files = await this.listFiles(prefix);
    return files.reduce((total, file) => total + (file.Size || 0), 0);
  }

  // ==================== COPY/MOVE METHODS ====================

  /**
   * ✅ Copy file
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucketName,
          CopySource: `${this.bucketName}/${sourceKey}`,
          Key: destinationKey,
        }),
      );

      this.logger.log(`📋 File copied: ${sourceKey} → ${destinationKey}`);
    } catch (error) {
      this.logger.error(`❌ Copy failed: ${error.message}`);
      throw new BadRequestException('Failed to copy file');
    }
  }

  /**
   * ✅ Move file (copy + delete)
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
    this.logger.log(`🚚 File moved: ${sourceKey} → ${destinationKey}`);
  }

  // ==================== VALIDATION METHODS ====================

  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.formatBytes(this.maxFileSize)}`,
      );
    }

    // Check MIME type (skip if wildcard is allowed)
    if (!this.allowedMimeTypes.includes('*/*') && !this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed: ${file.mimetype}. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check for malicious extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.jar', '.vbs', '.ps1'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (dangerousExtensions.includes(ext)) {
      throw new BadRequestException('File type not allowed for security reasons');
    }
  }

  // ==================== HELPER METHODS ====================

  private generateFileKey(filename: string, folder?: string, tenantId?: number): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = filename.substring(filename.lastIndexOf('.'));
    const sanitized = filename
      .substring(0, filename.lastIndexOf('.'))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50); // Limit length

    const parts = [
      folder || 'uploads',
      tenantId ? `tenant-${tenantId}` : 'global',
      new Date().toISOString().split('T')[0], // YYYY-MM-DD
      `${sanitized}-${timestamp}-${random}${ext}`,
    ];

    return parts.join('/');
  }

  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async generateThumbnail(key: string): Promise<string> {
    // TODO: Implement thumbnail generation using sharp or similar
    // For now, return placeholder
    return `${this.publicUrl}/thumbnails/${key}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // ==================== DATABASE INTEGRATION ====================

  /**
   * ✅ Save file record to database
   */
  async saveFileRecord(
    result: UploadResult,
    options: {
      tenantId: number;
      userId: number;
      messageId?: number;
      relatedType?: string;
      relatedId?: number;
    },
  ): Promise<number> {
    try {
      const record = await this.sqlService.execute('sp_UploadAttachment_Fast', {
        messageId: options.messageId || null,
        tenantId: options.tenantId,
        userId: options.userId,
        filename: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        fileUrl: result.fileUrl,
        fileHash: result.fileHash,
        thumbnailUrl: result.thumbnailUrl || null,
      });

      const attachmentId = record[0]?.attachment_id;
      this.logger.log(`💾 File record saved: ID ${attachmentId}`);
      return attachmentId;
    } catch (error) {
      this.logger.error(`❌ Save file record failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ Get storage usage for tenant
   */
  async getTenantStorageUsage(tenantId: number): Promise<{
    totalFiles: number;
    totalSize: number;
    formattedSize: string;
  }> {
    try {
      const result = await this.sqlService.query(
        `SELECT 
          COUNT(*) as total_files,
          ISNULL(SUM(file_size), 0) as total_size
        FROM message_attachments
        WHERE tenant_id = @tenantId AND is_deleted = 0`,
        { tenantId },
      );

      const totalSize = result[0]?.total_size || 0;

      return {
        totalFiles: result[0]?.total_files || 0,
        totalSize,
        formattedSize: this.formatBytes(totalSize),
      };
    } catch (error) {
      this.logger.error(`❌ Get storage usage failed: ${error.message}`);
      return { totalFiles: 0, totalSize: 0, formattedSize: '0 Bytes' };
    }
  }
}