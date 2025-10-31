
// ============================================
// FIX 4: src/modules/global-modules/system-config/system-config.service.ts
// ============================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { EncryptionService } from 'src/common/encryption.service';
import { SqlServerService } from 'src/core/database';

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly db: SqlServerService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getConfig(key: string, tenantId?: number) {
    const result = await this.db.query(
      `SELECT * FROM system_config 
       WHERE config_key = @key 
       AND (@tenantId IS NULL AND tenant_id IS NULL OR tenant_id = @tenantId)`,
      { key, tenantId },
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(`Config key '${key}' not found`);
    }

    const config = result[0];

    // Decrypt if encrypted
    if (config.is_encrypted && config.config_value) {
      try {
        config.config_value = await this.encryptionService.decrypt(
          config.config_value,
        );
      } catch (error) {
        console.error('Failed to decrypt config value:', error);
      }
    }

    return {
      success: true,
      data: config,
    };
  }

  async setConfig(
    key: string,
    value: any,
    configType: string = 'string',
    isEncrypted: boolean = false,
    tenantId?: number,
    userId?: number,
  ) {
    let configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // Encrypt if requested
    if (isEncrypted) {
      configValue = await this.encryptionService.encrypt(configValue);
    }

    const result = await this.db.query(
      `MERGE system_config AS target
       USING (SELECT @key AS config_key, @tenantId AS tenant_id) AS source
       ON (target.config_key = source.config_key 
           AND (@tenantId IS NULL AND target.tenant_id IS NULL OR target.tenant_id = source.tenant_id))
       WHEN MATCHED THEN
         UPDATE SET 
           config_value = @value,
           config_type = @configType,
           is_encrypted = @isEncrypted,
           updated_at = GETUTCDATE(),
           updated_by = @userId
       WHEN NOT MATCHED THEN
         INSERT (tenant_id, config_key, config_value, config_type, is_encrypted, created_by, updated_by)
         VALUES (@tenantId, @key, @value, @configType, @isEncrypted, @userId, @userId)
       OUTPUT INSERTED.*;`,
      {
        key,
        value: configValue,
        configType,
        isEncrypted: isEncrypted ? 1 : 0,
        tenantId,
        userId,
      },
    );

    return {
      success: true,
      data: result[0],
      message: 'Config saved successfully',
    };
  }

  async deleteConfig(key: string, tenantId?: number) {
    const result = await this.db.query(
      `DELETE FROM system_config 
       WHERE config_key = @key 
       AND (@tenantId IS NULL AND tenant_id IS NULL OR tenant_id = @tenantId)`,
      { key, tenantId },
    );

    return {
      success: true,
      message: 'Config deleted successfully',
    };
  }

  async getAllConfigs(tenantId?: number) {
    const result = await this.db.query(
      `SELECT * FROM system_config 
       WHERE @tenantId IS NULL AND tenant_id IS NULL OR tenant_id = @tenantId
       ORDER BY config_key`,
      { tenantId },
    );

    // Decrypt encrypted values
    for (const config of result) {
      if (config.is_encrypted && config.config_value) {
        try {
          config.config_value = await this.encryptionService.decrypt(
            config.config_value,
          );
        } catch (error) {
          console.error('Failed to decrypt config value:', error);
        }
      }
    }

    return {
      success: true,
      data: result,
    };
  }
}