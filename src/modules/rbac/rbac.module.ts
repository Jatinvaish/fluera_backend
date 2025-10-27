
// ============================================
// modules/rbac/rbac.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { MenuPermissionsController } from './menu-permission.controller';
import { MenuPermissionsService } from './menu-permission.service';

@Module({
  controllers: [RbacController, MenuPermissionsController],
  providers: [RbacService, MenuPermissionsService],
  exports: [RbacService, MenuPermissionsService],
})
export class RbacModule {}