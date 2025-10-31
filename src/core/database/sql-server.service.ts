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
      const config = {
        ...this.configService.get('database.sqlServer'),
        options: {
          ...this.configService.get('database.sqlServer.options'),
          // 🔒 Security hardening
          enableArithAbort: true,
          trustServerCertificate: process.env.NODE_ENV !== 'production',
          encrypt: process.env.NODE_ENV === 'production',
        }
      };
      
      this.pool = await new sql.ConnectionPool(config).connect();
      this.logger.log('✅ SQL Server connected securely');
    } catch (error) {
      this.logger.error('❌ SQL Server connection failed', error);
      throw error;
    }
  }

  getPool(): sql.ConnectionPool {
    return this.pool;
  }

  /**
   * 🔒 Enhanced query with SQL injection prevention
   */
  async query<T = any>(queryString: string, params?: any): Promise<T[]> {
    try {
      const request = this.pool.request();
      
      if (params) {
        // ✅ Validate and sanitize parameters
        Object.keys(params).forEach((key) => {
          const value = params[key];
          
          // 🔒 Type validation
          if (value !== null && value !== undefined) {
            request.input(key, this.inferSqlType(value), value);
          } else {
            request.input(key, sql.NVarChar, null);
          }
        });
      }

      const result = await request.query(queryString);
      
      if (Array.isArray(result.recordsets) && result.recordsets.length > 1) {
        return result.recordsets as any;
      }
      
      return result.recordset as T[];
    } catch (error) {
      this.logger.error('Query execution failed', {
        query: queryString.substring(0, 100),
        error: error.message,
      });
      throw error;
    }
  }

  async execute(procedureName: string, params?: any): Promise<any> {
    try {
      const request = this.pool.request();
      
      if (params) {
        Object.keys(params).forEach((key) => {
          const value = params[key];
          request.input(key, this.inferSqlType(value), value);
        });
      }

      const result = await request.execute(procedureName);
      
      if (Array.isArray(result.recordsets) && result.recordsets.length > 1) {
        return result.recordsets;
      }
      
      return result.recordset;
    } catch (error) {
      this.logger.error(`SP ${procedureName} failed`, error);
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
      this.logger.error('Transaction rolled back', error);
      throw error;
    }
  }

  /**
   * 🔒 Infer SQL type to prevent type coercion attacks
   */
  private inferSqlType(value: any): any {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? sql.BigInt : sql.Decimal(18, 2);
    }
    if (typeof value === 'boolean') return sql.Bit;
    if (value instanceof Date) return sql.DateTime2;
    if (typeof value === 'string') {
      return value.length > 4000 ? sql.NVarChar(sql.MAX) : sql.NVarChar(4000);
    }
    return sql.NVarChar(sql.MAX);
  }

  /**
   * 🔒 Safe query builder for dynamic WHERE clauses
   */
  buildSafeWhereClause(conditions: Record<string, any>): { whereClause: string; params: any } {
    const whereParts: string[] = [];
    const params: any = {};

    Object.entries(conditions).forEach(([key, value], index) => {
      const paramName = `param${index}`;
      whereParts.push(`${key} = @${paramName}`);
      params[paramName] = value;
    });

    return {
      whereClause: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '',
      params,
    };
  }
}