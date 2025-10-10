// ============================================
// FIX 1: core/middlewares/logger.middleware.ts
// ============================================
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const { method, url } = req;
    const ip = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    res.on('finish', () => {
      const statusCode = res.statusCode;
      const correlationId = req['correlationId'];

      this.logger.log(
        `[${correlationId}] ${method} ${url} ${statusCode} - ${ip} ${userAgent}`
      );
    });

    next();
  }
}