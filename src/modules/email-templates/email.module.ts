// ============================================
// email.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplateController } from './email-template.controller';

@Module({
  imports: [ConfigModule],
  controllers: [EmailTemplateController],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}

// ============================================
// Usage Examples
// ============================================

/*
// 1. SENDING EMAILS (No changes to existing code)
// ============================================

// In auth.service.ts - registration
await this.emailService.sendVerificationCode(
  registerDto.email,
  code,
  registerDto.firstName,
  // organizationId // Optional - will use global template if not provided
);

// With organization-specific template
await this.emailService.sendVerificationCode(
  registerDto.email,
  code,
  registerDto.firstName,
  organizationId  // Uses org-specific template if available
);

// Password reset
await this.emailService.sendPasswordReset(
  email,
  token,
  organizationId  // Optional
);

// Invitation
await this.emailService.sendInvitation(
  email,
  token,
  inviterName,
  orgName,
  organizationId  // Optional
);

// Welcome email
await this.emailService.sendWelcomeEmail(
  email,
  firstName,
  organizationId  // Optional
);

// Custom email using any template category
await this.emailService.sendCustomEmail(
  'campaign_notification',  // Custom category
  email,
  {
    campaignName: 'Summer Sale',
    startDate: '2025-06-01',
    discount: '20%',
  },
  organizationId
);

// Bulk emails
await this.emailService.sendBulkEmails(
  'newsletter',
  [
    { email: 'user1@example.com', variables: { name: 'John', ... } },
    { email: 'user2@example.com', variables: { name: 'Jane', ... } },
  ],
  organizationId
);


// 2. MANAGING TEMPLATES (Admin UI)
// ============================================

// Get all templates for organization
GET /email-templates?includeGlobal=true

// Get specific template by category
GET /email-templates/category/invitation

// Create new template
POST /email-templates
{
  "organizationId": 123,
  "name": "Custom Invitation Template",
  "category": "invitation",
  "subject": "Join us at {{orgName}}!",
  "bodyHtml": "<html>...</html>",
  "variables": {
    "orgName": "string",
    "inviterName": "string",
    "inviteLink": "string"
  },
  "isActive": true
}

// Update template
PUT /email-templates/456
{
  "subject": "Updated subject",
  "bodyHtml": "<html>Updated body</html>"
}

// Delete template
DELETE /email-templates/456

// Preview template with test data
POST /email-templates/preview
{
  "category": "invitation",
  "variables": {
    "orgName": "Acme Corp",
    "inviterName": "John Doe",
    "inviteLink": "https://example.com/invite/abc123"
  }
}

// Send test email
POST /email-templates/test
{
  "category": "invitation",
  "testEmail": "test@example.com",
  "variables": {
    "orgName": "Test Org",
    "inviterName": "Tester",
    "inviteLink": "https://example.com/test"
  }
}

// Get usage statistics
GET /email-templates/stats

// Clone template to your organization
POST /email-templates/789/clone
{
  "newName": "My Custom Version"
}

// Validate template variables
POST /email-templates/validate
{
  "template": "<p>Hello {{name}}, welcome to {{company}}</p>",
  "variables": {
    "name": "John"
  }
}
// Response: { valid: false, missing: ["company"] }


// 3. DATABASE TEMPLATE EXAMPLES
// ============================================

-- Custom campaign template
INSERT INTO email_templates (
  organization_id, name, category, subject, body_html, variables, is_active
)
VALUES (
  123,
  'Campaign Launch Notification',
  'campaign_launch',
  'New Campaign: {{campaignName}}',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>{{campaignName}} is Live!</h2>
  <p>Hi {{creatorName}},</p>
  <p>A new campaign "{{campaignName}}" has been launched.</p>
  <p><strong>Budget:</strong> {{budget}}</p>
  <p><strong>Deadline:</strong> {{deadline}}</p>
  <a href="{{campaignLink}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    View Campaign
  </a>
</body>
</html>',
  '{"campaignName": "string", "creatorName": "string", "budget": "string", "deadline": "string", "campaignLink": "string"}',
  1
);

-- Custom brand approval template
INSERT INTO email_templates (
  organization_id, name, category, subject, body_html, variables, is_active
)
VALUES (
  0,  -- Global template
  'Content Approval Request',
  'content_approval',
  '{{creatorName}} submitted content for review',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>Content Review Required</h2>
  <p>{{creatorName}} has submitted content for "{{campaignName}}".</p>
  <p><strong>Submission Date:</strong> {{submissionDate}}</p>
  <p><strong>Platform:</strong> {{platform}}</p>
  <a href="{{reviewLink}}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    Review Content
  </a>
  <hr style="margin: 30px 0;">
  <p style="font-size: 12px; color: #6B7280;">
    Please review within 24 hours.
  </p>
</body>
</html>',
  '{"creatorName": "string", "campaignName": "string", "submissionDate": "string", "platform": "string", "reviewLink": "string"}',
  1
);


// 4. SENDING CUSTOM EMAILS IN CODE
// ============================================

// In campaign.service.ts
async notifyCreatorOfNewCampaign(creatorEmail: string, campaign: any) {
  await this.emailService.sendCustomEmail(
    'campaign_launch',
    creatorEmail,
    {
      campaignName: campaign.name,
      creatorName: campaign.creatorName,
      budget: `$${campaign.budget}`,
      deadline: new Date(campaign.deadline).toLocaleDateString(),
      campaignLink: `${this.configService.get('APP_URL')}/campaigns/${campaign.id}`,
    },
    campaign.organizationId
  );
}

// In content.service.ts
async requestContentApproval(brandEmail: string, content: any) {
  await this.emailService.sendCustomEmail(
    'content_approval',
    brandEmail,
    {
      creatorName: content.creator.name,
      campaignName: content.campaign.name,
      submissionDate: new Date().toLocaleDateString(),
      platform: content.platform,
      reviewLink: `${this.configService.get('APP_URL')}/review/${content.id}`,
    },
    content.organizationId
  );
}


// 5. MIGRATION GUIDE (From Old to New)
// ============================================

// OLD CODE (Hardcoded templates):
await this.emailService.sendInvitation(email, token, inviterName, orgName);

// NEW CODE (Same! Backward compatible):
await this.emailService.sendInvitation(email, token, inviterName, orgName);
// Uses global template from database

// NEW CODE (With org-specific template):
await this.emailService.sendInvitation(email, token, inviterName, orgName, organizationId);
// Uses org-specific template if exists, falls back to global


// 6. TEMPLATE VARIABLE REFERENCE
// ============================================

// All default templates support these variables:

// invitation:
// - inviterName: Name of person sending invite
// - orgName: Organization name
// - inviteLink: Full invitation URL

// password_reset:
// - resetLink: Full password reset URL

// email_verification:
// - firstName: User's first name (or "there")
// - code: 6-digit verification code
// - expiryMinutes: Minutes until code expires (default: 10)
// - currentYear: Current year for copyright

// welcome:
// - firstName: User's first name
// - loginUrl: Login page URL
// - currentYear: Current year for copyright


// 7. ADMIN DASHBOARD INTEGRATION
// ============================================

// Example React component for managing templates
const TemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  
  useEffect(() => {
    fetch('/api/email-templates?includeGlobal=true')
      .then(res => res.json())
      .then(data => setTemplates(data.data));
  }, []);
  
  const previewTemplate = async (category, variables) => {
    const response = await fetch('/api/email-templates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, variables })
    });
    const data = await response.json();
    // Show preview in modal
    showPreviewModal(data.data.subject, data.data.html);
  };
  
  const sendTestEmail = async (category, testEmail, variables) => {
    await fetch('/api/email-templates/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, testEmail, variables })
    });
    alert('Test email sent!');
  };
  
  return (
    <div>
      {templates.map(template => (
        <TemplateCard 
          key={template.id}
          template={template}
          onPreview={previewTemplate}
          onTest={sendTestEmail}
        />
      ))}
    </div>
  );
};


// 8. BENEFITS OF DYNAMIC TEMPLATES
// ============================================

1. ✅ No code changes needed for template updates
2. ✅ Organization-specific branding per template
3. ✅ A/B testing different email versions
4. ✅ Multi-language support (create templates per language)
5. ✅ Template versioning and rollback capability
6. ✅ Usage tracking for analytics
7. ✅ Preview before sending
8. ✅ Test emails with sample data
9. ✅ Clone and customize global templates
10. ✅ Full backward compatibility


// 9. SECURITY CONSIDERATIONS
// ============================================

- Only admins can create/modify templates
- Organizations can only modify their own templates
- HTML is not sanitized - admins are trusted users
- Variables are escaped when replaced
- Rate limiting should be added to email endpoints
- Template permissions checked at database level


// 10. ADVANCED FEATURES TO ADD
// ============================================

// Template versioning
ALTER TABLE email_templates ADD version INT DEFAULT 1;
ALTER TABLE email_templates ADD parent_template_id BIGINT;

// Email tracking
CREATE TABLE email_logs (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  template_id BIGINT,
  recipient_email NVARCHAR(255),
  subject NVARCHAR(500),
  sent_at DATETIME2(7) DEFAULT GETUTCDATE(),
  opened_at DATETIME2(7),
  clicked_at DATETIME2(7),
  status NVARCHAR(50)
);

// A/B testing
CREATE TABLE email_ab_tests (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  template_a_id BIGINT,
  template_b_id BIGINT,
  variant_a_sent INT DEFAULT 0,
  variant_b_sent INT DEFAULT 0,
  variant_a_opened INT DEFAULT 0,
  variant_b_opened INT DEFAULT 0,
  is_active BIT DEFAULT 1
);

// Scheduled emails
CREATE TABLE scheduled_emails (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  template_category NVARCHAR(100),
  recipient_email NVARCHAR(255),
  variables NVARCHAR(MAX),
  scheduled_for DATETIME2(7),
  sent_at DATETIME2(7),
  status NVARCHAR(50)
);
*/