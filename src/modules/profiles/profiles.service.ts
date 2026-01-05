import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SqlServerService } from '../../core/database/sql-server.service';
import { UpdateCreatorProfileDto, UpdateBrandProfileDto, UpdateAgencyProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private sqlService: SqlServerService) {}

  // ============================================
  // Creator Profile Methods
  // ============================================
  async getCreatorProfile(tenantId: number, userId: number) {
    await this.verifyTenantAccess(userId, tenantId);

    const profile = await this.sqlService.query(
      `SELECT cp.*, t.name as tenant_name, t.slug
       FROM creator_profiles cp
       JOIN tenants t ON cp.tenant_id = t.id
       WHERE cp.tenant_id = @tenantId`,
      { tenantId }
    );

    if (profile.length === 0) {
      throw new NotFoundException('Creator profile not found');
    }

    // Parse JSON fields
    const result = profile[0];
    ['languages', 'categories', 'preferred_brands', 'excluded_brands', 'content_types'].forEach(field => {
      if (result[field]) {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (e) {
          result[field] = null;
        }
      }
    });

    return result;
  }

  async updateCreatorProfile(tenantId: number, userId: number, dto: UpdateCreatorProfileDto) {
    await this.verifyTenantAccess(userId, tenantId);

    const updates: string[] = [];
    const params: any = { tenantId, userId };

    if (dto.stageName !== undefined) {
      updates.push('stage_name = @stageName');
      params.stageName = dto.stageName;
    }
    if (dto.bio !== undefined) {
      updates.push('bio = @bio');
      params.bio = dto.bio;
    }
    if (dto.dateOfBirth !== undefined) {
      updates.push('date_of_birth = @dateOfBirth');
      params.dateOfBirth = dto.dateOfBirth;
    }
    if (dto.gender !== undefined) {
      updates.push('gender = @gender');
      params.gender = dto.gender;
    }
    if (dto.profileImageUrl !== undefined) {
      updates.push('profile_image_url = @profileImageUrl');
      params.profileImageUrl = dto.profileImageUrl;
    }
    if (dto.coverImageUrl !== undefined) {
      updates.push('cover_image_url = @coverImageUrl');
      params.coverImageUrl = dto.coverImageUrl;
    }
    if (dto.location !== undefined) {
      updates.push('location = @location');
      params.location = dto.location;
    }
    if (dto.languages !== undefined) {
      updates.push('languages = @languages');
      params.languages = JSON.stringify(dto.languages);
    }
    if (dto.categories !== undefined) {
      updates.push('categories = @categories');
      params.categories = JSON.stringify(dto.categories);
    }
    if (dto.contentTypes !== undefined) {
      updates.push('content_types = @contentTypes');
      params.contentTypes = JSON.stringify(dto.contentTypes);
    }
    if (dto.availabilityStatus !== undefined) {
      updates.push('availability_status = @availabilityStatus');
      params.availabilityStatus = dto.availabilityStatus;
    }
    if (dto.preferredBrands !== undefined) {
      updates.push('preferred_brands = @preferredBrands');
      params.preferredBrands = JSON.stringify(dto.preferredBrands);
    }
    if (dto.excludedBrands !== undefined) {
      updates.push('excluded_brands = @excludedBrands');
      params.excludedBrands = JSON.stringify(dto.excludedBrands);
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    updates.push('updated_at = GETUTCDATE()');
    updates.push('updated_by = @userId');

    await this.sqlService.query(
      `UPDATE creator_profiles SET ${updates.join(', ')} WHERE tenant_id = @tenantId`,
      params
    );

    return this.getCreatorProfile(tenantId, userId);
  }

  // ============================================
  // Brand Profile Methods
  // ============================================
  async getBrandProfile(tenantId: number, userId: number) {
    await this.verifyTenantAccess(userId, tenantId);

    const profile = await this.sqlService.query(
      `SELECT bp.*, t.name as tenant_name, t.slug
       FROM brand_profiles bp
       JOIN tenants t ON bp.tenant_id = t.id
       WHERE bp.tenant_id = @tenantId`,
      { tenantId }
    );

    if (profile.length === 0) {
      throw new NotFoundException('Brand profile not found');
    }

    const result = profile[0];
    ['blacklisted_creators', 'preferred_creators'].forEach(field => {
      if (result[field]) {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (e) {
          result[field] = null;
        }
      }
    });

    return result;
  }

  async updateBrandProfile(tenantId: number, userId: number, dto: UpdateBrandProfileDto) {
    await this.verifyTenantAccess(userId, tenantId);

    const updates: string[] = [];
    const params: any = { tenantId, userId };

    if (dto.websiteUrl !== undefined) {
      updates.push('website_url = @websiteUrl');
      params.websiteUrl = dto.websiteUrl;
    }
    if (dto.industry !== undefined) {
      updates.push('industry = @industry');
      params.industry = dto.industry;
    }
    if (dto.description !== undefined) {
      updates.push('description = @description');
      params.description = dto.description;
    }
    if (dto.brandGuidelinesUrl !== undefined) {
      updates.push('brand_guidelines_url = @brandGuidelinesUrl');
      params.brandGuidelinesUrl = dto.brandGuidelinesUrl;
    }
    if (dto.targetDemographics !== undefined) {
      updates.push('target_demographics = @targetDemographics');
      params.targetDemographics = dto.targetDemographics;
    }
    if (dto.budgetRange !== undefined) {
      updates.push('budget_range = @budgetRange');
      params.budgetRange = dto.budgetRange;
    }
    if (dto.campaignObjectives !== undefined) {
      updates.push('campaign_objectives = @campaignObjectives');
      params.campaignObjectives = dto.campaignObjectives;
    }
    if (dto.brandValues !== undefined) {
      updates.push('brand_values = @brandValues');
      params.brandValues = dto.brandValues;
    }
    if (dto.contentRestrictions !== undefined) {
      updates.push('content_restrictions = @contentRestrictions');
      params.contentRestrictions = dto.contentRestrictions;
    }
    if (dto.primaryContactName !== undefined) {
      updates.push('primary_contact_name = @primaryContactName');
      params.primaryContactName = dto.primaryContactName;
    }
    if (dto.primaryContactEmail !== undefined) {
      updates.push('primary_contact_email = @primaryContactEmail');
      params.primaryContactEmail = dto.primaryContactEmail;
    }
    if (dto.primaryContactPhone !== undefined) {
      updates.push('primary_contact_phone = @primaryContactPhone');
      params.primaryContactPhone = dto.primaryContactPhone;
    }
    if (dto.billingAddress !== undefined) {
      updates.push('billing_address = @billingAddress');
      params.billingAddress = dto.billingAddress;
    }
    if (dto.contentApprovalRequired !== undefined) {
      updates.push('content_approval_required = @contentApprovalRequired');
      params.contentApprovalRequired = dto.contentApprovalRequired;
    }
    if (dto.autoApproveCreators !== undefined) {
      updates.push('auto_approve_creators = @autoApproveCreators');
      params.autoApproveCreators = dto.autoApproveCreators;
    }
    if (dto.blacklistedCreators !== undefined) {
      updates.push('blacklisted_creators = @blacklistedCreators');
      params.blacklistedCreators = JSON.stringify(dto.blacklistedCreators);
    }
    if (dto.preferredCreators !== undefined) {
      updates.push('preferred_creators = @preferredCreators');
      params.preferredCreators = JSON.stringify(dto.preferredCreators);
    }
    if (dto.paymentTerms !== undefined) {
      updates.push('payment_terms = @paymentTerms');
      params.paymentTerms = dto.paymentTerms;
    }
    if (dto.preferredPaymentMethod !== undefined) {
      updates.push('preferred_payment_method = @preferredPaymentMethod');
      params.preferredPaymentMethod = dto.preferredPaymentMethod;
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    updates.push('updated_at = GETUTCDATE()');
    updates.push('updated_by = @userId');

    await this.sqlService.query(
      `UPDATE brand_profiles SET ${updates.join(', ')} WHERE tenant_id = @tenantId`,
      params
    );

    return this.getBrandProfile(tenantId, userId);
  }

  // ============================================
  // Agency Profile Methods
  // ============================================
  async getAgencyProfile(tenantId: number, userId: number) {
    await this.verifyTenantAccess(userId, tenantId);

    const profile = await this.sqlService.query(
      `SELECT ap.*, t.name as tenant_name, t.slug
       FROM agency_profiles ap
       JOIN tenants t ON ap.tenant_id = t.id
       WHERE ap.tenant_id = @tenantId`,
      { tenantId }
    );

    if (profile.length === 0) {
      throw new NotFoundException('Agency profile not found');
    }

    return profile[0];
  }

  async updateAgencyProfile(tenantId: number, userId: number, dto: UpdateAgencyProfileDto) {
    await this.verifyTenantAccess(userId, tenantId);

    const updates: string[] = [];
    const params: any = { tenantId, userId };

    if (dto.agencyName !== undefined) {
      updates.push('agency_name = @agencyName');
      params.agencyName = dto.agencyName;
    }
    if (dto.websiteUrl !== undefined) {
      updates.push('website_url = @websiteUrl');
      params.websiteUrl = dto.websiteUrl;
    }
    if (dto.registrationNumber !== undefined) {
      updates.push('registration_number = @registrationNumber');
      params.registrationNumber = dto.registrationNumber;
    }
    if (dto.industrySpecialization !== undefined) {
      updates.push('industry_specialization = @industrySpecialization');
      params.industrySpecialization = dto.industrySpecialization;
    }
    if (dto.description !== undefined) {
      updates.push('description = @description');
      params.description = dto.description;
    }
    if (dto.yearEstablished !== undefined) {
      updates.push('year_established = @yearEstablished');
      params.yearEstablished = dto.yearEstablished;
    }
    if (dto.companySize !== undefined) {
      updates.push('company_size = @companySize');
      params.companySize = dto.companySize;
    }
    if (dto.serviceOfferings !== undefined) {
      updates.push('service_offerings = @serviceOfferings');
      params.serviceOfferings = dto.serviceOfferings;
    }
    if (dto.targetMarkets !== undefined) {
      updates.push('target_markets = @targetMarkets');
      params.targetMarkets = dto.targetMarkets;
    }
    if (dto.clientPortfolio !== undefined) {
      updates.push('client_portfolio = @clientPortfolio');
      params.clientPortfolio = dto.clientPortfolio;
    }
    if (dto.caseStudiesUrl !== undefined) {
      updates.push('case_studies_url = @caseStudiesUrl');
      params.caseStudiesUrl = dto.caseStudiesUrl;
    }
    if (dto.certifications !== undefined) {
      updates.push('certifications = @certifications');
      params.certifications = dto.certifications;
    }
    if (dto.awards !== undefined) {
      updates.push('awards = @awards');
      params.awards = dto.awards;
    }
    if (dto.primaryContactName !== undefined) {
      updates.push('primary_contact_name = @primaryContactName');
      params.primaryContactName = dto.primaryContactName;
    }
    if (dto.primaryContactEmail !== undefined) {
      updates.push('primary_contact_email = @primaryContactEmail');
      params.primaryContactEmail = dto.primaryContactEmail;
    }
    if (dto.primaryContactPhone !== undefined) {
      updates.push('primary_contact_phone = @primaryContactPhone');
      params.primaryContactPhone = dto.primaryContactPhone;
    }
    if (dto.billingAddress !== undefined) {
      updates.push('billing_address = @billingAddress');
      params.billingAddress = dto.billingAddress;
    }
    if (dto.paymentTerms !== undefined) {
      updates.push('payment_terms = @paymentTerms');
      params.paymentTerms = dto.paymentTerms;
    }
    if (dto.preferredPaymentMethod !== undefined) {
      updates.push('preferred_payment_method = @preferredPaymentMethod');
      params.preferredPaymentMethod = dto.preferredPaymentMethod;
    }
    if (dto.commissionRate !== undefined) {
      updates.push('commission_rate = @commissionRate');
      params.commissionRate = dto.commissionRate;
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    updates.push('updated_at = GETUTCDATE()');
    updates.push('updated_by = @userId');

    await this.sqlService.query(
      `UPDATE agency_profiles SET ${updates.join(', ')} WHERE tenant_id = @tenantId`,
      params
    );

    return this.getAgencyProfile(tenantId, userId);
  }

  // ============================================
  // Helper Methods
  // ============================================
  private async verifyTenantAccess(userId: number, tenantId: number): Promise<void> {
    const result = await this.sqlService.execute('sp_VerifyTenantAccess', {
      userId,
      tenantId,
    });

    if (result[0]?.has_access !== 1) {
      throw new ForbiddenException('You do not have access to this tenant');
    }
  }
}
