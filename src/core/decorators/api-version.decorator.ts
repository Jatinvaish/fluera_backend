
// ============================================
// core/decorators/api-version.decorator.ts
// ============================================
// import { applyDecorators, SetMetadata, Version } from '@nestjs/common';

// Reason: applyDecorators expects method decorators but Version is a controller decorator - they can't be combined.
// export const API_VERSION_KEY = 'apiVersion';
// export const ApiVersion = (version: string | string[]) => 
//   applyDecorators(
//     Version(version),
//     SetMetadata(API_VERSION_KEY, version),
//   );

// ============================================
// core/decorators/api-version.decorator.ts
// ============================================
import { Version } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';
export const ApiVersion = (version: string | string[]) => Version(version);