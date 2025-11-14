// src/common/enhanced-encryption.service.ts - FIXED VERSION
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqlServerService } from '../core/database/sql-server.service';
import * as crypto from 'crypto';

interface UserKeyData {
  id: number;
  user_id: number;
  public_key_pem: string;
  key_fingerprint: string;
  key_fingerprint_short: string;
  key_version: number;
  status: string;
  created_at: Date;
  expires_at: Date | null;
}

interface KeyGenerationResult {
  publicKey: string;
  encryptedPrivateKey: string;
  backupEncryptedPrivateKey: string;
  keyFingerprint: string;
}

@Injectable()
export class EnhancedEncryptionService {
  private readonly logger = new Logger(EnhancedEncryptionService.name);
  private masterKey: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly SALT_LENGTH = 32;
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly RSA_KEY_SIZE = 4096;

  constructor(
    private configService: ConfigService,
    private sqlService: SqlServerService,
  ) {
    const key = this.configService.get('encryption.key');

    if (!key || key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }

    // Derive master key using PBKDF2 for better security
    const masterSalt = this.configService.get('encryption.masterSalt') || 'fluera-platform-master-salt-v3';
    this.masterKey = crypto.pbkdf2Sync(
      key,
      masterSalt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * 🔒 Generate RSA-4096 key pair for E2E encryption with backup
   */
  async generateUserKeyPair(userId: number, password: string): Promise<KeyGenerationResult> {
    try {
      this.logger.log(`Generating RSA-${this.RSA_KEY_SIZE} key pair for user ${userId}`);

      // Generate RSA-4096 key pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: this.RSA_KEY_SIZE,
        publicKeyEncoding: { 
          type: 'spki', 
          format: 'pem' 
        },
        privateKeyEncoding: { 
          type: 'pkcs8', 
          format: 'pem' 
        },
      });

      // Encrypt private key with user's password-derived key
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const derivedKey = crypto.pbkdf2Sync(
        password, 
        salt, 
        this.PBKDF2_ITERATIONS, 
        this.KEY_LENGTH, 
        'sha256'
      );

      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);

      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      // Format: salt:iv:authTag:encrypted
      const encryptedPrivateKey = `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

      // Create backup encrypted with master key (for recovery)
      const backupEncryptedPrivateKey = await this.encryptWithMasterKey(privateKey);

      // Generate fingerprint
      const keyFingerprint = crypto
        .createHash('sha256')
        .update(publicKey)
        .digest('hex');

      this.logger.log(`Key pair generated successfully for user ${userId}, fingerprint: ${keyFingerprint.substring(0, 16)}`);

      return {
        publicKey,
        encryptedPrivateKey,
        backupEncryptedPrivateKey,
        keyFingerprint,
      };
    } catch (error) {
      this.logger.error(`Failed to generate key pair for user ${userId}`, error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  /**
   * 🔒 Store user encryption keys in database (FIXED - Direct SQL instead of SP)
   */
  async storeUserEncryptionKey(
    userId: number, 
    keyData: KeyGenerationResult
  ): Promise<number> {
    try {
      this.logger.log(`Storing encryption keys for user ${userId}`);

      // Deactivate any existing active keys
      await this.sqlService.query(
        `UPDATE [dbo].[user_encryption_keys]
         SET status = 'inactive', updated_at = GETUTCDATE()
         WHERE user_id = @userId AND status = 'active'`,
        { userId }
      );

      // Calculate fingerprints
      const keyFingerprintShort = keyData.keyFingerprint.substring(0, 16);

      // Get next key version
      const versionResult = await this.sqlService.query(
        `SELECT ISNULL(MAX(key_version), 0) + 1 as nextVersion 
         FROM [dbo].[user_encryption_keys] 
         WHERE user_id = @userId`,
        { userId }
      );
      
      const keyVersion = versionResult[0]?.nextVersion || 1;

      // Insert new key
      const result = await this.sqlService.query(
        `INSERT INTO [dbo].[user_encryption_keys] (
          user_id,
          public_key_pem,
          encrypted_private_key_pem,
          key_fingerprint,
          key_fingerprint_short,
          backup_encrypted_private_key,
          backup_created_at,
          status,
          key_version,
          created_at,
          created_by
        )
        OUTPUT INSERTED.id
        VALUES (
          @userId,
          @publicKey,
          @encryptedPrivateKey,
          @keyFingerprint,
          @keyFingerprintShort,
          @backupKey,
          @backupCreatedAt,
          'active',
          @keyVersion,
          GETUTCDATE(),
          @userId
        )`,
        {
          userId,
          publicKey: keyData.publicKey,
          encryptedPrivateKey: keyData.encryptedPrivateKey,
          keyFingerprint: keyData.keyFingerprint,
          keyFingerprintShort,
          backupKey: keyData.backupEncryptedPrivateKey,
          backupCreatedAt: keyData.backupEncryptedPrivateKey ? new Date() : null,
          keyVersion,
        }
      );

      const keyId = result[0]?.id;
      this.logger.log(`Encryption keys stored for user ${userId}, key ID: ${keyId}`);
      return keyId;
    } catch (error) {
      this.logger.error(`Failed to store encryption keys for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * 🔒 Get user's active encryption key (FIXED - Direct SQL)
   */
  async getUserActiveKey(userId: number): Promise<UserKeyData | null> {
    try {
      const result = await this.sqlService.query(
        `SELECT TOP 1
          id,
          user_id,
          public_key_pem,
          key_fingerprint,
          key_fingerprint_short,
          key_version,
          status,
          created_at,
          expires_at
        FROM [dbo].[user_encryption_keys]
        WHERE user_id = @userId
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > GETUTCDATE())
        ORDER BY key_version DESC`,
        { userId }
      );

      if (result && result.length > 0) {
        return result[0] as UserKeyData;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get active key for user ${userId}`, error);
      return null;
    }
  }

  /**
   * 🔒 Rotate user encryption key (FIXED - Direct SQL)
   */
  async rotateUserKey(
    userId: number, 
    newPassword: string, 
    reason: string = 'scheduled'
  ): Promise<void> {
    try {
      this.logger.log(`Rotating encryption key for user ${userId}, reason: ${reason}`);

      // Generate new key pair
      const newKeyData = await this.generateUserKeyPair(userId, newPassword);

      // Get current key
      const currentKey = await this.getUserActiveKey(userId);
      const oldKeyId = currentKey?.id || null;

      // Mark old key as rotated
      if (oldKeyId) {
        await this.sqlService.query(
          `UPDATE [dbo].[user_encryption_keys]
           SET status = 'rotated', 
               revoked_at = GETUTCDATE(),
               revoke_reason = @reason,
               updated_at = GETUTCDATE(),
               updated_by = @userId
           WHERE id = @keyId`,
          { keyId: oldKeyId, reason, userId }
        );
      }

      // Store new key
      await this.storeUserEncryptionKey(userId, newKeyData);

      this.logger.log(`Key rotation completed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to rotate key for user ${userId}`, error);
      throw new Error('Failed to rotate encryption key');
    }
  }

  /**
   * 🔒 Decrypt user's private key
   */
  decryptUserPrivateKey(encryptedPrivateKey: string, password: string): string {
    try {
      const [saltHex, ivHex, authTagHex, encryptedHex] = encryptedPrivateKey.split(':');

      if (!saltHex || !ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted private key format');
      }

      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const derivedKey = crypto.pbkdf2Sync(
        password, 
        salt, 
        this.PBKDF2_ITERATIONS, 
        this.KEY_LENGTH, 
        'sha256'
      );

      const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Private key decryption failed', error);
      throw new BadRequestException('Invalid password or corrupted key');
    }
  }

  /**
   * 🔒 Encrypt with master key (for backups)
   */
  private async encryptWithMasterKey(data: string): Promise<string> {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 🔒 Decrypt with master key (for recovery)
   */
  async decryptWithMasterKey(encryptedData: string): Promise<string> {
    try {
      const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');

      if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Master key decryption failed', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * 🔒 Generate secure channel key
   */
  generateChannelKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 🔒 Encrypt message with AES-256-GCM
   */
  encryptMessage(content: string, channelKey: string): {
    encryptedContent: string;
    iv: string;
    authTag: string;
    contentHash: string;
  } {
    try {
      const keyBuffer = Buffer.from(channelKey, 'hex');
      if (keyBuffer.length !== 32) {
        throw new Error('Invalid channel key length');
      }

      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);

      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();
      
      // Generate content hash for integrity verification
      const contentHash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');

      return {
        encryptedContent: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        contentHash,
      };
    } catch (error) {
      this.logger.error('Message encryption failed', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * 🔒 Decrypt message with AES-256-GCM
   */
  decryptMessage(
    encryptedContent: string,
    channelKey: string,
    iv: string,
    authTag: string
  ): string {
    try {
      const keyBuffer = Buffer.from(channelKey, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, ivBuffer);
      decipher.setAuthTag(authTagBuffer);

      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Message decryption failed', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * 🔒 Encrypt with RSA public key
   */
  encryptWithPublicKey(data: string, publicKeyPem: string): string {
    try {
      const buffer = Buffer.from(data, 'utf8');
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer
      );
      return encrypted.toString('base64');
    } catch (error) {
      this.logger.error('RSA encryption failed', error);
      throw new Error('RSA encryption failed');
    }
  }

  /**
   * 🔒 Decrypt with RSA private key
   */
  decryptWithPrivateKey(encryptedData: string, privateKeyPem: string): string {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer
      );
      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('RSA decryption failed', error);
      throw new Error('RSA decryption failed');
    }
  }

  /**
   * 🔒 Generate HMAC for integrity verification
   */
  generateHMAC(data: string, secret?: string): string {
    const key = secret || this.masterKey.toString('hex');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * 🔒 Verify HMAC
   */
  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    try {
      const calculated = this.generateHMAC(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(calculated, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * 🔒 Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 🔒 Calculate key fingerprint
   */
  calculateKeyFingerprint(publicKeyPem: string): string {
    return crypto
      .createHash('sha256')
      .update(publicKeyPem)
      .digest('hex');
  }
}