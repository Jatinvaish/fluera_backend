
// ============================================
// UPDATED core/guards/abac.guard.ts
// ============================================
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ABAC_POLICY_KEY } from '../decorators/abac.decorator';
import { AbacService } from '../../modules/abac/abac.service';

@Injectable()
export class AbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abacService: AbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<string>(ABAC_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log("🚀 ~ AbacGuard ~ canActivate ~ user:", user)

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const evaluation = await this.abacService.evaluatePolicy({
      userId: user.id,
      organizationId: user.organizationId,
      action: request.method,
      resource: request.route?.path || request.url,
      context: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date(),
      },
    });

    if (evaluation.decision !== 'PERMIT') {
      throw new ForbiddenException('Access denied by ABAC policy');
    }

    return true;
  }
}