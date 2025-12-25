// src/modules/message-system/chat.controller.ts - COMPLETE SLACK-LIKE FUNCTIONALITY
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
  UsePipes,
  ValidationPipe,
  UploadedFiles,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { CurrentUser, TenantId, Unencrypted } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards';
import { ChatService } from './chat.service';
import {
  SendMessageDto,
  CreateChannelDto,
  MarkAsReadDto,
  UpdateChannelDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  EditMessageDto,
  PinMessageDto,
  ForwardMessageDto,
  MuteChannelDto,
} from './dto/chat.dto';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { FastifyRequest } from 'fastify';
import { FileFastifyInterceptor, FilesFastifyInterceptor } from 'fastify-file-interceptor';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard)
@Unencrypted()
export class ChatController {
  constructor(private chatService: ChatService,
    private gateway: ChatGateway,

  ) { }

  // ==================== MESSAGES ====================
  /**
   * ✅ Upload single file for chat message
   * Supports:
   *   - Upload only (no channelId) → returns attachmentId for later use
   *   - Upload & send as message (with channelId) → creates message immediately
   */
  @Post('messages/upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload file for chat message' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFastifyInterceptor('file'))
  async uploadMessageFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: FastifyRequest,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('messageId') messageId?: string,
    @Body('channelId') channelId?: string,
    @Body('caption') caption?: string,
    @Body('sendAsMessage') sendAsMessage?: string,
    @Body('replyToMessageId') replyToMessageId?: string,
    @Body('threadId') threadId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Flow 1: Send file as message immediately
    if (sendAsMessage === 'true' && channelId) {
      const result = await this.chatService.sendFileMessage(
        {
          channelId: parseInt(channelId),
          caption: caption || '',
          replyToMessageId: replyToMessageId
            ? parseInt(replyToMessageId)
            : undefined,
          threadId: threadId ? parseInt(threadId) : undefined,
        },
        file,
        userId,
        tenantId,
      );

      return {
        success: true,
        message: 'File message sent successfully',
        data: {
          message: result,
          attachmentId: result.attachments?.[0]?.id,
        },
      };
    }

    // Flow 2: Upload only (for later attachment to message)
    const result = await this.chatService['r2Service'].uploadChatAttachment(
      file,
      {
        tenantId,
        userId,
        messageId: messageId ? parseInt(messageId) : undefined,
      },
    );

