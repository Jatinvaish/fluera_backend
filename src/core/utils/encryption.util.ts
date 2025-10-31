// src/common/utils/encryption.util.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
    if (!key || key.length !== 64) {
      throw new Error('MASTER_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    this.masterKey = Buffer.from(key, 'hex');
  }

  // Generate RSA key pair for E2E encryption
  generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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
    return { publicKey, privateKey };
  }

  // Encrypt data with AES-256-GCM (for sensitive data at rest)
  encryptData(plaintext: string): {
    encryptedData: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  // Decrypt data with AES-256-GCM
  decryptData(encryptedData: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Encrypt private key with user's password-derived key
  encryptPrivateKey(privateKey: string, userPassword: string): string {
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(userPassword, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return JSON.stringify({
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      encrypted,
    });
  }

  // Decrypt private key with user's password
  decryptPrivateKey(encryptedKey: string, userPassword: string): string {
    const { salt, iv, encrypted } = JSON.parse(encryptedKey);
    const key = crypto.pbkdf2Sync(
      userPassword,
      Buffer.from(salt, 'hex'),
      100000,
      32,
      'sha256',
    );

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      Buffer.from(iv, 'hex'),
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Encrypt message with recipient's public key (E2E encryption)
  encryptWithPublicKey(message: string, publicKey: string): string {
    const buffer = Buffer.from(message, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return encrypted.toString('base64');
  }

  // Decrypt message with private key (E2E encryption)
  decryptWithPrivateKey(encryptedMessage: string, privateKey: string): string {
    const buffer = Buffer.from(encryptedMessage, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return decrypted.toString('utf8');
  }

  // Hash password with bcrypt
  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, 12);
  }

  // Compare password with hash
  async comparePassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, hash);
  }

  // Generate SHA-256 hash
  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate secure random token
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate 6-digit verification code
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
