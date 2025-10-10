// ============================================
// FIX 2: core/middlewares/correlation-id.middleware.ts
// ============================================
import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const correlationId = req.headers['x-request-id'] || uuidv4();
    req['correlationId'] = correlationId;
    res.setHeader('X-Request-ID', correlationId as string);
    next();
  }
}