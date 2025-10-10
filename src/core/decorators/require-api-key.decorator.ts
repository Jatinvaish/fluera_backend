
// ============================================
// core/decorators/require-api-key.decorator.ts
// ============================================
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_API_KEY = 'requireApiKey';
export const RequireApiKey = () => SetMetadata(REQUIRE_API_KEY, true);