// src/modules/subscriptions/subscriptions.module.ts
import { Module, Global } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionCheckService } from './subscription-check.service';
import { SubscriptionFeatureGuard } from './guards/subscription-feature.guard';
import { AuditLoggerService } from '../global-modules/audit-logs/audit-logs.service';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';

@Global()
@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionCheckService,
    SubscriptionFeatureGuard,
    AuditLoggerService,
    SubscriptionSchedulerService,
  ],
  exports: [SubscriptionsService, SubscriptionCheckService, AuditLoggerService],
})
export class SubscriptionsModule {}