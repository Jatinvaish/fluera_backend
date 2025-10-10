// ============================================
// modules/rbac/dto/rbac.dto.ts
// ============================================
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

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