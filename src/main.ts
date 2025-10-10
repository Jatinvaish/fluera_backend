// import { NestFactory } from '@nestjs/core';
// import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
// import { ValidationPipe, VersioningType } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import helmet from '@fastify/helmet';
// import compression from '@fastify/compress';
// import { AllExceptionsFilter } from './core/filters/all-exception.filter';
// import { ResponseInterceptor } from './core/interceptors/response.interceptor';
// import { AuditInterceptor } from './core/interceptors/audit.interceptor';
// import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     new FastifyAdapter({ logger: true }),
//     {
//       cors: {
//         origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
//         credentials: true,
//         methods: ['POST', 'OPTIONS'],
//         allowedHeaders: [
//           'Content-Type',
//           'Authorization',
//           'X-API-Key',
//           'X-Request-ID',
//           'X-Organization-ID',
//         ],
//       },
//     },
//   );

//   // Security middleware
//   await app.register(helmet, {
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         scriptSrc: ["'self'"],
//         imgSrc: ["'self'", 'data:', 'https:'],
//       },
//     },
//   });

//   // Compression
//   await app.register(compression, { encodings: ['gzip', 'deflate'] });

//   // Rate limiting
//   // await app.register(rateLimit, {
//   //   max: 100,
//   //   timeWindow: '1 minute',
//   //   errorResponseBuilder: (req, context) => ({
//   //     statusCode: 429,
//   //     error: 'Too Many Requests',
//   //     message: 'Rate limit exceeded. Please try again later.',
//   //   }),
//   // });

//   // Global prefix
//   app.setGlobalPrefix('api');

//   // API Versioning
//   app.enableVersioning({
//     type: VersioningType.URI,
//     defaultVersion: '1',
//     prefix: 'v',
//   });

//   // Global pipes
//   app.useGlobalPipes(
//     new ValidationPipe({
//       transform: true,
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transformOptions: {
//         enableImplicitConversion: true,
//       },
//     }),
//   );

//   // Global filters
//   app.useGlobalFilters(new AllExceptionsFilter());

//   // Global interceptors
//   app.useGlobalInterceptors(
//     new LoggingInterceptor(),
//     new ResponseInterceptor(),
//   );

//   // Swagger documentation
//   if (process.env.NODE_ENV !== 'production') {
//     const config = new DocumentBuilder()
//       .setTitle('Fluera SaaS Platform API')
//       .setDescription('Comprehensive Influencer Marketing Platform API')
//       .setVersion('1.0')
//       .addBearerAuth(
//         {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//           name: 'Authorization',
//           description: 'Enter JWT token',
//           in: 'header',
//         },
//         'JWT-auth',
//       )
//       .addApiKey(
//         {
//           type: 'apiKey',
//           name: 'X-API-Key',
//           in: 'header',
//           description: 'API Key for service-to-service authentication',
//         },
//         'api-key',
//       )
//       .addTag('Auth', 'Authentication endpoints')
//       .addTag('System Config', 'System configuration management')
//       .addTag('Audit Logs', 'Audit trail and logging')
//       .addTag('ABAC', 'Attribute-Based Access Control')
//       .build();

//     const document = SwaggerModule.createDocument(app, config);
//     SwaggerModule.setup('api/docs', app, document);
//   }

//   const port = process.env.PORT || 3000;
//   await app.listen(port, '0.0.0.0');

//   console.log(`
//     ╔═══════════════════════════════════════════════════╗
//     ║                                                   ║
//     ║   🚀 Fluera SaaS Platform Backend Started       ║
//     ║                                                   ║
//     ║   📡 Server: http://localhost:${port}             ║
//     ║   📚 Docs: http://localhost:${port}/api/docs     ║
//     ║   🔒 Mode: ${process.env.NODE_ENV}               ║
//     ║                                                   ║
//     ╚═══════════════════════════════════════════════════╝
//   `);
// }

// bootstrap();


// ============================================
// UPDATED main.ts (Remove schedule module)
// ============================================
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exception.filter';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
    {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['POST', 'GET', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-API-Key',
          'X-Request-ID',
          'X-Organization-ID',
        ],
      },
    },
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global pipes
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
  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors - FIXED
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Application running on: http://localhost:${port}`);
  
  console.log(`
    ╔═══════════════════════════════════════════════════╗
    ║                                                   ║
    ║   🚀 Fluera SaaS Platform Backend Started         ║
    ║                                                   ║ 
    ║   📡 Server: http://localhost:${port}             ║
    ║   📚 Docs: http://localhost:${port}/api/docs      ║
    ║   🔒 Mode: ${process.env.NODE_ENV}                ║
    ║                                                   ║
    ╚═══════════════════════════════════════════════════╝
  `);
}

bootstrap();
