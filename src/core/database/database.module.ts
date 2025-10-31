// 1. src/core/database/database.module.ts - Make it GLOBAL
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqlServerService } from './sql-server.service';

@Global() // ✅ This makes SqlServerService available everywhere
@Module({
  imports: [ConfigModule], // If it needs ConfigService
  providers: [SqlServerService],
  exports: [SqlServerService],
})
export class DatabaseModule {}