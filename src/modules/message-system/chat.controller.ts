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
  SearchDto,
  PinMessageDto,
  ForwardMessageDto,
  MuteChannelDto,
} from './dto/chat.dto';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('chat')
@UseGuards(JwtAuthGuard)
@Unencrypted()
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ==================== MESSAGES ====================

  /**
   * ✅ Upload single file for chat message
   */
  @Post('messages/upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload file for chat message' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMessageFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('messageId') messageId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

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
   */
  @Post('messages/upload-multiple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload multiple files for chat message' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleMessageFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('messageId') messageId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

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
   * ✅ Get file download URL
   */
  @Get('messages/files/:attachmentId/download')
  @ApiOperation({ summary: 'Get download URL for attachment' })
  async getFileDownloadUrl(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser('id') userId: number,
  ) {
    // Get attachment details from database
    const attachment = await this.chatService['sqlService'].query(
      `SELECT ma.*, m.channel_id
       FROM message_attachments ma
       INNER JOIN messages m ON ma.message_id = m.id
       WHERE ma.id = @attachmentId AND ma.is_deleted = 0`,
      { attachmentId },
    );

    if (!attachment.length) {
      throw new BadRequestException('Attachment not found');
    }

    // Verify user has access to the channel
    await this.chatService['validateMembership'](
      attachment[0].channel_id,
      userId,
    );

    // Extract key from file_url
    const fileUrl = attachment[0].file_url;
    const key = fileUrl.split('.com/')[1]; // Extract path after domain

    if (!key) {
      return {
        success: true,
        data: {
          url: fileUrl,
          directAccess: true,
        },
      };
    }

    // Generate signed URL (valid for 1 hour)
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
   * ✅ Delete attachment
   */
  @Delete('messages/files/:attachmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete message attachment' })
  async deleteAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser('id') userId: number,
  ) {
    // Get attachment details
    const attachment = await this.chatService['sqlService'].query(
      `SELECT ma.*, m.channel_id, m.sender_user_id
       FROM message_attachments ma
       INNER JOIN messages m ON ma.message_id = m.id
       WHERE ma.id = @attachmentId AND ma.is_deleted = 0`,
      { attachmentId },
    );

    if (!attachment.length) {
      throw new BadRequestException('Attachment not found');
    }

    // Only message sender or channel admin can delete
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

    // Soft delete in database
    await this.chatService['sqlService'].query(
      `UPDATE message_attachments 
       SET is_deleted = 1, deleted_at = GETUTCDATE(), deleted_by = @userId
       WHERE id = @attachmentId`,
      { attachmentId, userId },
    );

    // Optionally delete from R2 (uncomment if you want hard delete)
    // const fileUrl = attachment[0].file_url;
    // const key = fileUrl.split('.com/')[1];
    // if (key) {
    //   await this.chatService['r2Service'].deleteFile(key);
    // }

    return {
      success: true,
      message: 'Attachment deleted successfully',
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
    console.log('🚀 ~ ChatController ~ getMessages ~ userId:', userId);
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

  @Post('messages/mark-read')
  @HttpCode(HttpStatus.ACCEPTED)
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.markAsRead(dto.channelId, dto.messageId, userId);
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

  @Post('messages/:id/delivery-status')
  @HttpCode(HttpStatus.OK)
  async updateDeliveryStatus(
    @Param('id', ParseIntPipe) messageId: number,
    @Body() dto: { status: 'delivered' | 'read' },
    @CurrentUser('id') userId: number,
  ) {
    await this.chatService.updateMessageDeliveryStatus(
      messageId,
      userId,
      dto.status,
    );
    return { success: true };
  }

  @Get('messages/:id/read-status')
  async getReadStatus(@Param('id', ParseIntPipe) messageId: number) {
    return this.chatService.getMessageReadStatus(messageId);
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

  @Post('messages/bulk-mark-read')
  @HttpCode(HttpStatus.OK)
  async bulkMarkAsRead(
    @Body() dto: { channelId: number; upToMessageId: number },
    @CurrentUser('id') userId: number,
  ) {
    await this.chatService.bulkMarkAsRead(
      dto.channelId,
      userId,
      dto.upToMessageId,
    );

    return {
      success: true,
      message: 'Messages marked as read',
    };
  }

  /**
   * ✅ Get detailed read status for a message
   */
  @Get('messages/:messageId/read-status-detailed')
  async getDetailedReadStatus(
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    const status = await this.chatService.getMessageReadStatus(messageId);

    // ✅ Get user details for read/delivered users
    const userIds = [
      ...status.readByUserIds,
      ...status.deliveredToUserIds,
    ].filter((id, index, self) => self.indexOf(id) === index);

    let users = [];
    if (userIds.length > 0) {
      users = await this.chatService['sqlService'].query(
        `SELECT id, first_name, last_name, avatar_url
       FROM users
       WHERE id IN (${userIds.join(',')})`,
        {},
      );
    }

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    return {
      success: true,
      data: {
        readCount: status.readCount,
        deliveredCount: status.deliveredCount,
        readBy: status.readByUserIds
          .map((id) => userMap.get(id))
          .filter(Boolean),
        deliveredTo: status.deliveredToUserIds
          .map((id) => userMap.get(id))
          .filter(Boolean),
      },
    };
  }

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

  /**
   * ✅ Mark message as delivered (called automatically by frontend)
   */
  @Post('messages/:id/mark-delivered')
  @HttpCode(HttpStatus.OK)
  async markAsDelivered(
    @Param('id', ParseIntPipe) messageId: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.chatService.markAsDelivered(messageId, userId);

    return { success: true };
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
}
