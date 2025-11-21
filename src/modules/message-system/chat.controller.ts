// ============================================
// src/modules/message-system/chat.controller.ts
// MINIMAL ENDPOINTS - ULTRA FAST
// ============================================
import { Controller, Post, Get, Body, Query, UseGuards, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { CurrentUser, TenantId, Unencrypted } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards';
import { ChatService } from './chat.service';
import { SendMessageDto, CreateChannelDto, MarkAsReadDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
@Unencrypted()
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ==================== CORE ENDPOINTS ====================

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
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('beforeId') beforeId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getMessages(channelId, userId, limit, beforeId ? parseInt(beforeId) : undefined);
  }

  @Post('messages/mark-read')
  @HttpCode(HttpStatus.ACCEPTED)
  async markAsRead(@Body() dto: MarkAsReadDto, @CurrentUser('id') userId: number) {
    return this.chatService.markAsRead(dto.channelId, dto.messageId, userId);
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
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    const channels = await this.chatService.getUserChannels(userId, limit);
    return { channels };
  }

  @Get('channels/:id')
  async getChannelById(
    @Query('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelById(id, userId);
  }

  // ==================== TEAM COLLABORATION ====================

  @Get('team/members')
  async getTeamMembers(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.getTeamMembers(tenantId, userId);
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
}
