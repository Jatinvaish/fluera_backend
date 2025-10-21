// ============================================
// modules/rbac/dto/rbac.dto.ts
// ============================================
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';

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
