
// ============================================
// 5. INVITATION SERVICE (New)
// ============================================
// modules/auth/services/invitation.service.ts
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EmailService } from 'src/common/email.service';
import { HashingService } from 'src/common/hashing.service';
import { SqlServerService } from 'src/core/database';

@Injectable()
export class InvitationService {
  constructor(
    private sqlService: SqlServerService,
    private hashingService: HashingService,
    private emailService: EmailService,
  ) {}

  async sendInvitation(
    organizationId: bigint,
    invitedBy: bigint,
    dto: any,
  ) {
    // Check invitation limits
    const inviter = await this.sqlService.query(
      'SELECT invitations_sent, invitations_limit FROM users WHERE id = @userId',
      { userId: invitedBy }
    );

    if (inviter[0].invitations_sent >= inviter[0].invitations_limit) {
      throw new ForbiddenException('Invitation limit reached');
    }

    // Check if already invited
    const existing = await this.sqlService.query(
      `SELECT * FROM invitations 
       WHERE organization_id = @orgId AND invitee_email = @email AND status = 'pending'`,
      { orgId: organizationId, email: dto.inviteeEmail }
    );

    if (existing.length > 0) {
      throw new BadRequestException('Invitation already sent to this email');
    }

    const token = this.hashingService.generateRandomToken(64);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await this.sqlService.query(
      `INSERT INTO invitations (
        organization_id, invited_by, invitee_email, invitee_name, invitee_type,
        role_id, invitation_token, invitation_message, expires_at
      ) OUTPUT INSERTED.*
      VALUES (@orgId, @invitedBy, @email, @name, @type, @roleId, @token, @message, @expiresAt)`,
      {
        orgId: organizationId,
        invitedBy,
        email: dto.inviteeEmail,
        name: dto.inviteeName || null,
        type: dto.inviteeType,
        roleId: dto.roleId || null,
        token,
        message: dto.invitationMessage || null,
        expiresAt,
      }
    );

    // Update invitation counter
    await this.sqlService.query(
      'UPDATE users SET invitations_sent = invitations_sent + 1 WHERE id = @userId',
      { userId: invitedBy }
    );

    // Send email
    const inviterData = await this.sqlService.query(
      `SELECT u.first_name, u.last_name, o.name as org_name 
       FROM users u 
       JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = @userId`,
      { userId: invitedBy }
    );

    await this.emailService.sendInvitation(
      dto.inviteeEmail,
      token,
      `${inviterData[0].first_name} ${inviterData[0].last_name}`,
      inviterData[0].org_name
    );

    return result[0];
  }

  async acceptInvitation(token: string, password: string, userData: any) {
    const invitation = await this.sqlService.query(
      `SELECT i.*, o.name as org_name 
       FROM invitations i 
       JOIN organizations o ON i.organization_id = o.id
       WHERE invitation_token = @token AND status = 'pending' AND expires_at > GETUTCDATE()`,
      { token }
    );

    if (invitation.length === 0) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const invite = invitation[0];

    return this.sqlService.transaction(async (transaction) => {
      // Create user
      const passwordHash = await this.hashingService.hashPassword(password);
      
      const userResult = await transaction.request()
        .input('organizationId', invite.organization_id)
        .input('email', invite.invitee_email)
        .input('passwordHash', passwordHash)
        .input('firstName', userData.firstName || invite.invitee_name?.split(' ')[0] || 'User')
        .input('lastName', userData.lastName || invite.invitee_name?.split(' ')[1] || '')
        .input('userType', invite.invitee_type)
        .query(`
          INSERT INTO users (
            organization_id, email, password_hash, first_name, last_name,
            user_type, status, email_verified_at
          ) OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name
          VALUES (@organizationId, @email, @passwordHash, @firstName, @lastName,
                  @userType, 'active', GETUTCDATE())
        `);

      const user = userResult.recordset[0];

      // Assign role if provided
      if (invite.role_id) {
        await transaction.request()
          .input('userId', user.id)
          .input('roleId', invite.role_id)
          .query(`
            INSERT INTO user_roles (user_id, role_id, is_active)
            VALUES (@userId, @roleId, 1)
          `);
      }

      // Update invitation status
      await transaction.request()
        .input('invitationId', invite.id)
        .query(`
          UPDATE invitations 
          SET status = 'accepted', accepted_at = GETUTCDATE()
          WHERE id = @invitationId
        `);

      // Create creator/brand record if needed
      if (invite.invitee_type === 'creator') {
        await transaction.request()
          .input('organizationId', invite.organization_id)
          .input('userId', user.id)
          .input('email', invite.invitee_email)
          .input('firstName', user.first_name)
          .input('lastName', user.last_name)
          .query(`
            INSERT INTO creators (
              organization_id, user_id, email, first_name, last_name,
              status, onboarding_status
            ) VALUES (@organizationId, @userId, @email, @firstName, @lastName,
                     'active', 'pending')
          `);
      }

      return { user, invitation: invite };
    });
  }
}
