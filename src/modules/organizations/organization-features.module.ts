
// ============================================
// modules/organizations/organizations.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { OrganizationFeaturesController } from './organization-features.controller';
import { OrganizationFeaturesService } from './organization-features.service';

@Module({
  controllers: [OrganizationFeaturesController],
  providers: [OrganizationFeaturesService],
  exports: [OrganizationFeaturesService],
})
export class OrganizationsModule {}