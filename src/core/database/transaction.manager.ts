
// ============================================
// core/database/transaction.manager.ts
// ============================================
import { Injectable } from '@nestjs/common';
import { SqlServerService } from './sql-server.service';
import * as sql from 'mssql';

@Injectable()
export class TransactionManager {
  constructor(private sqlServerService: SqlServerService) {}

  async runInTransaction<T>(
    callback: (transaction: sql.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.sqlServerService.transaction(callback);
  }
}