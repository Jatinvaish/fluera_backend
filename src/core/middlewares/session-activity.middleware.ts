import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SqlServerService } from '../database/sql-server.service';

@Injectable()
export class SessionActivityMiddleware implements NestMiddleware {
  constructor(private sqlService: SqlServerService) {}

  async use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '');
    
    if (sessionToken) {
      try {
        // Get session ID from token
        const session = await this.sqlService.query(
          'SELECT id FROM user_sessions WHERE session_token = @token AND is_active = 1',
          { token: sessionToken }
        );

        if (session.length > 0) {
          // ✅ USE SP TO UPDATE ACTIVITY
          await this.sqlService.execute('sp_UpdateSessionActivity', {
            sessionId: session[0].id,
          });
        }
      } catch (error) {
        // Silently fail - don't block request
        console.error('Session activity update failed:', error);
      }
    }
    
    next();
  }
}