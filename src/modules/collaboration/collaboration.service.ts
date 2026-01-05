import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { EmailService } from '../email-templates/email.service';
import { AuditLoggerService } from '../global-modules/audit-logs/audit-logs.service';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private sqlService: SqlServerService,
    private emailService: EmailService,
    private auditLogger: AuditLoggerService,
  ) { }

  /**
   * AGENCY: Bulk invite creators
   */
  async bulkInviteCreators(
    agencyTenantId: number,
    invitedBy: number,
    dto: any,
  ) {
    this.logger.log(`Starting bulk invite for ${dto.emails}`);

    // Execute SP
    const results = await this.sqlService.execute('sp_BulkInviteCreators', {
      agencyTenantId,
      invitedBy,
      emails: dto.emails,
      roleId: dto.roleId,
      message: dto.message || null,
    });

    // Get agency info
    const agencyInfo: any = await this.sqlService.query(
      `SELECT t.name, u.first_name, u.last_name 
     FROM tenants t
     JOIN users u ON u.id = @userId
     WHERE t.id = @tenantId`,
      { userId: invitedBy, tenantId: agencyTenantId },
    );

    const agencyName = agencyInfo[0]?.name;
    const inviterName = `${agencyInfo[0]?.first_name} ${agencyInfo[0]?.last_name}`;

    // Send emails in background
    this.sendInvitationEmails(results, agencyName, inviterName).catch((err) =>
      this.logger.error('Failed to send invitation emails', err),
    );

    // ✅ NEW: Send notifications to existing creators
    this.sendInvitationNotifications(results, agencyTenantId, agencyName, inviterName)
      .catch((err) => this.logger.error('Failed to send notifications', err));

    // Log audit
    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const alreadyExisted = results.filter((r) => r.status === 'already_existed').length;

    this.auditLogger
      .log({
        tenantId: agencyTenantId,
        userId: invitedBy,
        entityType: 'invitations',
        actionType: 'BULK_CREATE',
        newValues: {
          totalEmails: results.length,
          successCount,
          failedCount,
          alreadyExisted,
          emails: dto.emails,
        },
        severity: 'medium',
      })
      .catch((err) => this.logger.error('Audit log failed', err));

    return {
      success: true,
      data: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        alreadyExisted,
        details: results,
      },
      message: `Processed ${results.length} invitations. ${successCount} sent, ${failedCount} failed, ${alreadyExisted} already existed.`,
    };
  }
  private async sendInvitationNotifications(
    results: any[],
    agencyTenantId: number,
    agencyName: string,
    inviterName: string,
  ) {
    for (const invite of results) {
      try {
        // ✅ ALWAYS create notification for ALL invitations
        // recipient_id and tenant_id will be NULL until user logs in
        await this.sqlService.execute(' ', {
          recipient_id: agencyTenantId, // NULL initially
          tenant_id: null, // NULL initially
          event_type: 'agency_invitation_to_creator_for_join',
          channel: 'in_app',
          subject: `Invitation from ${agencyName}`,
          message: `${inviterName} from ${agencyName} has invited you to collaborate.`,
          data: JSON.stringify({
            agencyTenantId,
            agencyName,
            inviterName,
            invitationToken: invite.invitation_token,
            invitationLink: `${process.env.FRONTEND_URL}/accept-creator-invitation?token=${invite.invitation_token}`,
            inviteeEmail: invite.email,
            invitationStatus: invite.status, // success, failed, already_existed
          }),
          priority: 'high',
        });

        this.logger.log(`✅ Notification created for: ${invite.email} (status: ${invite.status})`);
      } catch (error) {
        this.logger.error(`❌ Failed to create notification for ${invite.email}:`, error);
      }
    }
  }


  /**
   * CREATOR: Accept invitation
   */
  async acceptCreatorInvitation(dto: any, userId: number) {
    try {
      // Verify token
      const invitation: any = await this.sqlService.query(
        `SELECT i.*, t.name as agency_name
       FROM invitations i
       JOIN tenants t ON i.tenant_id = t.id
       WHERE i.invitation_token = @token 
         AND i.status = 'pending'
         AND i.expires_at > GETUTCDATE()`,
        { token: dto.token },
      );

      if (invitation.length === 0) {
        throw new BadRequestException('Invalid or expired invitation');
      }

      const invite = invitation[0];

      if (invite.status === 'accepted' || invite.request_status === 'accepted') {
        throw new BadRequestException('This invitation has already been accepted');
      }

      if (invite.status !== 'pending') {
        throw new BadRequestException('Invalid invitation status');
      }

      // Get creator's tenant from logged-in user
      const userTenant: any = await this.sqlService.query(
        `SELECT tm.tenant_id
         FROM users u
         JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
         JOIN tenants t ON tm.tenant_id = t.id
         WHERE u.id = @userId AND t.tenant_type = 'creator'`,
        { userId },
      );

      if (userTenant.length === 0) {
        throw new BadRequestException('Creator tenant not found');
      }

      const creatorTenantId = userTenant[0].tenant_id;

      // Update association
      await this.sqlService.execute('sp_AcceptCreatorInvitation', {
        invitationId: invite.id,
        creatorTenantId,
        userId,
      });
      await this.sqlService.query(
        `UPDATE notifications
       SET recipient_id = @userId,
           tenant_id = @tenantId,
           status = 'read',
           read_at = GETUTCDATE(),
           updated_at = GETUTCDATE()
       WHERE JSON_VALUE(data, '$.inviteeEmail') = @email
         AND JSON_VALUE(data, '$.invitationToken') = @token
         AND recipient_id IS NULL
         AND event_type = 'agency_invitation_to_creator_for_join'`,
        {
          userId,
          tenantId: creatorTenantId,
          email: invite.invitee_email,
          token: dto.token
        },
      );

      // Audit log
      const agencyAdmins: any = await this.sqlService.query(
        `SELECT u.id 
       FROM users u
       JOIN tenant_members tm ON u.id = tm.user_id
       WHERE tm.tenant_id = @agencyTenantId 
         AND tm.is_active = 1
         AND u.user_type IN ('agency_admin', 'owner')`,
        { agencyTenantId: invite.tenant_id },
      );

      const creatorInfo: any = await this.sqlService.query(
        `SELECT first_name, last_name FROM users WHERE id = @userId`,
        { userId },
      );

      const creatorName = `${creatorInfo[0]?.first_name} ${creatorInfo[0]?.last_name}`;

      for (const admin of agencyAdmins) {
        await this.sqlService.execute('sp_CreateNotification', {
          recipient_id: admin.id,
          tenant_id: invite.tenant_id,
          event_type: 'creator_accepted_agency_invitation',
          channel: 'in_app',
          subject: 'Creator Accepted Invitation',
          message: `${creatorName} has accepted your invitation to collaborate.`,
          data: JSON.stringify({
            creatorUserId: userId,
            creatorTenantId,
            creatorName,
          }),
          priority: 'normal',
        });
      }



      return {
        success: true,
        message: `Congratulations! You are now associated with ${invite.agency_name}.`,
        data: {
          userId,
          creatorTenantId,
          agencyTenantId: invite.tenant_id,
          agencyName: invite.agency_name,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * CREATOR: Reject invitation
   */
  async rejectCreatorInvitation(dto: any, userId: number) {
    try {
      await this.sqlService.execute('sp_RejectCreatorInvitation', {
        token: dto.token,
        userId,
        reason: dto.reason || null,
      });

      // Get invitation details for audit
      const inviteInfo: any = await this.sqlService.query(
        `SELECT i.tenant_id, i.agency_tenant_id 
         FROM invitations i
         WHERE i.invitation_token = @token`,
        { token: dto.token },
      );

      // Audit log
      this.auditLogger
        .log({
          tenantId: inviteInfo[0]?.agency_tenant_id,
          userId,
          entityType: 'invitations',
          actionType: 'UPDATE',
          newValues: {
            status: 'rejected',
            reason: dto.reason,
          },
          severity: 'low',
        })
        .catch((err) => this.logger.error('Audit log failed', err));

      return {
        success: true,
        message: 'Invitation rejected successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * AGENCY: Get creators list
   */
  async getAgencyCreators(agencyTenantId: number, filters: any) {
    const status = filters.status === 'all' ? null : filters.status;

    const result = await this.sqlService.execute('sp_GetAgencyCreators', {
      agencyTenantId,
      status,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * BRAND: Send collaboration request
   */
  async sendBrandCollaboration(
    brandTenantId: number,
    userId: number,
    dto: any,
  ) {
    try {
      const results: any = [];

      for (const creatorTenantId of dto.creatorTenantIds) {
        const result = await this.sqlService.execute(
          'sp_SendCollaborationRequest',
          {
            brandTenantId,
            creatorTenantId,
            agencyTenantId: dto.agencyTenantId,
            requestedBy: userId,
          },
        );
        results.push(result[0]);
      }

      // Audit log
      this.auditLogger
        .log({
          tenantId: brandTenantId,
          userId,
          entityType: 'brand_creator_collaborations',
          actionType: 'BULK_CREATE',
          newValues: {
            agencyTenantId: dto.agencyTenantId,
            creatorTenantIds: dto.creatorTenantIds,
            count: results.length,
          },
          severity: 'medium',
        })
        .catch((err) => this.logger.error('Audit log failed', err));

      return {
        success: true,
        message: `${results.length} collaboration request(s) sent successfully`,
        data: results,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async sendInvitationEmails(
    results: any[],
    agencyName: string,
    inviterName: string,
  ) {
    const successfulInvites = results.filter((r) => r.status === 'success');

    for (const invite of successfulInvites) {
      try {
        const inviteLink = `${process.env.FRONTEND_URL}/accept-creator-invitation?token=${invite.invitation_token}`;

        await this.emailService.sendInvitationEmail(
          invite.email,
          inviterName,
          agencyName,
          inviteLink,
        );

        this.logger.log(`Email sent to ${invite.email}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${invite.email}:`, error);
      }
    }
  }

  async getNotifications(
    userId: number,
    filters: { status?: string; page: number; limit: number },
  ) {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // ✅ Get user's email to fetch notifications created before registration
    const userInfo: any = await this.sqlService.query(
      `SELECT email FROM users WHERE id = @userId`,
      { userId },
    );

    const userEmail: any = userInfo[0]?.email;

    // ✅ Build WHERE clause to include both recipient_id and email-based notifications
    let whereClause = `WHERE (
    recipient_id = @userId 
    OR (recipient_id IS NULL AND JSON_VALUE(data, '$.inviteeEmail') = @userEmail)
  )`;

    if (status) {
      whereClause += ' AND status = @status';
    }

    const notifications = await this.sqlService.query(
      `SELECT 
      id,
      tenant_id,
      event_type,
      channel,
      subject,
      message,
      data,
      priority,
      status,
      read_at,
      created_at
     FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { userId, userEmail, status: status || null, offset, limit },
    );

    const countResult: any = await this.sqlService.query(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      { userId, userEmail, status: status || null },
    );

    // Parse data field for each notification
    const parsedNotifications = notifications.map((notif) => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : null,
    }));

    return {
      success: true,
      data: {
        notifications: parsedNotifications,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: countResult[0]?.total || 0,
          totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
          unreadCount: await this.getUnreadCount(userId, userEmail),
        },
      },
    };
  }


  /**
   * Mark notification as read
   */

  private async getUnreadCount(userId: number, userEmail: string): Promise<number> {
    const result: any = await this.sqlService.query(
      `SELECT COUNT(*) as count FROM notifications 
     WHERE (
       recipient_id = @userId 
       OR (recipient_id IS NULL AND JSON_VALUE(data, '$.inviteeEmail') = @userEmail)
     )
     AND status = 'pending'`,
      { userId, userEmail },
    );

    return result[0]?.count || 0;
  }

  // ============================================
  // UPDATED: markNotificationRead method
  // Handle both user_id and email-based notifications
  // ============================================

  async markNotificationRead(notificationId: number, userId: number) {
    // ✅ Get user's email
    const userInfo: any = await this.sqlService.query(
      `SELECT email FROM users WHERE id = @userId`,
      { userId },
    );

    const userEmail = userInfo[0]?.email;

    const result = await this.sqlService.query(
      `UPDATE notifications
     SET status = 'read', 
         read_at = GETUTCDATE(),
         recipient_id = CASE 
           WHEN recipient_id IS NULL THEN @userId 
           ELSE recipient_id 
         END
     WHERE id = @notificationId 
       AND (
         recipient_id = @userId 
         OR (recipient_id IS NULL AND JSON_VALUE(data, '$.inviteeEmail') = @userEmail)
       )
     OUTPUT INSERTED.*`,
      { notificationId, userId, userEmail },
    );

    if (result.length === 0) {
      throw new BadRequestException('Notification not found');
    }

    return {
      success: true,
      message: 'Notification marked as read',
      data: result[0],
    };
  }

}