// ============================================
// src/modules/message-system/chat-ultra-fast.controller.ts
// STREAMLINED: Only essential endpoints for speed
// ============================================
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { UltraFastChatService } from './chat-ultra-fast.service';
import { CurrentUser, TenantId } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { ChatService } from '../chat.service';
import { SendMessageDto, CreateChannelDto } from '../dto/chat.dto';

@Controller('chat/v2') // v2 for ultra-fast endpoints
@UseGuards(JwtAuthGuard)
export class UltraFastChatController {
  constructor(
    private ultraFastService: UltraFastChatService,
    private chatService: ChatService, // Fallback for complex operations
  ) {}

  // ==================== CRITICAL FAST ENDPOINTS ====================

  /**
   * ✅ SEND MESSAGE - Ultra-fast path (target: <80ms)
   * Used by WebSocket primarily, but also available via REST
   */
  @Post('messages/send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.ultraFastService.sendMessageUltraFast(dto, userId, tenantId);
  }

  /**
   * ✅ GET MESSAGES - Optimized fetch (target: <50ms)
   */
  @Get('messages')
  async getMessages(
    @Query('channelId', ParseIntPipe) channelId: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @CurrentUser('id') userId: number,
    @Query('beforeId', ParseIntPipe) beforeId?: number,
  ) {
    return this.ultraFastService.getMessagesUltraFast(
      channelId,
      userId,
      limit,
      beforeId,
    );
  }

  /**
   * ✅ BATCH SEND - For multiple messages (target: <200ms for 5 messages)
   */
  @Post('messages/batch')
  @HttpCode(HttpStatus.OK)
  async sendMessageBatch(
    @Body('messages') messages: SendMessageDto[],
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.ultraFastService.sendMessageBatch(messages, userId, tenantId);
  }

  // ==================== CHANNEL MANAGEMENT (Standard Speed) ====================
  // These don't need ultra-optimization as they're not real-time critical

  @Post('channels/create')
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    // Use standard service for channel creation (happens rarely)
    return this.chatService.createChannel(dto, userId, tenantId);
  }

  @Get('channels')
  async getUserChannels(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    return this.chatService.getUserChannels(userId, tenantId, { limit });
  }

  @Get('channels/:id')
  async getChannelById(
    @Query('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelById(id, userId);
  }

  // ==================== READ RECEIPTS (Async/Background) ====================

  /**
   * ✅ MARK AS READ - Fire and forget (don't block client)
   */
  @Post('messages/mark-read')
  @HttpCode(HttpStatus.ACCEPTED) // 202 - Accepted for processing
  async markAsRead(
    @Body('channelId', ParseIntPipe) channelId: number,
    @Body('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('id') userId: number,
  ) {
    // Process async - don't wait for completion
    this.chatService.markAsRead({ channelId, messageId }, userId).catch(err => {
      console.warn('Mark as read failed (non-critical):', err.message);
    });

    return { accepted: true };
  }

  /**
   * ✅ GET UNREAD COUNT - Cached (target: <20ms)
   */
  @Get('unread')
  async getUnreadCount(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.getUnreadCount(userId, tenantId);
  }

  // ==================== HEALTH & MONITORING ====================

  @Get('health')
  async getHealth() {
    return {
      status: 'ok',
      service: 'ultra-fast-chat',
      timestamp: new Date().toISOString(),
    };
  }
}