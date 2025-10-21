
// ============================================
// modules/rbac/rbac.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { MenuPermissionController } from './menu-permission.controller';
import { MenuPermissionService } from './menu-permission.service';

@Module({
  controllers: [RbacController, MenuPermissionController],
  providers: [RbacService, MenuPermissionService],
  exports: [RbacService, MenuPermissionService],
})
export class RbacModule {}