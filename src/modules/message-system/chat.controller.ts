// ============================================
// modules/chat/chat.controller.ts - PRODUCTION v3.0
// ============================================
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Put,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CurrentUser, TenantId, Unencrypted } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { EncryptionGuard, RequireEncryption } from 'src/core/guards/encryption.guard';
import { RateLimit, RateLimitGuard } from 'src/core/guards/rate-limit.guard';
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
  ReactToMessageDto,
  PinMessageDto,
  ArchiveChannelDto,
  GetThreadMessagesDto,
  BulkMarkAsReadDto,
  ForwardMessageDto,
  RotateChannelKeyDto,
} from './dto/chat.dto';

@Controller('chat')
@Unencrypted()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ==================== CHANNELS ====================

  @Post('channels/list')
  @HttpCode(HttpStatus.OK)
  async getUserChannels(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body() dto: GetChannelsDto,
  ) {
    return this.chatService.getUserChannels(
      userId,
      tenantId ,
      dto
    );
  }

  @Post('channels/get-by-id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EncryptionGuard)
  @RequireEncryption()
  async getChannelById(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelById(id, userId);
  }

  @Post('channels/create')
  @UseGuards(EncryptionGuard, RateLimitGuard)
  @RequireEncryption()
  @RateLimit(10, 60) // 10 channels per minute
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.createChannel(
      dto,
      userId,
      tenantId 
    );
  }

  @Post('channels/update')
  @HttpCode(HttpStatus.OK)
  async updateChannel(
    @Body() dto: UpdateChannelDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateChannel(
      dto.channelId,
      dto,
      userId
    );
  }

  @Post('channels/archive')
  @HttpCode(HttpStatus.OK)
  async archiveChannel(
    @Body() dto: ArchiveChannelDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.archiveChannel(
      dto.channelId,
      dto.isArchived,
      userId
    );
  }

  @Post('channels/delete')
  @HttpCode(HttpStatus.OK)
  async deleteChannel(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteChannel(id, userId);
  }

  // ✅ NEW: Channel key rotation
  @Post('channels/rotate-key')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EncryptionGuard)
  @RequireEncryption()
  async rotateChannelKey(
    @Body() dto: RotateChannelKeyDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.rotateChannelKey(dto.channelId, dto.reason, userId);
  }

  // ==================== CHANNEL MEMBERS ====================

  @Post('channels/members/list')
  @HttpCode(HttpStatus.OK)
  async getChannelMembers(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelMembers(id, userId);
  }

  @Post('channels/members/add')
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60) // 20 add operations per minute
  async addChannelMembers(
    @Body() dto: AddChannelMembersDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.addChannelMembers(
      dto.channelId,
      dto,
      userId
    );
  }

  @Post('channels/members/remove')
  @HttpCode(HttpStatus.OK)
  async removeChannelMember(
    @Body('channelId', ParseIntPipe) channelId: number,
    @Body('userId', ParseIntPipe) memberId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.removeChannelMember(
      channelId,
      memberId,
      userId
    );
  }

  @Post('channels/members/update-role')
  @HttpCode(HttpStatus.OK)
  async updateMemberRole(
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateMemberRole(
      dto.channelId,
      dto,
      userId
    );
  }

  @Post('channels/notifications/update')
  @HttpCode(HttpStatus.OK)
  async updateMemberNotification(
    @Body() dto: UpdateMemberNotificationDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateMemberNotification(
      dto.channelId,
      dto,
      userId
    );
  }

  @Post('channels/leave')
  @HttpCode(HttpStatus.OK)
  async leaveChannel(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.removeChannelMember(
      id,
      userId,
      userId
    );
  }

  // ==================== MESSAGES ====================

  @Post('messages/list')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EncryptionGuard)
  @RequireEncryption()
  async getMessages(
    @CurrentUser('id') userId: number,
    @Body() dto: GetMessagesDto,
  ) {
    return this.chatService.getMessages(
      dto.channelId,
      userId,
      dto
    );
  }

  @Post('messages/send')
  @UseGuards(EncryptionGuard, RateLimitGuard)
  @RequireEncryption()
  @RateLimit(60, 60) // 60 messages per minute
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.sendMessage(
      dto,
      userId,
      tenantId 
    );
  }

  @Post('messages/edit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EncryptionGuard)
  @RequireEncryption()
  async editMessage(
    @Body() dto: EditMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.editMessage(
      dto.messageId,
      dto,
      userId
    );
  }

  @Post('messages/delete')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Body('messageId', ParseIntPipe) id: number,
    @Body('hardDelete') hardDelete: boolean,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteMessage(
      id,
      userId,
      hardDelete
    );
  }

  @Post('messages/bulk-delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60) // 10 bulk operations per minute
  async bulkDeleteMessages(
    @Body('messageIds') messageIds: number[],
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.bulkDeleteMessages(messageIds, userId);
  }

  // ✅ NEW: Forward message
  @Post('messages/forward')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EncryptionGuard, RateLimitGuard)
  @RequireEncryption()
  @RateLimit(30, 60) // 30 forwards per minute
  async forwardMessage(
    @Body() dto: ForwardMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.forwardMessage(
      dto.messageId,
      dto.targetChannelIds,
      userId,
      tenantId 
    );
  }

  @Post('messages/reactions/add')
  @UseGuards(RateLimitGuard)
  @RateLimit(100, 60) // 100 reactions per minute
  async reactToMessage(
    @Body() dto: ReactToMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.reactToMessage(
      dto.messageId,
      dto.emoji,
      userId,
      tenantId 
    );
  }

  @Post('messages/reactions/list')
  @HttpCode(HttpStatus.OK)
  async getMessageReactions(
    @Body('messageId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getMessageReactions(id, userId);
  }

  @Post('messages/pin')
  @HttpCode(HttpStatus.OK)
  async pinMessage(
    @Body() dto: PinMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.pinMessage(
      dto.messageId,
      dto.isPinned,
      userId
    );
  }

  @Post('channels/pinned-messages')
  @HttpCode(HttpStatus.OK)
  async getPinnedMessages(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getPinnedMessages(id, userId);
  }

  // ==================== THREADS ====================

  @Post('threads/messages')
  @HttpCode(HttpStatus.OK)
  @UseGuards(EncryptionGuard)
  @RequireEncryption()
  async getThreadMessages(
    @Body('threadId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: GetThreadMessagesDto,
  ) {
    return this.chatService.getThreadMessages(
      id,
      userId,
      dto.limit,
      dto.offset
    );
  }

  @Post('threads/reply')
  @UseGuards(EncryptionGuard, RateLimitGuard)
  @RequireEncryption()
  @RateLimit(60, 60)
  async replyToThread(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.sendMessage(
      dto,
      userId,
      tenantId 
    );
  }

  // ==================== SEARCH ====================

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchMessages(
    @Body() dto: SearchMessagesDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.searchMessages(
      userId,
      tenantId ,
      dto
    );
  }

  // ==================== DIRECT MESSAGES ====================

  @Post('direct/send')
  @UseGuards(EncryptionGuard, RateLimitGuard)
  @RequireEncryption()
  @RateLimit(60, 60)
  async createDirectMessage(
    @Body() dto: CreateDirectMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.createDirectMessage(
      dto,
      userId,
      tenantId 
    );
  }

  // ==================== READ RECEIPTS ====================

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.markAsRead(dto, userId);
  }

  @Post('mark-read/bulk')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  async bulkMarkAsRead(
    @Body() dto: BulkMarkAsReadDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.bulkMarkAsRead(
      dto.channelId,
      dto.messageIds,
      userId
    );
  }

  @Post('unread/count')
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.getUnreadCount(
      userId,
      tenantId 
    );
  }

  // ✅ NEW: Get message delivery status
  @Post('messages/status')
  @HttpCode(HttpStatus.OK)
  async getMessageStatus(
    @Body('messageId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getMessageStatus(id, userId);
  }

  // ✅ NEW: Get bulk delivery status
  @Post('messages/status/bulk')
  @HttpCode(HttpStatus.OK)
  async getBulkMessageStatus(
    @Body('messageIds') messageIds: number[],
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getMessagesDeliveryStatus(messageIds, userId);
  }

  // ==================== FILES ====================

  @Post('channels/files/list')
  @HttpCode(HttpStatus.OK)
  async getChannelFiles(
    @Body('channelId', ParseIntPipe) id: number,
    @Body('limit') limit: number,
    @Body('offset') offset: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelFiles(
      id,
      userId,
      limit || 50,
      offset || 0
    );
  }

  // ==================== USER PRESENCE ====================

  @Post('presence/update')
  @HttpCode(HttpStatus.OK)
  async updatePresence(
    @Body('status') status: 'online' | 'away' | 'offline',
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateUserPresence(userId, status);
  }

  @Post('presence/online')
  @HttpCode(HttpStatus.OK)
  async getOnlineUsers(
    @TenantId() tenantId: number,
  ) {
    return this.chatService.getOnlineUsers(tenantId );
  }

  // ==================== CHANNEL SETTINGS ====================

  @Post('channels/settings/get')
  @HttpCode(HttpStatus.OK)
  async getChannelSettings(
    @Body('channelId', ParseIntPipe) channelId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelSettings(channelId, userId);
  }

  @Post('channels/settings/update')
  @HttpCode(HttpStatus.OK)
  async updateChannelSettings(
    @Body('channelId', ParseIntPipe) channelId: number,
    @Body('settings') settings: any,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateChannelSettings(
      channelId,
      settings,
      userId
    );
  }
}