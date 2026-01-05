import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, TenantId, Unencrypted } from '../../core/decorators';
import {
  BulkInviteCreatorsDto,
  AcceptCreatorInvitationDto,
  RejectCreatorInvitationDto,
  GetAgencyCreatorsDto,
  SendBrandCollaborationDto,
} from './dto/collaboration.dto';
import { CollaborationService } from './collaboration.service';

@Controller('collaboration')
@Unencrypted()
export class CollaborationController {
  constructor(private collaborationService: CollaborationService) { }

  // ============================================
  // AGENCY ENDPOINTS
  // ============================================

  /**
   * AGENCY: Bulk invite creators
   */
  @Post('agency/send-creator-invitations')
  async inviteCreators(
    @Body() dto: BulkInviteCreatorsDto,
    @TenantId() agencyTenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.collaborationService.bulkInviteCreators(
      agencyTenantId,
      userId,
      dto,
    );
  }
  @Get('notifications/list')
  async getNotifications(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.collaborationService.getNotifications(userId, { status, page, limit });
  }

  /**
   * Mark notification as read
   */
  @Post('notifications/:id/mark-read')
  async markNotificationRead(
    @Param('id') notificationId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.collaborationService.markNotificationRead(notificationId, userId);
  }
  /**
   * AGENCY: Get creators list with filters
   */
  @Post('agency/creators-list')
  async getAgencyCreators(
    @TenantId() agencyTenantId: number,
    @Body() filters: GetAgencyCreatorsDto,
  ) {
    return this.collaborationService.getAgencyCreators(agencyTenantId, filters);
  }

  // ============================================
  // CREATOR ENDPOINTS
  // ============================================

  /**
   * CREATOR: Accept agency invitation
   */
  @Post('agency/creator-accept-invitation')
  async acceptInvitation(
    @Body() dto: AcceptCreatorInvitationDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.collaborationService.acceptCreatorInvitation(dto, userId);
  }

  /**
   * CREATOR: Reject agency invitation
   */
  @Post('agency/creator-reject-invitation')
  async rejectInvitation(
    @Body() dto: RejectCreatorInvitationDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.collaborationService.rejectCreatorInvitation(dto, userId);
  }

  // ============================================
  // BRAND ENDPOINTS
  // ============================================

  /**
   * BRAND: Send collaboration request to agency + creators
   */
  @Post('brand/send-collaboration-request')
  async sendCollaborationRequest(
    @Body() dto: SendBrandCollaborationDto,
    @TenantId() brandTenantId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.collaborationService.sendBrandCollaboration(
      brandTenantId,
      userId,
      dto,
    );
  }
}