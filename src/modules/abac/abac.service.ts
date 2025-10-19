

// ============================================
// UPDATED modules/abac/abac.service.ts
// ============================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { CreateAbacAttributeDto, CreateAbacPolicyDto, EvaluatePolicyDto } from './dto/abac.dto';

@Injectable()
export class AbacService {
  constructor(private sqlService: SqlServerService) { }

  async createAttribute(dto: CreateAbacAttributeDto) {
    const result = await this.sqlService.query(
      `INSERT INTO abac_attributes (name, category, data_type, description,
                                    validation_rules, default_value, is_required, is_system_attribute)
       OUTPUT INSERTED.*
       VALUES (@name, @category, @dataType, @description, @validationRules,
               @defaultValue, @isRequired, 0)`,
      {
        name: dto.name,
        category: dto.category,
        dataType: dto.dataType,
        description: dto.description || null,
        validationRules: dto.validationRules || null,
        defaultValue: dto.defaultValue || null,
        isRequired: dto.isRequired || false,
      }
    );
    return result[0];
  }

  async createPolicy(dto: CreateAbacPolicyDto, userId?: bigint) {
    const result = await this.sqlService.query(
      `INSERT INTO abac_policies (name, description, organization_id, policy_document,
                                  priority, effect, target_conditions, is_active, version, created_by)
       OUTPUT INSERTED.*
       VALUES (@name, @description, @organizationId, @policyDocument, @priority,
               @effect, @targetConditions, 1, 1, @userId)`,
      {
        name: dto.name,
        description: dto.description || null,
        organizationId: dto.organizationId || null,
        policyDocument: dto.policyDocument,
        priority: dto.priority || 0,
        effect: dto.effect,
        targetConditions: dto.targetConditions || null,
        userId: userId || null,
      }
    );
    return result[0];
  }

