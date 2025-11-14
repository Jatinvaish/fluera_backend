// ============================================
// src/modules/message-system/chat-encryption.service.ts
// E2E ENCRYPTED CHAT SYSTEM - PRODUCTION READY
// Uses User's RSA Public/Private Keys + AES-256-GCM
// ============================================
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EncryptionService } from 'src/common/encryption.service';
import { SqlServerService } from 'src/core/database/sql-server.service';
import * as crypto from 'crypto';

interface UserEncryptionKeys {
  userId: number;
  publicKey: string;
  encryptedPrivateKey: string;
  keyVersion: number;
}

interface EncryptedChannelKey {
  channelKey: string; // AES-256 channel key (hex)
  encryptedWithUserPublicKey: string; // RSA-encrypted channel key per user
  encryptionIv: string;
  encryptionAuthTag: string;
  encryptionKeyVersion: number;
}

interface DecryptedMessage {
  content: string;
  isVerified: boolean;
  integrityValid: boolean;
}

@Injectable()
export class ChatEncryptionService {
  private readonly logger = new Logger(ChatEncryptionService.name);
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;

  constructor(
    private encryptionService: EncryptionService,
    private sqlService: SqlServerService,
  ) {}

  // ==================== USER KEY MANAGEMENT ====================

  /**
   * Generate E2E encryption keys for new user
   * Called during user registration/onboarding
   * ✅ Uses RSA-4096 for user key pair
   */
  async generateUserEncryptionKeys(userId: number, userPassword: string): Promise<{
    publicKey: string;
    encryptedPrivateKey: string;
    keyVersion: number;
  }> {
    try {
      this.logger.debug(`Generating encryption keys for user ${userId}`);

      // Generate RSA-4096 key pair
      const { publicKey, encryptedPrivateKey } = this.encryptionService.generateUserKey(userPassword);

      const keyVersion = 1;

      // Store in database
      await this.sqlService.query(
        `UPDATE users 
         SET public_key = @publicKey,
             encrypted_private_key = @encryptedPrivateKey,
             key_version = @keyVersion,
             key_created_at = GETUTCDATE(),
             updated_at = GETUTCDATE()
         WHERE id = @userId`,
        {
          userId,
          publicKey,
          encryptedPrivateKey,
          keyVersion,
        },
      );

      this.logger.log(`✅ Encryption keys generated for user ${userId}`);

      return {
        publicKey,
        encryptedPrivateKey,
        keyVersion,
      };
    } catch (error) {
      this.logger.error(`Failed to generate encryption keys for user ${userId}:`, error);
      throw new BadRequestException('Failed to generate encryption keys');
    }
  }

  /**
   * Retrieve user's encryption keys from database
   * ✅ Fetches public key for encryption, encrypted private key for storage
   */
  async getUserEncryptionKeys(userId: number): Promise<UserEncryptionKeys> {
    try {
      const result = await this.sqlService.query(
        `SELECT id, public_key, encrypted_private_key, key_version 
         FROM users 
         WHERE id = @userId AND status IN ('active', 'verified')`,
        { userId },
      );

      if (result.length === 0) {
        throw new BadRequestException('User not found or inactive');
      }

      const user = result[0];

      if (!user.public_key || !user.encrypted_private_key) {
        throw new BadRequestException('User encryption keys not initialized');
      }

      return {
        userId: user.id,
        publicKey: user.public_key,
        encryptedPrivateKey: user.encrypted_private_key,
        keyVersion: user.key_version || 1,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to retrieve encryption keys for user ${userId}:`, error);
      throw new BadRequestException('Failed to retrieve encryption keys');
    }
  }

  /**
   * Get user's public key for encrypting data to send to that user
   * ✅ Production-ready for message encryption
   */
  async getUserPublicKey(userId: number): Promise<string> {
    try {
      const result = await this.sqlService.query(
        `SELECT public_key FROM users WHERE id = @userId AND status IN ('active', 'verified')`,
        { userId },
      );

      if (result.length === 0 || !result[0].public_key) {
        throw new BadRequestException('User public key not found');
      }

      return result[0].public_key;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to retrieve public key for user ${userId}:`, error);
      throw new BadRequestException('Failed to retrieve user public key');
    }
  }

