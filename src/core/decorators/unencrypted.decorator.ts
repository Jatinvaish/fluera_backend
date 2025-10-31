
// ============================================
// src/core/decorators/unencrypted.decorator.ts
// ============================================
import { SetMetadata } from '@nestjs/common';

export const UNENCRYPTED_KEY = 'unencrypted';
export const Unencrypted = () => SetMetadata(UNENCRYPTED_KEY, true);