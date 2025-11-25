// src/modules/message-system/chat.controller.ts - COMPLETE SLACK-LIKE FUNCTIONALITY
import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards, HttpCode, HttpStatus, ParseIntPipe, BadRequestException, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, TenantId, Unencrypted } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards';
import { ChatService } from './chat.service';
import {
  SendMessageDto, CreateChannelDto, MarkAsReadDto, UpdateChannelDto,
  AddMemberDto, UpdateMemberRoleDto, EditMessageDto, SearchDto,
  PinMessageDto, ForwardMessageDto, MuteChannelDto
} from './dto/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
@Unencrypted()
export class ChatController {
  constructor(private chatService: ChatService) { }

  // ==================== MESSAGES ====================

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
    return this.chatService.getMessages(channelId, userId, +limit, beforeId ? +beforeId : undefined);
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
  async markAsRead(@Body() dto: MarkAsReadDto, @CurrentUser('id') userId: number) {
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
    return this.chatService.forwardMessage(dto.messageId, dto.targetChannelIds, userId, tenantId);
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
    return this.chatService.addReaction(dto.messageId, userId, tenantId, dto.emoji);
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
    return this.chatService.replyInThread(parentMessageId, dto.content, userId, tenantId);
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
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }))
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
      isArray: Array.isArray(dto.userIds)
    });

    // Additional validation
    if (!dto.userIds || !Array.isArray(dto.userIds) || dto.userIds.length === 0) {
      throw new BadRequestException('userIds must be a non-empty array of numbers');
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
    return this.chatService.updateMemberRole(channelId, targetUserId, dto.role, userId);
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
    return this.chatService.getAvailableMembersForChannel(channelId, tenantId, userId);
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
  async setOnline(@CurrentUser('id') userId: number, @TenantId() tenantId: number) {
    return this.chatService.setUserOnline(userId, tenantId);
  }

  @Post('presence/offline')
  @HttpCode(HttpStatus.OK)
  async setOffline(@CurrentUser('id') userId: number, @TenantId() tenantId: number) {
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
      dto.status
    );
    return { success: true };
  }

  @Get('messages/:id/read-status')
  async getReadStatus(
    @Param('id', ParseIntPipe) messageId: number,
  ) {
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

  /**
   * ✅ Get unread mentions count
   */
  @Get('mentions/unread-count')
  async getUnreadMentionsCount(
    @CurrentUser('id') userId: number,
  ) {
    // Query messages where user is mentioned and hasn't been read
    const count = await this.chatService['sqlService'].query(
      `SELECT COUNT(*) as count
       FROM message_mentions mm
       INNER JOIN messages m ON mm.message_id = m.id
       INNER JOIN chat_participants cp ON m.channel_id = cp.channel_id AND cp.user_id = mm.user_id
       WHERE mm.user_id = @userId
       AND m.is_deleted = 0
       AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)`,
      { userId }
    );

    return {
      success: true,
      count: count[0]?.count || 0,
    };
  }
  @Get('messages/:messageId/attachments')
  async getMessageAttachments(
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('id') userId: number,
  ) {
    const attachments = await this.chatService['sqlService'].execute(
      'sp_GetMessageAttachments_Fast',
      { messageId }
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
      { messageId }
    );

    return {
      success: true,
      data: reactions,
      total: reactions.length,
    };
  }

  // ==================== NEW: ENHANCED MESSAGE ENDPOINTS ====================

  /**
   * ✅ Get message with full details (reactions, attachments, mentions)
   */
  @Get('messages/:messageId/details')
  async getMessageDetails(
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('id') userId: number,
  ) {
    // Get message
    const message = await this.chatService.getMessage(messageId);

    // Get reactions
    const reactions = await this.chatService['sqlService'].execute(
      'sp_GetMessageReactions_Fast',
      { messageId }
    );

    // Get attachments
    const attachments = await this.chatService['sqlService'].execute(
      'sp_GetMessageAttachments_Fast',
      { messageId }
    );

    // Get mentions
    const mentions = await this.chatService['sqlService'].query(
      `SELECT mm.user_id, u.first_name, u.last_name, u.avatar_url
       FROM message_mentions mm
       INNER JOIN users u ON mm.user_id = u.id
       WHERE mm.message_id = @messageId`,
      { messageId }
    );

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