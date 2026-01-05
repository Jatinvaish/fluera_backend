
// ============================================
// modules/rbac/rbac.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { RbacPermissionFilterService } from './rbac-permission-filter.service';

@Module({
  controllers: [RbacController],
  providers: [RbacService, RbacPermissionFilterService],
  exports: [RbacService, RbacPermissionFilterService],
})
export class RbacModule { }