// src/core/filters/all-exception.filter.ts - FIXED VERSION
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
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

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
      // ✅ Properly serialize error message
      let sanitizedErrorMessage: string;
      try {
        if (typeof errorMessage === 'string') {
          sanitizedErrorMessage = errorMessage;
        } else if (errorMessage && typeof errorMessage === 'object') {
          sanitizedErrorMessage = JSON.stringify(errorMessage);
        } else {
          sanitizedErrorMessage = String(errorMessage || 'Unknown error');
        }

        // ✅ Truncate to SQL Server NVARCHAR limit (4000 chars)
        if (sanitizedErrorMessage.length > 4000) {
          sanitizedErrorMessage = sanitizedErrorMessage.substring(0, 3997) + '...';
        }
      } catch (serializeError) {
        this.logger.error('Failed to serialize error message:', serializeError);
        sanitizedErrorMessage = 'Error serialization failed';
      }

      // ✅ Properly serialize stack trace
      let stackTrace: string | null = null;
      try {
        if (exception instanceof Error && exception.stack) {
          stackTrace = exception.stack;
          // Truncate stack trace if too long
          if (stackTrace.length > 4000) {
            stackTrace = stackTrace.substring(0, 3997) + '...';
          }
        }
      } catch (stackError) {
        this.logger.error('Failed to serialize stack trace:', stackError);
      }

      // ✅ Properly serialize request body
      let requestBody: string = '{}';
      try {
        if (request.body) {
          requestBody = JSON.stringify(request.body);
          // Truncate if too long
          if (requestBody.length > 4000) {
            requestBody = requestBody.substring(0, 3997) + '...';
          }
        }
      } catch (bodyError) {
        this.logger.error('Failed to serialize request body:', bodyError);
        requestBody = '{"error": "Serialization failed"}';
      }

      // ✅ Properly serialize metadata
      let metadata: string = '{}';
      try {
        metadata = JSON.stringify({
          headers: request.headers,
          params: request.params,
          query: request.query,
          isGlobalAdmin: (request as any).user?.userType === 'super_admin',
        });
        // Truncate if too long
        if (metadata.length > 4000) {
          metadata = metadata.substring(0, 3997) + '...';
        }
      } catch (metaError) {
        this.logger.error('Failed to serialize metadata:', metaError);
        metadata = '{"error": "Serialization failed"}';
      }

      await this.databaseService.execute('[dbo].[sp_CreateErrorLog]', {
        user_id: (request as any).user?.id || null,
        tenant_id: (request as any).tenant?.id || (request as any).user?.tenantId || null,
        error_type: exception instanceof HttpException ? exception.name : 'UnknownError',
        error_message: sanitizedErrorMessage, // ✅ Properly sanitized
        stack_trace: stackTrace, // ✅ Can be NULL
        request_url: request.url,
        request_method: request.method,
        request_body: requestBody, // ✅ Properly serialized
        severity: status >= 500 ? 'critical' : 'error',
        ip_address: request.ip || request.socket.remoteAddress || null,
        user_agent: request.headers['user-agent'] || null,
        metadata: metadata, // ✅ Properly serialized
      });

      this.logger.debug('Error logged to database successfully');
    } catch (logError) {
      // Don't throw, just log the database error
      this.logger.error('Database logging failed:', logError);
      if (logError instanceof Error) {
        this.logger.error('Database logging error stack:', logError.stack);
      }
    }
  }
}