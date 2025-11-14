// src/test/e2e-encryption.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedEncryptionService } from '../common/enhanced-encryption.service';
import { ConfigService } from '@nestjs/config';
import { SqlServerService } from '../core/database/sql-server.service';

import * as crypto from 'crypto';

describe('E2E Encryption System', () => {
  let encryptionService: EnhancedEncryptionService;
  let mockSqlService: Partial<SqlServerService>;
  let mockConfigService: Partial<ConfigService>;

  beforeAll(async () => {
    // Mock configuration
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'encryption.key': 'test-encryption-key-minimum-32-characters-long',
          'encryption.masterSalt': 'test-master-salt',
        };
        return config[key];
      }),
    };

    // Mock SQL service
    mockSqlService = {
      execute: jest.fn().mockResolvedValue([{ KeyId: 1 }]),
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SqlServerService, useValue: mockSqlService },
      ],
    }).compile();

    encryptionService = module.get<EnhancedEncryptionService>(
      EnhancedEncryptionService,
    );
  });

  describe('User Key Generation', () => {
    it('should generate RSA-4096 key pair', async () => {
      const userId = 1;
      const password = 'TestPassword123!';

      const result = await encryptionService.generateUserKeyPair(
        userId,
        password,
      );

      expect(result).toHaveProperty('publicKey');
      expect(result).toHaveProperty('encryptedPrivateKey');
      expect(result).toHaveProperty('backupEncryptedPrivateKey');
      expect(result).toHaveProperty('keyFingerprint');

      // Verify public key format
      expect(result.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.publicKey).toContain('-----END PUBLIC KEY-----');

      // Verify encrypted private key format (salt:iv:authTag:encrypted)
      const parts = result.encryptedPrivateKey.split(':');
      expect(parts).toHaveLength(4);
    });

    it('should decrypt private key with correct password', () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';

      // Generate a test key pair
      const keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      // Encrypt the private key
      const salt = crypto.randomBytes(32);
      const derivedKey = crypto.pbkdf2Sync(
        password,
        salt,
        100000,
        32,
        'sha256',
      );
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

      let encrypted = cipher.update(keyPair.privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const encryptedPrivateKey = `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

      // Test correct password
      const decrypted = encryptionService.decryptUserPrivateKey(
        encryptedPrivateKey,
        password,
      );
      expect(decrypted).toBe(keyPair.privateKey);

      // Test wrong password
      expect(() => {
        encryptionService.decryptUserPrivateKey(
          encryptedPrivateKey,
          wrongPassword,
        );
      }).toThrow('Invalid password or corrupted key');
    });
  });

  describe('Channel Key Management', () => {
    it('should generate secure channel key', () => {
      const channelKey = encryptionService.generateChannelKey();

      expect(channelKey).toHaveLength(64); // 32 bytes in hex
      expect(channelKey).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Message Encryption', () => {
    it('should encrypt and decrypt messages', () => {
      const message = 'This is a secret message';
      const channelKey = encryptionService.generateChannelKey();

      // Encrypt
      const encrypted = encryptionService.encryptMessage(message, channelKey);

      expect(encrypted).toHaveProperty('encryptedContent');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('contentHash');

      // Decrypt
      const decrypted = encryptionService.decryptMessage(
        encrypted.encryptedContent,
        channelKey,
        encrypted.iv,
        encrypted.authTag,
      );

      expect(decrypted).toBe(message);
    });

    it('should fail decryption with wrong key', () => {
      const message = 'This is a secret message';
      const channelKey = encryptionService.generateChannelKey();
      const wrongKey = encryptionService.generateChannelKey();

      const encrypted = encryptionService.encryptMessage(message, channelKey);

      expect(() => {
        encryptionService.decryptMessage(
          encrypted.encryptedContent,
          wrongKey,
          encrypted.iv,
          encrypted.authTag,
        );
      }).toThrow('Message decryption failed');
    });
  });

  describe('RSA Encryption', () => {
    it('should encrypt with public key and decrypt with private key', async () => {
      const userId = 1;
      const password = 'TestPassword123!';
      const secretData = 'Channel encryption key';

      // Generate key pair
      const keyData = await encryptionService.generateUserKeyPair(
        userId,
        password,
      );

      // Encrypt with public key
      const encrypted = encryptionService.encryptWithPublicKey(
        secretData,
        keyData.publicKey,
      );

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(secretData);

      // To decrypt, we'd need the private key (which requires password)
      const privateKey = encryptionService.decryptUserPrivateKey(
        keyData.encryptedPrivateKey,
        password,
      );

      const decrypted = encryptionService.decryptWithPrivateKey(
        encrypted,
        privateKey,
      );
      expect(decrypted).toBe(secretData);
    });
  });

  describe('Key Storage', () => {
    it('should store user encryption key', async () => {
      const userId = 1;
      const password = 'TestPassword123!';

      const keyData = await encryptionService.generateUserKeyPair(
        userId,
        password,
      );

      await encryptionService.storeUserEncryptionKey(userId, keyData);

      expect(mockSqlService.execute).toHaveBeenCalledWith(
        'sp_CreateUserEncryptionKey',
        {
          UserId: userId,
          PublicKeyPem: keyData.publicKey,
          EncryptedPrivateKeyPem: keyData.encryptedPrivateKey,
          BackupEncryptedPrivateKey: keyData.backupEncryptedPrivateKey,
          CreatedBy: userId,
        },
      );
    });
  });

  describe('HMAC Functions', () => {
    it('should generate and verify HMAC', () => {
      const data = 'Important data to verify';
      const secret = 'shared-secret-key';

      const hmac = encryptionService.generateHMAC(data, secret);

      expect(hmac).toHaveLength(64); // SHA-256 produces 32 bytes = 64 hex chars

      const isValid = encryptionService.verifyHMAC(data, hmac, secret);
      expect(isValid).toBe(true);

      const tamperedData = 'Tampered data';
      const isInvalid = encryptionService.verifyHMAC(
        tamperedData,
        hmac,
        secret,
      );
      expect(isInvalid).toBe(false);
    });
  });
});

// Integration test example
describe('E2E Encryption Integration', () => {
  it('should complete full encryption flow', async () => {
    console.log('=== E2E Encryption Integration Test ===');

    // 1. User Registration
    console.log('1. Simulating user registration...');
    const userId = 1;
    const userPassword = 'SecurePassword123!';

    // Mock encryption service (in real test, use actual service)
    const mockConfig = {
      get: (key: string) => {
        const config = {
          'encryption.key': 'production-encryption-key-minimum-32-characters',
          'encryption.masterSalt': 'production-master-salt',
        };
        return config[key];
      },
    };

    const mockSql = {
      execute: async () => [{ KeyId: 1 }],
      query: async () => [],
    };

    const encryptionService = new EnhancedEncryptionService(
      mockConfig as any,
      mockSql as any,
    );

    // Generate user keys
    const userKeys = await encryptionService.generateUserKeyPair(
      userId,
      userPassword,
    );
    console.log(`✓ Generated RSA-4096 key pair for user ${userId}`);
    console.log(
      `  Public key fingerprint: ${userKeys.keyFingerprint.substring(0, 16)}...`,
    );

    // 2. Channel Creation
    console.log('\n2. Creating encrypted channel...');
    const channelKey = encryptionService.generateChannelKey();
    console.log(`✓ Generated channel key: ${channelKey.substring(0, 16)}...`);

    // 3. Encrypt channel key for user
    console.log('\n3. Encrypting channel key for user...');
    const encryptedChannelKey = encryptionService.encryptWithPublicKey(
      channelKey,
      userKeys.publicKey,
    );
    console.log(`✓ Channel key encrypted with user's public key`);

    // 4. Send encrypted message
    console.log('\n4. Sending encrypted message...');
    const message = 'Hello, this is an end-to-end encrypted message!';
    const encryptedMessage = encryptionService.encryptMessage(
      message,
      channelKey,
    );
    console.log(`✓ Message encrypted`);
    console.log(`  IV: ${encryptedMessage.iv.substring(0, 16)}...`);
    console.log(`  Auth Tag: ${encryptedMessage.authTag.substring(0, 16)}...`);
    console.log(
      `  Content Hash: ${encryptedMessage.contentHash.substring(0, 16)}...`,
    );

    // 5. Decrypt message (recipient side)
    console.log('\n5. Decrypting message (recipient)...');

    // First, decrypt user's private key
    const privateKey = encryptionService.decryptUserPrivateKey(
      userKeys.encryptedPrivateKey,
      userPassword,
    );
    console.log(`✓ Private key decrypted with user password`);

    // Decrypt channel key
    const decryptedChannelKey = encryptionService.decryptWithPrivateKey(
      encryptedChannelKey,
      privateKey,
    );
    console.log(`✓ Channel key decrypted`);

    // Decrypt message
    const decryptedMessage = encryptionService.decryptMessage(
      encryptedMessage.encryptedContent,
      decryptedChannelKey,
      encryptedMessage.iv,
      encryptedMessage.authTag,
    );
    console.log(`✓ Message decrypted: "${decryptedMessage}"`);

    // Verify
    expect(decryptedMessage).toBe(message);
    console.log('\n✅ E2E Encryption flow completed successfully!');
  });
});

// Run the integration test
if (require.main === module) {
  const integrationTest = async () => {
    const test = new (describe as any)('E2E Encryption Integration', () => {});
    await test.run();
  };

  integrationTest().catch(console.error);
}
