
// ============================================
// src/modules/collaboration/collaboration.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';

@Module({
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}