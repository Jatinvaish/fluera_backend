
// ============================================
// modules/abac/abac.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { AbacController } from './abac.controller';
import { AbacService } from './abac.service';

@Module({
  controllers: [AbacController],
  providers: [AbacService],
  exports: [AbacService],
})
export class AbacModule {}