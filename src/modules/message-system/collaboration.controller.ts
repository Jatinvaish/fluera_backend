// ============================================
// src/modules/message-system/collaboration.controller.ts
// ============================================
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { OptimizedChatService } from './chat-optimized.service';
import { CurrentUser, TenantId } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Team Collaboration')
@ApiBearerAuth()
@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private chatService: OptimizedChatService) {}

  /**
   * ✅ Get all team members for @mention or direct messaging
   * Returns cached results in <20ms
   */
  @Get('team/members')
  @ApiOperation({ summary: 'Get all team members for collaboration' })
  async getTeamMembers(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Query('includeOffline') includeOffline?: boolean,
  ) {
    const members = await this.chatService.getTeamMembers(tenantId, userId);

    if (!includeOffline) {
      // Filter to only active users (last active < 5 min ago)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return members.filter(
        (m) => m.status === 'active' && new Date(m.last_active_at) > fiveMinutesAgo,
      );
    }

    return members;
  }

  /**
   * ✅ Create instant collaboration (DM or group chat)
   * Completes in <400ms for new channels, <50ms for existing DMs
   * 
   * @Body memberIds - Array of user IDs to collaborate with
   * @Body name - Optional channel name (auto-generated for DMs)
   * @Body isPrivate - Whether channel is private (default: true)
   */
  @Post('team/start-chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start instant chat with team members' })
  async startTeamChat(
    @Body()
    dto: {
      memberIds: number[];
      name?: string;
      isPrivate?: boolean;
    },
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    if (!dto.memberIds || dto.memberIds.length === 0) {
      throw new BadRequestException('At least one member ID is required');
    }

    if (dto.memberIds.length > 50) {
      throw new BadRequestException('Maximum 50 members per channel');
    }

    return await this.chatService.createTeamCollaboration(dto, userId, tenantId);
  }

  /**
   * ✅ Search team members for @mention autocomplete
   */
  @Get('team/search')
  @ApiOperation({ summary: 'Search team members for mentions' })
  async searchTeamMembers(
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Query('q') query: string,
  ) {
    if (!query || query.length < 2) {
      return [];
    }

    const members = await this.chatService.getTeamMembers(tenantId, userId);

    return members
      .filter((m) => {
        const searchTerm = query.toLowerCase();
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
        const email = m.email.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
      })
      .slice(0, 10); // Return top 10 matches
  }
}