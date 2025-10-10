

// ============================================
// UPDATED modules/abac/abac.service.ts
// ============================================
import { Injectable } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { CreateAbacAttributeDto, CreateAbacPolicyDto, EvaluatePolicyDto } from './dto/abac.dto';

@Injectable()
export class AbacService {
  constructor(private sqlService: SqlServerService) {}

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
    // Serialize context to string for caching
    const contextStr = dto.context ? JSON.stringify(dto.context) : '';
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
      
      if (this.matchesPolicy(policyDoc, dto)) {
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
        context: dto.context ? JSON.stringify(dto.context) : null,
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
}
