
// ============================================
// core/decorators/abac.decorator.ts
// ============================================
import { SetMetadata } from '@nestjs/common';

export const ABAC_POLICY_KEY = 'abacPolicy';
export const AbacPolicy = (policyName: string) => 
  SetMetadata(ABAC_POLICY_KEY, policyName);