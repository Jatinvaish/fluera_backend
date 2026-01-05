// ============================================
// src/modules/auth/invitation.service.ts
// ============================================
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { HashingService } from '../../common/hashing.service';
import { RbacService } from '../rbac/rbac.service';
import { EmailService } from '../email-templates/email.service';

@Injectable()
export class InvitationService {
  constructor(
    private sqlService: SqlServerService,
    private hashingService: HashingService,
    private rbacService: RbacService,
    private emailService: EmailService,
  ) {}

  async sendInvitation(tenantId: number, invitedBy: number, dto: any) {
    // Get inviter's user type for role validation
    const inviterInfo: any = await this.sqlService.query(
      `SELECT user_type,first_name, last_name FROM users WHERE id = @userId`,
      { userId: invitedBy },
    );

    if (inviterInfo.length === 0) {
      throw new BadRequestException('Inviter user not found');
    }

    const inviterType = inviterInfo[0].user_type;
    // ✅ Step 1: Validate that role_id is provided
    if (!dto.roleId) {
      throw new BadRequestException('role_id is required for invitations');
    }

    // ✅ Step 2: Validate the role using RBAC service
    // This checks:
    // - Role exists
    // - Inviter has permission to assign this role
    // - Role belongs to inviter's tenant (or is a system role they can assign)
    await this.rbacService.validateRoleForInvitation(
      Number(dto.roleId),
      inviterType,
      tenantId,
    );

    // ✅ Step 3: Check for existing user in tenant and invitation status
    const existingUser = await this.sqlService.query(
      `SELECT u.id FROM users u
   JOIN tenant_members tm ON u.id = tm.user_id
   WHERE u.email = @email AND tm.tenant_id = @tenantId`,
      { email: dto.inviteeEmail, tenantId },
    );

    if (existingUser.length > 0) {
      throw new BadRequestException('User already exists in this tenant');
    }

    const existing = await this.sqlService.query(
      `SELECT status FROM invitations 
   WHERE tenant_id = @tenantId 
     AND invitee_email = @email`,
      { tenantId, email: dto.inviteeEmail },
    );

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === 'pending') {
        throw new BadRequestException('Invitation already sent to this email');
      }
      if (status === 'cancelled') {
        throw new BadRequestException(
          'Invitation was cancelled. Please resend the invitation',
        );
      }
    }

    // ✅ Step 4: Check role limits (if applicable)
    try {
      const canInvite = await this.rbacService.checkRoleLimit(
        Number(dto.roleId),
        'invitations',
      );

      if (!canInvite) {
        throw new ForbiddenException('Invitation limit reached for this role');
      }
    } catch (error) {
      // If no limit is defined, continue (checkRoleLimit returns true)
    }

    // ✅ Step 5: Generate invitation token
    const token = this.hashingService.generateRandomToken(64);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // ✅ Step 6: Create invitation with role_id
    const result = await this.sqlService.query(
      `INSERT INTO invitations (
        tenant_id, invited_by, invitee_email, invitee_name, invitee_type,
        role_id, invitation_token, invitation_message, expires_at, status
      ) OUTPUT INSERTED.*
      VALUES (@tenantId, @invitedBy, @email, @name, @type, @roleId, @token, @message, @expiresAt, 'pending')`,
      {
        tenantId,
        invitedBy,
        email: dto.inviteeEmail,
        name: dto.inviteeName || null,
        type: dto.inviteeType,
        roleId: Number(dto.roleId),
        token,
        message: dto.invitationMessage || null,
        expiresAt,
      },
    );

    // ✅ Step 7: Increment role limit usage
    try {
      await this.rbacService.incrementRoleLimitUsage(
        Number(dto.roleId),
        'invitations',
      );
    } catch (error) {
      // If no limit tracking, ignore
    }

    // ✅ Step 8: Send invitation email
    // In sendInvitation method, after creating invitation (after Step 7):
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`;

    const inviterName = `${inviterInfo[0].first_name} ${inviterInfo[0].last_name}`;

    const tenantInfo = await this.sqlService.query(
      `SELECT name FROM tenants WHERE id = @tenantId`,
      { tenantId },
    );

    await this.emailService.sendInvitationEmail(
      dto.inviteeEmail,
      inviterName,
      tenantInfo[0].name,
      inviteLink,
    );

    return {
      success: true,
      data: result[0],
      message: 'Invitation sent successfully',
    };
  }

  async acceptInvitation(token: string, password: string, userData: any) {
    // ✅ Step 1: Verify invitation token and get invitation details
    const invitation = await this.sqlService.query(
      `SELECT i.*, t.name as tenant_name, r.name as role_name, r.display_name as role_display_name
       FROM invitations i 
       JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN roles r ON i.role_id = r.id
       WHERE i.invitation_token = @token 
         AND i.status = 'pending' 
         AND i.expires_at > GETUTCDATE()`,
      { token },
    );
    console.log(
      '🚀 ~ InvitationService ~ acceptInvitation ~ invitation:',
      invitation,
    );

    if (invitation.length === 0) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const invite = invitation[0];

    // ✅ Step 2: Validate that role still exists and is valid
    if (!invite.role_id) {
      throw new BadRequestException(
        'Invitation does not have a valid role assigned',
      );
    }

    try {
      await this.rbacService.getRoleById(
        Number(invite.role_id),
        'system', // System context for invitation acceptance
        Number(invite.tenant_id),
      );
    } catch (error) {
      throw new BadRequestException(
        'The role assigned to this invitation is no longer valid',
      );
    }

    // ✅ Step 3: Check if user already exists globally
    const existingUser = await this.sqlService.query(
      `SELECT id, email, first_name, last_name, user_type FROM users WHERE email = @email`,
      { email: invite.invitee_email },
    );

    // ✅ Step 4: Check if user is already a member of this tenant
    const existingMember = await this.sqlService.query(
      `SELECT tm.id FROM tenant_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE u.email = @email AND tm.tenant_id = @tenantId`,
      { email: invite.invitee_email, tenantId: invite.tenant_id },
    );

    if (existingMember.length > 0) {
      throw new BadRequestException(
        'You are already a member of this tenant',
      );
    }

    // ✅ Step 5: Execute transaction to create/update user and assign role
    return this.sqlService.transaction(async (transaction) => {
      let user;

      if (existingUser.length > 0) {
        // ✅ User exists - just use existing user
        user = existingUser[0];
        console.log('✅ Using existing user:', user.email);
      } else {
        // ✅ New user - create account
        const passwordHash = await this.hashingService.hashPassword(password);
        
        const userResult = await transaction
          .request()
          .input('email', invite.invitee_email)
          .input('passwordHash', passwordHash)
          .input(
            'firstName',
            userData.firstName || invite.invitee_name?.split(' ')[0] || 'User',
          )
          .input(
            'lastName',
            userData.lastName ||
              invite.invitee_name?.split(' ').slice(1).join(' ') ||
              '',
          )
          .input('userType', invite.invitee_type || 'staff').query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name,
          user_type, status, email_verified_at, 
          onboarding_completed_at, created_at
        ) OUTPUT INSERTED.*
        VALUES (@email, @passwordHash, @firstName, @lastName,
                @userType, 'active', GETUTCDATE(), 
                GETUTCDATE(), GETUTCDATE())
      `);

        user = userResult.recordset[0];
        console.log('✅ Created new user:', user.email);
      }

      // ✅ Assign role to user via RBAC system
      await transaction
        .request()
        .input('userId', user.id)
        .input('roleId', invite.role_id)
        .input('assignedBy', invite.invited_by).query(`
          INSERT INTO user_roles (user_id, role_id, is_active, created_by, created_at) 
          VALUES (@userId, @roleId, 1, @assignedBy, GETUTCDATE())
        `);

      // Add user to tenant
      await transaction
        .request()
        .input('tenantId', invite.tenant_id)
        .input('userId', user.id)
        .input('roleId', invite.role_id)
        .input('memberType', invite.invitee_type || 'staff').query(`
          INSERT INTO tenant_members (tenant_id, user_id, role_id, member_type, is_active, created_at)
          VALUES (@tenantId, @userId, @roleId, @memberType, 1, GETUTCDATE())
        `);

      // Mark invitation as accepted
      await transaction.request().input('invitationId', invite.id).query(`
          UPDATE invitations 
          SET status = 'accepted', 
               accepted_at = GETUTCDATE(),
               updated_at = GETUTCDATE()
          WHERE id = @invitationId
        `);

      return {
        success: true,
        data: {
          user: {
            id: user.id.toString(),
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            userType: user.user_type,
            onboardingRequired: false,
            onboardingCompleted: true,
          },
          tenant: {
            id: invite.tenant_id.toString(),
            name: invite.tenant_name,
          },
          role: {
            id: invite.role_id.toString(),
            name: invite.role_name,
            displayName: invite.role_display_name,
          },
        },
        message:
          'Invitation accepted successfully. Your account has been created.',
      };
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  async getInvitationByToken(token: string) {
    const result = await this.sqlService.query(
      `SELECT i.*, t.name as tenant_name, r.name as role_name, r.display_name as role_display_name
       FROM invitations i
       JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN roles r ON i.role_id = r.id
       WHERE i.invitation_token = @token`,
      { token },
    );

    if (result.length === 0) {
      throw new NotFoundException('Invitation not found');
    }

    const invitation = result[0];

    // Check if user already exists
    const existingUser = await this.sqlService.query(
      `SELECT id FROM users WHERE email = @email`,
      { email: invitation.invitee_email },
    );

    return {
      ...invitation,
      user_exists: existingUser.length > 0,
    };
  }

  async listInvitations(tenantId: number, filters: any = {}) {
    const { status, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE i.tenant_id = @tenantId';

    if (status) {
      whereClause += ' AND i.status = @status';
    }

    const result = await this.sqlService.query(
      `SELECT 
         i.*,
         r.name as role_name,
         r.display_name as role_display_name,
         u.email as invited_by_email,
         u.first_name as invited_by_first_name,
         u.last_name as invited_by_last_name
       FROM invitations i
       LEFT JOIN roles r ON i.role_id = r.id
       LEFT JOIN users u ON i.invited_by = u.id
       ${whereClause}
       ORDER BY i.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { tenantId, status: status || null, offset, limit },
    );

    const countResult: any = await this.sqlService.query(
      `SELECT COUNT(*) as total FROM invitations i ${whereClause}`,
      { tenantId, status: status || null },
    );

    return {
      success: true,
      data: {
        invitations: result,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: countResult[0]?.total || 0,
          totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
        },
      },
    };
  }

  async cancelInvitation(
    invitationId: number,
    cancelledBy: number,
    tenantId: number,
  ) {
    const result = await this.sqlService.query(
      `UPDATE invitations 
       SET status = 'cancelled', 
           updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE id = @invitationId 
         AND tenant_id = @tenantId 
         AND status = 'pending'`,
      { invitationId, tenantId },
    );

    if (result.length === 0) {
      throw new NotFoundException(
        'Invitation not found or cannot be cancelled',
      );
    }

    return {
      success: true,
      data: result[0],
      message: 'Invitation cancelled successfully',
    };
  }

  async resendInvitation(invitationId: number, tenantId: number) {
    console.log('Resending invitation:', { invitationId, tenantId });
    const invitation = await this.sqlService.query(
      `SELECT * FROM invitations 
       WHERE id = @invitationId 
         AND tenant_id = @tenantId 
         AND status = 'pending'`,
      { invitationId, tenantId },
    );

    if (invitation.length === 0) {
      throw new NotFoundException('Invitation not found or already accepted');
    }

    // Generate new token and extend expiry
    const newToken = this.hashingService.generateRandomToken(64);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await this.sqlService.query(
      `UPDATE invitations 
       SET invitation_token = @token,
           expires_at = @expiresAt,
           updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE id = @invitationId`,
      { invitationId, token: newToken, expiresAt: newExpiresAt },
    );

    const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${newToken}`;

    const inviterInfo = await this.sqlService.query(
      `SELECT u.first_name, u.last_name FROM users u
   JOIN invitations i ON i.invited_by = u.id
   WHERE i.id = @invitationId`,
      { invitationId },
    );

    const tenantInfo = await this.sqlService.query(
      `SELECT name FROM tenants WHERE id = @tenantId`,
      { tenantId },
    );

    const inviterName = `${inviterInfo[0].first_name} ${inviterInfo[0].last_name}`;

    await this.emailService.sendInvitationEmail(
      result[0].invitee_email,
      inviterName,
      tenantInfo[0].name,
      inviteLink,
    );

    return {
      success: true,
      data: result[0],
      message: 'Invitation resent successfully',
    };
  }
}
