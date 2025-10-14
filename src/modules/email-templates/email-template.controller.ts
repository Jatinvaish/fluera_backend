
// ============================================
// email-template.controller.ts
// ============================================
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/guards/roles.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto, PreviewTemplateDto, SendTestEmailDto } from './dto/email-template.dto';


@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailTemplateController {
  constructor(
    private emailTemplateService: EmailTemplateService,
    private emailService: EmailService,
  ) {}

  /**
   * Get all templates for organization
   * GET /email-templates?includeGlobal=true
   */
  @Get()
  @Roles('admin', 'agency_admin', 'brand_admin')
  async getTemplates(
    @Request() req,
    @Query('includeGlobal') includeGlobal?: string,
  ) {
    const organizationId = req.user.organizationId;
    const templates = await this.emailTemplateService.getOrganizationTemplates(
      organizationId,
      includeGlobal === 'true',
    );

    return {
      success: true,
      data: templates,
    };
  }

  /**
   * Get template by category
   * GET /email-templates/category/:category
   */
  @Get('category/:category')
  @Roles('admin', 'agency_admin', 'brand_admin')
  async getTemplateByCategory(
    @Request() req,
    @Param('category') category: string,
  ) {
    const organizationId = req.user.organizationId;
    const template = await this.emailTemplateService.getTemplate(
      category,
      organizationId,
    );

    return {
      success: true,
      data: template,
    };
  }

  /**
   * Create new template
   * POST /email-templates
   */
  @Post()
  @Roles('admin', 'agency_admin')
  async createTemplate(
    @Request() req,
    @Body() createDto: CreateEmailTemplateDto,
  ) {
    const userId = req.user.id;
    
    // Ensure user can only create templates for their organization
    if (createDto.organizationId !== req.user.organizationId) {
      return {
        success: false,
        message: 'Cannot create template for different organization',
      };
    }

    const templateId = await this.emailTemplateService.upsertTemplate(
      createDto,
      userId,
    );

    return {
      success: true,
      message: 'Template created successfully',
      data: { id: templateId },
    };
  }

  /**
   * Update existing template
   * PUT /email-templates/:id
   */
  @Put(':id')
  @Roles('admin', 'agency_admin')
  async updateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: Omit<UpdateEmailTemplateDto, 'id'>,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organizationId;

    const templateId = await this.emailTemplateService.upsertTemplate(
      {
        ...updateDto,
        id: BigInt(id),
        organizationId,
      },
      userId,
    );

    return {
      success: true,
      message: 'Template updated successfully',
      data: { id: templateId },
    };
  }

  /**
   * Delete template
   * DELETE /email-templates/:id
   */
  @Delete(':id')
  @Roles('admin', 'agency_admin')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(
    @Request() req,
    @Param('id') id: string,
  ) {
    const organizationId = req.user.organizationId;
    const deleted = await this.emailTemplateService.deleteTemplate(
      BigInt(id),
      organizationId,
    );

    return {
      success: deleted,
      message: deleted ? 'Template deleted successfully' : 'Template not found',
    };
  }

  /**
   * Preview template with variables
   * POST /email-templates/preview
   */
  @Post('preview')
  @Roles('admin', 'agency_admin', 'brand_admin')
  async previewTemplate(
    @Request() req,
    @Body() previewDto: PreviewTemplateDto,
  ) {
    const organizationId = previewDto.organizationId || req.user.organizationId;
    const preview = await this.emailTemplateService.previewTemplate(
      previewDto.category,
      previewDto.variables,
      organizationId,
    );

    return {
      success: true,
      data: preview,
    };
  }

  /**
   * Send test email
   * POST /email-templates/test
   */
  @Post('test')
  @Roles('admin', 'agency_admin', 'brand_admin')
  async sendTestEmail(
    @Request() req,
    @Body() testDto: SendTestEmailDto,
  ) {
    const organizationId = testDto.organizationId || req.user.organizationId;
    
    await this.emailService.sendCustomEmail(
      testDto.category,
      testDto.testEmail,
      testDto.variables,
      organizationId,
    );

    return {
      success: true,
      message: `Test email sent to ${testDto.testEmail}`,
    };
  }

  /**
   * Get template statistics
   * GET /email-templates/stats
   */
  @Get('stats')
  @Roles('admin', 'agency_admin')
  async getTemplateStats(@Request() req) {
    const organizationId = req.user.organizationId;
    const stats = await this.emailTemplateService.getTemplateStats(organizationId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Clone template
   * POST /email-templates/:id/clone
   */
  @Post(':id/clone')
  @Roles('admin', 'agency_admin')
  async cloneTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body('newName') newName?: string,
  ) {
    const userId = req.user.id;
    const organizationId = req.user.organizationId;

    const newTemplateId = await this.emailTemplateService.cloneTemplate(
      BigInt(id),
      organizationId,
      userId,
      newName,
    );

    return {
      success: true,
      message: 'Template cloned successfully',
      data: { id: newTemplateId },
    };
  }

  /**
   * Validate template variables
   * POST /email-templates/validate
   */
  @Post('validate')
  @Roles('admin', 'agency_admin', 'brand_admin')
  async validateTemplate(
    @Body('template') template: string,
    @Body('variables') variables: Record<string, any>,
  ) {
    const validation = this.emailTemplateService.validateTemplateVariables(
      template,
      variables,
    );

    return {
      success: true,
      data: validation,
    };
  }
}