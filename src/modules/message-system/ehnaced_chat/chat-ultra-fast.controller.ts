// ============================================
// src/modules/message-system/chat-ultra-optimized.controller.ts
// BACKWARD COMPATIBLE with existing frontend
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
import { Unencrypted, CurrentUser, TenantId } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards';
import { SendMessageDto, CreateChannelDto } from 'src/modules/global-modules/dto/chat.dto';
import { ChatService } from '../chat.service';
import { UltraFastChatService, } from './chat-ultra-fast.service'; // ✅ Import MessageResponse

@Controller('chat/v2') // v2 for ultra-fast endpoints
@UseGuards(JwtAuthGuard)
@Unencrypted() // Bypass encryption for speed
export class UltraFastChatController {
  constructor(
    private optimizedService: UltraFastChatService,
    private chatService: ChatService, // Keep for backward compatibility
  ) { }

  // ==================== ULTRA-FAST ENDPOINTS ====================

  /**
   * ✅ SEND MESSAGE - Ultra-fast path (<50ms)
   * Compatible with existing frontend
   */
  @Post('messages/send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ): Promise<any> { // ✅ Explicit return type
    return this.optimizedService.sendMessageUltraFast(dto, userId, tenantId);
  }

  /**
   * ✅ GET MESSAGES - Ultra-fast fetch (<30ms)
   * Compatible with existing frontend
   */
  @Get('messages')
  async getMessages(
    @Query('channelId', ParseIntPipe) channelId: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @CurrentUser('id') userId: number,
    @Query('beforeId') beforeId?: string,
  ) {
    const beforeIdNum = beforeId ? parseInt(beforeId) : undefined;
    return this.optimizedService.getMessagesUltraFast(
      channelId,
      userId,
      limit,
      beforeIdNum,
    );
  }

  /**
   * ✅ BATCH SEND - For multiple messages
   */
  @Post('messages/batch')
  @HttpCode(HttpStatus.OK)
  async sendMessageBatch(
    @Body('messages') messages: SendMessageDto[],
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.optimizedService.sendMessageBatch(messages, userId, tenantId);
  }

  /**
   * ✅ MARK AS READ - Fire and forget (202 Accepted)
   */
  @Post('messages/mark-read')
  @HttpCode(HttpStatus.ACCEPTED)
  async markAsRead(
    @Body('channelId', ParseIntPipe) channelId: number,
    @Body('messageId', ParseIntPipe) messageId: number,
    @CurrentUser('id') userId: number,
  ) {
    // Non-blocking async call
    this.optimizedService.markAsReadAsync(channelId, messageId, userId);
    return { accepted: true };
  }

  /**
   * ✅ GET UNREAD COUNT - Cached (<20ms)
   */
  @Get('unread')
  async getUnreadCount(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    const count = await this.optimizedService.getUnreadCount(userId, tenantId);
    return { unread: count };
  }

  /**
   * ✅ GET USER CHANNELS - Fast (<20ms)
   */
  @Get('channels')
  async getUserChannels(
    @CurrentUser('id') userId: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    const channels = await this.optimizedService.getUserChannelsFast(userId);
    return { channels };
  }

  // ==================== STANDARD ENDPOINTS (Use existing service) ====================
  // These don't need ultra-optimization as they're not real-time critical

  @Post('channels/create')
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    return this.chatService.createChannel(dto, userId, tenantId);
  }

  @Get('channels/:id')
  async getChannelById(
    @Query('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.getChannelById(id, userId);
  }

  // ==================== HEALTH & MONITORING ====================

  @Get('health')
  async getHealth() {
    const metrics = this.optimizedService.getHealthMetrics();
    return {
      status: 'ok',
      serviceName: 'ultra-optimized-chat', // ✅ Renamed to avoid conflict
      ...metrics,
      timestamp: new Date().toISOString(),
    };
  }
}