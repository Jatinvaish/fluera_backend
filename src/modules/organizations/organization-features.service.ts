// modules/organizations/organization-features.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { CreateOrganizationFeatureDto, UpdateOrganizationFeatureDto } from './dto/organization-features.dto';

@Injectable()
export class OrganizationFeaturesService {
  constructor(private sqlService: SqlServerService) { }

  async createFeature(dto: CreateOrganizationFeatureDto, userId: bigint) {
    const result = await this.sqlService.query(
      `INSERT INTO organization_features (
        organization_id, feature_key, is_enabled, limit_value, 
        used_value, reset_period, created_by
      )
      OUTPUT INSERTED.*
      VALUES (@organizationId, @featureKey, @isEnabled, @limitValue, 0, @resetPeriod, @userId)`,
      {
        organizationId: BigInt(dto.organizationId),
        featureKey: dto.featureKey,
        isEnabled: dto.isEnabled ?? true,
        limitValue: dto.limitValue || null,
        resetPeriod: dto.resetPeriod || 'never',
        userId,
      }
    );
    return result[0];
  }

  async getOrganizationFeatures(organizationId: bigint) {
    return this.sqlService.query(
      `SELECT * FROM organization_features 
       WHERE organization_id = @organizationId 
       ORDER BY feature_key`,
      { organizationId }
    );
  }

  async updateFeature(
    organizationId: bigint,
    featureKey: string,
    dto: UpdateOrganizationFeatureDto,
    userId: bigint
  ) {
    const result = await this.sqlService.query(
      `UPDATE organization_features
       SET is_enabled = COALESCE(@isEnabled, is_enabled),
           limit_value = COALESCE(@limitValue, limit_value),
           used_value = COALESCE(@usedValue, used_value),
           updated_by = @userId,
           updated_at = GETUTCDATE()
       OUTPUT INSERTED.*
       WHERE organization_id = @organizationId AND feature_key = @featureKey`,
      {
        organizationId,
        featureKey,
        isEnabled: dto.isEnabled,
        limitValue: dto.limitValue,
        usedValue: dto.usedValue,
        userId,
      }
    );
    return result[0];
  }

  async checkFeature(
    organizationId: bigint,
    featureKey: string
  ): Promise<{ enabled: boolean; remaining: number | null }> {
    const features = await this.sqlService.query(
      `SELECT is_enabled, limit_value, used_value FROM organization_features
       WHERE organization_id = @organizationId AND feature_key = @featureKey`,
      { organizationId, featureKey }
    );

    if (features.length === 0) {
      return { enabled: false, remaining: null };
    }

    const feature = features[0];
    const remaining = feature.limit_value
      ? Math.max(0, feature.limit_value - feature.used_value)
      : null;

    return {
      enabled: feature.is_enabled,
      remaining,
    };
  }

  async incrementFeatureUsage(organizationId: bigint, featureKey: string) {
    const check = await this.checkFeature(organizationId, featureKey);

    if (!check.enabled) {
      throw new ForbiddenException(`Feature ${featureKey} is not enabled`);
    }

    if (check.remaining !== null && check.remaining <= 0) {
      throw new ForbiddenException(`Feature ${featureKey} limit exceeded`);
    }

    await this.sqlService.query(
      `UPDATE organization_features 
       SET used_value = used_value + 1 
       WHERE organization_id = @organizationId AND feature_key = @featureKey`,
      { organizationId, featureKey }
    );
  }

  async resetFeatureLimits() {
    await this.sqlService.query(
      `UPDATE organization_features 
       SET used_value = 0, last_reset_at = GETUTCDATE()
       WHERE (
         (reset_period = 'daily' AND last_reset_at < DATEADD(day, -1, GETUTCDATE())) OR
         (reset_period = 'monthly' AND last_reset_at < DATEADD(month, -1, GETUTCDATE())) OR
         (reset_period = 'yearly' AND last_reset_at < DATEADD(year, -1, GETUTCDATE()))
       )`
    );
  }

  async syncFeaturesFromPlan(organizationId: bigint) {
    // Get organization's subscription plan
    const org = await this.sqlService.query(
      `SELECT o.subscription_plan_id, sp.features 
       FROM organizations o
       LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = @organizationId`,
      { organizationId }
    );

    if (org.length === 0 || !org[0].features) return;

    const planFeatures = JSON.parse(org[0].features);

    for (const [featureKey, config] of Object.entries(planFeatures as any)) {
      const existing = await this.sqlService.query(
        `SELECT id FROM organization_features 
         WHERE organization_id = @organizationId AND feature_key = @featureKey`,
        { organizationId, featureKey }
      );

      if (existing.length === 0) {
        await this.createFeature(
          {
            organizationId: Number(organizationId),
            featureKey,
            //TODO fix this properly
            //@ts-ignore
            isEnabled: config.enabled ?? true,
            //@ts-ignore
            limitValue: config.limit || null,
            //@ts-ignore
            resetPeriod: config.resetPeriod || 'monthly',
          },
          BigInt(0) // System
        );
      }
    }
  }
}