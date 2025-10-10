
// ============================================
// modules/global-modules/system-config/system-config.service.ts
// ============================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { SqlServerService } from '../../../core/database/sql-server.service';
import { CreateSystemConfigDto, UpdateSystemConfigDto } from './dto/system-config.dto';
import { EncryptionService } from 'src/common/encryption.service';

@Injectable()
export class SystemConfigService {
  constructor(
    private sqlService: SqlServerService,
    private encryptionService: EncryptionService,
  ) {}

  async findAll() {
    const configs = await this.sqlService.query(`
      SELECT id, config_key, config_value, config_type, is_encrypted, 
             environment, created_at, updated_at
      FROM system_config
      ORDER BY config_key
    `);

    return configs.map(config => {
      if (config.is_encrypted && config.config_value) {
        try {
          config.config_value = this.encryptionService.decrypt(config.config_value);
        } catch (error) {
          console.error('Failed to decrypt config value', error);
        }
      }
      return config;
    });
  }

  async findOne(id: bigint) {
    const configs = await this.sqlService.query(
      'SELECT * FROM system_config WHERE id = @id',
      { id }
    );

    if (configs.length === 0) {
      throw new NotFoundException('Config not found');
    }

    const config = configs[0];
    if (config.is_encrypted && config.config_value) {
      config.config_value = this.encryptionService.decrypt(config.config_value);
    }

    return config;
  }

  async findByKey(key: string) {
    const configs = await this.sqlService.query(
      'SELECT * FROM system_config WHERE config_key = @key',
      { key }
    );

    if (configs.length === 0) {
      return null;
    }

    const config = configs[0];
    if (config.is_encrypted && config.config_value) {
      config.config_value = this.encryptionService.decrypt(config.config_value);
    }

    return config;
  }

  async create(dto: CreateSystemConfigDto, userId?: bigint) {
    let valueToStore = dto.configValue;

    if (dto.isEncrypted && valueToStore) {
      valueToStore = this.encryptionService.encrypt(valueToStore);
    }

    const result = await this.sqlService.query(
      `INSERT INTO system_config (config_key, config_value, config_type, is_encrypted, environment, created_by)
       OUTPUT INSERTED.*
       VALUES (@key, @value, @type, @encrypted, @environment, @userId)`,
      {
        key: dto.configKey,
        value: valueToStore,
        type: dto.configType || 'string',
        encrypted: dto.isEncrypted || false,
        environment: dto.environment || 'production',
        userId: userId || null,
      }
    );

    return result[0];
  }

  async update(id: bigint, dto: UpdateSystemConfigDto, userId?: bigint) {
    let valueToStore = dto.configValue;

    if (dto.isEncrypted && valueToStore) {
      valueToStore = this.encryptionService.encrypt(valueToStore);
    }

    const result = await this.sqlService.query(
      `UPDATE system_config
       SET config_value = @value,
           config_type = COALESCE(@type, config_type),
           is_encrypted = COALESCE(@encrypted, is_encrypted),
           updated_at = GETUTCDATE(),
           updated_by = @userId
       OUTPUT INSERTED.*
       WHERE id = @id`,
      {
        id,
        value: valueToStore,
        type: dto.configType,
        encrypted: dto.isEncrypted,
        userId: userId || null,
      }
    );

    if (result.length === 0) {
      throw new NotFoundException('Config not found');
    }

    return result[0];
  }

  async remove(id: bigint) {
    const result = await this.sqlService.query(
      'DELETE FROM system_config OUTPUT DELETED.* WHERE id = @id',
      { id }
    );

    if (result.length === 0) {
      throw new NotFoundException('Config not found');
    }

    return { message: 'Config deleted successfully' };
  }
}
