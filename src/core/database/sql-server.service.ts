// core/database/sql-server.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class SqlServerService implements OnModuleInit {
  private pool: sql.ConnectionPool;
  private readonly logger = new Logger(SqlServerService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      const config = this.configService.get('database.sqlServer');
      this.pool = await new sql.ConnectionPool(config).connect();
      this.logger.log('✅ SQL Server connected successfully');
    } catch (error) {
      this.logger.error('❌ SQL Server connection failed', error);
      throw error;
    }
  }

  getPool(): sql.ConnectionPool {
    return this.pool;
  }

  async query<T = any>(queryString: string, params?: any): Promise<T[]> {
    try {
      const request = this.pool.request();
      
      if (params) {
        Object.keys(params).forEach((key) => {
          request.input(key, params[key]);
        });
      }

      const result = await request.query(queryString);
      
      // Return all recordsets for stored procedures that return multiple result sets
      // If only one recordset, return it directly for backward compatibility
      if (Array.isArray(result.recordsets) && result.recordsets.length > 1) {
        return result.recordsets as any;
      }
      
      return result.recordset as T[];
    } catch (error) {
      this.logger.error('Query execution failed', error);
      throw error;
    }
  }

  async execute(procedureName: string, params?: any): Promise<any> {
    try {
      const request = this.pool.request();
      
      if (params) {
        Object.keys(params).forEach((key) => {
          request.input(key, params[key]);
        });
      }

      const result = await request.execute(procedureName);
      
      // Return all recordsets for stored procedures that return multiple result sets
      if (Array.isArray(result.recordsets) && result.recordsets.length > 1) {
        return result.recordsets;
      }
      
      return result.recordset;
    } catch (error) {
      this.logger.error(`Stored procedure ${procedureName} execution failed`, error);
      throw error;
    }
  }

  async transaction(callback: (transaction: sql.Transaction) => Promise<any>): Promise<any> {
    const transaction = new sql.Transaction(this.pool);
    
    try {
      await transaction.begin();
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Transaction failed and rolled back', error);
      throw error;
    }
  }
}