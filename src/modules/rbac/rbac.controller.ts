
// ============================================
// modules/rbac/rbac.controller.ts
// ============================================
import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto, AssignPermissionsDto, AssignRoleDto } from './dto/rbac.dto';
import { CurrentUser, Public } from 'src/core/decorators';
import { RbacService } from './rbac.service';

@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  // ==================== ROLES ====================
  
  @Get('roles')
  @Public() // Make public for initial setup
  async getAllRoles() {
    return this.rbacService.getAllRoles();
  }

  @Get('roles/:id')
  async getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getRoleById(BigInt(id));
  }

  @Post('roles')
  @Public() // Make public for initial setup
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser('id') userId?: bigint,
    @CurrentUser('organizationId') organizationId?: bigint,
  ) {
    return this.rbacService.createRole(dto, userId, organizationId);
  }

  @Put('roles/:id')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.rbacService.updateRole(BigInt(id), dto, userId);
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.deleteRole(BigInt(id));
  }

  // ==================== PERMISSIONS ====================

  @Get('permissions')
  @Public() // Make public for initial setup
  async getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Get('permissions/:id')
  async getPermissionById(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getPermissionById(BigInt(id));
  }

  @Post('permissions')
  @Public() // Make public for initial setup
  async createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('id') userId?: bigint,
  ) {
    return this.rbacService.createPermission(dto, userId);
  }

  @Delete('permissions/:id')
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.deletePermission(BigInt(id));
  }

  // ==================== ROLE PERMISSIONS ====================

  @Post('roles/:roleId/permissions')
  async assignPermissionsToRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.rbacService.assignPermissionsToRole(BigInt(roleId), dto.permissionIds, userId);
  }

  @Get('roles/:roleId/permissions')
  async getRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.rbacService.getRolePermissions(BigInt(roleId));
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  async removePermissionFromRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rbacService.removePermissionFromRole(BigInt(roleId), BigInt(permissionId));
  }

  // ==================== USER ROLES ====================

  @Post('users/assign-role')
  async assignRoleToUser(
    @Body() dto: AssignRoleDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.rbacService.assignRoleToUser(BigInt(dto.userId), BigInt(dto.roleId), userId);
  }

  @Get('users/:userId/roles')
  async getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.rbacService.getUserRoles(BigInt(userId));
  }

  @Delete('users/:userId/roles/:roleId')
  async removeRoleFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.rbacService.removeRoleFromUser(BigInt(userId), BigInt(roleId));
  }

  // ==================== SEED DATA ====================

  @Post('seed/system-data')
  @Public()
  async seedSystemData() {
    return this.rbacService.seedSystemRolesAndPermissions();
  }
}
