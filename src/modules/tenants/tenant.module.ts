// ============================================
// src/modules/tenants/tenants.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { TenantsController } from './tenant.controller';
import { TenantsService } from './tenant.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}