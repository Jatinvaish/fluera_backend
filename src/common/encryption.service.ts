// common/encryption.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private masterKey: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly SALT_LENGTH = 32;

  constructor(private configService: ConfigService) {
    const key = this.configService.get('encryption.key');

    if (!key || key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }

    // 🔒 Derive key using PBKDF2 for better security
    this.masterKey = crypto.pbkdf2Sync(
      key,
      'fluera-platform-salt', // In production, use env variable
      100000,
      this.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * 🔒 Secure encrypt with AES-256-GCM
   */
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * 🔒 Secure decrypt with AES-256-GCM
   */
  decrypt(encryptedData: string): string {
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
      this.logger.error('Decryption failed', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * 🔒 Generate RSA key pair (E2EE)
   */
  generateUserKey(password: string): { publicKey: string; encryptedPrivateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096, // 🔒 Increased from 2048
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // 🔒 Encrypt private key with password-derived key
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: salt:iv:authTag:encrypted
    const encryptedPrivateKey = `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    return { publicKey, encryptedPrivateKey };
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

      const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Private key decryption failed', error);
      throw new Error('Invalid password or corrupted key');
    }
  }

  /**
   * 🔒 Encrypt message with AES-256-GCM
   */
  encryptMessage(content: string, channelKey: string): {
    encryptedContent: string;
    iv: string;
    authTag: string;
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

      return {
        encryptedContent: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
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
   * 🔒 Generate secure random channel key
   */
  generateChannelKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 🔒 Hash password with bcrypt (for database storage)
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, 12); // 12 rounds
  }

  /**
   * 🔒 Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * 🔒 Generate HMAC for data integrity
   */
  generateHMAC(data: string, secret?: string): string {
    const key = secret || this.masterKey;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * 🔒 Verify HMAC
   */
  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    const calculated = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(calculated, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }

  generateTenantKey(): { publicKey: string; encryptedPrivateKey: string } {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    // Encrypt the private key with a master key or leave as-is
    const encryptedPrivateKey = this.encrypt(keyPair.privateKey);

    return {
      publicKey: keyPair.publicKey,
      encryptedPrivateKey: encryptedPrivateKey,
    };
  }

  /**
   * 🔒 Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 🔒 Key rotation helper
   */
  async rotateEncryptionKey(
    oldEncrypted: string,
    oldKey: string,
    newKey: string
  ): Promise<string> {
    try {
      // Decrypt with old key
      const plaintext = this.decrypt(oldEncrypted);

      // Re-encrypt with new key
      const tempMasterKey = this.masterKey;
      this.masterKey = Buffer.from(newKey);
      const newEncrypted = this.encrypt(plaintext);
      this.masterKey = tempMasterKey;

      return newEncrypted;
    } catch (error) {
      this.logger.error('Key rotation failed', error);
      throw new Error('Key rotation failed');
    }
  }
}
