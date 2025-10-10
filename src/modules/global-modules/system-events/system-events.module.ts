
// ============================================
// modules/global-modules/system-events/system-events.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { SystemEventsController } from './system-events.controller';
import { SystemEventsService } from './system-events.service';

@Module({
  controllers: [SystemEventsController],
  providers: [SystemEventsService],
  exports: [SystemEventsService],
})
export class SystemEventsModule {}