    return {
      success: true,
      message: 'File uploaded successfully',
      data: result,
    };
  }
  /**
   * ✅ Upload multiple files for chat message
   * Supports:
   *   - Upload only → returns attachmentIds for later use
   *   - Upload & send as messages (with channelId) → creates messages immediately
   */
  @Post('messages/upload-multiple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload multiple files for chat message' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleMessageFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('messageId') messageId?: string,
    @Body('channelId') channelId?: string,
    @Body('caption') caption?: string,
    @Body('sendAsMessage') sendAsMessage?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Flow 1: Send files as messages immediately
    if (sendAsMessage === 'true' && channelId) {
      const results = await this.chatService.sendMultipleFileMessages(
        parseInt(channelId),
        files,
        caption || '',
        userId,
        tenantId,
      );

      return {
        success: true,
        message: `${results.length} file message(s) sent successfully`,
        data: {
          messages: results,
          attachmentIds: results
            .map((m) => m.attachments?.[0]?.id)
            .filter(Boolean),
        },
      };
    }

    // Flow 2: Upload only
    const results = await this.chatService['r2Service'].uploadChatAttachments(
      files,
      {
        tenantId,
        userId,
        messageId: messageId ? parseInt(messageId) : undefined,
      },
    );

    return {
      success: true,
      message: `${results.length} file(s) uploaded successfully`,
      data: results,
    };
  }

  /**
   * ✅ Send file as standalone message (dedicated endpoint)
   */
  @Post('messages/send-file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send file as a standalone message' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFastifyInterceptor('file'))
  async sendFileMessage(
    @UploadedFile() file: Express.Multer.File,
    @Body('channelId') channelId: string,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('caption') caption?: string,
    @Body('replyToMessageId') replyToMessageId?: string,
    @Body('threadId') threadId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!channelId) {
      throw new BadRequestException('channelId is required');
    }

    const result = await this.chatService.sendFileMessage(
      {
        channelId: parseInt(channelId),
        caption: caption || '',
        replyToMessageId: replyToMessageId
          ? parseInt(replyToMessageId)
          : undefined,
        threadId: threadId ? parseInt(threadId) : undefined,
      },
      file,
      userId,
      tenantId,
    );

    return {
      success: true,
      message: 'File message sent successfully',
      data: result,
    };
  }

  @Post('messages/send-files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send files as message (like Slack)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesFastifyInterceptor('files', 10))
  async sendFilesAsMessage(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('channelId') channelId: string,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('caption') caption?: string,
    @Body('replyToMessageId') replyToMessageId?: string,
    @Body('threadId') threadId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (!channelId) {
      throw new BadRequestException('channelId is required');
    }

    // ✅ Send all files as ONE message with multiple attachments
    const result = await this.chatService.sendMultipleFilesAsOneMessage(
      {
        channelId: parseInt(channelId),
        caption: caption || '',
        replyToMessageId: replyToMessageId ? parseInt(replyToMessageId) : undefined,
        threadId: threadId ? parseInt(threadId) : undefined,
      },
      files,
      userId,
      tenantId,
    );

    // ✅ Broadcast via WebSocket to ALL clients (including sender)
    try {
      if (this.gateway?.server) {
        await this.gateway['broadcastToChannel'](parseInt(channelId), {
          event: 'new_message',
          message: result,
        });
      }
    } catch (error) {
      console.error('❌ WebSocket broadcast failed:', error.message);
    }

    return {
      success: true,
      message: 'Files sent successfully',
      data: result,
    };
  }


  /**
   * ✅ Send existing attachment as message (for WebSocket flow)
   */
  @Post('messages/send-attachment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send existing uploaded attachment as a message' })
  async sendAttachmentAsMessage(
    @Body()
    dto: {
      channelId: number;
      attachmentId: number;
      caption?: string;
      replyToMessageId?: number;
      threadId?: number;
    },
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    if (!dto.channelId || !dto.attachmentId) {
      throw new BadRequestException('channelId and attachmentId are required');
    }

    const result = await this.chatService.sendMessageWithExistingAttachment(
      dto,
      userId,
      tenantId,
    );

    return {
      success: true,
      message: 'Attachment sent as message',
      data: result,
    };
  }

  /**
   * ✅ Get file download URL (UPDATED: handles orphan attachments)
   */
  @Get('messages/files/:attachmentId/download')
  @ApiOperation({ summary: 'Get download URL for attachment' })
  async getFileDownloadUrl(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    // Get attachment details - handle both linked and orphan attachments
    const attachment = await this.chatService['sqlService'].query(
      `SELECT ma.*, m.channel_id
     FROM message_attachments ma
     LEFT JOIN messages m ON ma.message_id = m.id
     WHERE ma.id = @attachmentId 
       AND ma.is_deleted = 0
       AND ma.tenant_id = @tenantId`,
      { attachmentId, tenantId },
    );

    if (!attachment.length) {
      throw new BadRequestException('Attachment not found');
    }

    // For linked attachments, verify channel access
    if (attachment[0].channel_id) {
      await this.chatService['validateMembership'](
        attachment[0].channel_id,
        userId,
      );
    } else {
      // For orphan attachments, only creator can access
      if (attachment[0].created_by !== userId) {
        throw new BadRequestException('Access denied');
      }
    }

    const fileUrl = attachment[0].file_url;
    const key = fileUrl.split('.com/')[1];

    if (!key) {
      return {
        success: true,
        data: {
          url: fileUrl,
          directAccess: true,
        },
      };
    }

    const signedUrl = await this.chatService['r2Service'].getSignedUrl(
      key,
      3600,
    );

    return {
      success: true,
      data: {
        url: signedUrl,
        expiresIn: 3600,
        fileName: attachment[0].filename,
        fileSize: attachment[0].file_size,
        mimeType: attachment[0].mime_type,
      },
    };
  }

  /**
   * ✅ Delete attachment (UPDATED: handles orphan attachments)
   */
  @Delete('messages/files/:attachmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete message attachment' })
  async deleteAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    // Get attachment details - handle both linked and orphan
    const attachment = await this.chatService['sqlService'].query(
      `SELECT ma.*, m.channel_id, m.sender_user_id
     FROM message_attachments ma
     LEFT JOIN messages m ON ma.message_id = m.id
     WHERE ma.id = @attachmentId 
       AND ma.is_deleted = 0
       AND ma.tenant_id = @tenantId`,
      { attachmentId, tenantId },
    );

    if (!attachment.length) {
      throw new BadRequestException('Attachment not found');
    }

    // For orphan attachments, only creator can delete
    if (!attachment[0].message_id) {
      if (attachment[0].created_by !== userId) {
        throw new BadRequestException(
          'You do not have permission to delete this attachment',
        );
      }
    } else {
      // For linked attachments, check message sender or admin
      if (attachment[0].sender_user_id !== userId) {
        const participant = await this.chatService['sqlService'].query(
          `SELECT role FROM chat_participants 
         WHERE channel_id = @channelId AND user_id = @userId AND is_active = 1`,
          { channelId: attachment[0].channel_id, userId },
        );

        if (
          !participant.length ||
          !['admin', 'owner'].includes(participant[0].role)
        ) {
          throw new BadRequestException(
            'You do not have permission to delete this attachment',
          );
        }
      }
    }

    await this.chatService['sqlService'].query(
      `UPDATE message_attachments 
     SET is_deleted = 1, updated_at = GETUTCDATE(), updated_by = @userId
     WHERE id = @attachmentId`,
      { attachmentId, userId },
    );

    return {
      success: true,
      message: 'Attachment deleted successfully',
    };
  }

  /**
   * ✅ Get pending (orphan) attachments
   */
  @Get('attachments/pending')
  @ApiOperation({
    summary: 'Get pending attachments not yet linked to messages',
  })
  async getPendingAttachments(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    const attachments = await this.chatService['sqlService'].query(
      `SELECT id, filename, file_size, mime_type, file_url, thumbnail_url, created_at
     FROM message_attachments
     WHERE created_by = @userId 
       AND tenant_id = @tenantId
       AND message_id IS NULL 
       AND is_deleted = 0
       AND created_at > DATEADD(HOUR, -24, GETUTCDATE())
     ORDER BY created_at DESC`,
      { userId, tenantId },
    );

    return {
      success: true,
      data: attachments,
      total: attachments.length,
    };
  }

  @Post('messages/send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.sendMessage(dto, userId, tenantId);
  }

  @Get('messages')
  async getMessages(
    @Query('channelId', ParseIntPipe) channelId: number,
    @Query('limit') limit: number = 50,
    @CurrentUser('id') userId: number,
    @Query('beforeId') beforeId?: string,
  ) {
    return this.chatService.getMessages(
      channelId,
      userId,
      +limit,
      beforeId ? +beforeId : undefined,
    );
  }

  @Put('messages/:id')
  async editMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.editMessage(id, dto.content, userId);
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteMessage(id, userId);
  }



  @Post('messages/pin')
  @HttpCode(HttpStatus.OK)
  async pinMessage(
    @Body() dto: PinMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.pinMessage(dto.messageId, dto.isPinned, userId);
  }

  @Get('messages/pinned')
  async getPinnedMessages(
    @Query('channelId', ParseIntPipe) channelId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getPinnedMessages(channelId, userId);
  }

  @Post('messages/forward')
  @HttpCode(HttpStatus.OK)
  async forwardMessage(
    @Body() dto: ForwardMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.forwardMessage(
      dto.messageId,
      dto.targetChannelIds,
      userId,
      tenantId,
    );
  }

  @Get('unread')
  async getUnreadCount(@CurrentUser('id') userId: number) {
    const count = await this.chatService.getUnreadCount(userId);
    return { unread: count };
  }

  // ==================== REACTIONS ====================

  @Post('messages/reaction')
  @HttpCode(HttpStatus.OK)
  async addReaction(
    @Body() dto: { messageId: number; emoji: string },
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.addReaction(
      dto.messageId,
      userId,
      tenantId,
      dto.emoji,
    );
  }

  @Post('messages/reaction/remove')
  @HttpCode(HttpStatus.OK)
  async removeReaction(
    @Body() dto: { messageId: number; emoji: string },
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.removeReaction(dto.messageId, userId, dto.emoji);
  }

  // ==================== THREADS ====================

  @Get('threads/:messageId')
  async getThreadMessages(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('limit') limit: number = 50,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getThreadMessages(messageId, userId, +limit);
  }

  @Post('threads/:messageId/reply')
  @HttpCode(HttpStatus.OK)
  async replyInThread(
    @Param('messageId', ParseIntPipe) parentMessageId: number,
    @Body() dto: { content: string },
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.replyInThread(
      parentMessageId,
      dto.content,
      userId,
      tenantId,
    );
  }

  // ==================== CHANNELS ====================

  @Post('channels/create')
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.createChannel(dto, userId, tenantId);
  }

  @Get('channels')
  async getUserChannels(
    @CurrentUser('id') userId: number,
    @Query('limit') limit: number = 50,
  ) {
    const channels = await this.chatService.getUserChannels(userId, +limit);
    return { channels };
  }

  @Get('channels/:id')
  async getChannelById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelById(id, userId);
  }

  @Put('channels/:id')
  async updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateChannel(id, dto, userId);
  }

  @Post('channels/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.archiveChannel(id, userId);
  }

  @Post('channels/:id/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchiveChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.unarchiveChannel(id, userId);
  }

  @Post('channels/:id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.leaveChannel(id, userId);
  }

  @Delete('channels/:id')
  async deleteChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteChannel(id, userId);
  }

  @Post('channels/:id/pin')
  @HttpCode(HttpStatus.OK)
  async pinChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { isPinned: boolean },
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.pinChannel(id, dto.isPinned, userId);
  }

  @Post('channels/:id/mute')
  @HttpCode(HttpStatus.OK)
  async muteChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MuteChannelDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.muteChannel(id, dto.isMuted, dto.muteUntil, userId);
  }

  // ==================== CHANNEL MEMBERS ====================

  @Get('channels/:id/members')
  async getChannelMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelMembers(id, userId);
  }

  // FIX: Add proper validation and transform
  @Post('channels/:id/members')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async addMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMemberDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    console.log('📥 Add Members Request:', {
      channelId: id,
      dto,
      userIds: dto.userIds,
      userIdsType: typeof dto.userIds,
      isArray: Array.isArray(dto.userIds),
    });

    // Additional validation
    if (
      !dto.userIds ||
      !Array.isArray(dto.userIds) ||
      dto.userIds.length === 0
    ) {
      throw new BadRequestException(
        'userIds must be a non-empty array of numbers',
      );
    }

    return this.chatService.addMembers(id, dto.userIds, userId, tenantId);
  }

  @Delete('channels/:id/members/:userId')
  async removeMember(
    @Param('id', ParseIntPipe) channelId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.removeMember(channelId, targetUserId, userId);
  }

  @Put('channels/:id/members/:userId/role')
  async updateMemberRole(
    @Param('id', ParseIntPipe) channelId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateMemberRole(
      channelId,
      targetUserId,
      dto.role,
      userId,
    );
  }
  // ==================== SEARCH ====================

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('type') type: 'messages' | 'channels' | 'members' | 'all' = 'all',
    @Query('limit') limit: number = 20,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Query('channelId') channelId?: string,
  ) {
    return this.chatService.search(query, userId, tenantId, {
      channelId: channelId ? +channelId : undefined,
      type,
      limit: +limit,
    });
  }

  // ==================== TEAM COLLABORATION ====================

  @Get('team/members')
  async getTeamMembers(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Query('search') search?: string,
  ) {
    return this.chatService.getTeamMembers(tenantId, userId, search);
  }

  @Get('team/available-members')
  async getAvailableMembersForChannel(
    @Query('channelId', ParseIntPipe) channelId: number,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.getAvailableMembersForChannel(
      channelId,
      tenantId,
      userId,
    );
  }

  @Post('team/start-chat')
  @HttpCode(HttpStatus.OK)
  async startTeamChat(
    @Body() dto: { memberIds: number[]; name?: string },
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.createTeamCollaboration(dto, userId, tenantId);
  }

  // ==================== PRESENCE ====================

  @Post('presence/online')
  @HttpCode(HttpStatus.OK)
  async setOnline(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.setUserOnline(userId, tenantId);
  }

  @Post('presence/offline')
  @HttpCode(HttpStatus.OK)
  async setOffline(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.setUserOffline(userId, tenantId);
  }

  @Get('presence/online-users')
  async getOnlineUsers(@TenantId() tenantId: number) {
    return this.chatService.getOnlineUsers(tenantId);
  }

  // ==================== FILES ====================

  @Get('channels/:id/files')
  async getChannelFiles(
    @Param('id', ParseIntPipe) channelId: number,
    @Query('limit') limit: number = 50,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelFiles(channelId, userId, +limit);
  }



  @Get('mentions')
  async getUserMentions(
    @Query('limit') limit: number = 50,
    @CurrentUser('id') userId: number,
  ) {
    const mentions = await this.chatService.getUserMentions(userId, +limit);
    return {
      success: true,
      data: mentions,
      total: mentions.length,
    };
  }

  @Get('messages/:messageId/attachments')
  async getMessageAttachments(
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('id') userId: number,
  ) {
    const attachments = await this.chatService['sqlService'].execute(
      'sp_GetMessageAttachments_Fast',
      { messageId },
    );

    return {
      success: true,
      data: attachments,
      total: attachments.length,
    };
  }

  /**
   * ✅ Get message reactions
   */
  @Get('messages/:messageId/reactions')
  async getMessageReactions(
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    const reactions = await this.chatService['sqlService'].execute(
      'sp_GetMessageReactions_Fast',
      { messageId },
    );

    return {
      success: true,
      data: reactions,
      total: reactions.length,
    };
  }

  // ==================== NEW: ENHANCED MESSAGE ENDPOINTS ====================

  /**
   * ✅ Get thread with enhanced details
   */
  @Get('threads/:messageId/enhanced')
  async getEnhancedThread(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('limit') limit: number = 50,
    @CurrentUser('id') userId: number,
  ) {
    const messages = await this.chatService.getThreadMessages(
      messageId,
      userId,
      +limit,
    );

    // Get parent message
    const parent = await this.chatService.getMessage(messageId);

    return {
      success: true,
      data: {
        parent,
        replies: messages,
        totalReplies: messages.length,
      },
    };
  }


  //
  @Get('mentions/unread-count')
  async getUnreadMentionsCount(@CurrentUser('id') userId: number) {
    const userIdStr = userId.toString();

    // ✅ FIXED: Query messages.mentioned_user_ids instead of deleted message_mentions table
    const count = await this.chatService['sqlService'].query(
      `SELECT COUNT(*) as count
     FROM messages m
     INNER JOIN chat_participants cp ON m.channel_id = cp.channel_id AND cp.user_id = @userId
     WHERE m.mentioned_user_ids LIKE '%' + @userIdStr + '%'
       AND m.is_deleted = 0
       AND cp.is_active = 1
       AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)`,
      { userId, userIdStr },
    );

    return {
      success: true,
      count: count[0]?.count || 0,
    };
  }

  /**
   * ✅ UPDATED: Get message details (fixed for removed message_mentions table)
   */
  @Get('messages/:messageId/details')
  async getMessageDetails(
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('id') userId: number,
  ) {
    const message = await this.chatService.getMessage(messageId);

    const reactions = await this.chatService['sqlService'].execute(
      'sp_GetMessageReactions_Fast',
      { messageId },
    );

    const attachments = await this.chatService['sqlService'].execute(
      'sp_GetMessageAttachments_Fast',
      { messageId },
    );

    // ✅ FIXED: Parse mentioned_user_ids from message instead of querying deleted table
    let mentions = [];
    if (message.mentioned_user_ids) {
      const mentionedIds = message.mentioned_user_ids
        .split(',')
        .map((id: string) => parseInt(id.trim()));

      if (mentionedIds.length > 0) {
        mentions = await this.chatService['sqlService'].query(
          `SELECT id as user_id, first_name, last_name, avatar_url
         FROM users
         WHERE id IN (${mentionedIds.join(',')})`,
          {},
        );
      }
    }

    return {
      success: true,
      data: {
        ...message,
        reactions,
        attachments,
        mentions,
      },
    };
  }
  @Post('channels/:id/mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markChannelAsRead(
    @Param('id', ParseIntPipe) channelId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.markChannelAsRead(channelId, userId);
  }

}
