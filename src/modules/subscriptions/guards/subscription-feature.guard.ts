// src/modules/subscriptions/guards/subscription-feature.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionCheckService } from '../subscription-check.service';

export const REQUIRE_FEATURE = 'require_feature';
export const RequireFeature = (featureName: string) =>
  Reflect.metadata(REQUIRE_FEATURE, featureName);

@Injectable()
export class SubscriptionFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionCheckService: SubscriptionCheckService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureName = this.reflector.get<string>(
      REQUIRE_FEATURE,
      context.getHandler(),
    );

    if (!featureName) {
      return true; // No feature requirement
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const hasAccess = await this.subscriptionCheckService.checkFeatureAccess(
      tenantId,
      featureName,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Your plan does not include access to ${featureName}. Please upgrade.`,
      );
    }

    return true;
  }
}