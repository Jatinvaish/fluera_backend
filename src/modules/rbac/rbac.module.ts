
// ============================================
// modules/rbac/rbac.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { RbacEnhancedController } from './rbac-enhanced.controller';
import { RbacEnhancedService } from './rbac-enhanced.service';

@Module({
  controllers: [RbacController,RbacEnhancedController],
  providers: [RbacService,RbacEnhancedService],
  exports: [RbacService,RbacEnhancedService],
})
export class RbacModule { }