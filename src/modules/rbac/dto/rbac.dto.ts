// ============================================
// modules/rbac/dto/rbac.dto.ts
// ============================================
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, IsIn, Max, Min } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsNumber()
  @IsOptional()
  hierarchyLevel?: number;
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsNumber()
  @IsOptional()
  hierarchyLevel?: number;
}

export class CreatePermissionDto {
  @IsString()
  name: string;

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
}

export class AssignPermissionsDto {
  @IsArray()
  permissionIds: number[];
}

export class AssignRoleDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  roleId: number;
}



export class CreateRoleLimitDto {
  @IsNumber()
  roleId: number;

  @IsString()
  @IsEnum(['invitations', 'campaigns', 'contracts', 'storage', 'creators', 'brands'])
  limitType: string;

  @IsNumber()
  limitValue: number;

  @IsString()
  @IsEnum(['daily', 'monthly', 'yearly', 'never'])
  @IsOptional()
  resetPeriod?: string;
}

export class UpdateRoleLimitDto {
  @IsNumber()
  @IsOptional()
  limitValue?: number;

  @IsString()
  @IsOptional()
  resetPeriod?: string;
}

export class LinkMenuPermissionDto {
  @IsString()
  menuKey: string;

  @IsNumber()
  permissionId: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class BulkLinkMenuPermissionsDto {
  @IsArray()
  mappings: LinkMenuPermissionDto[];
}

export class GetUserMenuAccessDto {
  @IsNumber()
  userId: number;
}

export class CreateDefaultRolesDto {
  @IsString()
  userType: 'agency_admin' | 'brand_admin' | 'creator_admin';

  @IsNumber()
  organizationId: number;
}

export class GetRolesByUserTypeDto {
  @IsString()
  userType: 'agency_admin' | 'brand_admin' | 'creator_admin';

  @IsNumber()
  @IsOptional()
  organizationId?: number;
}

export class AssignDefaultRoleDto {
  @IsNumber()
  userId: number;

  @IsString()
  userType: 'agency_admin' | 'brand_admin' | 'creator_admin';
}



export class ListMenuPermissionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  menuKey?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['menu_key', 'permission_name', 'created_at', 'is_required'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class GetMenuPermissionsDto {
  @IsString()
  menuKey: string;
}

export class UnlinkMenuPermissionDto {
  @IsString()
  menuKey: string;

  @IsNumber()
  permissionId: number;
}


export class UpdateMenuPermissionDto {
  @IsNumber()
  id: number;

  @IsString()
  menuKey: string;

  @IsNumber()
  permissionId: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class GetMenuPermissionDto {
  @IsNumber()
  id: number;
}