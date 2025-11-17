// ============================================
// src/modules/message-system/chat.service.ts - UPDATED WITH E2E ENCRYPTION
// ============================================
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { EnhancedEncryptionService } from '../../common/enhanced-encryption.service';
import { RedisService } from '../../core/redis/redis.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  AddChannelMembersDto,
  SendMessageDto,
  EditMessageDto,
  SearchMessagesDto,
  GetMessagesDto,
  GetChannelsDto,
  UpdateMemberRoleDto,
  UpdateMemberNotificationDto,
  CreateDirectMessageDto,
  MarkAsReadDto,
  ChannelType,
  MemberRole,
  MessageType,
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private sqlService: SqlServerService,
    private encryptionService: EnhancedEncryptionService,
    private redisService: RedisService,
  ) {}

  // ==================== CHANNEL CREATION WITH E2E ENCRYPTION ====================

  /**
   * ✅ CREATE CHANNEL WITH E2E ENCRYPTION
   * Generates channel encryption key and distributes to participants
   */
  async createChannel(dto: CreateChannelDto, userId: number, tenantId: number) {
    try {
      this.logger.log(`Creating encrypted channel for user ${userId}`);

      // Generate channel key
      const channelKey = this.encryptionService.generateChannelKey();

      const result = await this.sqlService.query(
        `INSERT INTO chat_channels (
          created_by_tenant_id, name, description, channel_type, 
          related_type, related_id, is_private, member_count,
          is_encrypted, encryption_version, encryption_algorithm,
          last_activity_at, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @tenantId, @name, @description, @channelType, 
          @relatedType, @relatedId, @isPrivate, 1,
          1, 'v1', 'AES-256-GCM',
          GETUTCDATE(), @userId, GETUTCDATE()
        )`,
        {
          tenantId,
          name: dto.name,
          description: dto.description || null,
          channelType: dto.channelType,
          relatedType: dto.relatedType || null,
          relatedId: dto.relatedId ? Number(dto.relatedId) : null,
          isPrivate: dto.isPrivate || false,
          userId,
        },
      );

      const channel = result[0];
      const channelId = Number(channel.id);

      // ✅ NEW: Store master-key-encrypted channel key for admin recovery
      await this.storeMasterEncryptedChannelKey(
        channelId,
        channelKey,
        1,
        userId,
      );

      // Add participants with encrypted channel keys
      await this.addParticipantWithEncryption(
        channelId,
        userId,
        tenantId,
        userId,
        MemberRole.OWNER,
        channelKey,
      );

      if (dto.memberIds && dto.memberIds.length > 0) {
        for (const memberId of dto.memberIds) {
          if (Number(memberId) !== userId) {
            try {
              await this.addParticipantWithEncryption(
                channelId,
                Number(memberId),
                tenantId,
                userId,
                MemberRole.MEMBER,
                channelKey,
              );
            } catch (error) {
              this.logger.warn(
                `Failed to add member ${memberId}: ${error.message}`,
              );
            }
          }
        }
      }

      this.logger.log(`✅ Channel ${channelId} created with backup support`);

      return {
        ...channel,
        encryptionEnabled: true,
        encryptionVersion: 'v1',
        algorithm: 'AES-256-GCM',
        memberCount: 1 + (dto.memberIds?.length || 0),
        hasBackupKey: true, // ✅ NEW: Indicates disaster recovery is supported
      };
    } catch (error) {
      this.logger.error('Failed to create encrypted channel', error);
      throw new BadRequestException(
        `Failed to create channel: ${error.message}`,
      );
    }
  }

  /**
   * ✅ NEW: Store master-key-encrypted channel key
   */
  private async storeMasterEncryptedChannelKey(
    channelId: number,
    channelKey: string,
    keyVersion: number,
    userId: number,
  ): Promise<void> {
    try {
      // Encrypt channel key with master key
      const masterEncrypted =
        await this.encryptionService.encryptWithMasterKey(channelKey);

      // Generate fingerprint
      const keyFingerprint =
        this.encryptionService.calculateKeyFingerprint(channelKey);

      // Store in database
      await this.sqlService.query(
        `INSERT INTO chat_channel_keys_2 (
          channel_id, key_material_encrypted, key_fingerprint,
          algorithm, key_version, status, activated_at, created_by, created_at
        )
        VALUES (
          @channelId, @keyMaterial, @fingerprint,
          'AES-256-GCM', @keyVersion, 'active', GETUTCDATE(), @userId, GETUTCDATE()
        )`,
        {
          channelId,
          keyMaterial: masterEncrypted,
          fingerprint: keyFingerprint,
          keyVersion,
          userId,
        },
      );

      this.logger.debug(
        `✅ Master-encrypted channel key stored for channel ${channelId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store master-encrypted channel key: ${error.message}`,
      );
      throw new BadRequestException('Failed to store backup channel key');
    }
  }

  /**
   * ✅ NEW: Admin decrypt message (for legal/compliance)
   */
  async adminDecryptMessage(
    messageId: number,
    adminUserId: number,
    reason: string,
    ipAddress?: string,
  ): Promise<{ content: string; metadata: any }> {
    try {
      this.logger.log(
        `Admin ${adminUserId} attempting to decrypt message ${messageId}`,
      );

      // 1. Verify super admin permission
      await this.verifySuperAdminPermission(adminUserId);

      // 2. Get encrypted message
      const messageResult = await this.sqlService.query(
        `SELECT m.*, c.id as channel_id, c.name as channel_name
         FROM messages m 
         INNER JOIN chat_channels c ON m.channel_id = c.id 
         WHERE m.id = @messageId`,
        { messageId },
      );

      if (!messageResult || messageResult.length === 0) {
        throw new NotFoundException('Message not found');
      }

      const message = messageResult[0];

      // 3. Get channel key (master-key-encrypted)
      const channelKeyResult = await this.sqlService.query(
        `SELECT key_material_encrypted, key_fingerprint 
         FROM chat_channel_keys_2
         WHERE channel_id = @channelId 
         AND key_version = @keyVersion 
         AND status = 'active'`,
        {
          channelId: message.channel_id,
          keyVersion: message.encryption_key_version || 1,
        },
      );

      if (!channelKeyResult || channelKeyResult.length === 0) {
        throw new BadRequestException('Channel key not found - cannot decrypt');
      }

      // 4. Decrypt channel key with master key
      const channelKey = await this.encryptionService.decryptWithMasterKey(
        channelKeyResult[0].key_material_encrypted,
      );

      // 5. Decrypt message content
      const decryptedContent = this.encryptionService.decryptMessage(
        message.encrypted_content,
        channelKey,
        message.encryption_iv,
        message.encryption_auth_tag,
      );

      // 6. ✅ CRITICAL: Log admin access for compliance
      await this.logAdminDecryption({
        adminUserId,
        targetUserId: message.sender_user_id,
        channelId: message.channel_id,
        messageId,
        decryptionType: 'message',
        reason,
        success: true,
        ipAddress,
      });

      this.logger.log(
        `✅ Admin ${adminUserId} successfully decrypted message ${messageId}`,
      );

      return {
        content: decryptedContent,
        metadata: {
          messageId: message.id,
          channelId: message.channel_id,
          channelName: message.channel_name,
          senderId: message.sender_user_id,
          sentAt: message.sent_at,
          encryptionVersion: message.encryption_key_version,
          integrityVerified: true,
        },
      };
    } catch (error) {
      // Log failed attempt
      await this.logAdminDecryption({
        adminUserId,
        messageId,
        decryptionType: 'message',
        reason,
        success: false,
        errorMessage: error.message,
        ipAddress,
      });

      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Admin message decryption failed', error);
      throw new BadRequestException(
        `Failed to decrypt message: ${error.message}`,
      );
    }
  }

  /**
   * ✅ NEW: Backfill master-encrypted keys for existing channels
   */
  async backfillChannelKeys(adminUserId: number): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      this.logger.log(`Admin ${adminUserId} starting channel keys backfill`);

      // Verify super admin
      await this.verifySuperAdminPermission(adminUserId);

      // Get all channels without backup keys
      const channelsResult = await this.sqlService.query(
        `SELECT c.id, c.name, c.encryption_version
         FROM chat_channels c
         WHERE c.is_encrypted = 1
         AND NOT EXISTS (
           SELECT 1 FROM chat_channel_keys_2 ck 
           WHERE ck.channel_id = c.id
         )`,
        {},
      );

      const stats = {
        processed: channelsResult.length,
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const channel of channelsResult) {
        try {
          // Get any participant's encrypted channel key
          const participantKey = await this.sqlService.query(
            `SELECT TOP 1 user_id, encrypted_channel_key 
             FROM chat_participants 
             WHERE channel_id = @channelId AND is_active = 1`,
            { channelId: channel.id },
          );

          if (!participantKey || participantKey.length === 0) {
            stats.failed++;
            stats.errors.push(`Channel ${channel.id}: No active participants`);
            continue;
          }

          // Get user's private key (backup)
          const userKey = await this.sqlService.query(
            `SELECT backup_encrypted_private_key 
             FROM user_encryption_keys 
             WHERE user_id = @userId AND status = 'active'`,
            { userId: participantKey[0].user_id },
          );

          if (!userKey || !userKey[0].backup_encrypted_private_key) {
            stats.failed++;
            stats.errors.push(
              `Channel ${channel.id}: User backup key not found`,
            );
            continue;
          }

          // Decrypt user's private key
          const privateKey = await this.encryptionService.decryptWithMasterKey(
            userKey[0].backup_encrypted_private_key,
          );

          // Decrypt channel key
          const channelKey = this.encryptionService.decryptWithPrivateKey(
            participantKey[0].encrypted_channel_key,
            privateKey,
          );

          // Store master-encrypted channel key
          const keyVersion = parseInt(
            (channel.encryption_version || 'v1').substring(1),
          );
          await this.storeMasterEncryptedChannelKey(
            channel.id,
            channelKey,
            keyVersion,
            adminUserId,
          );

          stats.successful++;
        } catch (error) {
          stats.failed++;
          stats.errors.push(`Channel ${channel.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `✅ Backfill completed: ${stats.successful}/${stats.processed} successful`,
      );

      return stats;
    } catch (error) {
      this.logger.error('Backfill failed', error);
      throw new BadRequestException(`Backfill failed: ${error.message}`);
    }
  }

  /**
   * ✅ ADD PARTICIPANT WITH E2E ENCRYPTION
   * Encrypts channel key with participant's public key
   */
  private async addParticipantWithEncryption(
    channelId: number,
    memberId: number,
    tenantId: number,
    addedBy: number,
    role: MemberRole = MemberRole.MEMBER,
    channelKey: string,
  ): Promise<any> {
    try {
      const userKey = await this.encryptionService.getUserActiveKey(memberId);

      if (!userKey) {
        throw new BadRequestException(
          `User ${memberId} does not have encryption keys`,
        );
      }

      const encryptedChannelKey = this.encryptionService.encryptWithPublicKey(
        channelKey,
        userKey.public_key_pem,
      );

      const keyFingerprint = this.encryptionService.calculateKeyFingerprint(
        userKey.public_key_pem,
      );

      console.log({
        channelId,
        memberId,
        encryptedChannelKey,
        keyVersion: userKey.key_version,
        keyFingerprint,
        addedBy,
      });

      const result = await this.sqlService.query(
        `INSERT INTO chat_participants (
          channel_id, tenant_id, user_id, role, 
          encrypted_channel_key, key_version, key_fingerprint,
          is_active, joined_at, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @channelId, @tenantId, @memberId, @role, 
          @encryptedChannelKey, @keyVersion, @keyFingerprint,
          1, GETUTCDATE(), @addedBy, GETUTCDATE()
        )`,
        {
          channelId,
          tenantId,
          memberId,
          role,
          encryptedChannelKey,
          keyVersion: userKey.key_version,
          keyFingerprint,
          addedBy,
        },
      );

      this.logger.debug(
        `✅ User ${memberId} added to channel ${channelId} with encrypted key`,
      );

      return result[0];
    } catch (error) {
      this.logger.error(
        `Failed to add encrypted participant: ${error.message}`,
      );
      throw new BadRequestException(`Failed to add member: ${error.message}`);
    }
  }

  // ==================== MESSAGE SEND WITH E2E ENCRYPTION ====================

  /**
   * ✅ SEND ENCRYPTED MESSAGE
   * Validates and stores encrypted message content
   */
  async sendMessage(dto: SendMessageDto, userId: number, tenantId: number) {
    try {
      console.log('SendMessageDto:', dto);
      await this.checkChannelMembership(Number(dto.channelId), userId);

      if (
        !dto.encryptedContent ||
        !dto.encryptionIv ||
        !dto.encryptionAuthTag
      ) {
        throw new BadRequestException(
          'Message must be encrypted with AES-256-GCM. Missing: ' +
            (!dto.encryptedContent ? 'encryptedContent ' : '') +
            (!dto.encryptionIv ? 'encryptionIv ' : '') +
            (!dto.encryptionAuthTag ? 'encryptionAuthTag' : ''),
        );
      }

      this.validateEncryptionPayload(dto);

      // ✅ Auto-fetch sender's key version
      const senderKey = await this.encryptionService.getUserActiveKey(userId);
      if (!senderKey) {
        throw new BadRequestException('User encryption keys not found');
      }

      // ✅ Auto-fetch channel's encryption version
      const channelInfo = await this.sqlService.query(
        `SELECT encryption_version FROM chat_channels WHERE id = @channelId`,
        { channelId: Number(dto.channelId) },
      );

      if (channelInfo.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      const channelVersion = channelInfo[0].encryption_version || 'v1';
      const channelKeyVersion = parseInt(channelVersion.substring(1));

      const contentHash = this.encryptionService.generateHMAC(
        `${dto.encryptedContent}:${dto.encryptionIv}`,
      );

      const result = await this.sqlService.query(
        `INSERT INTO messages (
          channel_id, sender_tenant_id, sender_user_id, message_type, 
          encrypted_content, encryption_iv, encryption_auth_tag, content_hash,
          encryption_key_version, has_attachments, has_mentions, 
          reply_to_message_id, thread_id, sent_at, created_by, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @channelId, @tenantId, @userId, @messageType, 
          @encryptedContent, @encryptionIv, @encryptionAuthTag, @contentHash,
          @keyVersion, @hasAttachments, @hasMentions,
          @replyToMessageId, @threadId, GETUTCDATE(), @userId, GETUTCDATE()
        )`,
        {
          channelId: Number(dto.channelId),
          tenantId,
          userId,
          messageType: dto.messageType || 'text',
          encryptedContent: dto.encryptedContent,
          encryptionIv: dto.encryptionIv,
          encryptionAuthTag: dto.encryptionAuthTag,
          contentHash,
          keyVersion: channelKeyVersion,
          hasAttachments: dto.attachments && dto.attachments.length > 0 ? 1 : 0,
          hasMentions: dto.mentions && dto.mentions.length > 0 ? 1 : 0,
          replyToMessageId: dto.replyToMessageId
            ? Number(dto.replyToMessageId)
            : null,
          threadId: dto.threadId ? Number(dto.threadId) : null,
        },
      );

      const messageId = result[0].id;

      await this.createEncryptionAudit(
        messageId,
        Number(dto.channelId),
        userId,
        senderKey.key_version,
        channelKeyVersion,
      );

      await this.createDeliveryReceipts(
        Number(dto.channelId),
        messageId,
        userId,
      );

      await this.sqlService.query(
        `UPDATE chat_channels 
         SET message_count = message_count + 1, 
             last_message_at = GETUTCDATE(),
             last_activity_at = GETUTCDATE()
         WHERE id = @channelId`,
        { channelId: Number(dto.channelId) },
      );

      await this.redisService.invalidateCache(`user:*:channels:*`);

      this.logger.log(`✅ Encrypted message ${messageId} sent`);

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to send encrypted message', error);
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * ✅ VALIDATE ENCRYPTION PAYLOAD
   * Ensures proper format before storage
   */
  private validateEncryptionPayload(dto: SendMessageDto): void {
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;

    if (!base64Regex.test(dto.encryptedContent)) {
      throw new BadRequestException('encryptedContent must be base64 encoded');
    }

    if (!base64Regex.test(dto.encryptionIv)) {
      throw new BadRequestException('encryptionIv must be base64 encoded');
    }
    
    console.log('Encryption IV:', dto.encryptionIv);

    if (!base64Regex.test(dto.encryptionAuthTag)) {
      throw new BadRequestException('encryptionAuthTag must be base64 encoded');
    }

    if (dto.encryptionIv.length !== 24) {
      throw new BadRequestException(  
        'encryptionIv must be 16 bytes (24 base64 chars)',
      );
    }

    if (dto.encryptionAuthTag.length !== 24) {
      throw new BadRequestException(
        'encryptionAuthTag must be 16 bytes (24 base64 chars)',
      );
    }
  }

  /**
   * ✅ CREATE ENCRYPTION AUDIT LOG
   */
  private async createEncryptionAudit(
    messageId: number,
    channelId: number,
    senderUserId: number,
    senderKeyVersion: number,
    channelKeyVersion: number,
  ): Promise<void> {
    try {
      await this.sqlService.query(
        `INSERT INTO message_encryption_audit (
          message_id, channel_id, sender_user_id,
          sender_key_version, channel_key_version,
          encryption_algorithm, encryption_verified,
          verified_at, verified_by, created_at, created_by
        )
        VALUES (
          @messageId, @channelId, @senderUserId,
          @senderKeyVersion, @channelKeyVersion,
          'AES-256-GCM', 1,
          GETUTCDATE(), @senderUserId, GETUTCDATE(), @senderUserId
        )`,
        {
          messageId,
          channelId,
          senderUserId,
          senderKeyVersion,
          channelKeyVersion,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to create encryption audit: ${error.message}`);
    }
  }

  /**
   * ✅ CREATE DELIVERY RECEIPTS
   */
  private async createDeliveryReceipts(
    channelId: number,
    messageId: number,
    senderId: number,
  ): Promise<void> {
    try {
      await this.sqlService.query(
        `INSERT INTO message_read_receipts (message_id, user_id, status, created_at)
         SELECT @messageId, user_id, 'sent', GETUTCDATE()
         FROM chat_participants
         WHERE channel_id = @channelId 
         AND user_id != @senderId 
         AND is_active = 1`,
        { messageId, channelId, senderId },
      );
    } catch (error) {
      this.logger.warn(`Failed to create delivery receipts: ${error.message}`);
    }
  }

  // ==================== GET MESSAGES (ENCRYPTED) ====================

  /**
   * ✅ GET ENCRYPTED MESSAGES
   * Returns messages with encryption metadata (NOT decrypted)
   */
  async getMessages(channelId: number, userId: number, dto: GetMessagesDto) {
    try {
      await this.checkChannelMembership(channelId, userId);

      let query = `
        SELECT m.id, m.channel_id, m.sender_user_id, m.message_type,
               m.encrypted_content, m.encryption_iv, m.encryption_auth_tag,
               m.content_hash, m.encryption_key_version,
               m.is_edited, m.edited_at, m.is_deleted, m.deleted_at,
               m.reply_to_message_id, m.thread_id, m.sent_at, m.created_at,
               u.first_name as sender_first_name,
               u.last_name as sender_last_name,
               u.avatar_url as sender_avatar_url,
               (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count,
               (SELECT COUNT(*) FROM messages WHERE reply_to_message_id = m.id) as reply_count
        FROM messages m
        INNER JOIN users u ON m.sender_user_id = u.id
        WHERE m.channel_id = @channelId
      `;

      const params: any = { channelId };

      if (!dto.includeDeleted) {
        query += ` AND m.is_deleted = 0`;
      }

      if (dto.beforeMessageId) {
        query += ` AND m.id < @beforeMessageId`;
        params.beforeMessageId = Number(dto.beforeMessageId);
      }

      if (dto.afterMessageId) {
        query += ` AND m.id > @afterMessageId`;
        params.afterMessageId = Number(dto.afterMessageId);
      }

      query += ` ORDER BY m.sent_at DESC`;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

      params.limit = dto.limit || 50;
      params.offset = dto.offset || 0;

      const messages = await this.sqlService.query(query, params);

      return messages.map((msg) => ({
        ...msg,
        encryptionMetadata: {
          algorithm: 'AES-256-GCM',
          keyVersion: msg.encryption_key_version,
          hasIntegrityTag: !!msg.content_hash,
          requiresChannelKey: true,
        },
      }));
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get messages: ${error.message}`);
    }
  }

  // ==================== EDIT MESSAGE (ENCRYPTED) ====================

  /**
   * ✅ EDIT ENCRYPTED MESSAGE
   * Updates message with new encrypted content
   */
  async editMessage(messageId: number, dto: EditMessageDto, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT * FROM messages WHERE id = @messageId AND sender_user_id = @userId`,
        { messageId, userId },
      );

      if (message.length === 0) {
        throw new ForbiddenException('You can only edit your own messages');
      }

      if (
        !dto.encryptedContent ||
        !dto.encryptionIv ||
        !dto.encryptionAuthTag
      ) {
        throw new BadRequestException('Edited message must be encrypted');
      }

      this.validateEncryptionPayload(dto as any);

      const contentHash = this.encryptionService.generateHMAC(
        `${dto.encryptedContent}:${dto.encryptionIv}`,
      );

      const result = await this.sqlService.query(
        `UPDATE messages 
         SET encrypted_content = @encryptedContent,
             encryption_iv = @encryptionIv,
             encryption_auth_tag = @encryptionAuthTag,
             content_hash = @contentHash,
             is_edited = 1,
             edited_at = GETUTCDATE(),
             updated_by = @userId,
             updated_at = GETUTCDATE()
         OUTPUT INSERTED.*
         WHERE id = @messageId`,
        {
          messageId,
          encryptedContent: dto.encryptedContent,
          encryptionIv: dto.encryptionIv,
          encryptionAuthTag: dto.encryptionAuthTag,
          contentHash,
          userId,
        },
      );

      this.logger.log(`✅ Message ${messageId} edited`);

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to edit message: ${error.message}`);
    }
  }

  // ==================== CHANNEL KEY ROTATION ====================

  /**
   * ✅ ROTATE CHANNEL KEY
   * Generates new key and re-encrypts for all participants
   */
  async rotateChannelKey(
    channelId: number,
    reason: string,
    userId: number,
  ): Promise<any> {
    const rotationId = crypto.randomUUID();

    try {
      this.logger.log(
        `[${rotationId}] Starting channel key rotation for channel ${channelId}`,
      );

      // Verify user is channel owner
      await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER]);

      // Get current key version
      const channel = await this.sqlService.query(
        `SELECT encryption_version FROM chat_channels WHERE id = @channelId`,
        { channelId },
      );

      const currentVersion = channel[0]?.encryption_version || 'v1';
      const currentVersionNum = parseInt(currentVersion.substring(1));
      const newVersion = `v${currentVersionNum + 1}`;

      // Generate new channel key
      const newChannelKey = this.encryptionService.generateChannelKey();

      // Update channel
      await this.sqlService.query(
        `UPDATE chat_channels 
         SET encryption_version = @newVersion,
             updated_by = @userId,
             updated_at = GETUTCDATE()
         WHERE id = @channelId`,
        { channelId, newVersion, userId },
      );

      // Get all participants
      const participants = await this.sqlService.query(
        `SELECT user_id FROM chat_participants 
         WHERE channel_id = @channelId AND is_active = 1`,
        { channelId },
      );

      // Re-encrypt channel key for each participant
      let updatedCount = 0;
      for (const participant of participants) {
        try {
          const userKey = await this.encryptionService.getUserActiveKey(
            participant.user_id,
          );

          if (!userKey) {
            this.logger.warn(`User ${participant.user_id} has no active key`);
            continue;
          }

          const encryptedChannelKey =
            this.encryptionService.encryptWithPublicKey(
              newChannelKey,
              userKey.public_key_pem,
            );

          const keyFingerprint = this.encryptionService.calculateKeyFingerprint(
            userKey.public_key_pem,
          );

          await this.sqlService.query(
            `UPDATE chat_participants
             SET encrypted_channel_key = @encryptedChannelKey,
                 key_version = @keyVersion,
                 key_fingerprint = @keyFingerprint,
                 updated_at = GETUTCDATE()
             WHERE channel_id = @channelId AND user_id = @userId`,
            {
              channelId,
              userId: participant.user_id,
              encryptedChannelKey,
              keyVersion: userKey.key_version,
              keyFingerprint,
            },
          );

          updatedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to update key for user ${participant.user_id}: ${error.message}`,
          );
        }
      }

      // Log rotation
      await this.sqlService.query(
        `INSERT INTO channel_key_rotations (
          channel_id, old_key_version, new_key_version,
          rotated_by, rotation_reason, affected_participants,
          rotated_at, created_at, created_by
        )
        VALUES (
          @channelId, @oldVersion, @newVersionNum,
          @userId, @reason, @participantCount,
          GETUTCDATE(), GETUTCDATE(), @userId
        )`,
        {
          channelId,
          oldVersion: currentVersionNum,
          newVersionNum: currentVersionNum + 1,
          userId,
          reason,
          participantCount: updatedCount,
        },
      );

      // Invalidate cache
      await this.redisService.invalidateCache(`user:*:channels:*`);

      this.logger.log(
        `[${rotationId}] ✅ Channel key rotated from ${currentVersion} to ${newVersion} for ${updatedCount} participants`,
      );

      return {
        rotationId,
        channelId,
        oldVersion: currentVersion,
        newVersion,
        participantsUpdated: updatedCount,
        totalParticipants: participants.length,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `[${rotationId}] Key rotation failed: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== EXISTING METHODS (KEEP AS-IS) ====================

  // Note: All other methods from the original chat.service.ts remain unchanged
  // Only the methods above are updated for E2E encryption

  async getChannelById(channelId: number, userId: number) {
    try {
      const participation = await this.sqlService.query(
        `SELECT encrypted_channel_key FROM chat_participants 
         WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
        { channelId, userId },
      );

      if (participation.length === 0) {
        throw new ForbiddenException(
          'You are not a participant of this channel',
        );
      }

      const result = await this.sqlService.query(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM chat_participants WHERE channel_id = c.id AND is_active = 1) as member_count,
                (SELECT COUNT(*) FROM messages WHERE channel_id = c.id AND is_deleted = 0) as message_count,
                cp.role as user_role,
                cp.is_muted as is_muted,
                cp.last_read_message_id,
                cp.last_read_at,
                cp.encrypted_channel_key
         FROM chat_channels c
         LEFT JOIN chat_participants cp ON c.id = cp.channel_id AND cp.user_id = @userId
         WHERE c.id = @channelId`,
        { channelId, userId },
      );

      if (result.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to get channel: ${error.message}`);
    }
  }

  async getUserChannels(userId: number, tenantId: number, dto: GetChannelsDto) {
    try {
      const cacheKey = `user:${userId}:channels:${JSON.stringify(dto)}`;
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      let query = `
        SELECT c.*, 
               cp.role as user_role,
               cp.last_read_message_id,
               cp.last_read_at,
               cp.is_muted,
               cp.encrypted_channel_key,
               (SELECT COUNT(*) FROM messages m 
                WHERE m.channel_id = c.id 
                AND m.is_deleted = 0 
                AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)) as unread_count,
               (SELECT TOP 1 encrypted_content FROM messages 
                WHERE channel_id = c.id AND is_deleted = 0 
                ORDER BY sent_at DESC) as last_message_preview,
               (SELECT TOP 1 sent_at FROM messages 
                WHERE channel_id = c.id AND is_deleted = 0 
                ORDER BY sent_at DESC) as last_message_at
        FROM chat_channels c
        INNER JOIN chat_participants cp ON c.id = cp.channel_id
        WHERE cp.user_id = @userId 
        AND cp.is_active = 1
        AND c.created_by_tenant_id = @tenantId
      `;

      const params: any = { userId, tenantId };

      if (dto.channelType) {
        query += ` AND c.channel_type = @channelType`;
        params.channelType = dto.channelType;
      }

      if (dto.isArchived !== undefined) {
        query += ` AND c.is_archived = @isArchived`;
        params.isArchived = dto.isArchived;
      }

      if (dto.search) {
        query += ` AND (c.name LIKE @search OR c.description LIKE @search)`;
        params.search = `%${dto.search}%`;
      }

      query += ` ORDER BY c.last_activity_at DESC`;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

      params.limit = dto.limit || 50;
      params.offset = dto.offset || 0;

      const result = await this.sqlService.query(query, params);

      await this.redisService.set(cacheKey, JSON.stringify(result), 60);

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to get user channels: ${error.message}`,
      );
    }
  }

  async updateChannel(
    channelId: number,
    dto: UpdateChannelDto,
    userId: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      const result = await this.sqlService.query(
        `UPDATE chat_channels 
          SET name = COALESCE(@name, name),
              description = COALESCE(@description, description),
              is_private = COALESCE(@isPrivate, is_private),
              settings = COALESCE(@settings, settings),
              updated_by = @userId,
              updated_at = GETUTCDATE()
          OUTPUT INSERTED.*
          WHERE id = @channelId`,
        {
          channelId,
          name: dto.name,
          description: dto.description,
          isPrivate: dto.isPrivate,
          settings: dto.settings ? JSON.stringify(dto.settings) : null,
          userId,
        },
      );

      if (result.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      await this.redisService.del(`user:*:channels:*`);

      return result[0];
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update channel: ${error.message}`,
      );
    }
  }

  async archiveChannel(channelId: number, isArchived: boolean, userId: number) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      await this.sqlService.query(
        `UPDATE chat_channels 
          SET is_archived = @isArchived, updated_by = @userId, updated_at = GETUTCDATE()
          WHERE id = @channelId`,
        { channelId, isArchived, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return {
        message: isArchived ? 'Channel archived' : 'Channel unarchived',
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to archive channel: ${error.message}`,
      );
    }
  }

  async deleteChannel(channelId: number, userId: number) {
    try {
      await this.checkChannelPermission(channelId, userId, [MemberRole.OWNER]);

      await this.sqlService.query(
        `UPDATE chat_channels 
          SET is_archived = 1, updated_by = @userId, updated_at = GETUTCDATE()
          WHERE id = @channelId`,
        { channelId, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return { message: 'Channel deleted successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete channel: ${error.message}`,
      );
    }
  }

  // ==================== CHANNEL PARTICIPANTS ====================

  async addChannelMembers(
    channelId: number,
    dto: AddChannelMembersDto,
    userId: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      const channel = await this.sqlService.query(
        `SELECT created_by_tenant_id, cp.encrypted_channel_key 
           FROM chat_channels c
           LEFT JOIN chat_participants cp ON c.id = cp.channel_id AND cp.user_id = @userId
           WHERE c.id = @channelId`,
        { channelId, userId },
      );

      if (channel.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      const tenantId = channel[0].created_by_tenant_id;
      const encryptedChannelKey = channel[0].encrypted_channel_key;
      const addedMembers: any = [];

      for (const memberId of dto.userIds) {
        try {
          const member: any = await this.addChannelParticipant(
            channelId,
            Number(memberId),
            tenantId,
            userId,
            dto.role || MemberRole.MEMBER,
            encryptedChannelKey,
          );
          addedMembers.push(member);
        } catch (error) {
          this.logger.warn(`Failed to add member ${memberId}:`, error.message);
        }
      }

      await this.updateChannelMemberCount(channelId);
      await this.redisService.del(`user:*:channels:*`);

      return {
        message: 'Members added successfully',
        added: addedMembers.length,
        total: dto.userIds.length,
        members: addedMembers,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to add channel members: ${error.message}`,
      );
    }
  }

  async addChannelParticipant(
    channelId: number,
    memberId: number,
    tenantId: number,
    addedBy: number,
    role: MemberRole = MemberRole.MEMBER,
    encryptedChannelKey: string,
  ) {
    try {
      const result = await this.sqlService.query(
        `INSERT INTO chat_participants (
            channel_id, tenant_id, user_id, role, 
            encrypted_channel_key,
            is_active, joined_at, created_by, created_at
          )
          OUTPUT INSERTED.*
          VALUES (
            @channelId, @tenantId, @memberId, @role, 
            @encryptedChannelKey,
            1, GETUTCDATE(), @addedBy, GETUTCDATE()
          )`,
        { channelId, tenantId, memberId, role, encryptedChannelKey, addedBy },
      );

      return result[0];
    } catch (error) {
      throw new BadRequestException(
        `Failed to add participant: ${error.message}`,
      );
    }
  }

  async removeChannelMember(
    channelId: number,
    memberId: number,
    removedBy: number,
  ) {
    try {
      if (removedBy !== memberId) {
        await this.checkChannelPermission(channelId, removedBy, [
          MemberRole.OWNER,
          MemberRole.ADMIN,
        ]);
      }

      await this.sqlService.query(
        `UPDATE chat_participants 
           SET is_active = 0, left_at = GETUTCDATE(), updated_by = @removedBy, updated_at = GETUTCDATE()
           WHERE channel_id = @channelId AND user_id = @memberId`,
        { channelId, memberId, removedBy },
      );

      await this.updateChannelMemberCount(channelId);
      await this.redisService.del(`user:*:channels:*`);

      return { message: 'Member removed successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to remove member: ${error.message}`,
      );
    }
  }

  async getChannelMembers(channelId: number, userId: number) {
    try {
      await this.checkChannelMembership(channelId, userId);

      return await this.sqlService.query(
        `SELECT cp.*, 
                  u.first_name, u.last_name, u.email, u.avatar_url, u.status,
                  u.last_active_at
           FROM chat_participants cp
           INNER JOIN users u ON cp.user_id = u.id
           WHERE cp.channel_id = @channelId AND cp.is_active = 1
           ORDER BY cp.role DESC, u.first_name`,
        { channelId },
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get channel members: ${error.message}`,
      );
    }
  }

  async updateMemberRole(
    channelId: number,
    dto: UpdateMemberRoleDto,
    updatedBy: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, updatedBy, [
        MemberRole.OWNER,
      ]);

      await this.sqlService.query(
        `UPDATE chat_participants 
           SET role = @role, updated_by = @updatedBy, updated_at = GETUTCDATE()
           WHERE channel_id = @channelId AND user_id = @userId`,
        { channelId, userId: Number(dto.userId), role: dto.role, updatedBy },
      );

      return { message: 'Member role updated successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update member role: ${error.message}`,
      );
    }
  }

  async updateMemberNotification(
    channelId: number,
    dto: UpdateMemberNotificationDto,
    userId: number,
  ) {
    try {
      await this.sqlService.query(
        `UPDATE chat_participants 
           SET is_muted = COALESCE(@isMuted, is_muted),
               notification_settings = COALESCE(@notificationSettings, notification_settings),
               updated_by = @userId,
               updated_at = GETUTCDATE()
           WHERE channel_id = @channelId AND user_id = @userId`,
        {
          channelId,
          userId,
          isMuted: dto.isMuted,
          notificationSettings: dto.notificationSettings
            ? JSON.stringify(dto.notificationSettings)
            : null,
        },
      );

      return { message: 'Notification settings updated' };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update notification settings: ${error.message}`,
      );
    }
  }

  // ==================== MESSAGES ====================

  /**
   * ✅ VALIDATE ENCRYPTED MESSAGE FORMAT
   * Helper to ensure proper encryption format
   */
  private validateEncryptedMessageFormat(
    encryptedContent: string,
    iv: string,
    authTag: string,
  ): void {
    // Check if values are hex strings
    const hexRegex = /^[a-f0-9]*$/i;

    if (!hexRegex.test(encryptedContent)) {
      throw new BadRequestException(
        'encryptedContent must be hex-encoded string',
      );
    }

    if (!hexRegex.test(iv)) {
      throw new BadRequestException('encryptionIv must be hex-encoded string');
    }

    if (!hexRegex.test(authTag)) {
      throw new BadRequestException(
        'encryptionAuthTag must be hex-encoded string',
      );
    }

    // Check lengths
    if (iv.length !== 32) {
      throw new BadRequestException(
        'encryptionIv must be 16 bytes (32 hex chars)',
      );
    }

    if (authTag.length !== 32) {
      throw new BadRequestException(
        'encryptionAuthTag must be 16 bytes (32 hex chars)',
      );
    }
  }

  async deleteMessage(
    messageId: number,
    userId: number,
    hardDelete: boolean = false,
  ) {
    try {
      const message = await this.sqlService.query(
        `SELECT * FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      if (message[0].sender_user_id !== userId) {
        await this.checkChannelPermission(message[0].channel_id, userId, [
          MemberRole.OWNER,
          MemberRole.ADMIN,
        ]);
      }

      if (hardDelete) {
        await this.sqlService.query(
          `DELETE FROM messages WHERE id = @messageId`,
          { messageId },
        );
      } else {
        await this.sqlService.query(
          `UPDATE messages 
             SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId, updated_at = GETUTCDATE()
             WHERE id = @messageId`,
          { messageId, userId },
        );
      }

      return { message: 'Message deleted successfully' };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete message: ${error.message}`,
      );
    }
  }

  async reactToMessage(
    messageId: number,
    emoji: string,
    userId: number,
    tenantId: number,
  ) {
    try {
      const existing = await this.sqlService.query(
        `SELECT * FROM message_reactions 
           WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
        { messageId, userId, emoji },
      );

      if (existing.length > 0) {
        await this.sqlService.query(
          `DELETE FROM message_reactions 
             WHERE message_id = @messageId AND user_id = @userId AND emoji = @emoji`,
          { messageId, userId, emoji },
        );
        return { message: 'Reaction removed', action: 'removed' };
      } else {
        await this.sqlService.query(
          `INSERT INTO message_reactions (message_id, tenant_id, user_id, emoji, created_by, created_at)
             VALUES (@messageId, @tenantId, @userId, @emoji, @userId, GETUTCDATE())`,
          { messageId, tenantId, userId, emoji },
        );
        return { message: 'Reaction added', action: 'added' };
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to react to message: ${error.message}`,
      );
    }
  }

  async pinMessage(messageId: number, isPinned: boolean, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT channel_id FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      await this.checkChannelPermission(message[0].channel_id, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      await this.sqlService.query(
        `UPDATE messages 
           SET is_pinned = @isPinned,
               pinned_at = ${isPinned ? 'GETUTCDATE()' : 'NULL'},
               pinned_by = ${isPinned ? '@userId' : 'NULL'},
               updated_at = GETUTCDATE()
           WHERE id = @messageId`,
        { messageId, isPinned, userId },
      );

      return { message: isPinned ? 'Message pinned' : 'Message unpinned' };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to pin message: ${error.message}`);
    }
  }

  // ==================== READ RECEIPTS ====================

  // ✅ NEW: Missing bulk mark as read implementation
  async bulkMarkAsRead(
    channelId: number,
    messageIds: number[],
    userId: number,
  ) {
    try {
      await this.checkChannelMembership(channelId, userId);

      if (!messageIds || messageIds.length === 0) {
        return { message: 'No messages to mark as read' };
      }

      await this.sqlService.query(
        `UPDATE message_read_receipts
           SET status = 'read', read_at = GETUTCDATE()
           WHERE message_id IN (${messageIds.join(',')})
           AND user_id = @userId
           AND status != 'read'`,
        { userId },
      );

      // Update last read message
      const maxMessageId = Math.max(...messageIds);
      await this.sqlService.query(
        `UPDATE chat_participants 
           SET last_read_message_id = @messageId,
               last_read_at = GETUTCDATE(),
               updated_by = @userId,
               updated_at = GETUTCDATE()
           WHERE channel_id = @channelId AND user_id = @userId`,
        { channelId, messageId: maxMessageId, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return {
        message: 'Messages marked as read',
        count: messageIds.length,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to bulk mark as read: ${error.message}`,
      );
    }
  }

  async markAsRead(dto: MarkAsReadDto, userId: number) {
    try {
      const messageId = dto.messageId
        ? Number(dto.messageId)
        : await this.getLastMessageId(Number(dto.channelId));

      if (!messageId) {
        return { message: 'No messages to mark as read' };
      }

      // Update read receipt
      await this.sqlService.query(
        `UPDATE message_read_receipts
           SET status = 'read', read_at = GETUTCDATE()
           WHERE message_id = @messageId AND user_id = @userId`,
        { messageId, userId },
      );

      // Update participant's last read
      await this.sqlService.query(
        `UPDATE chat_participants 
           SET last_read_message_id = @messageId,
               last_read_at = GETUTCDATE(),
               updated_by = @userId,
               updated_at = GETUTCDATE()
           WHERE channel_id = @channelId AND user_id = @userId`,
        { channelId: Number(dto.channelId), messageId, userId },
      );

      await this.redisService.del(`user:*:channels:*`);

      return { message: 'Marked as read' };
    } catch (error) {
      throw new BadRequestException(`Failed to mark as read: ${error.message}`);
    }
  }

  async getUnreadCount(userId: number, tenantId: number) {
    try {
      const cacheKey = `user:${userId}:unread_count`;
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.sqlService.query(
        `SELECT 
             COUNT(*) as total_unread,
             COUNT(DISTINCT m.channel_id) as unread_channels
           FROM messages m
           INNER JOIN chat_channels c ON m.channel_id = c.id
           INNER JOIN chat_participants cp ON c.id = cp.channel_id
           WHERE cp.user_id = @userId
           AND cp.is_active = 1
           AND c.created_by_tenant_id = @tenantId
           AND m.is_deleted = 0
           AND m.sender_user_id != @userId
           AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)`,
        { userId, tenantId },
      );

      await this.redisService.set(cacheKey, JSON.stringify(result[0]), 30);

      return result[0];
    } catch (error) {
      throw new BadRequestException(
        `Failed to get unread count: ${error.message}`,
      );
    }
  }

  async getMessageStatus(messageId: number, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT channel_id, sender_user_id FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      await this.checkChannelMembership(message[0].channel_id, userId);

      const receipts = await this.sqlService.query(
        `SELECT mrr.*,
                  u.first_name, u.last_name, u.avatar_url
           FROM message_read_receipts mrr
           INNER JOIN users u ON mrr.user_id = u.id
           WHERE mrr.message_id = @messageId
           ORDER BY mrr.read_at DESC`,
        { messageId },
      );

      const totalRecipients = await this.sqlService.query(
        `SELECT COUNT(*) as count FROM chat_participants 
           WHERE channel_id = @channelId 
           AND user_id != @senderId 
           AND is_active = 1`,
        {
          channelId: message[0].channel_id,
          senderId: message[0].sender_user_id,
        },
      );

      const stats = {
        sent: receipts.filter((r) => r.status === 'sent').length,
        delivered: receipts.filter((r) => r.status === 'delivered').length,
        read: receipts.filter((r) => r.status === 'read').length,
        total: totalRecipients[0].count,
      };

      return {
        messageId,
        status: this.calculateMessageStatus(stats),
        stats,
        receipts,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get message status: ${error.message}`,
      );
    }
  }

  private calculateMessageStatus(stats: any): string {
    if (stats.read === stats.total) return 'read';
    if (stats.delivered > 0) return 'delivered';
    if (stats.sent > 0) return 'sent';
    return 'sending';
  }

  async getMessagesDeliveryStatus(messageIds: number[], userId: number) {
    try {
      if (!messageIds || messageIds.length === 0) {
        return [];
      }

      const statuses = await this.sqlService.query(
        `SELECT m.id as message_id,
                  COUNT(CASE WHEN mrr.status = 'sent' THEN 1 END) as sent_count,
                  COUNT(CASE WHEN mrr.status = 'delivered' THEN 1 END) as delivered_count,
                  COUNT(CASE WHEN mrr.status = 'read' THEN 1 END) as read_count,
                  (SELECT COUNT(*) FROM chat_participants cp 
                   WHERE cp.channel_id = m.channel_id 
                   AND cp.user_id != m.sender_user_id 
                   AND cp.is_active = 1) as total_recipients
           FROM messages m
           LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id
           WHERE m.id IN (${messageIds.join(',')})
           GROUP BY m.id, m.channel_id, m.sender_user_id`,
        {},
      );

      return statuses.map((s) => ({
        messageId: s.message_id,
        status: this.calculateMessageStatus({
          sent: s.sent_count,
          delivered: s.delivered_count,
          read: s.read_count,
          total: s.total_recipients,
        }),
        stats: {
          sent: s.sent_count,
          delivered: s.delivered_count,
          read: s.read_count,
          total: s.total_recipients,
        },
      }));
    } catch (error) {
      throw new BadRequestException(
        `Failed to get messages delivery status: ${error.message}`,
      );
    }
  }

  // ==================== SEARCH ====================

  async searchMessages(
    userId: number,
    tenantId: number,
    dto: SearchMessagesDto,
  ) {
    try {
      // NOTE: With E2E encryption, search must be done client-side
      // This endpoint can only search by metadata (sender, date, channel)
      let query = `
          SELECT m.*,
                 u.first_name as sender_first_name,
                 u.last_name as sender_last_name,
                 c.name as channel_name
          FROM messages m
          INNER JOIN users u ON m.sender_user_id = u.id
          INNER JOIN chat_channels c ON m.channel_id = c.id
          INNER JOIN chat_participants cp ON c.id = cp.channel_id AND cp.user_id = @userId
          WHERE m.sender_tenant_id = @tenantId
          AND m.is_deleted = 0
          AND cp.is_active = 1
        `;

      const params: any = {
        userId,
        tenantId,
      };

      if (dto.channelId) {
        query += ` AND m.channel_id = @channelId`;
        params.channelId = Number(dto.channelId);
      }

      if (dto.userId) {
        query += ` AND m.sender_user_id = @senderId`;
        params.senderId = Number(dto.userId);
      }

      if (dto.messageType) {
        query += ` AND m.message_type = @messageType`;
        params.messageType = dto.messageType;
      }

      if (dto.startDate) {
        query += ` AND m.sent_at >= @startDate`;
        params.startDate = dto.startDate;
      }

      if (dto.endDate) {
        query += ` AND m.sent_at <= @endDate`;
        params.endDate = dto.endDate;
      }

      query += ` ORDER BY m.sent_at DESC`;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

      params.limit = dto.limit || 50;
      params.offset = dto.offset || 0;

      return await this.sqlService.query(query, params);
    } catch (error) {
      throw new BadRequestException(
        `Failed to search messages: ${error.message}`,
      );
    }
  }

  // ==================== DIRECT MESSAGES ====================

  async createDirectMessage(
    dto: CreateDirectMessageDto,
    userId: number,
    tenantId: number,
  ) {
    try {
      // Check if DM channel already exists between these two users
      let channel = await this.sqlService.query(
        `SELECT c.* FROM chat_channels c
           INNER JOIN chat_participants cp1 ON c.id = cp1.channel_id AND cp1.user_id = @userId
           INNER JOIN chat_participants cp2 ON c.id = cp2.channel_id AND cp2.user_id = @recipientId
           WHERE c.channel_type = 'direct' 
           AND c.created_by_tenant_id = @tenantId
           AND (SELECT COUNT(*) FROM chat_participants WHERE channel_id = c.id AND is_active = 1) = 2`,
        { userId, recipientId: Number(dto.recipientUserId), tenantId },
      );

      let channelId: number;

      if (channel.length === 0) {
        // Create new DM channel
        const channelKey = this.encryptionService.generateChannelKey();

        const newChannel = await this.sqlService.query(
          `INSERT INTO chat_channels (
              created_by_tenant_id, name, channel_type, is_private, 
              is_encrypted, encryption_version, encryption_algorithm,
              created_by, created_at
            )
            OUTPUT INSERTED.*
            VALUES (@tenantId, 'Direct Message', 'direct', 1, 1, 'v1', 'AES-256-GCM', @userId, GETUTCDATE())`,
          { tenantId, userId },
        );

        channelId = newChannel[0].id;

        // ✅ FIX: Add both participants using proper encryption method
        await this.addParticipantWithEncryption(
          channelId,
          userId,
          tenantId,
          userId,
          MemberRole.MEMBER,
          channelKey,
        );

        await this.addParticipantWithEncryption(
          channelId,
          Number(dto.recipientUserId),
          tenantId,
          userId,
          MemberRole.MEMBER,
          channelKey,
        );

        this.logger.log(`✅ DM channel ${channelId} created`);
      } else {
        channelId = channel[0].id;
        this.logger.log(`Using existing DM channel ${channelId}`);
      }

      // Validate encryption
      if (
        !dto.encryptedContent ||
        !dto.encryptionIv ||
        !dto.encryptionAuthTag
      ) {
        throw new BadRequestException('Direct message must be encrypted');
      }

      // ✅ FIX: Send message using existing sendMessage method (no version fields needed)
      return await this.sendMessage(
        {
          channelId: Number(channelId),
          encryptedContent: dto.encryptedContent,
          encryptionIv: dto.encryptionIv,
          encryptionAuthTag: dto.encryptionAuthTag,
          attachments: dto.attachments,
          messageType: MessageType.TEXT,
        } as SendMessageDto,
        userId,
        tenantId,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create direct message', error);
      throw new BadRequestException(
        `Failed to create direct message: ${error.message}`,
      );
    }
  }

  // ==================== THREADS ====================

  async getThreadMessages(
    threadId: number,
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      const parentMessage = await this.sqlService.query(
        `SELECT channel_id FROM messages WHERE id = @threadId`,
        { threadId },
      );

      if (parentMessage.length === 0) {
        throw new NotFoundException('Thread not found');
      }

      await this.checkChannelMembership(parentMessage[0].channel_id, userId);

      return await this.sqlService.query(
        `SELECT m.*,
                  u.first_name as sender_first_name,
                  u.last_name as sender_last_name,
                  u.avatar_url as sender_avatar_url,
                  (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count
           FROM messages m
           INNER JOIN users u ON m.sender_user_id = u.id
           WHERE (m.thread_id = @threadId OR m.id = @threadId)
           AND m.is_deleted = 0
           ORDER BY m.sent_at ASC
           OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { threadId, limit, offset },
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get thread messages: ${error.message}`,
      );
    }
  }

  // ==================== FILE ATTACHMENTS ====================

  async getChannelFiles(
    channelId: number,
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      await this.checkChannelMembership(channelId, userId);

      return await this.sqlService.query(
        `SELECT ma.*, m.sent_at, m.sender_user_id,
                  u.first_name as sender_first_name,
                  u.last_name as sender_last_name
           FROM message_attachments ma
           INNER JOIN messages m ON ma.message_id = m.id
           INNER JOIN users u ON m.sender_user_id = u.id
           WHERE m.channel_id = @channelId
           AND m.is_deleted = 0
           AND ma.is_deleted = 0
           ORDER BY ma.created_at DESC
           OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { channelId, limit, offset },
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get channel files: ${error.message}`,
      );
    }
  }

  // ==================== PINNED MESSAGES ====================

  async getPinnedMessages(channelId: number, userId: number) {
    try {
      await this.checkChannelMembership(channelId, userId);

      return await this.sqlService.query(
        `SELECT m.*,
                  u.first_name as sender_first_name,
                  u.last_name as sender_last_name,
                  u.avatar_url as sender_avatar_url,
                  pinner.first_name as pinned_by_first_name,
                  pinner.last_name as pinned_by_last_name
           FROM messages m
           INNER JOIN users u ON m.sender_user_id = u.id
           LEFT JOIN users pinner ON m.pinned_by = pinner.id
           WHERE m.channel_id = @channelId
           AND m.is_pinned = 1
           AND m.is_deleted = 0
           ORDER BY m.pinned_at DESC`,
        { channelId },
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get pinned messages: ${error.message}`,
      );
    }
  }

  // ==================== MESSAGE REACTIONS ====================

  async getMessageReactions(messageId: number, userId: number) {
    try {
      const message = await this.sqlService.query(
        `SELECT channel_id FROM messages WHERE id = @messageId`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      await this.checkChannelMembership(message[0].channel_id, userId);

      return await this.sqlService.query(
        `SELECT mr.emoji, 
                  COUNT(*) as count,
                  STRING_AGG(CAST(u.first_name + ' ' + u.last_name AS NVARCHAR(MAX)), ', ') as users
           FROM message_reactions mr
           INNER JOIN users u ON mr.user_id = u.id
           WHERE mr.message_id = @messageId
           GROUP BY mr.emoji
           ORDER BY COUNT(*) DESC`,
        { messageId },
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get message reactions: ${error.message}`,
      );
    }
  }

  // ==================== USER PRESENCE ====================

  async updateUserPresence(
    userId: number,
    status: 'online' | 'away' | 'offline',
  ) {
    try {
      await this.sqlService.query(
        `UPDATE users 
           SET status = @status, 
               last_active_at = GETUTCDATE()
           WHERE id = @userId`,
        { userId, status },
      );

      await this.redisService.set(`user:${userId}:status`, status, 300);

      return { message: 'User presence updated', status };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update user presence: ${error.message}`,
      );
    }
  }

  async getOnlineUsers(tenantId: number) {
    try {
      return await this.sqlService.query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name, u.avatar_url, u.status, u.last_active_at
           FROM users u
           INNER JOIN chat_participants cp ON u.id = cp.user_id
           INNER JOIN chat_channels c ON cp.channel_id = c.id
           WHERE c.created_by_tenant_id = @tenantId
           AND cp.is_active = 1
           AND u.status IN ('online', 'away')
           AND u.last_active_at > DATEADD(minute, -5, GETUTCDATE())`,
        { tenantId },
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to get online users: ${error.message}`,
      );
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkDeleteMessages(messageIds: number[], userId: number) {
    try {
      if (!messageIds || messageIds.length === 0) {
        throw new BadRequestException('No message IDs provided');
      }

      const messages = await this.sqlService.query(
        `SELECT DISTINCT channel_id, sender_user_id 
           FROM messages 
           WHERE id IN (${messageIds.join(',')})`,
        {},
      );

      for (const msg of messages) {
        if (msg.sender_user_id !== userId) {
          await this.checkChannelPermission(msg.channel_id, userId, [
            MemberRole.OWNER,
            MemberRole.ADMIN,
          ]);
        }
      }

      await this.sqlService.query(
        `UPDATE messages 
           SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId
           WHERE id IN (${messageIds.join(',')})`,
        { userId },
      );

      return {
        message: 'Messages deleted successfully',
        deleted: messageIds.length,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to bulk delete messages: ${error.message}`,
      );
    }
  }

  // ==================== CHANNEL SETTINGS ====================

  async getChannelSettings(channelId: number, userId: number) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      const result = await this.sqlService.query(
        `SELECT settings FROM chat_channels WHERE id = @channelId`,
        { channelId },
      );

      if (result.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      return {
        channelId,
        settings: result[0].settings ? JSON.parse(result[0].settings) : {},
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get channel settings: ${error.message}`,
      );
    }
  }

  async updateChannelSettings(
    channelId: number,
    settings: any,
    userId: number,
  ) {
    try {
      await this.checkChannelPermission(channelId, userId, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);

      await this.sqlService.query(
        `UPDATE chat_channels 
           SET settings = @settings, 
               updated_by = @userId, 
               updated_at = GETUTCDATE()
           WHERE id = @channelId`,
        { channelId, settings: JSON.stringify(settings), userId },
      );

      return {
        message: 'Channel settings updated',
        settings,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update channel settings: ${error.message}`,
      );
    }
  }

  // ==================== HELPER METHODS ====================

  private async verifySuperAdminPermission(userId: number): Promise<void> {
    const user = await this.sqlService.query(
      `SELECT is_super_admin FROM users WHERE id = @userId`,
      { userId },
    );

    if (!user || user.length === 0 || !user[0].is_super_admin) {
      throw new ForbiddenException('Super admin permission required');
    }
  }

  private async logAdminDecryption(data: {
    adminUserId: number;
    targetUserId?: number;
    channelId?: number;
    messageId?: number;
    decryptionType: string;
    reason: string;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.sqlService.query(
        `INSERT INTO admin_decryption_logs (
          admin_user_id, target_user_id, channel_id, message_id,
          decryption_type, decryption_reason, decryption_success,
          error_message, ip_address, decrypted_at, created_at
        )
        VALUES (
          @adminUserId, @targetUserId, @channelId, @messageId,
          @decryptionType, @reason, @success,
          @errorMessage, @ipAddress, GETUTCDATE(), GETUTCDATE()
        )`,
        {
          adminUserId: data.adminUserId,
          targetUserId: data.targetUserId || null,
          channelId: data.channelId || null,
          messageId: data.messageId || null,
          decryptionType: data.decryptionType,
          reason: data.reason,
          success: data.success,
          errorMessage: data.errorMessage || null,
          ipAddress: data.ipAddress || null,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to log admin decryption: ${error.message}`);
    }
  }

  private async logPasswordRecovery(data: {
    userId: number;
    adminUserId: number;
    recoveryType: string;
    reason: string;
    oldKeyFingerprint?: string;
    newKeyFingerprint?: string;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.sqlService.query(
        `INSERT INTO password_recovery_logs (
          user_id, admin_user_id, recovery_type, recovery_reason,
          old_key_fingerprint, new_key_fingerprint, recovery_success,
          error_message, ip_address, recovered_at, created_at
        )
        VALUES (
          @userId, @adminUserId, @recoveryType, @reason,
          @oldFingerprint, @newFingerprint, @success,
          @errorMessage, @ipAddress, GETUTCDATE(), GETUTCDATE()
        )`,
        {
          userId: data.userId,
          adminUserId: data.adminUserId,
          recoveryType: data.recoveryType,
          reason: data.reason,
          oldFingerprint: data.oldKeyFingerprint || null,
          newFingerprint: data.newKeyFingerprint || null,
          success: data.success,
          errorMessage: data.errorMessage || null,
          ipAddress: data.ipAddress || null,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to log password recovery: ${error.message}`);
    }
  }

  async checkChannelMembership(channelId: number, userId: number) {
    const result = await this.sqlService.query(
      `SELECT * FROM chat_participants 
         WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
      { channelId, userId },
    );

    if (result.length === 0) {
      throw new ForbiddenException('You are not a participant of this channel');
    }

    return result[0];
  }

  async checkChannelPermission(
    channelId: number,
    userId: number,
    allowedRoles: MemberRole[],
  ) {
    const member = await this.checkChannelMembership(channelId, userId);

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return member;
  }

  async updateChannelMemberCount(channelId: number) {
    await this.sqlService.query(
      `UPDATE chat_channels 
         SET member_count = (SELECT COUNT(*) FROM chat_participants 
                             WHERE channel_id = @channelId AND is_active = 1)
         WHERE id = @channelId`,
      { channelId },
    );
  }

  async getLastMessageId(channelId: number): Promise<number | null> {
    const result = await this.sqlService.query(
      `SELECT TOP 1 id FROM messages 
         WHERE channel_id = @channelId AND is_deleted = 0 
         ORDER BY sent_at DESC`,
      { channelId },
    );

    return result.length > 0 ? result[0].id : null;
  }

  // ============================================
  // Additional methods to add to chat.service.ts
  // ============================================

  // ==================== MESSAGE FORWARDING (NEW) ====================

  async forwardMessage(
    messageId: number,
    targetChannelIds: number[],
    userId: number,
    tenantId: number,
  ) {
    try {
      // Get original message
      const message = await this.sqlService.query(
        `SELECT * FROM messages WHERE id = @messageId AND is_deleted = 0`,
        { messageId },
      );

      if (message.length === 0) {
        throw new NotFoundException('Message not found');
      }

      // Check if user has access to source channel
      await this.checkChannelMembership(message[0].channel_id, userId);

      const forwardedMessages: any[] = [];

      for (const targetChannelId of targetChannelIds) {
        try {
          // Check if user has access to target channel
          await this.checkChannelMembership(targetChannelId, userId);

          // Forward the message (encrypted content remains same)
          const result = await this.sqlService.query(
            `INSERT INTO messages (
                channel_id, sender_tenant_id, sender_user_id, message_type,
                encrypted_content, encryption_iv, encryption_auth_tag, content_hash,
                has_attachments, reply_to_message_id,
                sent_at, created_by, created_at
              )
              OUTPUT INSERTED.*
              VALUES (
                @channelId, @tenantId, @userId, @messageType,
                @encryptedContent, @encryptionIv, @encryptionAuthTag, @contentHash,
                @hasAttachments, @originalMessageId,
                GETUTCDATE(), @userId, GETUTCDATE()
              )`,
            {
              channelId: targetChannelId,
              tenantId,
              userId,
              messageType: message[0].message_type,
              encryptedContent: message[0].encrypted_content,
              encryptionIv: message[0].encryption_iv,
              encryptionAuthTag: message[0].encryption_auth_tag,
              contentHash: message[0].content_hash,
              hasAttachments: message[0].has_attachments,
              originalMessageId: messageId,
            },
          );

          const newMessageId = result[0].id;

          // Create delivery receipts
          await this.createDeliveryReceipts(
            targetChannelId,
            newMessageId,
            userId,
          );

          // Update channel activity
          await this.sqlService.query(
            `UPDATE chat_channels 
               SET message_count = message_count + 1,
                   last_message_at = GETUTCDATE(),
                   last_activity_at = GETUTCDATE()
               WHERE id = @channelId`,
            { channelId: targetChannelId },
          );

          forwardedMessages.push(result[0]);
        } catch (error) {
          this.logger.warn(
            `Failed to forward to channel ${targetChannelId}:`,
            error.message,
          );
        }
      }

      await this.redisService.del(`user:*:channels:*`);

      return {
        message: 'Message forwarded',
        forwarded: forwardedMessages.length,
        total: targetChannelIds.length,
        messages: forwardedMessages,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to forward message: ${error.message}`,
      );
    }
  }
}
