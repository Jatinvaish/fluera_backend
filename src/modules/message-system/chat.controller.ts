// ============================================
// modules/chat/chat.controller.ts - FIXED & OPTIMIZED
// ============================================
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Query,
  Delete,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { CurrentUser } from 'src/core/decorators';
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
  RemoveChannelMemberDto,
  ArchiveChannelDto,
  GetThreadMessagesDto,
} from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ==================== CHANNELS ====================

  @Post('channels/list')
  @HttpCode(HttpStatus.OK)
  async getUserChannels(
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
    @Body() dto: GetChannelsDto,
  ) {
    return this.chatService.getUserChannels(
      userId,
      organizationId ?? 30008,
      dto
    );
  }

  @Post('channels/get-by-id')
  @HttpCode(HttpStatus.OK)
  async getChannelById(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelById(Number(id), userId);
  }

  @Post('channels/create')
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.createChannel(
      dto,
      userId,
      organizationId ?? 30008
    );
  }

  @Post('channels/update')
  @HttpCode(HttpStatus.OK)
  async updateChannel(
    @Body() dto: UpdateChannelDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateChannel(
      Number(dto.channelId),
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
      Number(dto.channelId),
      dto.isArchived,
      userId
    );
  }

  @Delete('channels/:channelId')
  @HttpCode(HttpStatus.OK)
  async deleteChannel(
    @Param('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteChannel(Number(id), userId);
  }

  // FIX: Add POST alternative for delete (compatibility)
  @Post('channels/delete')
  @HttpCode(HttpStatus.OK)
  async deleteChannelPost(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteChannel(Number(id), userId);
  }

  // ==================== CHANNEL MEMBERS ====================

  @Post('channels/members/list')
  @HttpCode(HttpStatus.OK)
  async getChannelMembers(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelMembers(Number(id), userId);
  }

  @Post('channels/members/add')
  async addChannelMembers(
    @Body() dto: AddChannelMembersDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.addChannelMembers(
      Number(dto.channelId),
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
      Number(channelId),
      Number(memberId),
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
      Number(dto.channelId),
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
      Number(dto.channelId),
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
      Number(id),
      userId,
      userId
    );
  }

  // ==================== MESSAGES ====================

  @Post('messages/list')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @CurrentUser('id') userId: number,
    @Body() dto: GetMessagesDto,
  ) {
    return this.chatService.getMessages(
      Number(dto.channelId),
      userId,
      dto
    );
  }

  @Post('messages/send')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.sendMessage(
      dto,
      userId,
      organizationId ?? 30008
    );
  }

  @Post('messages/edit')
  @HttpCode(HttpStatus.OK)
  async editMessage(
    @Body() dto: EditMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.editMessage(
      Number(dto.messageId),
      dto,
      userId
    );
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Param('messageId', ParseIntPipe) id: number,
    @Query('hardDelete') hardDelete: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteMessage(
      Number(id),
      userId,
      hardDelete === 'true'
    );
  }

  // FIX: Add POST alternative for delete
  @Post('messages/delete')
  @HttpCode(HttpStatus.OK)
  async deleteMessagePost(
    @Body('messageId', ParseIntPipe) id: number,
    @Body('hardDelete') hardDelete: boolean,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteMessage(
      Number(id),
      userId,
      hardDelete
    );
  }

  // NEW: Bulk delete messages
  @Post('messages/bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDeleteMessages(
    @Body('messageIds') messageIds: number[],
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.bulkDeleteMessages(messageIds, userId);
  }

  @Post('messages/reactions/add')
  async reactToMessage(
    @Body() dto: ReactToMessageDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.reactToMessage(
      Number(dto.messageId),
      dto.emoji,
      userId,
      organizationId ?? 30008
    );
  }

  @Post('messages/reactions/list')
  @HttpCode(HttpStatus.OK)
  async getMessageReactions(
    @Body('messageId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getMessageReactions(Number(id), userId);
  }

  @Post('messages/pin')
  @HttpCode(HttpStatus.OK)
  async pinMessage(
    @Body() dto: PinMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.pinMessage(
      Number(dto.messageId),
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
    return this.chatService.getPinnedMessages(Number(id), userId);
  }

  // ==================== THREADS ====================

  @Post('threads/messages')
  @HttpCode(HttpStatus.OK)
  async getThreadMessages(
    @Body('threadId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: GetThreadMessagesDto,
  ) {
    return this.chatService.getThreadMessages(
      Number(id),
      userId,
      dto.limit,
      dto.offset
    );
  }

  // NEW: Reply to thread
  @Post('threads/reply')
  async replyToThread(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.sendMessage(
      dto,
      userId,
      organizationId ?? 30008
    );
  }

  // ==================== SEARCH ====================

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchMessages(
    @Body() dto: SearchMessagesDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.searchMessages(
      userId,
      organizationId ?? 30008,
      dto
    );
  }

  // ==================== DIRECT MESSAGES ====================

  @Post('direct/send')
  async createDirectMessage(
    @Body() dto: CreateDirectMessageDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.createDirectMessage(
      dto,
      userId,
      organizationId ?? 30008
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

  @Get('unread/count')
  async getUnreadCount(
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.getUnreadCount(
      userId,
      organizationId ?? 30008
    );
  }

  // FIX: Add POST alternative
  @Post('unread/count')
  @HttpCode(HttpStatus.OK)
  async getUnreadCountPost(
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.getUnreadCount(
      userId,
      organizationId ?? 30008
    );
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
      Number(id),
      userId,
      limit || 50,
      offset || 0
    );
  }

  @Post('channels/files/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Body('channelId', ParseIntPipe) id: number,
    // @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption: string,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    // TODO: Implement file upload logic with your file service
    return {
      message: 'File upload endpoint - implement with your file service',
      // file: file?.originalname,
      channelId: id,
      userId,
    };
  }

  // ==================== NEW: USER PRESENCE ====================

  @Post('presence/update')
  @HttpCode(HttpStatus.OK)
  async updatePresence(
    @Body('status') status: 'online' | 'away' | 'offline',
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateUserPresence(userId, status);
  }

  @Get('presence/online')
  async getOnlineUsers(
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.getOnlineUsers(organizationId ?? 30008);
  }

  // ==================== NEW: CHANNEL SETTINGS ====================

  @Get('channels/:channelId/settings')
  async getChannelSettings(
    @Param('channelId', ParseIntPipe) channelId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelSettings(channelId, userId);
  }

  @Put('channels/:channelId/settings')
  @HttpCode(HttpStatus.OK)
  async updateChannelSettings(
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body('settings') settings: any,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateChannelSettings(
      channelId,
      settings,
      userId
    );
  }

  // FIX: Add POST alternative
  @Post('channels/settings/get')
  @HttpCode(HttpStatus.OK)
  async getChannelSettingsPost(
    @Body('channelId', ParseIntPipe) channelId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelSettings(channelId, userId);
  }

  @Post('channels/settings/update')
  @HttpCode(HttpStatus.OK)
  async updateChannelSettingsPost(
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