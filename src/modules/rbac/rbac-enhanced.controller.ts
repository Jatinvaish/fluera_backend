// modules/rbac/rbac-enhanced.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser, TenantId, Unencrypted } from '../../core/decorators';
import {
  BulkAssignRolesDto,
  BulkRemoveRolesDto,
  BulkAssignUsersToRoleDto,
  CloneRoleDto,
  CompareRolesDto,
  SearchPermissionsDto,
  GetAvailablePermissionsDto,
  GetMenuHierarchyDto,
  GetBlockedMenusDto,
  GetTenantRolesDto,
  TransferRoleOwnershipDto,
  GetTenantRoleAnalyticsDto,
  ValidateRoleAssignmentDto,
  ValidateRoleNameDto,
  GetRoleAssignmentHistoryDto,
  GetPermissionChangeHistoryDto,
  GetUserAccessReportDto,
  CreateRoleTemplateDto,
  ApplyRoleTemplateDto,
  GetRolesByHierarchyDto,
  GetUnassignedUsersDto,
  GetRoleUsageStatsDto,
} from './dto/rbac-enhanced.dto';
import { RbacEnhancedService } from './rbac-enhanced.service';

@Controller('rbac')
@Unencrypted()
export class RbacEnhancedController {
  constructor(private rbacEnhancedService: RbacEnhancedService) {}

  // ==================== BULK OPERATIONS ====================

  @Post('users/roles/bulk-assign')
  @Permissions('user-roles:write')
  async bulkAssignRoles(
    @Body() dto: BulkAssignRolesDto,
    @CurrentUser('id') assignerId: number,
    @CurrentUser('userType') assignerType: string,
    @TenantId() assignerTenantId: number
  ) {
    return this.rbacEnhancedService.bulkAssignRolesToUser(
      dto.userId,
      dto.roleIds,
      assignerId,
      assignerType,
      assignerTenantId
    );
  }

  @Post('users/roles/bulk-remove')
  @Permissions('user-roles:write')
  async bulkRemoveRoles(
    @Body() dto: BulkRemoveRolesDto,
    @CurrentUser('id') removerId: number,
    @CurrentUser('userType') removerType: string,
    @TenantId() removerTenantId: number
  ) {
    return this.rbacEnhancedService.bulkRemoveRolesFromUser(
      dto.userId,
      dto.roleIds,
      removerId,
      removerType,
      removerTenantId
    );
  }

  @Post('roles/users/bulk-assign')
  @Permissions('user-roles:write')
  async bulkAssignUsersToRole(
    @Body() dto: BulkAssignUsersToRoleDto,
    @CurrentUser('id') assignerId: number,
    @CurrentUser('userType') assignerType: string,
    @TenantId() assignerTenantId: number
  ) {
    return this.rbacEnhancedService.bulkAssignUsersToRole(
      dto.roleId,
      dto.userIds,
      assignerId,
      assignerType,
      assignerTenantId
    );
  }

  // ==================== ROLE CLONING ====================

  @Post('roles/clone')
  @Permissions('roles:create')
  async cloneRole(
    @Body() dto: CloneRoleDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.cloneRole(
      dto.sourceRoleId,
      dto.newName,
      userId,
      tenantId,
      userType,
      {
        newDisplayName: dto.newDisplayName,
        description: dto.description,
        copyPermissions: dto.copyPermissions,
        copyLimits: dto.copyLimits,
      }
    );
  }

  // ==================== ROLE COMPARISON ====================

  @Post('roles/compare')
  @Permissions('roles:read')
  async compareRoles(
    @Body() dto: CompareRolesDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.compareRoles(
      dto.roleId1,
      dto.roleId2,
      userType,
      tenantId
    );
  }

  // ==================== PERMISSION SEARCH ====================

  @Post('permissions/search')
  @Permissions('permissions:read')
  async searchPermissions(@Body() dto: SearchPermissionsDto) {
    return this.rbacEnhancedService.searchPermissions(dto);
  }

  @Post('permissions/available')
  @Permissions('permissions:read')
  async getAvailablePermissions(@Body() dto: GetAvailablePermissionsDto) {
    return this.rbacEnhancedService.getAvailablePermissionsForRole(
      dto.roleId,
      dto.category,
      dto.search
    );
  }

  // ==================== MENU HIERARCHY ====================

  @Post('menu-permissions/hierarchy')
  async getMenuHierarchyWithAccess(
    @Body() dto: GetMenuHierarchyDto,
    @CurrentUser('id') currentUserId: number
  ) {
    const targetUserId = dto.userId || currentUserId;
    return this.rbacEnhancedService.getMenuHierarchyWithAccess(
      targetUserId,
      dto.includeBlockedReasons
    );
  }

  @Post('menu-permissions/blocked')
  async getBlockedMenus(
    @Body() dto: GetBlockedMenusDto,
    @CurrentUser('id') currentUserId: number
  ) {
    const targetUserId = dto.userId || currentUserId;
    return this.rbacEnhancedService.getBlockedMenusWithReasons(targetUserId);
  }

  // ==================== TENANT-SPECIFIC ====================

