// modules/permissions/permissions.module.ts
import { Module, Global } from '@nestjs/common';
import { ResourcePermissionService } from './resource-permission.service';
import { PermissionsController } from './permissions.controller';

@Global()
@Module({
  controllers: [PermissionsController],
  providers: [ResourcePermissionService],
  exports: [ResourcePermissionService],
})
export class PermissionsModule {}