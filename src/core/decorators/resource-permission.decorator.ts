// core/decorators/resource-permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RESOURCE_PERMISSION_KEY = 'resourcePermission';

export interface ResourcePermissionConfig {
  resourceType: string;
  permissionType: string;
  extractResourceId?: (request: any) => number | string;
}

export const RequireResourcePermission = (config: ResourcePermissionConfig) =>
  SetMetadata(RESOURCE_PERMISSION_KEY, config);

// Usage example:
// @RequireResourcePermission({ 
//   resourceType: 'email', 
//   permissionType: 'read',
//   extractResourceId: (req) => req.params.id 
// })