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
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
    @Body() dto: GetChannelsDto,
  ) {
    return this.chatService.getUserChannels(userId, organizationId, dto);
  }

  @Post('channels/get-by-id')
  async getChannelById(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.getChannelById(BigInt(id), userId);
  }

  @Post('channels/create')
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
  ) {
    return this.chatService.createChannel(dto, userId, organizationId);
  }

  @Post('channels/update')
  async updateChannel(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.updateChannel(BigInt(dto.channelId), dto, userId);
  }

  @Post('channels/archive')
  async archiveChannel(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: ArchiveChannelDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.archiveChannel(BigInt(dto.channelId), dto.isArchived, userId);
  }

  @Post('channels/delete')
  async deleteChannel(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.deleteChannel(BigInt(id), userId);
  }

  // ==================== CHANNEL MEMBERS ====================

  @Post('channels/members/list')
  async getChannelMembers(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.getChannelMembers(BigInt(id), userId);
  }

  @Post('channels/members/add')
  async addChannelMembers(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: AddChannelMembersDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.addChannelMembers(BigInt(dto.channelId), dto, userId);
  }

  @Post('channels/members/remove')
  async removeChannelMember(
    @Body('channelId', ParseIntPipe) channelId: number,
    @Body('userId', ParseIntPipe) memberId: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.removeChannelMember(
      BigInt(channelId),
      BigInt(memberId),
      userId,
    );
  }

  @Post('channels/members/update-role')
  async updateMemberRole(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.updateMemberRole(BigInt(dto.channelId), dto, userId);
  }

  @Post('channels/notifications/update')
  async updateMemberNotification(
    // @Body('channelId', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberNotificationDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.updateMemberNotification(BigInt(dto.channelId), dto, userId);
  }

  @Post('channels/leave')
  async leaveChannel(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.removeChannelMember(BigInt(id), userId, userId);
  }

  // ==================== MESSAGES ====================

  @Post('messages/list')
  async getMessages(
    // @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
    @Body() dto: GetMessagesDto,
  ) {
    return this.chatService.getMessages(BigInt(dto.channelId), userId, dto);
  }

  @Post('messages/send')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
  ) {
    return this.chatService.sendMessage(dto, userId, organizationId);
  }

  @Post('messages/edit')
  async editMessage(
    // @Body('messageId', ParseIntPipe) id: number,
    @Body() dto: EditMessageDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.editMessage(BigInt(dto.messageId), dto, userId);
  }

  @Post('messages/delete')
  async deleteMessage(
    @Body('messageId', ParseIntPipe) id: number,
    @Body('hardDelete') hardDelete: boolean,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.deleteMessage(BigInt(id), userId, hardDelete);
  }

  @Post('messages/reactions/add')
  async reactToMessage(
    // @Body('messageId', ParseIntPipe) id: number,
    @Body() dto: ReactToMessageDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
  ) {
    return this.chatService.reactToMessage(
      BigInt(dto.messageId),
      dto.emoji,
      userId,
      organizationId,
    );
  }

  @Post('messages/reactions/list')
  async getMessageReactions(
    @Body('messageId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.getMessageReactions(BigInt(id), userId);
  }

  @Post('messages/pin')
  async pinMessage(
    // @Body('messageId', ParseIntPipe) id: number,
    @Body() dto: PinMessageDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.pinMessage(BigInt(dto.messageId), dto.isPinned, userId);
  }

  @Post('channels/pinned-messages')
  async getPinnedMessages(
    @Body('channelId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.getPinnedMessages(BigInt(id), userId);
  }

  // ==================== THREADS ====================

  @Post('threads/messages')
  async getThreadMessages(
    @Body('threadId', ParseIntPipe) id: number,
    @CurrentUser('id') userId: bigint,
    @Body() dto: GetThreadMessagesDto,
  ) {
    return this.chatService.getThreadMessages(
      BigInt(id),
      userId,
      dto.limit,
      dto.offset,
    );
  }

  // ==================== SEARCH ====================

  @Post('search')
  async searchMessages(
    @Body() dto: SearchMessagesDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
  ) {
    return this.chatService.searchMessages(userId, organizationId, dto);
  }

  // ==================== DIRECT MESSAGES ====================

  @Post('direct/send')
  async createDirectMessage(
    @Body() dto: CreateDirectMessageDto,
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
  ) {
    return this.chatService.createDirectMessage(dto, userId, organizationId);
  }

  // ==================== READ RECEIPTS ====================

  @Post('mark-read')
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.markAsRead(dto, userId);
  }

  @Post('unread/count')
  async getUnreadCount(
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
  ) {
    return this.chatService.getUnreadCount(userId, organizationId);
  }

  // ==================== FILES ====================

  @Post('channels/files/list')
  async getChannelFiles(
    @Body('channelId', ParseIntPipe) id: number,
    @Body('limit') limit: number,
    @Body('offset') offset: number,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.chatService.getChannelFiles(
      BigInt(id),
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
    @CurrentUser('id') userId: bigint,
    @CurrentUser('organizationId') organizationId: bigint,
  ) {
    // Implement file upload logic here
    // This is a placeholder - integrate with your file service
    return {
      message: 'File upload endpoint - implement with your file service',
    //   file: file.originalname,
    };
  }
}