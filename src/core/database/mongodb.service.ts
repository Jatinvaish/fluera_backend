
// // ============================================
// // core/database/mongodb.service.ts
// // ============================================
// import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { MongoClient, Db } from 'mongodb';

// @Injectable()
// export class MongoDBService implements OnModuleInit {
//   private client: MongoClient;
//   private db: Db;
//   private readonly logger = new Logger(MongoDBService.name);

//   constructor(private configService: ConfigService) {}

//   async onModuleInit() {
//     await this.connect();
//   }

//   private async connect() {
//     try {
//       const config = this.configService.get('database.mongodb');
//       this.client = await MongoClient.connect(config.uri, config.options);
//       this.db = this.client.db();
//       this.logger.log('✅ MongoDB connected successfully');
//     } catch (error) {
//       this.logger.error('❌ MongoDB connection failed', error);
//       throw error;
//     }
//   }

//   getDb(): Db {
//     return this.db;
//   }

//   getClient(): MongoClient {
//     return this.client;
//   }
// }