// ============================================
// main.ts - COMPLETE WITH AES-CBC DECRYPTION
// ============================================
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exception.filter';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { EncryptionService } from './common/encryption.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
          'X-Organization-ID',
          'X-Encryption-Enabled',
          'X-Key-Version',
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
    .setTitle('Fluera API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalFilters(new AllExceptionsFilter());

  const reflector = app.get(Reflector);
  const encryptionService = app.get(EncryptionService);

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(reflector, encryptionService),
  );

  // Get Fastify instance to add decryption hook
  const fastifyInstance = app.getHttpAdapter().getInstance();

  // Add preHandler hook to decrypt body BEFORE validation
  fastifyInstance.addHook('preHandler', async (request, reply) => {
    console.log(`[${request.headers['x-request-id']}] preHandler called`);
    console.log(`Encryption enabled:`, request.headers['x-encryption-enabled']);
    console.log(`Request body:`, request.body);

    const encryptionEnabled = request.headers['x-encryption-enabled'] === 'true';
    const requestId = request.headers['x-request-id'] || 'unknown';

    if (!encryptionEnabled) {
      return;
    }

    try {
      const body = request.body as any;

      if (body && typeof body === 'object' && body.__payload) {
        console.log(`[${requestId}] Found encrypted payload, decrypting...`);

        const payload = body.__payload;
        const receivedChecksum = body.__checksum;

        // Verify checksum if provided
        if (receivedChecksum) {
          const crypto = require('crypto');
          const calculatedChecksum = crypto
            .createHash('sha256')
            .update(payload + process.env.ENCRYPTION_KEY)
            .digest('hex');

          console.log(`[${requestId}] Checksum validation:`);
          console.log(`  Received:   ${receivedChecksum}`);
          console.log(`  Calculated: ${calculatedChecksum}`);

          if (calculatedChecksum !== receivedChecksum) {
            console.error(`[${requestId}] Checksum mismatch!`);
            throw new Error('Checksum verification failed');
          }
          console.log(`[${requestId}] ✓ Checksum verified`);
        }

        try {
          // Decrypt the payload using EncryptionService
          const decrypted = encryptionService.decrypt(payload);
          const decryptedBody = JSON.parse(decrypted);

          // Replace request body with decrypted data
          request.body = decryptedBody;

          console.log(
            `[${requestId}] ✓ Decrypted successfully. Body keys:`,
            Object.keys(decryptedBody),
          );
        } catch (decryptError) {
          console.error(
            `[${requestId}] ✗ Decryption failed:`,
            decryptError.message,
          );
          throw new Error(`Decryption failed: ${decryptError.message}`);
        }
      } else {
        console.log(`[${requestId}] No __payload in body, skipping decryption`);
      }
    } catch (error) {
      console.error(`[${requestId}] PreHandler error:`, error.message);
      throw error;
    }
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`
    ╔═══════════════════════════════════════════════════╗
    ║                                                   ║
    ║   🚀 Fluera SaaS Platform Backend Started         ║
    ║                                                   ║
    ║   📡 Server: http://localhost:${port}             ║
    ║   📚 Docs: http://localhost:${port}/api/docs      ║
    ║   🔒 Mode: ${process.env.NODE_ENV}                ║
    ║   🔐 Encryption: AES-256-CBC                      ║
    ║                                                   ║
    ╚═══════════════════════════════════════════════════╝
  `);
}

bootstrap();