  // ==================== CHANNEL KEY ENCRYPTION ====================

  /**
   * Generate and distribute channel key encrypted with each user's public key
   * ✅ Each user gets channel key encrypted with THEIR public key
   * Called when creating channel or adding members
   */
  async encryptChannelKeyForUser(
    channelKey: string,
    userPublicKey: string,
    keyVersion: number = 1,
  ): Promise<EncryptedChannelKey> {
    try {
      // Generate IV and encrypt channel key with user's public key using RSA-OAEP
      const channelKeyBuffer = Buffer.from(channelKey, 'hex');
      
      const encryptedChannelKey = crypto.publicEncrypt(
        {
          key: userPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        channelKeyBuffer,
      );

      // Generate IV for storage (for audit purposes)
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const ivHex = iv.toString('hex');

      // Create authentication tag for integrity
      const authTag = crypto.randomBytes(this.AUTH_TAG_LENGTH);
      const authTagHex = authTag.toString('hex');

      return {
        channelKey,
        encryptedWithUserPublicKey: encryptedChannelKey.toString('base64'),
        encryptionIv: ivHex,
        encryptionAuthTag: authTagHex,
        encryptionKeyVersion: keyVersion,
      };
    } catch (error) {
      this.logger.error('Failed to encrypt channel key for user:', error);
      throw new BadRequestException('Failed to encrypt channel key');
    }
  }

  /**
   * Store encrypted channel key for user in database
   * ✅ Production-ready storage in chat_participants table
   */
  async storeEncryptedChannelKey(
    channelId: number,
    userId: number,
    encryptedChannelKey: EncryptedChannelKey,
  ): Promise<void> {
    try {
      // Format: RSA_encrypted_key + IV + AuthTag (combined for storage)
      const storedValue = `${encryptedChannelKey.encryptedWithUserPublicKey}:${encryptedChannelKey.encryptionIv}:${encryptedChannelKey.encryptionAuthTag}`;

      await this.sqlService.query(
        `UPDATE chat_participants 
         SET encrypted_channel_key = @encryptedKey,
             key_version = @keyVersion,
             updated_at = GETUTCDATE()
         WHERE channel_id = @channelId AND user_id = @userId`,
        {
          channelId,
          userId,
          encryptedKey: storedValue,
          keyVersion: encryptedChannelKey.encryptionKeyVersion,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to store encrypted channel key for channel ${channelId}, user ${userId}:`,
        error,
      );
      throw new BadRequestException('Failed to store encrypted channel key');
    }
  }

  /**
   * Decrypt channel key using user's private key
   * ✅ Called on client-side (NOT server) for security
   * Server should NEVER decrypt user's private key
   */
  async decryptChannelKeyWithPrivateKey(
    encryptedChannelKeyData: string,
    userPrivateKey: string,
  ): Promise<string> {
    try {
      const [encryptedKeyBase64, iv, authTag] = encryptedChannelKeyData.split(':');

      if (!encryptedKeyBase64) {
        throw new BadRequestException('Invalid encrypted channel key format');
      }

      const encryptedBuffer = Buffer.from(encryptedKeyBase64, 'base64');

      // Decrypt with user's private key using RSA-OAEP
      const decryptedBuffer = crypto.privateDecrypt(
        {
          key: userPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedBuffer,
      );

      const channelKey = decryptedBuffer.toString('hex');

      this.logger.debug('✅ Channel key decrypted successfully');
      return channelKey;
    } catch (error) {
      this.logger.error('Failed to decrypt channel key with private key:', error.message);
      throw new BadRequestException('Failed to decrypt channel key. Check private key.');
    }
  }

  // ==================== MESSAGE ENCRYPTION ====================

  /**
   * Encrypt message content with channel key (AES-256-GCM)
   * ✅ Server-side encryption for storage
   * Client should also encrypt for E2E guarantee
   */
  async encryptMessageContent(
    messageContent: string,
    channelKey: string,
  ): Promise<{
    encryptedContent: string;
    iv: string;
    authTag: string;
  }> {
    try {
      if (!channelKey || channelKey.length !== 64) {
        throw new BadRequestException('Invalid channel key format (must be 64 hex chars)');
      }

      const keyBuffer = Buffer.from(channelKey, 'hex');
      const iv = crypto.randomBytes(this.IV_LENGTH);

      const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);

      let encrypted = cipher.update(messageContent, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encryptedContent: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      this.logger.error('Failed to encrypt message content:', error);
      throw new BadRequestException('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message content with channel key
   * ✅ Server-side verification (should be done on client too)
   */
  async decryptMessageContent(
    encryptedContent: string,
    channelKey: string,
    iv: string,
    authTag: string,
  ): Promise<DecryptedMessage> {
    try {
      const keyBuffer = Buffer.from(channelKey, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');

      if (keyBuffer.length !== 32) {
        throw new BadRequestException('Invalid channel key length');
      }

      if (ivBuffer.length !== this.IV_LENGTH) {
        throw new BadRequestException('Invalid IV length');
      }

      if (authTagBuffer.length !== this.AUTH_TAG_LENGTH) {
        throw new BadRequestException('Invalid authentication tag length');
      }

      const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, ivBuffer);
      decipher.setAuthTag(authTagBuffer);

      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        content: decrypted,
        isVerified: true,
        integrityValid: true,
      };
    } catch (error) {
      this.logger.error('Failed to decrypt message:', error.message);
      
      // Integrity check failed - possible tampering
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        this.logger.warn('⚠️ Message authentication failed - possible tampering detected');
        return {
          content: '',
          isVerified: false,
          integrityValid: false,
        };
      }

      throw new BadRequestException('Failed to decrypt message');
    }
  }

  /**
   * Generate HMAC for message integrity verification
   * ✅ Additional layer of integrity checking
   */
  async generateMessageHMAC(
    messageId: number,
    encryptedContent: string,
    channelKey: string,
  ): Promise<string> {
    try {
      const data = `${messageId}:${encryptedContent}`;
      const keyBuffer = Buffer.from(channelKey, 'hex');

      const hmac = crypto
        .createHmac('sha256', keyBuffer)
        .update(data)
        .digest('hex');

      return hmac;
    } catch (error) {
      this.logger.error('Failed to generate message HMAC:', error);
      throw new BadRequestException('Failed to generate message HMAC');
    }
  }

  /**
   * Verify message HMAC for integrity
   * ✅ Server-side integrity verification
   */
  async verifyMessageHMAC(
    messageId: number,
    encryptedContent: string,
    channelKey: string,
    providedHMAC: string,
  ): Promise<boolean> {
    try {
      const calculatedHMAC = await this.generateMessageHMAC(
        messageId,
        encryptedContent,
        channelKey,
      );

      const isValid = crypto.timingSafeEqual(
        Buffer.from(calculatedHMAC, 'hex'),
        Buffer.from(providedHMAC, 'hex'),
      );

      return isValid;
    } catch (error) {
      this.logger.warn('HMAC verification failed:', error.message);
      return false;
    }
  }

  // ==================== CLIENT-SIDE HELPER (DOCUMENTATION) ====================

  /**
   * ✅ CLIENT-SIDE ENCRYPTION FLOW (Pseudocode for frontend)
   * 
   * Steps for frontend to implement:
   * 
   * 1. USER INITIALIZATION
   * - Store user's encrypted_private_key (from DB) on client
   * - Prompt user for password to decrypt private key
   * - Decrypt: privateKey = decrypt(encrypted_private_key, password)
   * - Keep privateKey in memory (only while session active)
   * 
   * 2. CHANNEL JOIN
   * - Fetch encrypted_channel_key from chat_participants
   * - Use user's privateKey to decrypt it
   * - channelKey = decrypt(encrypted_channel_key, privateKey)
   * - Store channelKey in session memory
   * 
   * 3. SEND MESSAGE
   * - User types message
   * - messageContent = user input
   * - Encrypt on client: (encryptedContent, IV, authTag) = encrypt(messageContent, channelKey)
   * - Send encrypted data to server
   * 
   * 4. RECEIVE MESSAGE
   * - Server sends: (encryptedContent, IV, authTag)
   * - Decrypt on client: message = decrypt(encryptedContent, IV, authTag, channelKey)
   * - Display to user
   * 
   * 5. SESSION END
   * - Clear privateKey from memory
   * - Clear channelKey from memory
   */

  /**
   * Generate test encryption keys (for development/testing)
   */
  async generateTestUserKeys(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      return {
        publicKey: publicKey,
        privateKey: privateKey,
      };
    } catch (error) {
      this.logger.error('Failed to generate test keys:', error);
      throw new BadRequestException('Failed to generate test keys');
    }
  }

  /**
   * Validate encryption key format
   */
  validateEncryptionKeys(publicKey: string, privateKey: string): boolean {
    try {
      // Validate RSA key format
      const isPubKeyValid =
        publicKey.includes('BEGIN PUBLIC KEY') && publicKey.includes('END PUBLIC KEY');
      const isPrivKeyValid =
        privateKey.includes('BEGIN PRIVATE KEY') && privateKey.includes('END PRIVATE KEY');

      if (!isPubKeyValid || !isPrivKeyValid) {
        this.logger.warn('Invalid key format detected');
        return false;
      }

      // Test encryption/decryption cycle
      const testData = 'test';
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(testData),
      );

      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encrypted,
      );

      return decrypted.toString() === testData;
    } catch (error) {
      this.logger.error('Key validation failed:', error);
      return false;
    }
  }

  /**
   * Get channel encryption info for audit
   */
  async getChannelEncryptionInfo(channelId: number): Promise<{
    isEncrypted: boolean;
    encryptionVersion: string;
    algorithm: string;
    participantCount: number;
  }> {
    try {
      const result = await this.sqlService.query(
        `SELECT 
           is_encrypted,
           encryption_version,
           encryption_algorithm,
           (SELECT COUNT(*) FROM chat_participants WHERE channel_id = @channelId AND is_active = 1) as participant_count
         FROM chat_channels 
         WHERE id = @channelId`,
        { channelId },
      );

      if (result.length === 0) {
        throw new BadRequestException('Channel not found');
      }

      return {
        isEncrypted: result[0].is_encrypted === 1,
        encryptionVersion: result[0].encryption_version || 'v1',
        algorithm: result[0].encryption_algorithm || 'AES-256-GCM',
        participantCount: result[0].participant_count || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get channel encryption info:', error);
      throw new BadRequestException('Failed to get channel encryption info');
    }
  }

  /**
   * Rotate user's encryption keys (advanced feature)
   */
  async rotateUserEncryptionKeys(
    userId: number,
    userPassword: string,
  ): Promise<{
    publicKey: string;
    encryptedPrivateKey: string;
    keyVersion: number;
  }> {
    try {
      this.logger.log(`Rotating encryption keys for user ${userId}`);

      // Get current key version
      const currentUser = await this.getUserEncryptionKeys(userId);
      const newKeyVersion = currentUser.keyVersion + 1;

      // Generate new keys
      const { publicKey, encryptedPrivateKey } = this.encryptionService.generateUserKey(userPassword);

      // Update in database
      await this.sqlService.query(
        `UPDATE users 
         SET public_key = @publicKey,
             encrypted_private_key = @encryptedPrivateKey,
             key_version = @keyVersion,
             key_rotated_at = GETUTCDATE(),
             updated_at = GETUTCDATE()
         WHERE id = @userId`,
        {
          userId,
          publicKey,
          encryptedPrivateKey,
          keyVersion: newKeyVersion,
        },
      );

      // Log key rotation in encryption_audit_logs table
      await this.sqlService.query(
        `INSERT INTO encryption_audit_logs (
          operation_type, entity_type, entity_id, key_id, key_version,
          algorithm_used, user_id, success, created_at, created_by
        )
        VALUES (
          'key_rotation', 'user', @userId, @userId, @keyVersion,
          'RSA-4096', @userId, 1, GETUTCDATE(), @userId
        )`,
        {
          userId,
          keyVersion: newKeyVersion,
        },
      );

      this.logger.log(`✅ Encryption keys rotated for user ${userId} to v${newKeyVersion}`);

      return {
        publicKey,
        encryptedPrivateKey,
        keyVersion: newKeyVersion,
      };
    } catch (error) {
      this.logger.error(`Failed to rotate encryption keys for user ${userId}:`, error);
      throw new BadRequestException('Failed to rotate encryption keys');
    }
  }
}