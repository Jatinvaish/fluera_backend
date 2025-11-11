// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/all-exception.filter'; // ✅ FIX: Change to GlobalExceptionFilter
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { EncryptionService } from './common/encryption.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { SqlServerService } from './core/database/sql-server.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
    {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-API-Key',
          'X-Request-ID',
          'X-Tenant-ID',
          'X-Encryption-Enabled',
          'X-Key-Version',
          'X-Device-Fingerprint', // ← Add this
        ],
      },
    },
  );

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Fluera API V3.0')
    .setDescription('Multi-tenant SaaS with E2E Encryption')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  const databaseService = app.get(SqlServerService);
  app.useGlobalFilters(new GlobalExceptionFilter(databaseService));

  const reflector = app.get(Reflector);
  const encryptionService = app.get(EncryptionService);

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(reflector, encryptionService),
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();

  fastifyInstance.addHook('preHandler', async (request: FastifyRequest, reply) => {
    console.log(`[${request.headers['x-request-id']}] preHandler called`);
    console.log(`Encryption enabled:`, request.headers['x-encryption-enabled']);
    console.log(`Request body:`, request.body);

    if (request.method === 'OPTIONS') {
      return;
    }

    // ✅ Check env variable if header is not set
    const encryptionEnabledByDefault = process.env.ENCRYPTION_ENABLED_BY_DEFAULT === 'true';
    const encryptionEnabled = request.headers['x-encryption-enabled'] === 'true'
      || (request.headers['x-encryption-enabled'] === undefined && encryptionEnabledByDefault);

    const requestId = request.headers['x-request-id'] || 'unknown';

    if (!encryptionEnabled) {
      console.log(`[${requestId}] Encryption disabled, skipping decryption`);
      return;
    }

    try {
      const body = request.body as any;

      if (body && typeof body === 'object' && body.__payload) {
        console.log(`[${requestId}] Decrypting E2E encrypted payload...`);

        const payload = body.__payload;
        const receivedChecksum = body.__checksum;

        if (receivedChecksum) {
          const crypto = require('crypto');
          const calculatedChecksum = crypto
            .createHash('sha256')
            .update(payload + process.env.ENCRYPTION_KEY)
            .digest('hex');

          if (calculatedChecksum !== receivedChecksum) {
            console.error(`[${requestId}] Checksum mismatch!`);
            throw new Error('Checksum verification failed');
          }
        }

        const decrypted = encryptionService.decrypt(payload);
        const decryptedBody = JSON.parse(decrypted);
        request.body = decryptedBody;

        console.log(`[${requestId}] ✓ Decrypted successfully`);
      }
    } catch (error) {
      console.error(`[${requestId}] Decryption error:`, error.message);
      throw error;
    }
  });

  const port = process.env.PORT || 3060;
  await app.listen(port, '0.0.0.0');

  console.log(`
    ╔═══════════════════════════════════════════════════╗
    ║                                                   ║
    ║   🚀 Fluera V3.0 - Multi-Tenant SaaS              ║
    ║                                                   ║
    ║   📡 Server: http://localhost:${port}             ║
    ║   📚 Docs: http://localhost:${port}/api/docs      ║
    ║   🔒 Mode: ${process.env.NODE_ENV}                ║
    ║   🔐 Encryption: AES-256-CBC (E2E)                ║
    ║   🏢 Multi-Tenant: ENABLED                        ║
    ║                                                   ║
    ╚═══════════════════════════════════════════════════╝
  `);
}

bootstrap();