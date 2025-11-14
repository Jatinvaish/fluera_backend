// modules/rbac/dto/rbac-enhanced.dto.ts
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== BULK OPERATIONS ====================

export class BulkAssignRolesDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  roleIds: number[];
}

export class BulkRemoveRolesDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  roleIds: number[];
}

export class BulkAssignUsersToRoleDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  userIds: number[];
}

// ==================== ROLE CLONING ====================

export class CloneRoleDto {
  @IsNumber()
  @Type(() => Number)
  sourceRoleId: number;

  @IsString()
  newName: string;

  @IsString()
  @IsOptional()
  newDisplayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  copyPermissions?: boolean = true;

  @IsBoolean()
  @IsOptional()
  copyLimits?: boolean = false;
}

// ==================== ROLE COMPARISON ====================

export class CompareRolesDto {
  @IsNumber()
  @Type(() => Number)
  roleId1: number;

  @IsNumber()
  @Type(() => Number)
  roleId2: number;
}

// ==================== PERMISSION SEARCH ====================

export class SearchPermissionsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  action?: string;

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

export class GetAvailablePermissionsDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string;
}

// ==================== MENU HIERARCHY ====================

export class GetMenuHierarchyDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;

  @IsBoolean()
  @IsOptional()
  includeBlockedReasons?: boolean = true;
}

export class GetBlockedMenusDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;
}

// ==================== TENANT-SPECIFIC ====================

export class GetTenantRolesDto {
  @IsOptional()
  @IsBoolean()
  includeSystemRoles?: boolean = false;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all' = 'active';
}

export class TransferRoleOwnershipDto {
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsNumber()
  @Type(() => Number)
  newTenantId: number;
}

export class GetTenantRoleAnalyticsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tenantId?: number;

  @IsOptional()
  @IsEnum(['users', 'permissions', 'usage'])
  metric?: 'users' | 'permissions' | 'usage';
}

// ==================== VALIDATION ====================

export class ValidateRoleAssignmentDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

export class ValidateRoleNameDto {
  @IsString()
  roleName: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tenantId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  excludeRoleId?: number;
}

// ==================== AUDIT & REPORTING ====================

export class GetRoleAssignmentHistoryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  roleId?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

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

export class GetPermissionChangeHistoryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  roleId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  permissionId?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

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

export class GetUserAccessReportDto {
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsBoolean()
  @IsOptional()
  includeInheritedPermissions?: boolean = true;

  @IsBoolean()
  @IsOptional()
  includeMenuAccess?: boolean = true;

  @IsBoolean()
  @IsOptional()
  includeResourcePermissions?: boolean = false;
}

// ==================== ROLE TEMPLATES ====================

export class CreateRoleTemplateDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissionKeys: string[];

  @IsEnum(['agency', 'brand', 'creator', 'all'])
  applicableTo: 'agency' | 'brand' | 'creator' | 'all';
}

export class ApplyRoleTemplateDto {
  @IsString()
  templateName: string;

  @IsString()
  @IsOptional()
  customRoleName?: string;
}

// ==================== ADVANCED QUERIES ====================

export class GetRolesByHierarchyDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  minLevel?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  maxLevel?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tenantId?: number;
}

export class GetUnassignedUsersDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tenantId?: number;

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

export class GetRoleUsageStatsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  roleId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tenantId?: number;

  @IsOptional()
  @IsString()
  period?: string; // 'day', 'week', 'month', 'year'
}