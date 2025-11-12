// modules/rbac/dto/rbac.dto.ts
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== ROLE DTOs ====================

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  hierarchyLevel?: number = 0;
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  hierarchyLevel?: number;
}

export class ListRolesDto {
  @IsOptional()
  @IsEnum(['system', 'tenant', 'all'])
  scope?: 'system' | 'tenant' | 'all' = 'all';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;


  search?: string;  
  sortBy?: string;  
  category?: string;  
  sortOrder?: string;  
}

export class GetRoleDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

export class DeleteRoleDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

// ==================== PERMISSION DTOs ====================

export class CreatePermissionDto {
  @IsString()
  resource: string;

  @IsString()
  action: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isSystemPermission?: boolean = false;
}

export class ListPermissionsDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['system', 'custom', 'all'])
  scope?: 'system' | 'custom' | 'all' = 'all';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class GetPermissionDto {
  @IsNumber()
  @Type(() => Number)
  permissionId: number;
}

export class DeletePermissionDto {
  @IsNumber()
  @Type(() => Number)
  permissionId: number;
}

// ==================== ROLE-PERMISSION DTOs ====================

export class AssignPermissionsDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsArray()
  @IsString({ each: true })
  permissionKeys: string[];
}

export class BulkAssignPermissionsDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionChangeDto)
  changes: PermissionChangeDto[];
}

class PermissionChangeDto {
  @IsEnum(['I', 'D']) // Insert or Delete
  mode: 'I' | 'D';

  @IsNumber()
  @Type(() => Number)
  permissionId: number;
}

export class GetRolePermissionsTreeDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

export class RemovePermissionsDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  permissionIds: number[];
}

// ==================== USER-ROLE DTOs ====================

export class AssignRoleToUserDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

export class GetUserRolesDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;
}

export class RemoveRoleFromUserDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

export class GetUserEffectivePermissionsDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;
}

// ==================== MENU-PERMISSION DTOs ====================

export class LinkMenuPermissionDto {
  @IsString()
  menuKey: string;

  @IsNumber()
  @Type(() => Number)
  permissionId: number;

  @IsBoolean()
  @IsOptional()
  isRequired: boolean = true;
}

export class BulkLinkMenuPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkMenuPermissionDto)
  mappings: LinkMenuPermissionDto[];
}

export class UnlinkMenuPermissionDto {
  @IsString()
  menuKey: string;

  @IsNumber()
  @Type(() => Number)
  permissionId: number;
}

export class GetMenuPermissionsDto {
  @IsString()
  menuKey: string;
}

export class ListMenuPermissionsDto {
  @IsOptional()
  @IsString()
  menuKey?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(['menu_key', 'permission_name', 'created_at'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class GetUserAccessibleMenusDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;
}

export class CheckMenuAccessDto {
  @IsString()
  menuKey: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;
}

// ==================== RESOURCE-PERMISSION DTOs ====================

export class GrantResourcePermissionDto {
  @IsString()
  resourceType: string;

  @IsNumber()
  @Type(() => Number)
  resourceId: number;

  @IsEnum(['user', 'role'])
  entityType: 'user' | 'role';

  @IsNumber()
  @Type(() => Number)
  entityId: number;

  @IsString()
  permissionType: string; // 'read', 'write', 'delete', 'share', etc.

  @IsOptional()
  @IsString()
  expiresAt?: string; // ISO date string
}

export class RevokeResourcePermissionDto {
  @IsString()
  resourceType: string;

  @IsNumber()
  @Type(() => Number)
  resourceId: number;

  @IsEnum(['user', 'role'])
  entityType: 'user' | 'role';

  @IsNumber()
  @Type(() => Number)
  entityId: number;

  @IsOptional()
  @IsString()
  permissionType?: string;
}

export class CheckResourcePermissionDto {
  @IsString()
  resourceType: string;

  @IsNumber()
  @Type(() => Number)
  resourceId: number;

  @IsString()
  permissionType: string;
}

export class CheckBatchPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckResourcePermissionDto)
  checks: CheckResourcePermissionDto[];
}

export class ListResourcePermissionsDto {
  @IsString()
  resourceType: string;

  @IsNumber()
  @Type(() => Number)
  resourceId: number;
}

// ==================== ROLE-LIMIT DTOs ====================

export class CreateRoleLimitDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsString()
  @IsEnum(['invitations', 'campaigns', 'contracts', 'storage', 'creators', 'brands'])
  limitType: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  limitValue: number;

  @IsOptional()
  @IsEnum(['daily', 'monthly', 'yearly', 'never'])
  resetPeriod?: string;
}

export class UpdateRoleLimitDto {
  @IsNumber()
  @Type(() => Number)
  limitId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limitValue?: number;

  @IsOptional()
  @IsEnum(['daily', 'monthly', 'yearly', 'never'])
  resetPeriod?: string;
}

export class GetRoleLimitsDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

// ==================== INVITATION DTOs (Enhanced) ====================

export class SendInvitationDto {
  @IsString()
  inviteeEmail: string;

  @IsString()
  @IsOptional()
  inviteeName?: string;

  @IsEnum(['creator', 'brand', 'staff', 'manager'])
  inviteeType: string;

  @IsNumber()
  @Type(() => Number)
  roleId: number; // ✅ Required role_id

  @IsString()
  @IsOptional()
  invitationMessage?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}