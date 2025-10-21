
// // ============================================
// // UPDATED core/guards/abac.guard.ts
// // ============================================
// import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { ABAC_POLICY_KEY } from '../decorators/abac.decorator';
// import { AbacService } from '../../modules/abac/abac.service';

// @Injectable()
// export class AbacGuard implements CanActivate {
//   constructor(
//     private reflector: Reflector,
//     private abacService: AbacService,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const policy = this.reflector.getAllAndOverride<string>(ABAC_POLICY_KEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]);

//     if (!policy) {
//       return true;
//     }

//     const request = context.switchToHttp().getRequest();
//     const user = request.user;
//     console.log("🚀 ~ AbacGuard ~ canActivate ~ user:", user)

//     if (!user) {
//       throw new ForbiddenException('User not authenticated');
//     }

//     const evaluation = await this.abacService.evaluatePolicy({
//       userId: user.id,
//       organizationId: user.organizationId,
//       action: request.method,
//       resource: request.route?.path || request.url,
//       context: {
//         ip: request.ip,
//         userAgent: request.headers['user-agent'],
//         timestamp: new Date(),
//       },
//     });

//     if (evaluation.decision !== 'PERMIT') {
//       throw new ForbiddenException('Access denied by ABAC policy');
//     }

//     return true;
//   }
// }


// core/guards/enhanced-abac.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbacService } from '../../modules/abac/abac.service';
import { ResourcePermissionService } from 'src/modules/permissions/resource-permission.service';

@Injectable()
export class AbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abacService: AbacService,
    private resourcePermissionService: ResourcePermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get required permission from decorator
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());
    
    // Extract resource ID from request
    const resourceId = request.params.id || request.body?.resourceId;

    // 1. Check RBAC first (fast)
    if (user.permissions?.includes(requiredPermission)) {
      // Still need to check resource-level permissions
      if (resourceId && resourceType) {
        const hasResourceAccess = await this.resourcePermissionService.checkAccess(
          user.id,
          resourceType,
          resourceId,
          requiredPermission
        );
        if (!hasResourceAccess) {
          throw new ForbiddenException('No access to this resource');
        }
      }
      return true;
    }

    // 2. Check ABAC policy evaluation (contextual)
    const evaluation = await this.abacService.evaluatePolicy({
      userId: user.id,
      organizationId: user.organizationId,
      action: requiredPermission,
      resource: resourceType || request.route?.path || request.url,
      context: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date(),
        resourceId,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        userAttributes: await this.abacService.getUserAttributes(user.id),
        resourceAttributes: resourceId 
          ? await this.abacService.getResourceAttributes(resourceType, resourceId)
          : {},
      },
    });

    if (evaluation.decision !== 'PERMIT') {
      throw new ForbiddenException('Access denied by policy');
    }

    return true;
  }
}