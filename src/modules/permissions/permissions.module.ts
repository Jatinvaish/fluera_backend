// modules/permissions/permissions.module.ts
import { Module, Global } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './resource-permission.service';

@Global()
@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}