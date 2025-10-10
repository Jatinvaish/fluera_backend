

// ============================================
// core/database/database.module.ts
// ============================================
import { Module, Global } from '@nestjs/common';
import { SqlServerService } from './sql-server.service';
// TODOO: Re-add MongoDB support if needed
// import { MongoDBService } from './mongodb.service';
import { TransactionManager } from './transaction.manager';

@Global()
@Module({
  // TODOO: Re-add MongoDB support if needed
  // providers: [SqlServerService, MongoDBService, TransactionManager],
  // exports: [SqlServerService, MongoDBService, TransactionManager],
  providers: [SqlServerService, TransactionManager],
  exports: [SqlServerService, TransactionManager],
})
export class DatabaseModule { }