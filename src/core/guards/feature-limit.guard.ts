// core/guards/feature-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationFeaturesService } from '../../modules/organizations/organization-features.service';

export const FEATURE_KEY = 'feature';
export const RequireFeature = (featureKey: string) => SetMetadata(FEATURE_KEY, featureKey);

@Injectable()
export class FeatureLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featuresService: OrganizationFeaturesService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.organizationId) {
      throw new ForbiddenException('User organization not found');
    }

    const check = await this.featuresService.checkFeature(
      user.organizationId,
      featureKey
    );

    if (!check.enabled) {
      throw new ForbiddenException(`Feature '${featureKey}' is not enabled for your organization`);
    }

    if (check.remaining !== null && check.remaining <= 0) {
      throw new ForbiddenException(`Feature '${featureKey}' usage limit exceeded`);
    }

    return true;
  }

  // USE CASES

  // @Post('campaigns')
  // @RequireFeature('campaigns:create')
  // @Permissions('campaigns:create')
  // async createCampaign(@Body() dto: CreateCampaignDto) {
  //   // After successful creation, increment usage
  //   await this.featuresService.incrementFeatureUsage(
  //     user.organizationId,
  //     'campaigns:create'
  //   );
  //   return this.campaignsService.create(dto);
  // }

}



