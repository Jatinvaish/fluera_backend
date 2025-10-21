// modules/permissions/permissions.controller.ts
import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ResourcePermissionService } from './resource-permission.service';
import { CurrentUser } from 'src/core/decorators';
import { Permissions } from 'src/core/decorators/permissions.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private permissionService: ResourcePermissionService) {}

  @Get('check/:resourceType/:resourceId/:permissionType')
  async checkAccess(
    @Param('resourceType') resourceType: string,
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @Param('permissionType') permissionType: string,
    @CurrentUser('id') userId: bigint,
  ) {
    const hasAccess = await this.permissionService.checkAccess(
      userId,
      resourceType,
      BigInt(resourceId),
      permissionType
    );
    return { hasAccess };
  }

  @Post('grant')
  @Permissions('permissions:grant')
  async grantAccess(
    @Body() payload: {
      resourceType: string;
      resourceId: number;
      entityType: 'user' | 'role' | 'team';
      entityId: number;
      permissionType: string;
      expiresAt?: Date;
    },
    @CurrentUser('id') userId: bigint,
  ) {
    return this.permissionService.grantAccess(
      payload.resourceType,
      BigInt(payload.resourceId),
      payload.entityType,
      BigInt(payload.entityId),
      payload.permissionType,
      userId,
      payload.expiresAt
    );
  }

  @Delete('revoke/:resourceType/:resourceId/:entityType/:entityId/:permissionType')
  @Permissions('permissions:revoke')
  async revokeAccess(
    @Param('resourceType') resourceType: string,
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @Param('entityType') entityType: 'user' | 'role' | 'team',
    @Param('entityId', ParseIntPipe) entityId: number,
    @Param('permissionType') permissionType: string,
  ) {
    return this.permissionService.revokeAccess(
      resourceType,
      BigInt(resourceId),
      entityType,
      BigInt(entityId),
      permissionType
    );
  }

  @Get(':resourceType/:resourceId')
  @Permissions('permissions:view')
  async listPermissions(
    @Param('resourceType') resourceType: string,
    @Param('resourceId', ParseIntPipe) resourceId: number,
  ) {
    return this.permissionService.listResourcePermissions(
      resourceType,
      BigInt(resourceId)
    );
  }

  @Post('share')
  @Permissions('permissions:share')
  async createShareLink(
    @Body() payload: {
      resourceType: string;
      resourceId: number;
      shareType: 'view' | 'comment' | 'edit';
      recipientEmail?: string;
      recipientUserId?: number;
      passwordProtected?: boolean;
      password?: string;
      requiresLogin?: boolean;
      allowDownload?: boolean;
      expiresAt?: Date;
      maxViews?: number;
    },
    @CurrentUser('id') userId: bigint,
  ) {
    return this.permissionService.createShareLink(
      payload.resourceType,
      BigInt(payload.resourceId),
      payload.shareType,
      {
        recipientEmail: payload.recipientEmail,
        recipientUserId: payload.recipientUserId ? BigInt(payload.recipientUserId) : undefined,
        passwordProtected: payload.passwordProtected,
        password: payload.password,
        requiresLogin: payload.requiresLogin,
        allowDownload: payload.allowDownload,
        expiresAt: payload.expiresAt,
        maxViews: payload.maxViews,
      },
      userId
    );
  }
}