  async evaluatePolicy(dto: EvaluatePolicyDto): Promise<{ decision: string; policies: any[] }> {
    console.log("🚀 ~ AbacService ~ evaluatePolicy ~ evaluatePolicy:", dto)

    // Get user attributes from existing table
    const userAttrs = await this.sqlService.query(
      `SELECT a.name, ua.value
     FROM user_attributes ua
     JOIN abac_attributes a ON ua.attribute_id = a.id
     WHERE ua.user_id = @userId
     AND (ua.valid_until IS NULL OR ua.valid_until > GETUTCDATE())`,
      { userId: dto.userId }
    );

    // Get resource attributes if resourceId is provided
    let resourceAttrs = [];
    if (dto.context?.resourceId && dto.context?.resourceType) {
      resourceAttrs = await this.sqlService.query(
        `SELECT a.name, ra.value
       FROM resource_attributes ra
       JOIN abac_attributes a ON ra.attribute_id = a.id
       WHERE ra.resource_type = @resourceType AND ra.resource_id = @resourceId
       AND (ra.valid_until IS NULL OR ra.valid_until > GETUTCDATE())`,
        {
          resourceType: dto.context.resourceType,
          resourceId: dto.context.resourceId
        }
      );
    }

    // Build enriched context
    const enrichedContext = {
      ...dto.context,
      userAttributes: userAttrs.reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}),
      resourceAttributes: resourceAttrs.reduce((acc, attr: any) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}),
    };

    // Serialize context to string for caching
    const contextStr = JSON.stringify(enrichedContext);
    const cacheKey = `${dto.userId}-${dto.action}-${dto.resource}-${contextStr}`;

    const cached = await this.sqlService.query(
      `SELECT * FROM abac_evaluation_cache 
     WHERE cache_key = @cacheKey AND expires_at > GETUTCDATE()`,
      { cacheKey }
    );
    console.log("🚀 ~ AbacService ~ evaluatePolicy ~ cached:", cached)

    if (cached.length > 0) {
      await this.sqlService.query(
        `UPDATE abac_evaluation_cache 
       SET hit_count = hit_count + 1, last_accessed_at = GETUTCDATE()
       WHERE id = @id`,
        { id: cached[0].id }
      );
      return {
        decision: cached[0].decision,
        policies: JSON.parse(cached[0].applicable_policies || '[]'),
      };
    }

    const policies = await this.sqlService.query(
      `SELECT * FROM abac_policies 
     WHERE is_active = 1 
     AND (organization_id IS NULL OR organization_id = @organizationId)
     ORDER BY priority DESC`,
      { organizationId: dto.organizationId || null }
    );
    console.log("🚀 ~ AbacService ~ evaluatePolicy ~ policies:", policies)

    let finalDecision = 'DENY';
    const applicablePolicies = [];

    for (const policy of policies) {
      const policyDoc = JSON.parse(policy.policy_document);

      // Pass enriched context for matching
      if (this.matchesPolicy(policyDoc, { ...dto, context: enrichedContext })) {
        //@ts-ignore
        applicablePolicies.push(policy);
        if (policy.effect === 'PERMIT') {
          finalDecision = 'PERMIT';
        } else if (policy.effect === 'DENY') {
          finalDecision = 'DENY';
          break;
        }
      }
    }

    await this.sqlService.query(
      `INSERT INTO abac_evaluation_cache (cache_key, decision, applicable_policies, expires_at)
     VALUES (@cacheKey, @decision, @policies, DATEADD(minute, 5, GETUTCDATE()))`,
      {
        cacheKey,
        decision: finalDecision,
        //@ts-ignore
        policies: JSON.stringify(applicablePolicies.map(p => p?.id)),
      }
    );

    await this.sqlService.query(
      `INSERT INTO abac_evaluation_logs (user_id, resource_type, action, decision, 
                                       policies_evaluated, context)
     VALUES (@userId, @resource, @action, @decision, @policies, @context)`,
      {
        userId: dto.userId,
        resource: dto.resource,
        action: dto.action,
        decision: finalDecision,
        //@ts-ignore
        policies: JSON.stringify(applicablePolicies.map(p => p?.id)),
        context: JSON.stringify(enrichedContext),
      }
    );

    return { decision: finalDecision, policies: applicablePolicies };
  }

  private matchesPolicy(policyDoc: any, dto: EvaluatePolicyDto): boolean {
    if (policyDoc.actions && !policyDoc.actions.includes(dto.action)) {
      return false;
    }
    if (policyDoc.resources && !policyDoc.resources.includes(dto.resource)) {
      return false;
    }
    return true;
  }

  async findAllPolicies(organizationId?: bigint) {
    let query = 'SELECT * FROM abac_policies WHERE 1=1';
    const params: any = {};

    if (organizationId) {
      query += ' AND (organization_id IS NULL OR organization_id = @organizationId)';
      params.organizationId = organizationId;
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    return this.sqlService.query(query, params);
  }

  async findAllAttributes() {
    return this.sqlService.query(
      'SELECT * FROM abac_attributes WHERE is_active = 1 ORDER BY category, name'
    );
  }
  async assignUserAttributes(
    userId: bigint,
    attributes: { attributeId: number; value: string; validUntil?: Date }[],
    createdBy: bigint
  ) {
    const inserted: any = [];

    for (const attr of attributes) {
      try {
        const result: any = await this.sqlService.query(
          `INSERT INTO user_attributes (user_id, attribute_id, value, valid_until, source, created_by)
         OUTPUT INSERTED.*
         VALUES (@userId, @attributeId, @value, @validUntil, 'manual', @createdBy)`,
          {
            userId,
            attributeId: BigInt(attr.attributeId),
            value: attr.value,
            validUntil: attr.validUntil || null,
            createdBy,
          }
        );
        inserted.push(result[0]);
      } catch (error) {
        // Update if already exists
        await this.sqlService.query(
          `UPDATE user_attributes 
         SET value = @value, valid_until = @validUntil, updated_by = @createdBy, updated_at = GETUTCDATE()
         WHERE user_id = @userId AND attribute_id = @attributeId`,
          {
            userId,
            attributeId: BigInt(attr.attributeId),
            value: attr.value,
            validUntil: attr.validUntil || null,
            createdBy,
          }
        );
      }
    }

    return {
      message: 'User attributes assigned successfully',
      assigned: inserted.length,
      total: attributes.length,
    };
  }

  async getUserAttributes(userId: bigint) {
    return this.sqlService.query(
      `SELECT ua.*, a.name, a.category, a.data_type, a.description
     FROM user_attributes ua
     JOIN abac_attributes a ON ua.attribute_id = a.id
     WHERE ua.user_id = @userId
     AND (ua.valid_until IS NULL OR ua.valid_until > GETUTCDATE())
     ORDER BY a.category, a.name`,
      { userId }
    );
  }

  async updateUserAttribute(
    userId: bigint,
    attributeId: bigint,
    dto: { value: string; validUntil?: Date },
    updatedBy: bigint
  ) {
    const result = await this.sqlService.query(
      `UPDATE user_attributes
     SET value = @value, valid_until = @validUntil, updated_by = @updatedBy, updated_at = GETUTCDATE()
     OUTPUT INSERTED.*
     WHERE user_id = @userId AND attribute_id = @attributeId`,
      {
        userId,
        attributeId,
        value: dto.value,
        validUntil: dto.validUntil || null,
        updatedBy,
      }
    );

    if (result.length === 0) {
      throw new NotFoundException('User attribute not found');
    }

    return result[0];
  }

  async removeUserAttribute(userId: bigint, attributeId: bigint) {
    await this.sqlService.query(
      'DELETE FROM user_attributes WHERE user_id = @userId AND attribute_id = @attributeId',
      { userId, attributeId }
    );
    return { message: 'User attribute removed successfully' };
  }


  async assignResourceAttribute(
    dto: {
      resourceType: string;
      resourceId: number;
      attributeId: number;
      value: string;
      validUntil?: Date;
    },
    createdBy: bigint
  ) {
    try {
      const result = await this.sqlService.query(
        `INSERT INTO resource_attributes (resource_type, resource_id, attribute_id, value, valid_until, created_by)
       OUTPUT INSERTED.*
       VALUES (@resourceType, @resourceId, @attributeId, @value, @validUntil, @createdBy)`,
        {
          resourceType: dto.resourceType,
          resourceId: BigInt(dto.resourceId),
          attributeId: BigInt(dto.attributeId),
          value: dto.value,
          validUntil: dto.validUntil || null,
          createdBy,
        }
      );
      return result[0];
    } catch (error) {
      // Update if exists
      await this.sqlService.query(
        `UPDATE resource_attributes
       SET value = @value, valid_until = @validUntil, updated_by = @createdBy, updated_at = GETUTCDATE()
       WHERE resource_type = @resourceType AND resource_id = @resourceId AND attribute_id = @attributeId`,
        {
          resourceType: dto.resourceType,
          resourceId: BigInt(dto.resourceId),
          attributeId: BigInt(dto.attributeId),
          value: dto.value,
          validUntil: dto.validUntil || null,
          createdBy,
        }
      );
      return { message: 'Resource attribute updated' };
    }
  }

  async getResourceAttributes(resourceType: string, resourceId: bigint) {
    return this.sqlService.query(
      `SELECT ra.*, a.name, a.category, a.data_type, a.description
     FROM resource_attributes ra
     JOIN abac_attributes a ON ra.attribute_id = a.id
     WHERE ra.resource_type = @resourceType AND ra.resource_id = @resourceId
     AND (ra.valid_until IS NULL OR ra.valid_until > GETUTCDATE())
     ORDER BY a.category, a.name`,
      { resourceType, resourceId }
    );
  }

  async removeResourceAttribute(
    resourceType: string,
    resourceId: bigint,
    attributeId: bigint
  ) {
    await this.sqlService.query(
      `DELETE FROM resource_attributes 
     WHERE resource_type = @resourceType AND resource_id = @resourceId AND attribute_id = @attributeId`,
      { resourceType, resourceId, attributeId }
    );
    return { message: 'Resource attribute removed successfully' };
  }

  async createPolicyVersion(policyId: bigint, userId: bigint) {
    // Get current policy
    const current = await this.sqlService.query(
      'SELECT * FROM abac_policies WHERE id = @policyId',
      { policyId }
    );

    if (current.length === 0) {
      throw new NotFoundException('Policy not found');
    }

    const policy = current[0];

    // Create new version
    const result = await this.sqlService.query(
      `INSERT INTO abac_policies (
      name, description, organization_id, policy_document, priority, effect,
      target_conditions, is_active, version, parent_policy_id, created_by
    )
    OUTPUT INSERTED.*
    VALUES (
      @name, @description, @organizationId, @policyDocument, @priority, @effect,
      @targetConditions, 0, @version, @parentPolicyId, @userId
    )`,
      {
        name: policy.name,
        description: policy.description,
        organizationId: policy.organization_id,
        policyDocument: policy.policy_document,
        priority: policy.priority,
        effect: policy.effect,
        targetConditions: policy.target_conditions,
        version: policy.version + 1,
        parentPolicyId: policy.parent_policy_id || policyId,
        userId,
      }
    );

    return result[0];
  }

  async getPolicyVersions(policyId: bigint) {
    return this.sqlService.query(
      `SELECT * FROM abac_policies 
     WHERE id = @policyId OR parent_policy_id = @policyId
     ORDER BY version DESC`,
      { policyId }
    );
  }

  async activatePolicyVersion(versionId: bigint, userId: bigint) {
    // Deactivate all versions
    const version = await this.sqlService.query(
      'SELECT parent_policy_id FROM abac_policies WHERE id = @versionId',
      { versionId }
    );

    const parentId = version[0].parent_policy_id || versionId;

    await this.sqlService.query(
      `UPDATE abac_policies 
     SET is_active = 0 
     WHERE id = @parentId OR parent_policy_id = @parentId`,
      { parentId }
    );

    // Activate selected version
    await this.sqlService.query(
      `UPDATE abac_policies 
     SET is_active = 1, updated_by = @userId, updated_at = GETUTCDATE()
     WHERE id = @versionId`,
      { versionId, userId }
    );

    return { message: 'Policy version activated' };
  }
}
