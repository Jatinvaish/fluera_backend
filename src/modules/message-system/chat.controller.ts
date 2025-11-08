// ============================================
// modules/chat/chat.controller.ts
// ============================================
import {
  Controller,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UploadedFile,
  UseInterceptors,
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
  async getUserChannels(
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
    @Body() dto: GetChannelsDto,
  ) {
    return this.chatService.getUserChannels(userId, organizationId ?? 30008, dto);
  }

  @Post('channels/get-by-id')
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
    console.log('CreateChannelDto:', dto);
    console.log(userId,organizationId);
    
    return this.chatService.createChannel(dto, userId, organizationId ?? 30008);
  }

  @Post('channels/update')
  async updateChannel(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateChannel(Number(dto.channelId), dto, userId);
  }

  @Post('channels/archive')
  async archiveChannel(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: ArchiveChannelDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.archiveChannel(Number(dto.channelId), dto.isArchived, userId);
  }

  @Post('channels/delete')
  async deleteChannel(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteChannel(Number(id), userId);
  }

  // ==================== CHANNEL MEMBERS ====================

  @Post('channels/members/list')
  async getChannelMembers(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelMembers(Number(id), userId);
  }

  @Post('channels/members/add')
  async addChannelMembers(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: AddChannelMembersDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.addChannelMembers(Number(dto.channelId), dto, userId);
  }

  @Post('channels/members/remove')
  async removeChannelMember(
    @Body('channelId', ParseIntPipe) channelId: number,
    @Body('userId', ParseIntPipe) memberId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.removeChannelMember(
      Number(channelId),
      Number(memberId),
      userId,
    );
  }

  @Post('channels/members/update-role')
  async updateMemberRole(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateMemberRole(Number(dto.channelId), dto, userId);
  }

  @Post('channels/notifications/update')
  async updateMemberNotification(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberNotificationDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.updateMemberNotification(Number(dto.channelId), dto, userId);
  }

  @Post('channels/leave')
  async leaveChannel(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.removeChannelMember(Number(id), userId, userId);
  }

  // ==================== MESSAGES ====================

  @Post('messages/list')
  async getMessages(
    // @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: GetMessagesDto,
  ) {
    return this.chatService.getMessages(Number(dto.channelId), userId, dto);
  }

  @Post('messages/send')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.sendMessage(dto, userId, organizationId ?? 30008);
  }

  @Post('messages/edit')
  async editMessage(
    // @Body('messageId', ParseIntPipe) id: number,
    @Body() dto: EditMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.editMessage(Number(dto.messageId), dto, userId);
  }

  @Post('messages/delete')
  async deleteMessage(
    @Body('messageId', ParseIntPipe) id: number,
    @Body('hardDelete') hardDelete: boolean,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteMessage(Number(id), userId, hardDelete);
  }

  @Post('messages/reactions/add')
  async reactToMessage(
    // @Body('messageId', ParseIntPipe) id: number,
    @Body() dto: ReactToMessageDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.reactToMessage(
      Number(dto.messageId),
      dto.emoji,
      userId,
      organizationId ?? 30008,
    );
  }

  @Post('messages/reactions/list')
  async getMessageReactions(
    @Body('messageId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getMessageReactions(Number(id), userId);
  }

  @Post('messages/pin')
  async pinMessage(
    // @Body('messageId', ParseIntPipe) id: number,
    @Body() dto: PinMessageDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.pinMessage(Number(dto.messageId), dto.isPinned, userId);
  }

  @Post('channels/pinned-messages')
  async getPinnedMessages(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getPinnedMessages(Number(id), userId);
  }

  // ==================== THREADS ====================

  @Post('threads/messages')
  async getThreadMessages(
    @Body('threadId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: GetThreadMessagesDto,
  ) {
    return this.chatService.getThreadMessages(
      Number(id),
      userId,
      dto.limit,
      dto.offset,
    );
  }

  // ==================== SEARCH ====================

  @Post('search')
  async searchMessages(
    @Body() dto: SearchMessagesDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.searchMessages(userId, organizationId ?? 30008, dto);
  }

  // ==================== DIRECT MESSAGES ====================

  @Post('direct/send')
  async createDirectMessage(
    @Body() dto: CreateDirectMessageDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.createDirectMessage(dto, userId, organizationId ?? 30008);
  }

  // ==================== READ RECEIPTS ====================

  @Post('mark-read')
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.markAsRead(dto, userId);
  }

  @Post('unread/count')
  async getUnreadCount(
    @CurrentUser('id') userId: number,
    @CurrentUser('organizationId') organizationId: number,
  ) {
    return this.chatService.getUnreadCount(userId, organizationId ?? 30008);
  }

  // ==================== FILES ====================

  @Post('channels/files/list')
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
      offset || 0,
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
    // Implement file upload logic here
    // This is a placeholder - integrate with your file service
    return {
      message: 'File upload endpoint - implement with your file service',
    //   file: file.originalname,
    };
  }
}