  @Post('roles/tenant')
  @Permissions('roles:read')
  async getTenantRoles(
    @Body() dto: GetTenantRolesDto,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.getTenantRoles(
      tenantId,
      dto.includeSystemRoles,
      dto.status
    );
  }

  @Post('roles/transfer')
  @Permissions('roles:write')
  async transferRoleOwnership(
    @Body() dto: TransferRoleOwnershipDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() currentTenantId: number
  ) {
    return this.rbacEnhancedService.transferRoleOwnership(
      dto.roleId,
      dto.newTenantId,
      userId,
      userType,
      currentTenantId
    );
  }

  @Post('roles/analytics')
  @Permissions('roles:read')
  async getTenantRoleAnalytics(
    @Body() dto: GetTenantRoleAnalyticsDto,
    @TenantId() currentTenantId: number
  ) {
    const targetTenantId = dto.tenantId || currentTenantId;
    return this.rbacEnhancedService.getTenantRoleAnalytics(
      targetTenantId,
      dto.metric
    );
  }

  // ==================== VALIDATION ====================

  @Post('roles/validate-assignment')
  @Permissions('user-roles:read')
  async validateRoleAssignment(
    @Body() dto: ValidateRoleAssignmentDto,
    @CurrentUser('id') requestorId: number,
    @CurrentUser('userType') requestorType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.validateRoleAssignment(
      requestorId,
      dto.userId,
      dto.roleId,
      requestorType,
      tenantId
    );
  }

  @Post('roles/validate-name')
  @Permissions('roles:read')
  async validateRoleName(
    @Body() dto: ValidateRoleNameDto,
    @TenantId() currentTenantId: number
  ) {
    const targetTenantId = dto.tenantId || currentTenantId;
    return this.rbacEnhancedService.validateRoleName(
      dto.roleName,
      targetTenantId,
      dto.excludeRoleId
    );
  }

  // ==================== AUDIT & REPORTING ====================

  @Post('audit/role-assignments')
  @Permissions('roles:read')
  async getRoleAssignmentHistory(
    @Body() dto: GetRoleAssignmentHistoryDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.getRoleAssignmentHistory(
      dto,
      userType,
      tenantId
    );
  }

  @Post('audit/permission-changes')
  @Permissions('permissions:read')
  async getPermissionChangeHistory(
    @Body() dto: GetPermissionChangeHistoryDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.getPermissionChangeHistory(
      dto,
      userType,
      tenantId
    );
  }

  @Post('reports/user-access')
  @Permissions('user-roles:read')
  async getUserAccessReport(
    @Body() dto: GetUserAccessReportDto,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.getUserAccessReport(
      dto.userId,
      userType,
      tenantId,
      {
        includeInheritedPermissions: dto.includeInheritedPermissions,
        includeMenuAccess: dto.includeMenuAccess,
        includeResourcePermissions: dto.includeResourcePermissions,
      }
    );
  }

  // ==================== ROLE TEMPLATES ====================

  @Post('role-templates/create')
  @Permissions('roles:create')
  async createRoleTemplate(
    @Body() dto: CreateRoleTemplateDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string
  ) {
    return this.rbacEnhancedService.createRoleTemplate(dto, userId, userType);
  }

  @Post('role-templates/list')
  @Permissions('roles:read')
  async listRoleTemplates(@CurrentUser('userType') userType: string) {
    return this.rbacEnhancedService.listRoleTemplates(userType);
  }

  @Post('role-templates/apply')
  @Permissions('roles:create')
  async applyRoleTemplate(
    @Body() dto: ApplyRoleTemplateDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('userType') userType: string,
    @TenantId() tenantId: number
  ) {
    return this.rbacEnhancedService.applyRoleTemplate(
      dto.templateName,
      tenantId,
      userId,
      userType,
      dto.customRoleName
    );
  }

  // ==================== ADVANCED QUERIES ====================

  @Post('roles/by-hierarchy')
  @Permissions('roles:read')
  async getRolesByHierarchy(
    @Body() dto: GetRolesByHierarchyDto,
    @CurrentUser('userType') userType: string,
    @TenantId() currentTenantId: number
  ) {
    const targetTenantId = dto.tenantId || currentTenantId;
    return this.rbacEnhancedService.getRolesByHierarchy(
      targetTenantId,
      dto.minLevel,
      dto.maxLevel,
      userType
    );
  }

  @Post('users/unassigned')
  @Permissions('user-roles:read')
  async getUnassignedUsers(
    @Body() dto: GetUnassignedUsersDto,
    @TenantId() currentTenantId: number
  ) {
    const targetTenantId = dto.tenantId || currentTenantId;
    return this.rbacEnhancedService.getUnassignedUsers(
      targetTenantId,
      dto.page,
      dto.limit
    );
  }

  @Post('roles/usage-stats')
  @Permissions('roles:read')
  async getRoleUsageStats(
    @Body() dto: GetRoleUsageStatsDto,
    @TenantId() currentTenantId: number
  ) {
    const targetTenantId = dto.tenantId || currentTenantId;
    return this.rbacEnhancedService.getRoleUsageStats(
      targetTenantId,
      dto.roleId,
      dto.period
    );
  }
}