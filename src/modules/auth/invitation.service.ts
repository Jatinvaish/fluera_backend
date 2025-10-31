
// ============================================
// src/modules/auth/invitation.service.ts
// ============================================
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { HashingService } from '../../common/hashing.service';

@Injectable()
export class InvitationService {
  constructor(
    private sqlService: SqlServerService,
    private hashingService: HashingService,
  ) {}

  async sendInvitation(tenantId: bigint, invitedBy: bigint, dto: any) {
    const existing = await this.sqlService.query(
      `SELECT * FROM invitations 
       WHERE tenant_id = @tenantId AND invitee_email = @email AND status = 'pending'`,
      { tenantId, email: dto.inviteeEmail }
    );

    if (existing.length > 0) {
      throw new BadRequestException('Invitation already sent to this email');
    }

    const token = this.hashingService.generateRandomToken(64);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await this.sqlService.query(
      `INSERT INTO invitations (
        tenant_id, invited_by, invitee_email, invitee_name, invitee_type,
        role_id, invitation_token, invitation_message, expires_at
      ) OUTPUT INSERTED.*
      VALUES (@tenantId, @invitedBy, @email, @name, @type, @roleId, @token, @message, @expiresAt)`,
      {
        tenantId,
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

    return result[0];
  }

  async acceptInvitation(token: string, password: string, userData: any) {
    const invitation = await this.sqlService.query(
      `SELECT i.*, t.name as tenant_name 
       FROM invitations i 
       JOIN tenants t ON i.tenant_id = t.id
       WHERE invitation_token = @token AND status = 'pending' AND expires_at > GETUTCDATE()`,
      { token }
    );

    if (invitation.length === 0) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const invite = invitation[0];
    const passwordHash = await this.hashingService.hashPassword(password);

    return this.sqlService.transaction(async (transaction) => {
      const userResult = await transaction.request()
        .input('email', invite.invitee_email)
        .input('passwordHash', passwordHash)
        .input('firstName', userData.firstName || 'User')
        .input('lastName', userData.lastName || '')
        .query(`
          INSERT INTO users (
            email, password_hash, first_name, last_name,
            user_type, status, email_verified_at
          ) OUTPUT INSERTED.*
          VALUES (@email, @passwordHash, @firstName, @lastName,
                  'staff', 'active', GETUTCDATE())
        `);

      const user = userResult.recordset[0];

      if (invite.role_id) {
        await transaction.request()
          .input('userId', user.id)
          .input('roleId', invite.role_id)
          .query(`INSERT INTO user_roles (user_id, role_id, is_active) VALUES (@userId, @roleId, 1)`);
      }

      await transaction.request()
        .input('tenantId', invite.tenant_id)
        .input('userId', user.id)
        .input('roleId', invite.role_id)
        .query(`
          INSERT INTO tenant_members (tenant_id, user_id, role_id, member_type, is_active)
          VALUES (@tenantId, @userId, @roleId, 'staff', 1)
        `);

      await transaction.request()
        .input('invitationId', invite.id)
        .query(`UPDATE invitations SET status = 'accepted', accepted_at = GETUTCDATE() WHERE id = @invitationId`);

      return { user, invitation: invite };
    });
  }
}