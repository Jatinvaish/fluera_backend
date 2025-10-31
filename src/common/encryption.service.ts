// ============================================
// src/common/encryption.service.ts - COMPLETE V3.0 E2E
// ============================================
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private masterKey: string;

  constructor(private configService: ConfigService) {
    const key = this.configService.get('encryption.key');
    if (!key) {
      throw new Error('ENCRYPTION_KEY not found in environment');
    }
    this.masterKey = key;
  }

  /**
   * Encrypt text using AES-256-CBC with CryptoJS
   */
  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.masterKey).toString();
  }

  /**
   * Decrypt encrypted text
   */
  decrypt(encryptedData: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.masterKey).toString(CryptoJS.enc.Utf8);
    return decrypted;
  }

  /**
   * Generate RSA key pair for tenant
   * Returns public key and encrypted private key
   */
  generateTenantKey(): { publicKey: string; encryptedPrivateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Encrypt private key with master key
    const encryptedPrivateKey = this.encrypt(privateKey);
    
    return { publicKey, encryptedPrivateKey };
  }

  /**
   * Generate RSA key pair for user
   * Encrypts private key with password-derived key
   */
  generateUserKey(password: string): { publicKey: string; encryptedPrivateKey: string } {
    // Generate RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Derive key from password
    const salt = crypto.randomBytes(32);
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // Encrypt private key with derived key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Format: salt:iv:encrypted
    const encryptedPrivateKey = `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;

    return { publicKey, encryptedPrivateKey };
  }

  /**
   * Decrypt user's private key using password
   */
  decryptUserPrivateKey(encryptedPrivateKey: string, password: string): string {
    try {
      const [saltHex, ivHex, encryptedHex] = encryptedPrivateKey.split(':');
      
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      // Derive key from password
      const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

      // Decrypt private key
      const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Failed to decrypt user private key');
    }
  }

  /**
   * Generate encryption key for channel/chat
   */
  generateChannelKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt channel key with user's public key (RSA)
   */
  encryptChannelKeyForUser(channelKey: string, userPublicKey: string): string {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: userPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(channelKey, 'utf8')
      );
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error('Failed to encrypt channel key');
    }
  }

  /**
   * Decrypt channel key with user's private key (RSA)
   */
  decryptChannelKeyForUser(encryptedChannelKey: string, userPrivateKey: string): string {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: userPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedChannelKey, 'base64')
      );
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Failed to decrypt channel key');
    }
  }

  /**
   * Encrypt message content with AES-256-GCM
   */
  encryptMessage(content: string, channelKey: string): {
    encryptedContent: string;
    iv: string;
    authTag: string;
  } {
    try {
      const keyBuffer = Buffer.from(channelKey, 'hex');
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');

      return {
        encryptedContent: encrypted,
        iv: iv.toString('hex'),
        authTag,
      };
    } catch (error) {
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message content with AES-256-GCM
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

      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
      decipher.setAuthTag(authTagBuffer);

      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Encrypt file with AES-256-CBC
   */
  encryptFile(fileBuffer: Buffer): {
    encryptedData: Buffer;
    fileKey: string;
    iv: string;
  } {
    try {
      const fileKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-256-cbc', fileKey, iv);
      const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

      return {
        encryptedData: encrypted,
        fileKey: fileKey.toString('hex'),
        iv: iv.toString('hex'),
      };
    } catch (error) {
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file with AES-256-CBC
   */
  decryptFile(encryptedData: Buffer, fileKey: string, iv: string): Buffer {
    try {
      const keyBuffer = Buffer.from(fileKey, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Hash data with SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate checksum for integrity verification
   */
  generateChecksum(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data + this.masterKey)
      .digest('hex');
  }

  /**
   * Verify checksum
   */
  verifyChecksum(data: string, checksum: string): boolean {
    const calculated = this.generateChecksum(data);
    return calculated === checksum;
  }

  /**
   * Generate HMAC signature
   */
  generateHMAC(data: string, secret?: string): string {
    const key = secret || this.masterKey;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    const calculated = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(calculated, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }

  /**
   * Generate random token
   */
  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt sensitive data for database storage
   */
  encryptForStorage(data: string): string {
    return this.encrypt(data);
  }

  /**
   * Decrypt sensitive data from database
   */
  decryptFromStorage(encryptedData: string): string {
    return this.decrypt(encryptedData);
  }

  /**
   * Generate key fingerprint
   */
  generateKeyFingerprint(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 64);
  }

  /**
   * Rotate encryption key
   */
  rotateKey(oldEncryptedData: string, oldKey: string, newKey: string): string {
    // Decrypt with old key
    const decrypted = CryptoJS.AES.decrypt(oldEncryptedData, oldKey).toString(CryptoJS.enc.Utf8);
    
    // Re-encrypt with new key
    return CryptoJS.AES.encrypt(decrypted, newKey).toString();
  }
}