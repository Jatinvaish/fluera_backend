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
import { CurrentUser, TenantId } from 'src/core/decorators';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('Team Collaboration')
@ApiBearerAuth()
@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private chatService: ChatService) {}
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