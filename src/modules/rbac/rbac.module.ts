
// ============================================
// modules/rbac/rbac.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { RbacEnhancedController } from './rbac-enhanced.controller';
import { RbacEnhancedService } from './rbac-enhanced.service';
import { RbacPermissionFilterService } from './rbac-permission-filter.service';

@Module({
  controllers: [RbacController,RbacEnhancedController],
  providers: [RbacService,RbacEnhancedService,RbacPermissionFilterService],
  exports: [RbacService,RbacEnhancedService,RbacPermissionFilterService],
})
export class RbacModule { }