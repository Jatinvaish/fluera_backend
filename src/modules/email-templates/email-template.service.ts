// ============================================
// email-template.service.ts
// Service for managing email templates
// ============================================
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SqlServerService } from 'src/core/database/sql-server.service';

export interface EmailTemplate {
  id: bigint;
  organization_id: bigint;
  name: string;
  category: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables?: string;
  usage_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTemplateDto {
  organizationId: bigint;
  name: string;
  category: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables?: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  id: bigint;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private sqlService: SqlServerService) { }

  /**
   * Get template by category and organization
   */
  async getTemplate(category: string, organizationId?: bigint): Promise<EmailTemplate | null> {
    try {
      const result = await this.sqlService.execute(
        'sp_GetEmailTemplate',
        {
          tenant_id: organizationId || null,
          category
        }
      );

      if (!result || result.length === 0) {
        return null;
      }

      return result[0];
    } catch (error) {
      this.logger.error(`Failed to get template: ${category}`, error.stack);
      throw error;
    }
  }

  /**
   * Create or update email template
   */
  async upsertTemplate(dto: CreateTemplateDto | UpdateTemplateDto, userId: bigint): Promise<bigint> {
    try {
      const id = 'id' in dto ? dto.id : null;

      const result = await this.sqlService.execute(
        'sp_UpsertEmailTemplate',
        {
          id: id || null,
          organizationId: dto.organizationId,
          name: dto.name,
          category: dto.category,
          subject: dto.subject,
          bodyHtml: dto.bodyHtml,
          bodyText: dto.bodyText || null,
          variables: dto.variables ? JSON.stringify(dto.variables) : null,
          userId,
          isActive: dto.isActive !== false,
        }
      );

      return result[0].id;
    } catch (error) {
      this.logger.error('Failed to upsert template', error.stack);
      throw new BadRequestException('Failed to save email template');
    }
  }


  /**
   * Get all templates for an organization
   */
  async getOrganizationTemplates(
    organizationId: bigint,
    includeGlobal: boolean = true
  ): Promise<EmailTemplate[]> {
    try {
      // ✅ USE SP INSTEAD OF INLINE SQL
      const result = await this.sqlService.execute(
        'sp_GetOrganizationTemplates',
        {
          organizationId,
          includeGlobal: includeGlobal ? 1 : 0
        }
      );

      return result || [];
    } catch (error) {
      this.logger.error('Failed to get organization templates', error.stack);
      throw error;
    }
  }


  /**
   * Delete a template
   */
  async deleteTemplate(id: bigint, organizationId: bigint): Promise<boolean> {
    try {
      // ✅ USE SP INSTEAD OF INLINE SQL
      const result = await this.sqlService.execute(
        'sp_DeleteEmailTemplate',
        { id, organizationId }
      );

      return result[0]?.affected_rows > 0;
    } catch (error) {
      this.logger.error('Failed to delete template', error.stack);
      throw new BadRequestException('Failed to delete email template');
    }
  }
  /**
   * Validate template variables
   */
  validateTemplateVariables(
    template: string,
    providedVariables: Record<string, any>
  ): { valid: boolean; missing: string[] } {
    // Extract all {{variable}} patterns from template
    const regex = /{{(\w+)}}/g;
    const matches = [...template.matchAll(regex)];
    const requiredVars = new Set(matches.map(m => m[1]));

    const providedVars = new Set(Object.keys(providedVariables));
    const missing: string[] = [];

    for (const required of requiredVars) {
      if (!providedVars.has(required)) {
        missing.push(required);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Preview template with variables
   */
  async previewTemplate(
    category: string,
    variables: Record<string, any>,
    organizationId?: bigint
  ): Promise<{ subject: string; html: string }> {
    const template = await this.getTemplate(category, organizationId);

    if (!template) {
      throw new NotFoundException(`Template not found: ${category}`);
    }

    const validation = this.validateTemplateVariables(template.body_html, variables);
    if (!validation.valid) {
      throw new BadRequestException(
        `Missing required variables: ${validation.missing.join(', ')}`
      );
    }

    const subject = this.replaceVariables(template.subject, variables);
    const html = this.replaceVariables(template.body_html, variables);

    return { subject, html };
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    return result;
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(organizationId: bigint): Promise<any[]> {
    try {
      const result = await this.sqlService.query(
        `SELECT 
          category,
          COUNT(*) as template_count,
          SUM(usage_count) as total_usage,
          MAX(updated_at) as last_updated
        FROM email_templates
        WHERE organization_id = @organizationId OR organization_id = 0
        GROUP BY category
        ORDER BY total_usage DESC`,
        { organizationId }
      );

      return result || [];
    } catch (error) {
      this.logger.error('Failed to get template stats', error.stack);
      throw error;
    }
  }

  /**
   * Clone template to organization
   */
  async cloneTemplate(
    sourceTemplateId: bigint,
    targetOrganizationId: bigint,
    userId: bigint,
    newName?: string
  ): Promise<bigint> {
    try {
      // Get source template
      const source = await this.sqlService.query(
        'SELECT * FROM email_templates WHERE id = @id',
        { id: sourceTemplateId }
      );

      if (!source || source.length === 0) {
        throw new NotFoundException('Source template not found');
      }

      const template = source[0];

      // Create new template
      return await this.upsertTemplate({
        organizationId: targetOrganizationId,
        name: newName || `${template.name} (Copy)`,
        category: template.category,
        subject: template.subject,
        bodyHtml: template.body_html,
        bodyText: template.body_text,
        variables: template.variables ? JSON.parse(template.variables) : undefined,
        isActive: template.is_active,
      }, userId);
    } catch (error) {
      this.logger.error('Failed to clone template', error.stack);
      throw new BadRequestException('Failed to clone email template');
    }
  }
}