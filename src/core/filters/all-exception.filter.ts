// src/core/filters/all-exception.filter.ts - FASTIFY VERSION
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SqlServerService } from '../database';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private databaseService: SqlServerService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>(); // ← Fastify uses 'reply'
    const request = ctx.getRequest<FastifyRequest>(); // ← Fastify request

    // Check if response has already been sent
    if (reply.sent) {
      this.logger.warn('Response already sent, skipping exception filter');
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'Something went wrong',
    };

    // Log to console immediately
    this.logger.error(
      `Error occurred: ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // Log error to database (non-blocking)
    this.logErrorToDatabase(exception, request, status, errorResponse.message)
      .catch((logError) => {
        this.logger.error('Failed to log error to database:', logError);
      });

    // Send response using Fastify's API
    try {
      reply.status(status).send(errorResponse);
    } catch (err) {
      this.logger.error('Failed to send error response:', err);
      
      // Fallback: try raw response
      if (!reply.sent) {
        try {
          reply.raw.writeHead(status, { 'Content-Type': 'application/json' });
          reply.raw.end(JSON.stringify(errorResponse));
        } catch (fallbackErr) {
          this.logger.error('Fallback response also failed:', fallbackErr);
        }
      }
    }
  }

  private async logErrorToDatabase(
    exception: unknown,
    request: FastifyRequest,
    status: number,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.databaseService.execute('[dbo].[sp_CreateErrorLog]', {
        user_id: (request as any).user?.id || null,
        tenant_id: (request as any).tenant?.id || null,
        error_type:
          exception instanceof HttpException ? exception.name : 'UnknownError',
        error_message: errorMessage,
        stack_trace: exception instanceof Error ? exception.stack : null,
        request_url: request.url,
        request_method: request.method,
        request_body: JSON.stringify(request.body),
        severity: status >= 500 ? 'critical' : 'error',
        ip_address: request.ip || request.socket.remoteAddress,
        user_agent: request.headers['user-agent'],
        metadata: JSON.stringify({
          headers: request.headers,
          params: request.params,
          query: request.query,
        }),
      });
    } catch (logError) {
      this.logger.error('Database logging failed:', logError);
      throw logError;
    }
  }
}