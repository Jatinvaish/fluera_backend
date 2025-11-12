
-- =====================================================
-- FLUERA - Complete Multi-Tenant SaaS Database Schema
-- Supporting: Agency, Brand, Creator modules + Super Admin
-- Version: 3.0 - E2E Encryption + Enhanced RBAC
-- =====================================================

-- ==================== CORE TENANT SYSTEM ====================

CREATE TABLE [dbo].[tenants] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_type] NVARCHAR(20) NOT NULL CHECK ([tenant_type] IN ('agency', 'brand', 'creator')),
    [name] NVARCHAR(255) NOT NULL,
    [slug] NVARCHAR(100) UNIQUE NOT NULL,
    [owner_user_id] BIGINT NOT NULL,
    
    -- Branding
    [logo_url] NVARCHAR(MAX),
    [subdomain] NVARCHAR(100),
    [custom_domain] NVARCHAR(255),
    [domain_verified_at] DATETIME2(7),
    
    -- Settings
    [timezone] NVARCHAR(50) DEFAULT 'UTC',
    [locale] NVARCHAR(10) DEFAULT 'en-US',
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [settings] NVARCHAR(MAX), -- JSON
    [metadata] NVARCHAR(MAX), -- JSON
    
    -- Subscription
    [subscription_plan_id] BIGINT,
    [subscription_status] NVARCHAR(20) DEFAULT 'trial',
    [is_trial] BIT DEFAULT 1,
    [trial_started_at] DATETIME2(7),
    [trial_ends_at] DATETIME2(7),
    [subscription_started_at] DATETIME2(7),
    [subscription_expires_at] DATETIME2(7),
    
    -- Usage limits
    [max_staff] INT DEFAULT 5,
    [max_storage_gb] INT DEFAULT 10,
    [max_campaigns] INT DEFAULT 10,
    [max_invitations] INT DEFAULT 20,
    [max_creators] INT DEFAULT 100,
    [max_brands] INT DEFAULT 50,
    
    -- Current usage
    [current_staff] INT DEFAULT 0,
    [current_storage_gb] DECIMAL(10,2) DEFAULT 0,
    [current_campaigns] INT DEFAULT 0,
    [current_invitations] INT DEFAULT 0,
    [current_creators] INT DEFAULT 0,
    [current_brands] INT DEFAULT 0,
    
    -- E2E Encryption Keys (per tenant)
    [public_key] NVARCHAR(MAX), -- RSA public key for tenant
    [encrypted_private_key] NVARCHAR(MAX), -- Encrypted with master key
    [key_version] INT DEFAULT 1,
    [key_created_at] DATETIME2(7),
    [key_rotated_at] DATETIME2(7),
    
    [status] NVARCHAR(20) DEFAULT 'active',
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== BRAND PROFILES ====================

CREATE TABLE [dbo].[brand_profiles] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL UNIQUE,
    [website_url] NVARCHAR(MAX),
    [industry] NVARCHAR(100),
    [description] NVARCHAR(MAX),
    [brand_guidelines_url] NVARCHAR(MAX),
    [target_demographics] NVARCHAR(MAX),
    [budget_range] NVARCHAR(MAX),
    [campaign_objectives] NVARCHAR(MAX),
    [brand_values] NVARCHAR(MAX),
    [content_restrictions] NVARCHAR(MAX),
    
    [primary_contact_name] NVARCHAR(255),
    [primary_contact_email] NVARCHAR(320),
    [primary_contact_phone] NVARCHAR(20),
    [billing_address] NVARCHAR(MAX),
    
    [content_approval_required] BIT DEFAULT 1,
    [auto_approve_creators] BIT DEFAULT 0,
    [blacklisted_creators] NVARCHAR(MAX),
    [preferred_creators] NVARCHAR(MAX),
    [payment_terms] INT DEFAULT 30,
    [preferred_payment_method] NVARCHAR(50),
    
    [rating] DECIMAL(3,2) DEFAULT 5.0,
    [rating_count] INT DEFAULT 0,
    [total_campaigns] INT DEFAULT 0,
    [total_spent] DECIMAL(12,2) DEFAULT 0,
    
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== CAMPAIGNS ====================

CREATE TABLE [dbo].[campaign_types] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(MAX),
    [default_duration_days] INT DEFAULT 30,
    [default_workflow] NVARCHAR(MAX),
    [required_deliverables] NVARCHAR(MAX),
    [pricing_model] NVARCHAR(50),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[campaigns] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [created_by_tenant_id] BIGINT NOT NULL,
    [brand_tenant_id] BIGINT,
    [campaign_type_id] BIGINT,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [brief_document_url] NVARCHAR(MAX),
    [objectives] NVARCHAR(MAX),
    [target_audience] NVARCHAR(MAX),
    [hashtags] NVARCHAR(MAX),
    [mentions] NVARCHAR(MAX),
    [content_requirements] NVARCHAR(MAX),
    [deliverables] NVARCHAR(MAX),
    
    [budget_total] DECIMAL(12,2),
    [budget_allocated] DECIMAL(12,2) DEFAULT 0,
    [budget_spent] DECIMAL(12,2) DEFAULT 0,
    [currency] NVARCHAR(3) DEFAULT 'USD',
    
    [creator_count_target] INT,
    [creator_count_assigned] INT DEFAULT 0,
    
    [start_date] DATE,
    [end_date] DATE,
    [content_submission_deadline] DATE,
    [approval_deadline] DATE,
    [go_live_date] DATE,
    
    [campaign_manager_id] BIGINT,
    [account_manager_id] BIGINT,
    
    [approval_workflow] NVARCHAR(MAX),
    [auto_approve_content] BIT DEFAULT 0,
    [content_approval_required] BIT DEFAULT 1,
    [legal_approval_required] BIT DEFAULT 0,
    
    [usage_rights_duration] INT DEFAULT 90,
    [exclusivity_period] INT DEFAULT 0,
    
    [visibility] NVARCHAR(20) DEFAULT 'private',
    [shared_with_tenants] NVARCHAR(MAX),
    
    [performance_metrics] NVARCHAR(MAX),
    [success_criteria] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'draft',
    [priority] NVARCHAR(20) DEFAULT 'medium',
    [tags] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_campaigns_tenant] ON [dbo].[campaigns] ([created_by_tenant_id], [status]);
CREATE INDEX [IX_campaigns_brand] ON [dbo].[campaigns] ([brand_tenant_id]) WHERE [brand_tenant_id] IS NOT NULL;

CREATE TABLE [dbo].[campaign_participants] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [campaign_id] BIGINT NOT NULL,
    [creator_tenant_id] BIGINT NOT NULL,
    [status] NVARCHAR(20) DEFAULT 'invited',
    [invitation_sent_at] DATETIME2(7),
    [response_deadline] DATETIME2(7),
    [accepted_at] DATETIME2(7),
    [declined_at] DATETIME2(7),
    [decline_reason] NVARCHAR(MAX),
    [deliverables] NVARCHAR(MAX),
    [agreed_rate] DECIMAL(10,2),
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [bonus_amount] DECIMAL(10,2) DEFAULT 0,
    [payment_status] NVARCHAR(20) DEFAULT 'pending',
    [payment_due_date] DATE,
    [content_submitted_at] DATETIME2(7),
    [content_approved_at] DATETIME2(7),
    [content_rejected_at] DATETIME2(7),
    [rejection_reason] NVARCHAR(MAX),
    [revision_count] INT DEFAULT 0,
    [performance_metrics] NVARCHAR(MAX),
    [rating] DECIMAL(3,2),
    [feedback] NVARCHAR(MAX),
    [notes] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([campaign_id], [creator_tenant_id])
);

CREATE INDEX [IX_campaign_participants_campaign] ON [dbo].[campaign_participants] ([campaign_id], [status]);
CREATE INDEX [IX_campaign_participants_creator] ON [dbo].[campaign_participants] ([creator_tenant_id], [status]);

CREATE TABLE [dbo].[campaign_tasks] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [campaign_id] BIGINT NOT NULL,
    [creator_tenant_id] BIGINT,
    [assigned_to] BIGINT,
    [task_type] NVARCHAR(50) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [priority] NVARCHAR(20) DEFAULT 'medium',
    [status] NVARCHAR(20) DEFAULT 'todo',
    [due_date] DATETIME2(7),
    [completed_at] DATETIME2(7),
    [estimated_hours] DECIMAL(4,2),
    [actual_hours] DECIMAL(4,2),
    [dependencies] NVARCHAR(MAX),
    [attachments] NVARCHAR(MAX),
    [comments_count] INT DEFAULT 0,
    [checklist] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== CONTENT MANAGEMENT ====================

CREATE TABLE [dbo].[content_submissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [campaign_id] BIGINT NOT NULL,
    [submission_type] NVARCHAR(50) NOT NULL,
    [title] NVARCHAR(255),
    [description] NVARCHAR(MAX),
    [content_type] NVARCHAR(50) NOT NULL,
    [platform] NVARCHAR(50) NOT NULL,
    [file_urls] NVARCHAR(MAX) NOT NULL,
    [thumbnail_url] NVARCHAR(MAX),
    [caption] NVARCHAR(MAX),
    [hashtags] NVARCHAR(MAX),
    [mentions] NVARCHAR(MAX),
    [duration_seconds] INT,
    [dimensions] NVARCHAR(MAX),
    [file_sizes] NVARCHAR(MAX),
    [mime_types] NVARCHAR(MAX),
    [scheduled_publish_time] DATETIME2(7),
    [submission_notes] NVARCHAR(MAX),
    
    [version] INT DEFAULT 1,
    [parent_submission_id] BIGINT,
    [review_round] INT DEFAULT 1,
    [max_review_rounds] INT DEFAULT 3,
    
    [watermark_applied] BIT DEFAULT 0,
    [drm_protected] BIT DEFAULT 0,
    [download_protection] BIT DEFAULT 1,
    [screenshot_protected] BIT DEFAULT 1,
    
    [view_count] INT DEFAULT 0,
    [download_count] INT DEFAULT 0,
    [share_count] INT DEFAULT 0,
    
    [shared_with_tenants] NVARCHAR(MAX),
    
    [status] NVARCHAR(20) DEFAULT 'submitted',
    [submitted_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [reviewed_at] DATETIME2(7),
    [approved_at] DATETIME2(7),
    [rejected_at] DATETIME2(7),
    [published_at] DATETIME2(7),
    [reviewer_id] BIGINT,
    [approval_notes] NVARCHAR(MAX),
    [rejection_reason] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_content_submissions_tenant] ON [dbo].[content_submissions] ([tenant_id], [status]);
CREATE INDEX [IX_content_submissions_campaign] ON [dbo].[content_submissions] ([campaign_id], [status]);

CREATE TABLE [dbo].[content_reviews] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [submission_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    [reviewer_id] BIGINT NOT NULL,
    [review_type] NVARCHAR(20) NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [overall_rating] INT CHECK ([overall_rating] >= 1 AND [overall_rating] <= 5),
    [brand_alignment_rating] INT CHECK ([brand_alignment_rating] >= 1 AND [brand_alignment_rating] <= 5),
    [quality_rating] INT CHECK ([quality_rating] >= 1 AND [quality_rating] <= 5),
    [creativity_rating] INT CHECK ([creativity_rating] >= 1 AND [creativity_rating] <= 5),
    [feedback] NVARCHAR(MAX),
    [revision_notes] NVARCHAR(MAX),
    [approval_conditions] NVARCHAR(MAX),
    [review_checklist] NVARCHAR(MAX),
    [time_spent_minutes] INT,
    [reviewed_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[content_review_comments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [submission_id] BIGINT NOT NULL,
    [review_id] BIGINT,
    [commenter_id] BIGINT NOT NULL,
    [comment_text] NVARCHAR(MAX) NOT NULL,
    [comment_type] NVARCHAR(20) DEFAULT 'general',
    [comment_category] NVARCHAR(50),
    [timestamp_seconds] DECIMAL(8,3),
    [start_timestamp_seconds] DECIMAL(8,3),
    [end_timestamp_seconds] DECIMAL(8,3),
    [coordinates] NVARCHAR(MAX),
    [is_resolved] BIT DEFAULT 0,
    [resolved_by] BIGINT,
    [resolved_at] DATETIME2(7),
    [parent_comment_id] BIGINT,
    [attachments] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[content_performance] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [submission_id] BIGINT NOT NULL,
    [platform] NVARCHAR(50) NOT NULL,
    [post_url] NVARCHAR(MAX),
    [platform_post_id] NVARCHAR(255),
    [published_at] DATETIME2(7),
    [likes] INT DEFAULT 0,
    [comments] INT DEFAULT 0,
    [shares] INT DEFAULT 0,
    [saves] INT DEFAULT 0,
    [views] INT DEFAULT 0,
    [reach] INT DEFAULT 0,
    [impressions] INT DEFAULT 0,
    [engagement_rate] DECIMAL(5,2),
    [click_through_rate] DECIMAL(5,2),
    [conversion_rate] DECIMAL(5,2),
    [cost_per_engagement] DECIMAL(8,2),
    [cost_per_click] DECIMAL(8,2),
    [roi] DECIMAL(8,2),
    [sentiment_score] DECIMAL(3,2),
    [top_comments] NVARCHAR(MAX),
    [performance_grade] NVARCHAR(2),
    [last_updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== CONTRACT MANAGEMENT ====================

CREATE TABLE [dbo].[contract_templates] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [template_type] NVARCHAR(50) NOT NULL,
    [category] NVARCHAR(100),
    [description] NVARCHAR(MAX),
    [template_content] NVARCHAR(MAX) NOT NULL,
    [variables] NVARCHAR(MAX),
    [version] NVARCHAR(20) DEFAULT '1.0',
    [is_default] BIT DEFAULT 0,
    [requires_legal_review] BIT DEFAULT 0,
    [auto_renewal] BIT DEFAULT 0,
    [renewal_period] INT,
    [is_active] BIT DEFAULT 1,
    [usage_count] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[contracts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [template_id] BIGINT,
    [contract_number] NVARCHAR(100) UNIQUE NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [contract_type] NVARCHAR(50) NOT NULL,
    [party_a_type] NVARCHAR(20) NOT NULL,
    [party_a_tenant_id] BIGINT,
    [party_a_name] NVARCHAR(255) NOT NULL,
    [party_a_email] NVARCHAR(320),
    [party_b_type] NVARCHAR(20) NOT NULL,
    [party_b_tenant_id] BIGINT,
    [party_b_name] NVARCHAR(255) NOT NULL,
    [party_b_email] NVARCHAR(320),
    [related_campaign_id] BIGINT,
    [content] NVARCHAR(MAX) NOT NULL,
    [variables_data] NVARCHAR(MAX),
    [contract_value] DECIMAL(12,2),
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [start_date] DATE,
    [end_date] DATE,
    [auto_renewal] BIT DEFAULT 0,
    [renewal_period] INT,
    [renewal_count] INT DEFAULT 0,
    [status] NVARCHAR(20) DEFAULT 'draft',
    [signature_required_from] NVARCHAR(MAX),
    [signatures_completed] INT DEFAULT 0,
    [signatures_required] INT DEFAULT 2,
    [fully_signed_at] DATETIME2(7),
    [docusign_envelope_id] NVARCHAR(255),
    [document_urls] NVARCHAR(MAX),
    [legal_reviewed] BIT DEFAULT 0,
    [legal_reviewer_id] BIGINT,
    [legal_reviewed_at] DATETIME2(7),
    [legal_notes] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_contracts_tenant] ON [dbo].[contracts] ([tenant_id], [status]);

CREATE TABLE [dbo].[contract_signatures] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [contract_id] BIGINT NOT NULL,
    [signer_type] NVARCHAR(20) NOT NULL,
    [signer_tenant_id] BIGINT,
    [signer_user_id] BIGINT,
    [signer_name] NVARCHAR(255) NOT NULL,
    [signer_email] NVARCHAR(320) NOT NULL,
    [signer_role] NVARCHAR(100),
    [signature_type] NVARCHAR(20) NOT NULL,
    [signature_method] NVARCHAR(50),
    [signature_image_url] NVARCHAR(MAX),
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [signed_at] DATETIME2(7),
    [status] NVARCHAR(20) DEFAULT 'pending',
    [sent_at] DATETIME2(7),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== PORTFOLIO MANAGEMENT ====================

CREATE TABLE [dbo].[portfolios] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [creator_tenant_ids] NVARCHAR(MAX),
    [brand_categories] NVARCHAR(MAX),
    [target_audience] NVARCHAR(MAX),
    [total_reach] INT DEFAULT 0,
    [avg_engagement_rate] DECIMAL(5,2),
    [template_id] BIGINT,
    [cover_image_url] NVARCHAR(MAX),
    [is_public] BIT DEFAULT 0,
    [share_token] NVARCHAR(255) UNIQUE,
    [share_expires_at] DATETIME2(7),
    [view_count] INT DEFAULT 0,
    [download_count] INT DEFAULT 0,
    [status] NVARCHAR(20) DEFAULT 'draft',
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_portfolios_tenant] ON [dbo].[portfolios] ([tenant_id], [status]);

-- ==================== E2E ENCRYPTED CHAT SYSTEM ====================

CREATE TABLE [dbo].[chat_channels] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [created_by_tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255),
    [description] NVARCHAR(MAX),
    [channel_type] NVARCHAR(20) DEFAULT 'group',
    [related_type] NVARCHAR(50),
    [related_id] BIGINT,
    [participant_tenant_ids] NVARCHAR(MAX),
    [is_private] BIT DEFAULT 1,
    [is_archived] BIT DEFAULT 0,
    
    -- E2E Encryption
    [is_encrypted] BIT DEFAULT 1,
    [encryption_version] NVARCHAR(20) DEFAULT 'v1',
    [encryption_algorithm] NVARCHAR(50) DEFAULT 'AES-256-GCM',
    
    [member_count] INT DEFAULT 0,
    [message_count] INT DEFAULT 0,
    [last_message_at] DATETIME2(7),
    [last_activity_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [settings] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_channels_tenant] ON [dbo].[chat_channels] ([created_by_tenant_id]);

CREATE TABLE [dbo].[chat_participants] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [channel_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [role] NVARCHAR(20) DEFAULT 'member',
    [joined_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [left_at] DATETIME2(7),
    [last_read_message_id] BIGINT,
    [last_read_at] DATETIME2(7),
    
    -- E2E Encryption Keys
    [encrypted_channel_key] NVARCHAR(MAX), -- Channel key encrypted with user's public key
    [key_version] INT DEFAULT 1,
    [key_fingerprint] NVARCHAR(64),
    
    [notification_settings] NVARCHAR(MAX),
    [is_muted] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([channel_id], [user_id])
);

CREATE INDEX [IX_chat_participants_channel] ON [dbo].[chat_participants] ([channel_id], [is_active]);
CREATE INDEX [IX_chat_participants_user] ON [dbo].[chat_participants] ([user_id], [is_active]);

CREATE TABLE [dbo].[messages] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [channel_id] BIGINT NOT NULL,
    [sender_tenant_id] BIGINT NOT NULL,
    [sender_user_id] BIGINT NOT NULL,
    [message_type] NVARCHAR(20) DEFAULT 'text',
    
    -- E2E Encrypted Content
    [encrypted_content] NVARCHAR(MAX) NOT NULL, -- AES-256-GCM encrypted message
    [encryption_iv] NVARCHAR(MAX) NOT NULL, -- Initialization vector
    [encryption_auth_tag] NVARCHAR(MAX) NOT NULL, -- Authentication tag for GCM
    [content_hash] NVARCHAR(64), -- SHA-256 hash for integrity
    [encryption_key_version] INT DEFAULT 1,
    
    -- Metadata (not encrypted for indexing)
    [has_attachments] BIT DEFAULT 0,
    [has_mentions] BIT DEFAULT 0,
    [reply_to_message_id] BIGINT,
    [thread_id] BIGINT,
    
    [is_edited] BIT DEFAULT 0,
    [edited_at] DATETIME2(7),
    [is_deleted] BIT DEFAULT 0,
    [deleted_at] DATETIME2(7),
    [deleted_by] BIGINT,
    [is_pinned] BIT DEFAULT 0,
    [pinned_at] DATETIME2(7),
    [pinned_by] BIGINT,
    
    [metadata] NVARCHAR(MAX),
    [sent_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_messages_channel] ON [dbo].[messages] ([channel_id], [sent_at] DESC);
CREATE INDEX [IX_messages_sender] ON [dbo].[messages] ([sender_user_id]);
CREATE INDEX [IX_messages_thread] ON [dbo].[messages] ([thread_id]) WHERE [thread_id] IS NOT NULL;

CREATE TABLE [dbo].[message_attachments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    
    -- E2E Encrypted File Data
    [encrypted_file_url] NVARCHAR(MAX) NOT NULL, -- URL to encrypted file
    [encrypted_filename] NVARCHAR(MAX) NOT NULL, -- Encrypted filename
    [encrypted_file_key] NVARCHAR(MAX) NOT NULL, -- File encryption key (encrypted with channel key)
    [encryption_iv] NVARCHAR(MAX) NOT NULL,
    [encryption_auth_tag] NVARCHAR(MAX) NOT NULL,
    
    -- Metadata (not encrypted)
    [file_size] BIGINT NOT NULL,
    [mime_type] NVARCHAR(200) NOT NULL,
    [file_hash] NVARCHAR(64),
    [thumbnail_url] NVARCHAR(MAX),
    [virus_scan_status] NVARCHAR(20) DEFAULT 'pending',
    [virus_scan_result] NVARCHAR(MAX),
    [download_count] INT DEFAULT 0,
    [is_deleted] BIT DEFAULT 0,
    
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_message_attachments] ON [dbo].[message_attachments] ([message_id]);

CREATE TABLE [dbo].[message_reactions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [emoji] NVARCHAR(50) NOT NULL,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([message_id], [user_id], [emoji])
);

CREATE TABLE message_read_receipts (
    id INT PRIMARY KEY IDENTITY(1,1),
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'read'
    delivered_at DATETIME2 NULL,
    read_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_message_receipts (message_id, user_id),
    INDEX idx_user_unread (user_id, status)
);

CREATE INDEX [IX_read_receipts] ON [dbo].[message_read_receipts] ([message_id]);

-- Channel key rotation history
CREATE TABLE [dbo].[channel_key_rotations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [channel_id] BIGINT NOT NULL,
    [old_key_version] INT NOT NULL,
    [new_key_version] INT NOT NULL,
    [rotated_by] BIGINT NOT NULL,
    [rotation_reason] NVARCHAR(MAX),
    [affected_participants] INT DEFAULT 0,
    [rotated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_key_rotations] ON [dbo].[channel_key_rotations] ([channel_id], [rotated_at] DESC);

-- ==================== E2E ENCRYPTED EMAIL SYSTEM ====================

CREATE TABLE [dbo].[email_accounts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [provider] NVARCHAR(50) NOT NULL,
    [email_address] NVARCHAR(320) NOT NULL,
    [display_name] NVARCHAR(255),
    [imap_host] NVARCHAR(255),
    [imap_port] INT DEFAULT 993,
    [imap_encryption] NVARCHAR(10) DEFAULT 'ssl',
    [smtp_host] NVARCHAR(255),
    [smtp_port] INT DEFAULT 587,
    [smtp_encryption] NVARCHAR(10) DEFAULT 'tls',
    [access_token] NVARCHAR(MAX),
    [refresh_token] NVARCHAR(MAX),
    [token_expires_at] DATETIME2(7),
    [credentials_encrypted] NVARCHAR(MAX),
    [sync_enabled] BIT DEFAULT 1,
    [last_sync_at] DATETIME2(7),
    [sync_status] NVARCHAR(20) DEFAULT 'active',
    [error_message] NVARCHAR(MAX),
    [settings] NVARCHAR(MAX),
    [is_primary] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [email_address])
);

CREATE INDEX [IX_email_accounts_tenant] ON [dbo].[email_accounts] ([tenant_id], [is_active]);

CREATE TABLE [dbo].[email_folders] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [email_account_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255),
    [folder_type] NVARCHAR(50),
    [parent_folder_id] BIGINT,
    [message_count] INT DEFAULT 0,
    [unread_count] INT DEFAULT 0,
    [sort_order] INT DEFAULT 0,
    [is_selectable] BIT DEFAULT 1,
    [attributes] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([email_account_id], [name])
);

CREATE TABLE [dbo].[email_messages] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [email_account_id] BIGINT NOT NULL,
    [message_id] NVARCHAR(255),
    [thread_id] NVARCHAR(255),
    [parent_message_id] BIGINT,
    
    -- E2E Encrypted Content
    [encrypted_subject] NVARCHAR(MAX),
    [encrypted_body_text] NVARCHAR(MAX),
    [encrypted_body_html] NVARCHAR(MAX),
    [encryption_iv] NVARCHAR(MAX),
    [encryption_auth_tag] NVARCHAR(MAX),
    [encryption_key_version] INT DEFAULT 1,
    [is_encrypted] BIT DEFAULT 1,
    
    -- Metadata (searchable, not encrypted)
    [sender_email] NVARCHAR(320),
    [sender_name] NVARCHAR(255),
    [reply_to_email] NVARCHAR(320),
    [reply_to_name] NVARCHAR(255),
    [recipients_to] NVARCHAR(MAX),
    [recipients_cc] NVARCHAR(MAX),
    [recipients_bcc] NVARCHAR(MAX),
    [snippet] NVARCHAR(500), -- Unencrypted preview for search
    [size_bytes] INT,
    [attachments_count] INT DEFAULT 0,
    
    [is_read] BIT DEFAULT 0,
    [is_important] BIT DEFAULT 0,
    [is_starred] BIT DEFAULT 0,
    [is_draft] BIT DEFAULT 0,
    [is_sent] BIT DEFAULT 0,
    [is_spam] BIT DEFAULT 0,
    [is_trash] BIT DEFAULT 0,
    [is_inquiry] BIT DEFAULT 0,
    [inquiry_confidence] DECIMAL(3,2),
    [sentiment_score] DECIMAL(3,2),
    [priority_level] INT DEFAULT 0,
    [assigned_to] BIGINT,
    [labels] NVARCHAR(MAX),
    [headers] NVARCHAR(MAX),
    
    [shared_with_tenants] NVARCHAR(MAX),
    [sharing_settings] NVARCHAR(MAX),
    
    [received_at] DATETIME2(7),
    [sent_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_emails_tenant] ON [dbo].[email_messages] ([tenant_id], [received_at] DESC);
CREATE INDEX [IX_emails_account] ON [dbo].[email_messages] ([email_account_id], [received_at] DESC);
CREATE INDEX [IX_emails_inquiry] ON [dbo].[email_messages] ([tenant_id], [is_inquiry], [assigned_to]);

CREATE TABLE [dbo].[email_attachments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    
    -- E2E Encrypted File
    [encrypted_filename] NVARCHAR(MAX),
    [encrypted_file_url] NVARCHAR(MAX),
    [encrypted_file_key] NVARCHAR(MAX),
    [encryption_iv] NVARCHAR(MAX),
    [encryption_auth_tag] NVARCHAR(MAX),
    [is_encrypted] BIT DEFAULT 1,
    
    [content_type] NVARCHAR(200),
    [size_bytes] INT,
    [attachment_id] NVARCHAR(255),
    [file_hash] NVARCHAR(64),
    [is_inline] BIT DEFAULT 0,
    [virus_scan_status] NVARCHAR(20) DEFAULT 'pending',
    [virus_scan_result] NVARCHAR(MAX),
    
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_email_attachments] ON [dbo].[email_attachments] ([message_id]);

CREATE TABLE [dbo].[email_templates] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [category] NVARCHAR(100),
    [subject] NVARCHAR(500),
    [body_html] NVARCHAR(MAX),
    [body_text] NVARCHAR(MAX),
    [variables] NVARCHAR(MAX),
    [usage_count] INT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[email_rules] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [email_account_id] BIGINT,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [conditions] NVARCHAR(MAX) NOT NULL,
    [actions] NVARCHAR(MAX) NOT NULL,
    [priority] INT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [execution_count] INT DEFAULT 0,
    [last_executed_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

 
-- ==================== PAYMENT & FINANCIAL ====================

CREATE TABLE [dbo].[payment_methods] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT,
    [method_type] NVARCHAR(50) NOT NULL,
    [provider] NVARCHAR(50),
    [account_name] NVARCHAR(255),
    [account_number_encrypted] NVARCHAR(MAX),
    [routing_number_encrypted] NVARCHAR(MAX),
    [iban_encrypted] NVARCHAR(MAX),
    [swift_code] NVARCHAR(20),
    [bank_name] NVARCHAR(255),
    [bank_address] NVARCHAR(MAX),
    [paypal_email] NVARCHAR(320),
    [crypto_wallet_address] NVARCHAR(MAX),
    [crypto_network] NVARCHAR(50),
    [provider_customer_id] NVARCHAR(255),
    [provider_payment_method_id] NVARCHAR(255),
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [is_default] BIT DEFAULT 0,
    [is_verified] BIT DEFAULT 0,
    [verified_at] DATETIME2(7),
    [last_used_at] DATETIME2(7),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_payment_methods_tenant] ON [dbo].[payment_methods] ([tenant_id], [is_default]);

CREATE TABLE [dbo].[invoices] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [invoice_number] NVARCHAR(100) UNIQUE NOT NULL,
    [invoice_type] NVARCHAR(20) NOT NULL,
    [related_type] NVARCHAR(50),
    [related_id] BIGINT,
    [recipient_type] NVARCHAR(20) NOT NULL,
    [recipient_tenant_id] BIGINT,
    [recipient_name] NVARCHAR(255) NOT NULL,
    [recipient_email] NVARCHAR(320),
    [recipient_address] NVARCHAR(MAX),
    [bill_to_address] NVARCHAR(MAX),
    [ship_to_address] NVARCHAR(MAX),
    [subtotal] DECIMAL(12,2) NOT NULL DEFAULT 0,
    [tax_amount] DECIMAL(12,2) DEFAULT 0,
    [discount_amount] DECIMAL(12,2) DEFAULT 0,
    [total_amount] DECIMAL(12,2) NOT NULL,
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [exchange_rate] DECIMAL(10,4) DEFAULT 1,
    [payment_terms] INT DEFAULT 30,
    [due_date] DATE,
    [issue_date] DATE DEFAULT CAST(GETUTCDATE() AS DATE),
    [service_period_start] DATE,
    [service_period_end] DATE,
    [notes] NVARCHAR(MAX),
    [terms_conditions] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'draft',
    [sent_at] DATETIME2(7),
    [paid_at] DATETIME2(7),
    [payment_method] NVARCHAR(50),
    [payment_reference] NVARCHAR(255),
    [late_fee_amount] DECIMAL(10,2) DEFAULT 0,
    [reminder_sent_count] INT DEFAULT 0,
    [last_reminder_sent_at] DATETIME2(7),
    [pdf_url] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_invoices_tenant] ON [dbo].[invoices] ([tenant_id], [status]);
CREATE INDEX [IX_invoices_recipient] ON [dbo].[invoices] ([recipient_tenant_id]) WHERE [recipient_tenant_id] IS NOT NULL;

CREATE TABLE [dbo].[invoice_items] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [invoice_id] BIGINT NOT NULL,
    [line_number] INT NOT NULL,
    [item_type] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [quantity] DECIMAL(10,2) DEFAULT 1,
    [unit_price] DECIMAL(10,2) NOT NULL,
    [discount_percent] DECIMAL(5,2) DEFAULT 0,
    [discount_amount] DECIMAL(10,2) DEFAULT 0,
    [tax_rate] DECIMAL(5,2) DEFAULT 0,
    [tax_amount] DECIMAL(10,2) DEFAULT 0,
    [line_total] DECIMAL(12,2) NOT NULL,
    [sku] NVARCHAR(100),
    [category] NVARCHAR(100),
    [campaign_id] BIGINT,
    [creator_tenant_id] BIGINT,
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[payments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [invoice_id] BIGINT,
    [payment_type] NVARCHAR(20) NOT NULL,
    [transaction_type] NVARCHAR(50) NOT NULL,
    [payer_type] NVARCHAR(20),
    [payer_tenant_id] BIGINT,
    [payer_name] NVARCHAR(255),
    [payee_type] NVARCHAR(20),
    [payee_tenant_id] BIGINT,
    [payee_name] NVARCHAR(255),
    [amount] DECIMAL(12,2) NOT NULL,
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [exchange_rate] DECIMAL(10,4) DEFAULT 1,
    [base_amount] DECIMAL(12,2),
    [fee_amount] DECIMAL(10,2) DEFAULT 0,
    [net_amount] DECIMAL(12,2),
    [payment_method_id] BIGINT,
    [payment_gateway] NVARCHAR(50),
    [gateway_transaction_id] NVARCHAR(255),
    [gateway_fee] DECIMAL(10,2) DEFAULT 0,
    [reference_number] NVARCHAR(255),
    [description] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'pending',
    [initiated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [processed_at] DATETIME2(7),
    [completed_at] DATETIME2(7),
    [failed_at] DATETIME2(7),
    [failure_reason] NVARCHAR(MAX),
    [retry_count] INT DEFAULT 0,
    [next_retry_at] DATETIME2(7),
    [webhook_data] NVARCHAR(MAX),
    [reconciliation_status] NVARCHAR(20) DEFAULT 'pending',
    [reconciled_at] DATETIME2(7),
    [bank_statement_reference] NVARCHAR(255),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_payments_tenant] ON [dbo].[payments] ([tenant_id], [created_at] DESC);
CREATE INDEX [IX_payments_payer] ON [dbo].[payments] ([payer_tenant_id]) WHERE [payer_tenant_id] IS NOT NULL;
CREATE INDEX [IX_payments_payee] ON [dbo].[payments] ([payee_tenant_id]) WHERE [payee_tenant_id] IS NOT NULL;

CREATE TABLE [dbo].[payout_batches] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [batch_number] NVARCHAR(100) UNIQUE NOT NULL,
    [batch_type] NVARCHAR(20) DEFAULT 'creator_payout',
    [total_amount] DECIMAL(12,2) NOT NULL,
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [payment_count] INT DEFAULT 0,
    [successful_payments] INT DEFAULT 0,
    [failed_payments] INT DEFAULT 0,
    [processing_fee] DECIMAL(10,2) DEFAULT 0,
    [status] NVARCHAR(20) DEFAULT 'draft',
    [scheduled_at] DATETIME2(7),
    [started_at] DATETIME2(7),
    [completed_at] DATETIME2(7),
    [gateway_batch_id] NVARCHAR(255),
    [notes] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[batch_payments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [batch_id] BIGINT NOT NULL,
    [payment_id] BIGINT NOT NULL,
    [sequence_number] INT,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([batch_id], [payment_id])
);

CREATE TABLE [dbo].[financial_reports] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [report_type] NVARCHAR(50) NOT NULL,
    [report_name] NVARCHAR(255) NOT NULL,
    [period_type] NVARCHAR(20) NOT NULL,
    [period_start] DATE NOT NULL,
    [period_end] DATE NOT NULL,
    [total_revenue] DECIMAL(12,2) DEFAULT 0,
    [total_expenses] DECIMAL(12,2) DEFAULT 0,
    [total_profit] DECIMAL(12,2) DEFAULT 0,
    [creator_payments] DECIMAL(12,2) DEFAULT 0,
    [platform_fees] DECIMAL(12,2) DEFAULT 0,
    [tax_amount] DECIMAL(12,2) DEFAULT 0,
    [report_data] NVARCHAR(MAX) NOT NULL,
    [generated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [file_url] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [report_type], [period_start], [period_end])
);

-- ==================== FILE MANAGEMENT ====================

CREATE TABLE [dbo].[files] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [uploaded_by] BIGINT NOT NULL,
    [filename] NVARCHAR(500) NOT NULL,
    [original_filename] NVARCHAR(500) NOT NULL,
    [file_path] NVARCHAR(1000) NOT NULL,
    [file_url] NVARCHAR(MAX) NOT NULL,
    [file_size] BIGINT NOT NULL,
    [mime_type] NVARCHAR(200) NOT NULL,
    [file_extension] NVARCHAR(20),
    [file_hash] NVARCHAR(64) UNIQUE,
    [dimensions] NVARCHAR(MAX),
    [duration_seconds] INT,
    [metadata] NVARCHAR(MAX),
    [folder_path] NVARCHAR(1000) DEFAULT '/',
    [tags] NVARCHAR(MAX),
    [is_public] BIT DEFAULT 0,
    [is_temporary] BIT DEFAULT 0,
    [expires_at] DATETIME2(7),
    [download_count] INT DEFAULT 0,
    [virus_scan_status] NVARCHAR(20) DEFAULT 'pending',
    [virus_scan_result] NVARCHAR(MAX),
    [processing_status] NVARCHAR(20) DEFAULT 'pending',
    [thumbnail_url] NVARCHAR(MAX),
    [preview_url] NVARCHAR(MAX),
    [compressed_url] NVARCHAR(MAX),
    [watermarked_url] NVARCHAR(MAX),
    
    -- E2E Encryption for files
    [encrypted_file_key] NVARCHAR(MAX),
    [encryption_iv] NVARCHAR(MAX),
    [encryption_auth_tag] NVARCHAR(MAX),
    [is_encrypted] BIT DEFAULT 0,
    
    [shared_with_tenants] NVARCHAR(MAX),
    
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_files_tenant] ON [dbo].[files] ([tenant_id], [created_at] DESC);
CREATE INDEX [IX_files_hash] ON [dbo].[files] ([file_hash]);

CREATE TABLE [dbo].[file_shares] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [file_id] BIGINT NOT NULL,
    [share_type] NVARCHAR(20) NOT NULL,
    [shared_with_user_id] BIGINT,
    [shared_with_tenant_id] BIGINT,
    [shared_with_email] NVARCHAR(320),
    [access_token] NVARCHAR(255) UNIQUE,
    [password_hash] NVARCHAR(255),
    [permissions] NVARCHAR(MAX),
    [expires_at] DATETIME2(7),
    [max_downloads] INT,
    [download_count] INT DEFAULT 0,
    [last_accessed_at] DATETIME2(7),
    [access_count] INT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[resource_shares] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [resource_type] NVARCHAR(50) NOT NULL,
    [resource_id] BIGINT NOT NULL,
    [share_token] NVARCHAR(255) UNIQUE NOT NULL,
    [share_type] NVARCHAR(20) NOT NULL,
    [recipient_email] NVARCHAR(320),
    [recipient_user_id] BIGINT,
    [recipient_tenant_id] BIGINT,
    [password_protected] BIT DEFAULT 0,
    [password_hash] NVARCHAR(255),
    [requires_login] BIT DEFAULT 1,
    [allow_download] BIT DEFAULT 0,
    [expires_at] DATETIME2(7),
    [max_views] INT,
    [view_count] INT DEFAULT 0,
    [revoked_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_resource_shares] ON [dbo].[resource_shares] ([resource_type], [resource_id]);
CREATE INDEX [IX_resource_shares_token] ON [dbo].[resource_shares] ([share_token]);

CREATE TABLE [dbo].[resource_access_logs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [resource_type] NVARCHAR(50) NOT NULL,
    [resource_id] BIGINT NOT NULL,
    [user_id] BIGINT,
    [tenant_id] BIGINT,
    [action] NVARCHAR(50) NOT NULL,
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [accessed_at] DATETIME2(7) DEFAULT GETUTCDATE()
);

CREATE INDEX [IX_resource_access_logs] ON [dbo].[resource_access_logs] ([resource_type], [resource_id], [accessed_at] DESC);

-- ==================== INTEGRATIONS -- DO NOT CONSIDER IT NOT IN USE ====================
-- DO NOT CONSIDER IT NOT IN USE 
CREATE TABLE [dbo].[integrations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [integration_type] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [configuration] NVARCHAR(MAX),
    [credentials_encrypted] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'active',
    [last_sync_at] DATETIME2(7),
    [sync_frequency_minutes] INT DEFAULT 60,
    [error_message] NVARCHAR(MAX),
    [error_count] INT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_integrations_tenant] ON [dbo].[integrations] ([tenant_id], [integration_type]);

CREATE TABLE [dbo].[webhooks] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [url] NVARCHAR(MAX) NOT NULL,
    [secret_key] NVARCHAR(255),
    [events] NVARCHAR(MAX) NOT NULL,
    [is_active] BIT DEFAULT 1,
    [retry_attempts] INT DEFAULT 3,
    [timeout_seconds] INT DEFAULT 30,
    [last_triggered_at] DATETIME2(7),
    [success_count] INT DEFAULT 0,
    [failure_count] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_webhooks_tenant] ON [dbo].[webhooks] ([tenant_id], [is_active]);

CREATE TABLE [dbo].[webhook_deliveries] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [webhook_id] BIGINT NOT NULL,
    [event_type] NVARCHAR(100) NOT NULL,
    [event_data] NVARCHAR(MAX) NOT NULL,
    [http_status] INT,
    [response_body] NVARCHAR(MAX),
    [response_headers] NVARCHAR(MAX),
    [delivery_duration_ms] INT,
    [attempt_number] INT DEFAULT 1,
    [max_attempts] INT DEFAULT 3,
    [status] NVARCHAR(20) NOT NULL,
    [error_message] NVARCHAR(MAX),
    [next_retry_at] DATETIME2(7),
    [delivered_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== WORKFLOW AUTOMATION -- DO NOT CONSIDER IT'S NOT IN USE ====================

CREATE TABLE [dbo].[workflows] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [category] NVARCHAR(100),
    [trigger_type] NVARCHAR(50) NOT NULL,
    [trigger_conditions] NVARCHAR(MAX),
    [workflow_definition] NVARCHAR(MAX) NOT NULL,
    [variables] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [is_template] BIT DEFAULT 0,
    [execution_count] INT DEFAULT 0,
    [success_rate] DECIMAL(5,2),
    [avg_execution_time_seconds] INT,
    [last_executed_at] DATETIME2(7),
    [version] INT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_workflows_tenant] ON [dbo].[workflows] ([tenant_id], [is_active]);

CREATE TABLE [dbo].[workflow_executions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [workflow_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    [execution_name] NVARCHAR(255),
    [trigger_data] NVARCHAR(MAX),
    [context_data] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'running',
    [started_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [completed_at] DATETIME2(7),
    [duration_seconds] INT,
    [steps_total] INT DEFAULT 0,
    [steps_completed] INT DEFAULT 0,
    [steps_failed] INT DEFAULT 0,
    [current_step_id] BIGINT,
    [error_message] NVARCHAR(MAX),
    [retry_count] INT DEFAULT 0,
    [max_retries] INT DEFAULT 3,
    [next_retry_at] DATETIME2(7),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[workflow_step_executions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [execution_id] BIGINT NOT NULL,
    [step_id] NVARCHAR(100) NOT NULL,
    [step_name] NVARCHAR(255),
    [step_type] NVARCHAR(50) NOT NULL,
    [input_data] NVARCHAR(MAX),
    [output_data] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'pending',
    [started_at] DATETIME2(7),
    [completed_at] DATETIME2(7),
    [duration_seconds] INT,
    [error_message] NVARCHAR(MAX),
    [retry_count] INT DEFAULT 0,
    [sequence_number] INT,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== AI SYSTEM ====================

CREATE TABLE [dbo].[ai_conversations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [conversation_type] NVARCHAR(50) DEFAULT 'general',
    [title] NVARCHAR(255),
    [context] NVARCHAR(MAX),
    [message_count] INT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [last_message_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_ai_conversations_tenant] ON [dbo].[ai_conversations] ([tenant_id], [user_id]);

CREATE TABLE [dbo].[ai_messages] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [conversation_id] BIGINT NOT NULL,
    [sender_type] NVARCHAR(10) NOT NULL CHECK ([sender_type] IN ('user', 'assistant')),
    [message_content] NVARCHAR(MAX) NOT NULL,
    [message_tokens] INT,
    [response_time_ms] INT,
    [model_used] NVARCHAR(100),
    [confidence_score] DECIMAL(3,2),
    [intent_detected] NVARCHAR(100),
    [entities_extracted] NVARCHAR(MAX),
    [actions_suggested] NVARCHAR(MAX),
    [feedback_rating] INT CHECK ([feedback_rating] >= 1 AND [feedback_rating] <= 5),
    [feedback_comment] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== NOTIFICATIONS ====================

CREATE TABLE [dbo].[notification_templates] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [event_type] NVARCHAR(100) NOT NULL,
    [channel] NVARCHAR(50) NOT NULL,
    [subject_template] NVARCHAR(500),
    [body_template] NVARCHAR(MAX) NOT NULL,
    [variables] NVARCHAR(MAX),
    [is_system_template] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[notification_preferences] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [event_type] NVARCHAR(100) NOT NULL,
    [email_enabled] BIT DEFAULT 1,
    [sms_enabled] BIT DEFAULT 0,
    [push_enabled] BIT DEFAULT 1,
    [in_app_enabled] BIT DEFAULT 1,
    [frequency] NVARCHAR(20) DEFAULT 'immediate',
    [quiet_hours_start] TIME,
    [quiet_hours_end] TIME,
    [timezone] NVARCHAR(50),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([user_id], [event_type])
);

CREATE TABLE [dbo].[notifications] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [recipient_id] BIGINT NOT NULL,
    [event_type] NVARCHAR(100) NOT NULL,
    [channel] NVARCHAR(50) NOT NULL,
    [priority] NVARCHAR(20) DEFAULT 'normal',
    [subject] NVARCHAR(500),
    [message] NVARCHAR(MAX) NOT NULL,
    [data] NVARCHAR(MAX),
    [template_id] BIGINT,
    [scheduled_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [sent_at] DATETIME2(7),
    [delivered_at] DATETIME2(7),
    [read_at] DATETIME2(7),
    [clicked_at] DATETIME2(7),
    [status] NVARCHAR(20) DEFAULT 'pending',
    [error_message] NVARCHAR(MAX),
    [retry_count] INT DEFAULT 0,
    [max_retries] INT DEFAULT 3,
    [next_retry_at] DATETIME2(7),
    [provider_message_id] NVARCHAR(255),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_notifications_recipient] ON [dbo].[notifications] ([recipient_id], [status], [created_at] DESC);
CREATE INDEX [IX_notifications_tenant] ON [dbo].[notifications] ([tenant_id]) WHERE [tenant_id] IS NOT NULL;

-- ==================== ANALYTICS & REPORTING -- DO NOT CONSIDER IT'S NOT IN USE ====================

CREATE TABLE [dbo].[analytics_events] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT,
    [session_id] BIGINT,
    [event_name] NVARCHAR(100) NOT NULL,
    [event_category] NVARCHAR(50) NOT NULL,
    [event_action] NVARCHAR(50),
    [event_label] NVARCHAR(255),
    [event_value] DECIMAL(10,2),
    [page_url] NVARCHAR(MAX),
    [referrer_url] NVARCHAR(MAX),
    [user_agent] NVARCHAR(MAX),
    [ip_address] NVARCHAR(45),
    [properties] NVARCHAR(MAX),
    [timestamp] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_analytics_events_tenant] ON [dbo].[analytics_events] ([tenant_id], [timestamp] DESC);

CREATE TABLE [dbo].[dashboard_widgets] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [user_id] BIGINT,
    [widget_type] NVARCHAR(50) NOT NULL,
    [widget_name] NVARCHAR(255) NOT NULL,
    [configuration] NVARCHAR(MAX) NOT NULL,
    [position_x] INT DEFAULT 0,
    [position_y] INT DEFAULT 0,
    [width] INT DEFAULT 4,
    [height] INT DEFAULT 3,
    [dashboard_tab] NVARCHAR(100) DEFAULT 'default',
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[reports] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [report_type] NVARCHAR(50) NOT NULL,
    [configuration] NVARCHAR(MAX) NOT NULL,
    [schedule_type] NVARCHAR(20),
    [schedule_config] NVARCHAR(MAX),
    [last_generated_at] DATETIME2(7),
    [next_generation_at] DATETIME2(7),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_reports_tenant] ON [dbo].[reports] ([tenant_id], [is_active]);

CREATE TABLE [dbo].[report_instances] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [report_id] BIGINT NOT NULL,
    [generated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [generation_time_seconds] INT,
    [file_url] NVARCHAR(MAX),
    [file_format] NVARCHAR(20),
    [row_count] INT,
    [status] NVARCHAR(20) DEFAULT 'completed',
    [error_message] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== SYSTEM MANAGEMENT ====================

CREATE TABLE [dbo].[system_config] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [config_key] NVARCHAR(255) NOT NULL,
    [config_value] NVARCHAR(MAX),
    [config_type] NVARCHAR(50) DEFAULT 'string',
    [is_encrypted] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE UNIQUE INDEX [IX_system_config_tenant_key] ON [dbo].[system_config] ([tenant_id], [config_key]);

CREATE TABLE [dbo].[audit_logs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [user_id] BIGINT,
    [entity_type] NVARCHAR(100) NOT NULL,
    [entity_id] BIGINT,
    [action_type] NVARCHAR(50) NOT NULL,
    [old_values] NVARCHAR(MAX),
    [new_values] NVARCHAR(MAX),
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [session_id] BIGINT,
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_audit_tenant] ON [dbo].[audit_logs] ([tenant_id], [created_at] DESC) WHERE [tenant_id] IS NOT NULL;
CREATE INDEX [IX_audit_system] ON [dbo].[audit_logs] ([created_at] DESC) WHERE [tenant_id] IS NULL;

CREATE TABLE [dbo].[system_events] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [user_id] BIGINT,
    [event_type] NVARCHAR(100) NOT NULL,
    [event_name] NVARCHAR(255) NOT NULL,
    [event_data] NVARCHAR(MAX),
    [source] NVARCHAR(100),
    [session_id] BIGINT,
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_system_events_tenant] ON [dbo].[system_events] ([tenant_id], [created_at] DESC) WHERE [tenant_id] IS NOT NULL;

CREATE TABLE [dbo].[system_metrics] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [metric_name] NVARCHAR(100) NOT NULL,
    [metric_value] DECIMAL(15,4) NOT NULL,
    [metric_unit] NVARCHAR(50),
    [dimensions] NVARCHAR(MAX),
    [timestamp] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_system_metrics] ON [dbo].[system_metrics] ([metric_name], [timestamp] DESC);

CREATE TABLE [dbo].[error_logs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [user_id] BIGINT,
    [error_type] NVARCHAR(100) NOT NULL,
    [error_message] NVARCHAR(MAX) NOT NULL,
    [error_code] NVARCHAR(50),
    [stack_trace] NVARCHAR(MAX),
    [request_url] NVARCHAR(MAX),
    [request_method] NVARCHAR(10),
    [request_headers] NVARCHAR(MAX),
    [request_body] NVARCHAR(MAX),
    [response_status] INT,
    [severity] NVARCHAR(20) DEFAULT 'error',
    [resolved] BIT DEFAULT 0,
    [resolved_at] DATETIME2(7),
    [resolved_by] BIGINT,
    [occurrence_count] INT DEFAULT 1,
    [first_occurred_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [last_occurred_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_error_logs_tenant] ON [dbo].[error_logs] ([tenant_id], [severity], [resolved]) WHERE [tenant_id] IS NOT NULL;

-- ==================== ENCRYPTION KEY MANAGEMENT ====================

CREATE TABLE [dbo].[encryption_keys] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [key_type] NVARCHAR(50) NOT NULL, -- 'master', 'tenant', 'user', 'channel', 'file'
    [entity_type] NVARCHAR(50), -- 'tenant', 'user', 'channel'
    [entity_id] BIGINT,
    [key_version] INT NOT NULL,
    [algorithm] NVARCHAR(50) NOT NULL, -- 'RSA-2048', 'AES-256-GCM'
    [encrypted_key] NVARCHAR(MAX) NOT NULL,
    [public_key] NVARCHAR(MAX),
    [key_fingerprint] NVARCHAR(64) NOT NULL,
    [key_purpose] NVARCHAR(100), -- 'signing', 'encryption', 'both'
    [is_active] BIT DEFAULT 1,
    [expires_at] DATETIME2(7),
    [rotated_from_key_id] BIGINT,
    [rotation_reason] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_encryption_keys_entity] ON [dbo].[encryption_keys] ([entity_type], [entity_id], [is_active]);
CREATE INDEX [IX_encryption_keys_fingerprint] ON [dbo].[encryption_keys] ([key_fingerprint]);

CREATE TABLE [dbo].[key_rotation_schedule] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [entity_type] NVARCHAR(50) NOT NULL,
    [entity_id] BIGINT NOT NULL,
    [current_key_id] BIGINT NOT NULL,
    [rotation_frequency_days] INT DEFAULT 90,
    [last_rotated_at] DATETIME2(7),
    [next_rotation_at] DATETIME2(7) NOT NULL,
    [auto_rotate] BIT DEFAULT 1,
    [rotation_policy] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([entity_type], [entity_id])
);

CREATE INDEX [IX_key_rotation_next] ON [dbo].[key_rotation_schedule] ([next_rotation_at], [auto_rotate]) WHERE [is_active] = 1;

-- ==================== SECURITY AUDIT ====================

CREATE TABLE [dbo].[security_events] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [user_id] BIGINT,
    [event_type] NVARCHAR(100) NOT NULL,
    [event_category] NVARCHAR(50) NOT NULL, -- 'authentication', 'authorization', 'encryption', 'data_access'
    [severity] NVARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    [description] NVARCHAR(MAX) NOT NULL,
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [location] NVARCHAR(MAX),
    [resource_type] NVARCHAR(50),
    [resource_id] BIGINT,
    [action_taken] NVARCHAR(MAX),
    [risk_score] INT DEFAULT 0,
    [is_anomaly] BIT DEFAULT 0,
    [is_resolved] BIT DEFAULT 0,
    [resolved_at] DATETIME2(7),
    [resolved_by] BIGINT,
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_security_events_tenant] ON [dbo].[security_events] ([tenant_id], [created_at] DESC) WHERE [tenant_id] IS NOT NULL;
CREATE INDEX [IX_security_events_severity] ON [dbo].[security_events] ([severity], [is_resolved], [created_at] DESC);

CREATE TABLE [dbo].[encryption_audit_logs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [operation_type] NVARCHAR(50) NOT NULL, -- 'encrypt', 'decrypt', 'key_generation', 'key_rotation'
    [entity_type] NVARCHAR(50) NOT NULL,
    [entity_id] BIGINT NOT NULL,
    [key_id] BIGINT,
    [key_version] INT,
    [algorithm_used] NVARCHAR(50),
    [user_id] BIGINT,
    [tenant_id] BIGINT,
    [success] BIT NOT NULL,
    [error_message] NVARCHAR(MAX),
    [ip_address] NVARCHAR(45),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_encryption_audit] ON [dbo].[encryption_audit_logs] ([entity_type], [entity_id], [created_at] DESC);

CREATE INDEX [IX_tenants_type_status] ON [dbo].[tenants] ([tenant_type], [status]);
CREATE INDEX [IX_tenants_owner] ON [dbo].[tenants] ([owner_user_id]);
CREATE INDEX [IX_tenants_slug] ON [dbo].[tenants] ([slug]);

-- ==================== SUBSCRIPTION PLANS ====================

CREATE TABLE [dbo].[subscription_plans] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [plan_name] NVARCHAR(100) NOT NULL,
    [plan_slug] NVARCHAR(50) UNIQUE NOT NULL,
    [plan_type] NVARCHAR(20) NOT NULL CHECK ([plan_type] IN ('agency', 'brand', 'creator')),
    [price_monthly] DECIMAL(10,2),
    [price_yearly] DECIMAL(10,2),
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [trial_days] INT DEFAULT 14,
    
    -- Limits
    [max_staff] INT DEFAULT 5,
    [max_storage_gb] INT DEFAULT 10,
    [max_campaigns] INT DEFAULT 10,
    [max_invitations] INT DEFAULT 20,
    [max_integrations] INT DEFAULT 5,
    [max_creators] INT DEFAULT 100,
    [max_brands] INT DEFAULT 50,
    
    [features] NVARCHAR(MAX), -- JSON array
    [is_active] BIT DEFAULT 1,
    [sort_order] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_plans_type] ON [dbo].[subscription_plans] ([plan_type], [is_active]);

CREATE TABLE [dbo].[subscription_history] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [from_plan_id] BIGINT,
    [to_plan_id] BIGINT NOT NULL,
    [change_type] NVARCHAR(20) NOT NULL,
    [change_reason] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_subscription_history_tenant] ON [dbo].[subscription_history] ([tenant_id], [created_at] DESC);

-- ==================== USERS ====================

CREATE TABLE [dbo].[users] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [email] NVARCHAR(320) UNIQUE NOT NULL,
    [username] NVARCHAR(100) NULL,
    [password_hash] NVARCHAR(255),
    [user_type] NVARCHAR(50) NOT NULL DEFAULT 'pending',
    
    [is_super_admin] BIT DEFAULT 0,
    
    -- Profile
    [first_name] NVARCHAR(100),
    [last_name] NVARCHAR(100),
    [display_name] NVARCHAR(200),
    [avatar_url] NVARCHAR(MAX),
    [phone] NVARCHAR(20),
    [timezone] NVARCHAR(50) DEFAULT 'UTC',
    [locale] NVARCHAR(10) DEFAULT 'en-US',
    
    -- E2E Encryption Keys (per user)
    [public_key] NVARCHAR(MAX), -- User's RSA public key
    [encrypted_private_key] NVARCHAR(MAX), -- Encrypted with user's password-derived key
    [key_version] INT DEFAULT 1,
    [key_created_at] DATETIME2(7),
    [key_rotated_at] DATETIME2(7),
    
    -- Verification
    [email_verified_at] DATETIME2(7),
    [phone_verified_at] DATETIME2(7),
    
    -- Onboarding
    [onboarding_completed_at] DATETIME2(7),
    [onboarding_step] INT DEFAULT 0,
    
    -- Activity
    [last_login_at] DATETIME2(7),
    [last_active_at] DATETIME2(7),
    [login_count] INT DEFAULT 0,
    
    -- Security
    [failed_login_count] INT DEFAULT 0,
    [locked_until] DATETIME2(7),
    [password_changed_at] DATETIME2(7),
    [must_change_password] BIT DEFAULT 0,
    [two_factor_enabled] BIT DEFAULT 0,
    [two_factor_secret] NVARCHAR(255),
    [backup_codes] NVARCHAR(MAX),
    
    [preferences] NVARCHAR(MAX), -- JSON
    [metadata] NVARCHAR(MAX), -- JSON
    [status] NVARCHAR(20) DEFAULT 'pending',
    [is_system_user] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_users_email] ON [dbo].[users] ([email]);
CREATE INDEX [IX_users_status] ON [dbo].[users] ([status]);
CREATE INDEX [IX_users_super_admin] ON [dbo].[users] ([is_super_admin]) WHERE [is_super_admin] = 1;

CREATE TABLE [dbo].[verification_codes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT,
    [email] NVARCHAR(320),
    [phone] NVARCHAR(20),
    [code] NVARCHAR(10) NOT NULL,
    [code_type] NVARCHAR(20) NOT NULL,
    [expires_at] DATETIME2(7) NOT NULL,
    [used_at] DATETIME2(7),
    [ip_address] NVARCHAR(45),
    [attempts] INT DEFAULT 0,
    [max_attempts] INT DEFAULT 5,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_verification_codes_lookup] ON [dbo].[verification_codes] ([email], [code_type], [used_at]);

CREATE TABLE [dbo].[user_sessions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [active_tenant_id] BIGINT NULL,
    [session_token] NVARCHAR(512) UNIQUE NOT NULL,
    [refresh_token] NVARCHAR(512) UNIQUE,
    [device_fingerprint] NVARCHAR(255),
    [device_name] NVARCHAR(255),
    [device_type] NVARCHAR(50),
    [browser_name] NVARCHAR(100),
    [browser_version] NVARCHAR(50),
    [os_name] NVARCHAR(100),
    [os_version] NVARCHAR(50),
    [ip_address] NVARCHAR(45),
    [location] NVARCHAR(MAX),
    
    -- E2E Session Keys
    [encrypted_session_key] NVARCHAR(MAX), -- Encrypted with user's public key
    [session_key_version] INT DEFAULT 1,
    
    [is_active] BIT DEFAULT 1,
    [last_activity_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [expires_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_user_sessions_token] ON [dbo].[user_sessions] ([session_token]) INCLUDE ([user_id], [expires_at], [is_active]);
CREATE INDEX [IX_user_sessions_user] ON [dbo].[user_sessions] ([user_id], [is_active]);
CREATE INDEX [IX_user_sessions_tenant] ON [dbo].[user_sessions] ([active_tenant_id]) WHERE [active_tenant_id] IS NOT NULL;

CREATE TABLE [dbo].[user_social_accounts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [provider] NVARCHAR(50) NOT NULL,
    [provider_user_id] NVARCHAR(255) NOT NULL,
    [provider_username] NVARCHAR(255),
    [provider_email] NVARCHAR(320),
    [access_token] NVARCHAR(MAX),
    [refresh_token] NVARCHAR(MAX),
    [token_expires_at] DATETIME2(7),
    [profile_data] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([provider], [provider_user_id])
);

CREATE TABLE [dbo].[password_reset_tokens] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [token] NVARCHAR(255) UNIQUE NOT NULL,
    [expires_at] DATETIME2(7) NOT NULL,
    [used_at] DATETIME2(7),
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== TENANT MEMBERSHIP ====================

CREATE TABLE [dbo].[tenant_members] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [role_id] BIGINT NOT NULL,
    [member_type] NVARCHAR(20) NOT NULL DEFAULT 'staff',
    [department] NVARCHAR(100),
    [reports_to] BIGINT,
    [joined_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [left_at] DATETIME2(7),
    [is_active] BIT DEFAULT 1,
    [permissions_override] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [user_id])
);

CREATE INDEX [IX_tenant_members_tenant] ON [dbo].[tenant_members] ([tenant_id], [is_active]);
CREATE INDEX [IX_tenant_members_user] ON [dbo].[tenant_members] ([user_id]);
CREATE INDEX [IX_tenant_members_role] ON [dbo].[tenant_members] ([role_id]);

-- ==================== INVITATIONS ====================

CREATE TABLE [dbo].[invitations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [invited_by] BIGINT NOT NULL,
    [invitee_email] NVARCHAR(320) NOT NULL,
    [invitee_phone] NVARCHAR(20),
    [invitee_name] NVARCHAR(255),
    [invitee_type] NVARCHAR(50) NOT NULL,
    [role_id] BIGINT,
    [invitation_token] NVARCHAR(255) UNIQUE NOT NULL,
    [invitation_message] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'pending',
    [expires_at] DATETIME2(7) NOT NULL,
    [accepted_at] DATETIME2(7),
    [declined_at] DATETIME2(7),
    [decline_reason] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_invitations_tenant] ON [dbo].[invitations] ([tenant_id], [status]);
CREATE INDEX [IX_invitations_token] ON [dbo].[invitations] ([invitation_token]);
CREATE INDEX [IX_invitations_email] ON [dbo].[invitations] ([invitee_email], [status]);

-- ==================== TENANT RELATIONSHIPS ====================

CREATE TABLE [dbo].[tenant_relationships] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [primary_tenant_id] BIGINT NOT NULL,
    [related_tenant_id] BIGINT NOT NULL,
    [relationship_type] NVARCHAR(50) NOT NULL,
    [permissions] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'active',
    [started_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [ended_at] DATETIME2(7),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([primary_tenant_id], [related_tenant_id])
);

CREATE INDEX [IX_relationships_primary] ON [dbo].[tenant_relationships] ([primary_tenant_id], [status]);
CREATE INDEX [IX_relationships_related] ON [dbo].[tenant_relationships] ([related_tenant_id], [status]);

-- ==================== TENANT USAGE ====================

CREATE TABLE [dbo].[tenant_usage] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [metric_name] NVARCHAR(100) NOT NULL,
    [metric_value] DECIMAL(15,4),
    [measurement_period] DATE,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [metric_name], [measurement_period])
);

CREATE INDEX [IX_tenant_usage] ON [dbo].[tenant_usage] ([tenant_id], [measurement_period] DESC);

-- ==================== ENHANCED RBAC SYSTEM ====================

CREATE TABLE [dbo].[roles] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [display_name] NVARCHAR(255),
    [description] NVARCHAR(MAX),
    [is_system_role] BIT DEFAULT 0,
    [is_default] BIT DEFAULT 0,
    [hierarchy_level] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE UNIQUE INDEX [IX_roles_tenant_name] ON [dbo].[roles] ([tenant_id], [name]);
CREATE INDEX [IX_roles_system] ON [dbo].[roles] ([is_system_role]) WHERE [is_system_role] = 1;

CREATE TABLE [dbo].[permissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [permission_key] NVARCHAR(100) UNIQUE NOT NULL,
    [resource] NVARCHAR(100) NOT NULL,
    [action] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(MAX),
    [category] NVARCHAR(100),
    [applicable_to] NVARCHAR(MAX),
    [is_system_permission] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_permissions_resource] ON [dbo].[permissions] ([resource], [action]);
CREATE INDEX [IX_permissions_system] ON [dbo].[permissions] ([is_system_permission]) WHERE [is_system_permission] = 1;

CREATE TABLE [dbo].[role_permissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [role_id] BIGINT NOT NULL,
    [permission_id] BIGINT NOT NULL,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([role_id], [permission_id])
);

CREATE INDEX [IX_role_permissions_role] ON [dbo].[role_permissions] ([role_id]);

CREATE TABLE [dbo].[user_roles] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [role_id] BIGINT NOT NULL,
    [assigned_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [expires_at] DATETIME2(7),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([user_id], [role_id])
);

CREATE INDEX [IX_user_roles_lookup] ON [dbo].[user_roles] ([user_id], [is_active]) INCLUDE ([role_id]);

CREATE TABLE [dbo].[role_limits] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [role_id] BIGINT NOT NULL,
    [limit_type] NVARCHAR(50) NOT NULL,
    [limit_value] INT NOT NULL,
    [current_usage] INT DEFAULT 0,
    [reset_period] NVARCHAR(20),
    [last_reset_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([role_id], [limit_type])
);

CREATE TABLE [dbo].[menu_permissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [menu_key] NVARCHAR(100) NOT NULL,
    [permission_id] BIGINT NOT NULL,
    [applicable_to] NVARCHAR(MAX),
    [is_required] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([menu_key], [permission_id])
);

CREATE INDEX [IX_menu_permissions] ON [dbo].[menu_permissions] ([menu_key]);

-- Resource-level permissions (granular access control)
CREATE TABLE [dbo].[resource_permissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [resource_type] NVARCHAR(50) NOT NULL,
    [resource_id] BIGINT NOT NULL,
    [entity_type] NVARCHAR(20) NOT NULL,
    [entity_id] BIGINT NOT NULL,
    [permission_type] NVARCHAR(20) NOT NULL,
    [granted_by] BIGINT NOT NULL,
    [expires_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([resource_type], [resource_id], [entity_type], [entity_id], [permission_type])
);

CREATE INDEX [IX_resource_permissions] ON [dbo].[resource_permissions] ([resource_type], [resource_id]);

-- ==================== CREATOR PROFILES ====================

CREATE TABLE [dbo].[creator_profiles] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL UNIQUE,
    [stage_name] NVARCHAR(200),
    [bio] NVARCHAR(MAX),
    [date_of_birth] DATE,
    [gender] NVARCHAR(20),
    [profile_image_url] NVARCHAR(MAX),
    [cover_image_url] NVARCHAR(MAX),
    [location] NVARCHAR(MAX),
    [languages] NVARCHAR(MAX),
    [categories] NVARCHAR(MAX),
    
    [follower_count_total] INT DEFAULT 0,
    [engagement_rate_avg] DECIMAL(5,2),
    [rating] DECIMAL(3,2) DEFAULT 5.0,
    [rating_count] INT DEFAULT 0,
    [total_campaigns] INT DEFAULT 0,
    [completed_campaigns] INT DEFAULT 0,
    [success_rate] DECIMAL(5,2),
    
    [preferred_brands] NVARCHAR(MAX),
    [excluded_brands] NVARCHAR(MAX),
    [content_types] NVARCHAR(MAX),
    [availability_status] NVARCHAR(20) DEFAULT 'available',
    
    [kyc_status] NVARCHAR(20) DEFAULT 'pending',
    [bank_details] NVARCHAR(MAX),
    [tax_details] NVARCHAR(MAX),
    
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_creator_profiles_tenant] ON [dbo].[creator_profiles] ([tenant_id]);

CREATE TABLE [dbo].[creator_categories] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(100) UNIQUE NOT NULL,
    [slug] NVARCHAR(100) UNIQUE NOT NULL,
    [description] NVARCHAR(MAX),
    [parent_category_id] BIGINT,
    [level] INT DEFAULT 0,
    [sort_order] INT DEFAULT 0,
    [icon_url] NVARCHAR(MAX),
    [color] NVARCHAR(7),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[creator_social_accounts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [platform] NVARCHAR(50) NOT NULL,
    [username] NVARCHAR(255) NOT NULL,
    [url] NVARCHAR(MAX),
    [follower_count] INT DEFAULT 0,
    [following_count] INT DEFAULT 0,
    [posts_count] INT DEFAULT 0,
    [engagement_rate] DECIMAL(5,2),
    [avg_likes] INT DEFAULT 0,
    [avg_comments] INT DEFAULT 0,
    [avg_shares] INT DEFAULT 0,
    [avg_views] INT DEFAULT 0,
    [is_verified] BIT DEFAULT 0,
    [is_business_account] BIT DEFAULT 0,
    [last_sync_at] DATETIME2(7),
    [sync_status] NVARCHAR(20) DEFAULT 'pending',
    [api_data] NVARCHAR(MAX),
    [is_primary] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [platform], [username])
);

CREATE INDEX [IX_creator_social_tenant] ON [dbo].[creator_social_accounts] ([tenant_id], [platform]);

CREATE TABLE [dbo].[creator_rate_cards] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [platform] NVARCHAR(50) NOT NULL,
    [content_type] NVARCHAR(100) NOT NULL,
    [deliverable_type] NVARCHAR(100),
    [base_rate] DECIMAL(10,2) NOT NULL,
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [rate_type] NVARCHAR(20) DEFAULT 'fixed',
    [min_rate] DECIMAL(10,2),
    [max_rate] DECIMAL(10,2),
    [duration_hours] INT,
    [revisions_included] INT DEFAULT 2,
    [usage_rights_duration] INT,
    [commercial_usage_rate] DECIMAL(10,2),
    [rush_delivery_rate] DECIMAL(10,2),
    [additional_requirements] NVARCHAR(MAX),
    [is_negotiable] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [effective_from] DATE DEFAULT CAST(GETUTCDATE() AS DATE),
    [effective_until] DATE,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);
-- ==================== REMAINING TABLES FROM CREATOR DOCUMENTS ====================

CREATE TABLE [dbo].[creator_documents] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [document_type] NVARCHAR(50) NOT NULL,
    [document_name] NVARCHAR(255),
    [file_url] NVARCHAR(MAX) NOT NULL,
    [file_size] INT,
    [file_type] NVARCHAR(100),
    [verification_status] NVARCHAR(20) DEFAULT 'pending',
    [verified_at] DATETIME2(7),
    [verified_by] BIGINT,
    [rejection_reason] NVARCHAR(MAX),
    [expiry_date] DATE,
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_creator_documents_tenant] ON [dbo].[creator_documents] ([tenant_id], [verification_status]);

CREATE TABLE [dbo].[creator_availability] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [date] DATE NOT NULL,
    [is_available] BIT DEFAULT 1,
    [availability_type] NVARCHAR(20) DEFAULT 'full',
    [hours_available] INT DEFAULT 8,
    [notes] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [date])
);

CREATE INDEX [IX_creator_availability] ON [dbo].[creator_availability] ([tenant_id], [date]);

CREATE TABLE [dbo].[creator_metrics] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [platform] NVARCHAR(50) NOT NULL,
    [metric_date] DATE NOT NULL,
    [followers] INT DEFAULT 0,
    [following] INT DEFAULT 0,
    [posts] INT DEFAULT 0,
    [likes] INT DEFAULT 0,
    [comments] INT DEFAULT 0,
    [shares] INT DEFAULT 0,
    [views] INT DEFAULT 0,
    [engagement_rate] DECIMAL(5,2),
    [reach] INT DEFAULT 0,
    [impressions] INT DEFAULT 0,
    [saves] INT DEFAULT 0,
    [profile_visits] INT DEFAULT 0,
    [website_clicks] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [platform], [metric_date])
);

CREATE INDEX [IX_creator_metrics] ON [dbo].[creator_metrics] ([tenant_id], [platform], [metric_date] DESC);

-- ==================== CONTRACT REVIEW & MODIFICATIONS ====================

CREATE TABLE [dbo].[contract_review_rounds] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [contract_id] BIGINT NOT NULL,
    [round_number] INT NOT NULL,
    [review_type] NVARCHAR(50) NOT NULL,
    [initiated_by] BIGINT NOT NULL,
    [initiator_role] NVARCHAR(50) NOT NULL,
    [status] NVARCHAR(20) DEFAULT 'in_progress',
    [max_modifications] INT DEFAULT 3,
    [current_modifications] INT DEFAULT 0,
    [started_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [completed_at] DATETIME2(7),
    [deadline] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([contract_id], [round_number])
);

CREATE INDEX [IX_contract_review_rounds] ON [dbo].[contract_review_rounds] ([contract_id], [status]);

CREATE TABLE [dbo].[contract_modifications] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [contract_id] BIGINT NOT NULL,
    [review_round_id] BIGINT,
    [modified_by] BIGINT NOT NULL,
    [modifier_role] NVARCHAR(50) NOT NULL,
    [modification_type] NVARCHAR(50) NOT NULL,
    [section_modified] NVARCHAR(255),
    [old_content] NVARCHAR(MAX),
    [new_content] NVARCHAR(MAX),
    [change_reason] NVARCHAR(MAX),
    [requires_approval] BIT DEFAULT 1,
    [approved_by] BIGINT,
    [approved_at] DATETIME2(7),
    [rejected_by] BIGINT,
    [rejected_at] DATETIME2(7),
    [rejection_reason] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_contract_modifications] ON [dbo].[contract_modifications] ([contract_id], [created_at] DESC);

CREATE TABLE [dbo].[contract_stage_permissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT,
    [contract_stage] NVARCHAR(50) NOT NULL,
    [role_type] NVARCHAR(50) NOT NULL,
    [can_view] BIT DEFAULT 1,
    [can_edit] BIT DEFAULT 0,
    [can_comment] BIT DEFAULT 1,
    [can_approve] BIT DEFAULT 0,
    [max_modifications] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [contract_stage], [role_type])
);

CREATE INDEX [IX_contract_stage_permissions] ON [dbo].[contract_stage_permissions] ([tenant_id], [contract_stage]);

CREATE TABLE [dbo].[contract_versions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [contract_id] BIGINT NOT NULL,
    [version_number] INT NOT NULL,
    [content] NVARCHAR(MAX) NOT NULL,
    [variables_data] NVARCHAR(MAX),
    [changes_summary] NVARCHAR(MAX),
    [change_reason] NVARCHAR(500),
    [previous_version_id] BIGINT,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([contract_id], [version_number])
);

CREATE INDEX [IX_contract_versions] ON [dbo].[contract_versions] ([contract_id], [version_number] DESC);

-- ==================== PORTFOLIO TEMPLATES & SHARES ====================

CREATE TABLE [dbo].[portfolio_templates] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [thumbnail_url] NVARCHAR(MAX),
    [template_config] NVARCHAR(MAX) NOT NULL,
    [is_default] BIT DEFAULT 0,
    [is_public] BIT DEFAULT 0,
    [usage_count] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_portfolio_templates] ON [dbo].[portfolio_templates] ([tenant_id], [is_public]);

CREATE TABLE [dbo].[portfolio_shares] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [portfolio_id] BIGINT NOT NULL,
    [share_type] NVARCHAR(20) NOT NULL,
    [recipient_email] NVARCHAR(320),
    [recipient_name] NVARCHAR(255),
    [access_token] NVARCHAR(255) UNIQUE NOT NULL,
    [password_hash] NVARCHAR(255),
    [expires_at] DATETIME2(7),
    [view_count] INT DEFAULT 0,
    [last_viewed_at] DATETIME2(7),
    [viewer_info] NVARCHAR(MAX),
    [permissions] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_portfolio_shares] ON [dbo].[portfolio_shares] ([portfolio_id], [is_active]);
CREATE INDEX [IX_portfolio_shares_token] ON [dbo].[portfolio_shares] ([access_token]);

CREATE TABLE [dbo].[portfolio_selections] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [portfolio_id] BIGINT NOT NULL,
    [share_id] BIGINT NOT NULL,
    [selected_creator_tenant_ids] NVARCHAR(MAX) NOT NULL,
    [brand_email] NVARCHAR(320),
    [brand_name] NVARCHAR(255),
    [brand_message] NVARCHAR(MAX),
    [selection_date] DATETIME2(7) DEFAULT GETUTCDATE(),
    [status] NVARCHAR(20) DEFAULT 'pending',
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_portfolio_selections] ON [dbo].[portfolio_selections] ([portfolio_id], [share_id]);

-- ==================== CONTENT ACCESS VIOLATIONS ====================

CREATE TABLE [dbo].[content_access_violations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [submission_id] BIGINT NOT NULL,
    [user_id] BIGINT,
    [violation_type] NVARCHAR(50) NOT NULL,
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [device_fingerprint] NVARCHAR(255),
    [detected_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_content_violations] ON [dbo].[content_access_violations] ([submission_id], [detected_at] DESC);

-- ==================== FILE PROCESSING ====================

CREATE TABLE [dbo].[file_processing_jobs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [file_id] BIGINT NOT NULL,
    [job_type] NVARCHAR(50) NOT NULL,
    [status] NVARCHAR(20) DEFAULT 'pending',
    [progress_percent] INT DEFAULT 0,
    [started_at] DATETIME2(7),
    [completed_at] DATETIME2(7),
    [error_message] NVARCHAR(MAX),
    [input_parameters] NVARCHAR(MAX),
    [output_data] NVARCHAR(MAX),
    [processing_time_seconds] INT,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_file_processing_jobs] ON [dbo].[file_processing_jobs] ([file_id], [status]);

-- ==================== TASKS & CALENDAR ====================

CREATE TABLE [dbo].[tasks] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [task_type] NVARCHAR(50) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [priority] NVARCHAR(20) DEFAULT 'medium',
    [status] NVARCHAR(20) DEFAULT 'todo',
    [assigned_to] BIGINT,
    [assigned_by] BIGINT,
    [related_type] NVARCHAR(50),
    [related_id] BIGINT,
    [due_date] DATETIME2(7),
    [start_date] DATETIME2(7),
    [completed_at] DATETIME2(7),
    [estimated_hours] DECIMAL(4,2),
    [actual_hours] DECIMAL(4,2),
    [tags] NVARCHAR(MAX),
    [attachments] NVARCHAR(MAX),
    [checklist] NVARCHAR(MAX),
    [dependencies] NVARCHAR(MAX),
    [recurrence_rule] NVARCHAR(MAX),
    [parent_task_id] BIGINT,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_tasks_tenant] ON [dbo].[tasks] ([tenant_id], [status]);
CREATE INDEX [IX_tasks_assigned] ON [dbo].[tasks] ([assigned_to], [status]);

CREATE TABLE [dbo].[calendar_events] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [event_type] NVARCHAR(50) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [location] NVARCHAR(MAX),
    [start_time] DATETIME2(7) NOT NULL,
    [end_time] DATETIME2(7) NOT NULL,
    [all_day] BIT DEFAULT 0,
    [timezone] NVARCHAR(50),
    [organizer_id] BIGINT NOT NULL,
    [attendees] NVARCHAR(MAX),
    [meeting_url] NVARCHAR(MAX),
    [meeting_provider] NVARCHAR(50),
    [related_type] NVARCHAR(50),
    [related_id] BIGINT,
    [recurrence_rule] NVARCHAR(MAX),
    [recurrence_parent_id] BIGINT,
    [reminder_minutes] INT DEFAULT 15,
    [is_private] BIT DEFAULT 0,
    [status] NVARCHAR(20) DEFAULT 'confirmed',
    [color] NVARCHAR(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_calendar_events] ON [dbo].[calendar_events] ([tenant_id], [start_time]);
CREATE INDEX [IX_calendar_organizer] ON [dbo].[calendar_events] ([organizer_id], [start_time]);

CREATE TABLE [dbo].[event_attendees] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [event_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    [response_status] NVARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'tentative'
    [responded_at] DATETIME2(7),
    [is_organizer] BIT DEFAULT 0,
    [is_optional] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([event_id], [user_id])
);

CREATE INDEX [IX_event_attendees] ON [dbo].[event_attendees] ([event_id], [response_status]);

-- ==================== NOTES & DOCUMENTS ====================

CREATE TABLE [dbo].[notes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [title] NVARCHAR(255),
    [content] NVARCHAR(MAX) NOT NULL,
    [content_type] NVARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'html', 'plain'
    [related_type] NVARCHAR(50),
    [related_id] BIGINT,
    [tags] NVARCHAR(MAX),
    [is_pinned] BIT DEFAULT 0,
    [is_archived] BIT DEFAULT 0,
    [folder_path] NVARCHAR(1000) DEFAULT '/',
    
    -- E2E Encryption
    [encrypted_content] NVARCHAR(MAX),
    [encryption_iv] NVARCHAR(MAX),
    [encryption_auth_tag] NVARCHAR(MAX),
    [is_encrypted] BIT DEFAULT 0,
    
    [shared_with] NVARCHAR(MAX),
    [last_edited_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_notes_tenant] ON [dbo].[notes] ([tenant_id], [is_archived]);
CREATE INDEX [IX_notes_creator] ON [dbo].[notes] ([created_by], [is_archived]);

-- ==================== TAGS SYSTEM ====================

CREATE TABLE [dbo].[tags] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [slug] NVARCHAR(100) NOT NULL,
    [color] NVARCHAR(7),
    [icon] NVARCHAR(50),
    [category] NVARCHAR(100),
    [usage_count] INT DEFAULT 0,
    [is_system_tag] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tenant_id], [slug])
);

CREATE INDEX [IX_tags_tenant] ON [dbo].[tags] ([tenant_id], [name]);

CREATE TABLE [dbo].[taggables] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tag_id] BIGINT NOT NULL,
    [taggable_type] NVARCHAR(50) NOT NULL,
    [taggable_id] BIGINT NOT NULL,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([tag_id], [taggable_type], [taggable_id])
);

CREATE INDEX [IX_taggables] ON [dbo].[taggables] ([taggable_type], [taggable_id]);

-- ==================== COMMENTS SYSTEM ====================

CREATE TABLE [dbo].[comments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [commentable_type] NVARCHAR(50) NOT NULL,
    [commentable_id] BIGINT NOT NULL,
    [parent_comment_id] BIGINT,
    [user_id] BIGINT NOT NULL,
    [comment_text] NVARCHAR(MAX) NOT NULL,
    [mentions] NVARCHAR(MAX),
    [attachments] NVARCHAR(MAX),
    [is_edited] BIT DEFAULT 0,
    [edited_at] DATETIME2(7),
    [is_deleted] BIT DEFAULT 0,
    [deleted_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_comments] ON [dbo].[comments] ([commentable_type], [commentable_id], [created_at] DESC);
CREATE INDEX [IX_comments_parent] ON [dbo].[comments] ([parent_comment_id]) WHERE [parent_comment_id] IS NOT NULL;

-- ==================== SAVED FILTERS & VIEWS ====================

CREATE TABLE [dbo].[saved_filters] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [filter_name] NVARCHAR(255) NOT NULL,
    [resource_type] NVARCHAR(50) NOT NULL,
    [filter_criteria] NVARCHAR(MAX) NOT NULL,
    [is_default] BIT DEFAULT 0,
    [is_shared] BIT DEFAULT 0,
    [shared_with] NVARCHAR(MAX),
    [usage_count] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_saved_filters] ON [dbo].[saved_filters] ([tenant_id], [user_id], [resource_type]);

-- ==================== BOOKMARKS & FAVORITES ====================

CREATE TABLE [dbo].[bookmarks] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    [bookmarkable_type] NVARCHAR(50) NOT NULL,
    [bookmarkable_id] BIGINT NOT NULL,
    [folder] NVARCHAR(255),
    [notes] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([user_id], [bookmarkable_type], [bookmarkable_id])
);

CREATE INDEX [IX_bookmarks] ON [dbo].[bookmarks] ([user_id], [tenant_id]);

-- ==================== ACTIVITY FEED ====================

CREATE TABLE [dbo].[activities] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [activity_type] NVARCHAR(50) NOT NULL,
    [subject_type] NVARCHAR(50),
    [subject_id] BIGINT,
    [action] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [is_read] BIT DEFAULT 0,
    [read_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_activities] ON [dbo].[activities] ([tenant_id], [user_id], [created_at] DESC);
CREATE INDEX [IX_activities_unread] ON [dbo].[activities] ([user_id], [is_read]) WHERE [is_read] = 0;


-- =====================================================
-- EMAIL TEMPLATES INSERT SCRIPT
-- Updated for V3.0 Multi-Tenant Schema (No organization_id)
-- =====================================================

-- Clear existing templates (optional - comment out in production)
-- DELETE FROM [dbo].[email_templates];

-- 1. EMAIL VERIFICATION TEMPLATE
INSERT INTO [dbo].[email_templates] (
    tenant_id, name, category, subject, body_html, variables, is_active, created_at
)
VALUES (
    0, -- Global template (NULL tenant_id for all tenants)
    'Default Email Verification',
    'email_verification',
    'Verify Your Email - Fluera Platform',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Fluera! 🎉</h1>
        </div>
        <div style="padding: 40px 30px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>{{firstName}}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 30px;">Thank you for signing up! To complete your registration, please verify your email address by entering the code below:</p>
            <div style="background: #F3F4F6; padding: 20px; text-align: center; border-radius: 6px; margin: 30px 0;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; font-family: monospace;">
                    {{code}}
                </div>
            </div>
            <p style="font-size: 14px; color: #EF4444; font-weight: bold; margin: 20px 0;">
                ⏱️ This code will expire in {{expiryMinutes}} minutes.
            </p>
            <p style="font-size: 14px; color: #6B7280; margin-top: 30px;">
                If you didn''t create an account with Fluera, you can safely ignore this email.
            </p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
            <p style="font-size: 12px; color: #6B7280; margin: 0; text-align: center;">
                © {{currentYear}} Fluera Platform. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
    '{"firstName": "string", "code": "string", "expiryMinutes": "number", "currentYear": "number"}',
    1,
    GETUTCDATE()
);

-- 2. PASSWORD RESET TEMPLATE
INSERT INTO [dbo].[email_templates] (
    tenant_id, name, category, subject, body_html, variables, is_active, created_at
)
VALUES (
    0,
    'Default Password Reset Email',
    'password_reset',
    'Reset Your Password - Fluera Platform',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Reset Request 🔐</h1>
        </div>
        <div style="padding: 40px 30px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 30px;">We received a request to reset your password for your Fluera account. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{resetLink}}" style="display: inline-block; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 14px; color: #6B7280; margin-bottom: 10px;">
                Or copy and paste this link into your browser:
            </p>
            <p style="background: #F3F4F6; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #4B5563;">
                {{resetLink}}
            </p>
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-top: 30px; border-radius: 4px;">
                <p style="font-size: 14px; color: #DC2626; margin: 0; font-weight: bold;">
                    ⚠️ This link expires in 1 hour.
                </p>
                <p style="font-size: 13px; color: #DC2626; margin: 10px 0 0 0;">
                    If you didn''t request a password reset, please ignore this email or contact support if you have concerns.
                </p>
            </div>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
            <p style="font-size: 12px; color: #6B7280; margin: 0; text-align: center;">
                © {{currentYear}} Fluera Platform. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
    '{"resetLink": "string", "currentYear": "number"}',
    1,
    GETUTCDATE()
);

-- 3. WELCOME EMAIL TEMPLATE
INSERT INTO [dbo].[email_templates] (
    tenant_id, name, category, subject, body_html, variables, is_active, created_at
)
VALUES (
    0,
    'Default Welcome Email',
    'welcome',
    'Welcome to Fluera Platform! 🎉',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px;">Welcome to Fluera! 🎉</h1>
            <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">Your account is now active!</p>
        </div>
        <div style="padding: 40px 30px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>{{firstName}}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 30px;">Congratulations! Your email has been successfully verified, and your Fluera account is now active. You can now access all features of our platform.</p>
            
            <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">What you can do now:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #065F46;">
                    <li style="margin-bottom: 10px;">Complete your profile setup</li>
                    <li style="margin-bottom: 10px;">Connect with agencies, brands, and creators</li>
                    <li style="margin-bottom: 10px;">Manage campaigns and collaborations</li>
                    <li>Access powerful analytics and insights</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{loginUrl}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Login to Your Account
                </a>
            </div>
            
            <p style="font-size: 14px; color: #6B7280; margin-top: 30px;">
                Need help getting started? Check out our <a href="https://fluera.com/docs" style="color: #4F46E5; text-decoration: none;">documentation</a> or <a href="https://fluera.com/support" style="color: #4F46E5; text-decoration: none;">contact support</a>.
            </p>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
            <p style="font-size: 12px; color: #6B7280; margin: 0; text-align: center;">
                © {{currentYear}} Fluera Platform. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
    '{"firstName": "string", "loginUrl": "string", "currentYear": "number"}',
    1,
    GETUTCDATE()
);

-- 4. INVITATION EMAIL TEMPLATE
INSERT INTO [dbo].[email_templates] (
    tenant_id, name, category, subject, body_html, variables, is_active, created_at
)
VALUES (
    0,
    'Default Invitation Email',
    'invitation',
    'You''re invited to join {{tenantName}} on Fluera',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">You''ve Been Invited! 🎊</h1>
        </div>
        <div style="padding: 40px 30px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 30px;">
                <strong>{{inviterName}}</strong> has invited you to join <strong>{{tenantName}}</strong> on the Fluera Platform.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{inviteLink}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Accept Invitation
                </a>
            </div>
            
            <p style="font-size: 14px; color: #6B7280; margin-bottom: 10px;">
                Or copy and paste this link into your browser:
            </p>
            <p style="background: #F3F4F6; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #4B5563;">
                {{inviteLink}}
            </p>
            
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-top: 30px; border-radius: 4px;">
                <p style="font-size: 14px; color: #92400E; margin: 0;">
                    ⏱️ This invitation link will expire in <strong>7 days</strong>.
                </p>
            </div>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
            <p style="font-size: 12px; color: #6B7280; margin: 0; text-align: center;">
                © {{currentYear}} Fluera Platform. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
    '{"inviterName": "string", "tenantName": "string", "inviteLink": "string", "currentYear": "number"}',
    1,
    GETUTCDATE()
);

-- 5. TWO-FACTOR AUTHENTICATION (2FA) CODE TEMPLATE
INSERT INTO [dbo].[email_templates] (
    tenant_id, name, category, subject, body_html, variables, is_active, created_at
)
VALUES (
    0,
    'Default 2FA Code Email',
    '2fa_code',
    'Your Two-Factor Authentication Code - Fluera',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Security Code 🔒</h1>
        </div>
        <div style="padding: 40px 30px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>{{firstName}}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 30px;">Your two-factor authentication code is:</p>
            <div style="background: #FEF3C7; padding: 20px; text-align: center; border-radius: 6px; margin: 30px 0; border: 2px solid #F59E0B;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #92400E; font-family: monospace;">
                    {{code}}
                </div>
            </div>
            <p style="font-size: 14px; color: #DC2626; font-weight: bold; margin: 20px 0;">
                ⏱️ This code will expire in {{expiryMinutes}} minutes.
            </p>
            <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin-top: 30px; border-radius: 4px;">
                <p style="font-size: 14px; color: #991B1B; margin: 0;">
                    <strong>Security Notice:</strong> Never share this code with anyone. Fluera will never ask for this code via phone or email.
                </p>
            </div>
        </div>
        <div style="background-color: #F9FAFB; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
            <p style="font-size: 12px; color: #6B7280; margin: 0; text-align: center;">
                © {{currentYear}} Fluera Platform. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
    '{"firstName": "string", "code": "string", "expiryMinutes": "number", "currentYear": "number"}',
    1,
    GETUTCDATE()
);

GO

USE [fluera_new_structure]
GO

/****** Object:  StoredProcedure [dbo].[sp_CheckResourcePermission]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 7. Get User Permissions for Resource
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_CheckResourcePermission]
    @userId BIGINT,
    @tenantId BIGINT,
    @resourceType NVARCHAR(50),
    @resourceId BIGINT,
    @permissionType NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if user has direct resource permission
    SELECT COUNT(*) AS has_permission
    FROM resource_permissions
    WHERE resource_type = @resourceType
      AND resource_id = @resourceId
      AND entity_type = 'user'
      AND entity_id = @userId
      AND permission_type = @permissionType
      AND (expires_at IS NULL OR expires_at > GETUTCDATE());

    -- Also check role-based permissions
    SELECT COUNT(*) AS has_role_permission
    FROM resource_permissions rp
    JOIN user_roles ur ON rp.entity_id = ur.role_id
    WHERE rp.resource_type = @resourceType
      AND rp.resource_id = @resourceId
      AND rp.entity_type = 'role'
      AND ur.user_id = @userId
      AND ur.is_active = 1
      AND rp.permission_type = @permissionType
      AND (rp.expires_at IS NULL OR rp.expires_at > GETUTCDATE());
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CleanupExpiredSessions]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 15. Cleanup Expired Sessions
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_CleanupExpiredSessions]
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE user_sessions
    SET is_active = 0
    WHERE expires_at < GETUTCDATE() AND is_active = 1;

    SELECT @@ROWCOUNT AS sessions_cleaned;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateAuditLog]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 8. Create Audit Log
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_CreateAuditLog]
    @tenantId BIGINT = NULL,
    @userId BIGINT = NULL,
    @entityType NVARCHAR(100),
    @entityId BIGINT = NULL,
    @actionType NVARCHAR(50),
    @oldValues NVARCHAR(MAX) = NULL,
    @newValues NVARCHAR(MAX) = NULL,
    @ipAddress NVARCHAR(45) = NULL,
    @userAgent NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO audit_logs (
        tenant_id, user_id, entity_type, entity_id, action_type,
        old_values, new_values, ip_address, user_agent
    )
    OUTPUT INSERTED.*
    VALUES (
        @tenantId, @userId, @entityType, @entityId, @actionType,
        @oldValues, @newValues, @ipAddress, @userAgent
    );
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateErrorLog]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[sp_CreateErrorLog]
    @tenant_id BIGINT = NULL,
    @user_id BIGINT = NULL,
    @error_type NVARCHAR(100),
    @error_message NVARCHAR(MAX),
    @stack_trace NVARCHAR(MAX) = NULL,
    @request_url NVARCHAR(MAX) = NULL,
    @request_method NVARCHAR(10) = NULL,
    @request_body NVARCHAR(MAX) = NULL,
    @severity NVARCHAR(20) = 'error',
    @ip_address NVARCHAR(45) = NULL,
    @user_agent NVARCHAR(MAX) = NULL,
    @metadata NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [dbo].[error_logs] (
        tenant_id, user_id, error_type, error_message, stack_trace,
        request_url, request_method, request_body, severity,  metadata, created_at
    )
    VALUES (
        @tenant_id, @user_id, @error_type, @error_message, @stack_trace,
        @request_url, @request_method, @request_body, @severity,
         @metadata, GETUTCDATE()
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateNotification]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== NOTIFICATIONS ====================

-- SP: Create Notification
-- FIX: Changed user_id to recipient_id and added event_type, channel
CREATE OR ALTER PROCEDURE [dbo].[sp_CreateNotification]
    @recipient_id BIGINT,
    @tenant_id BIGINT = NULL,
    @event_type NVARCHAR(100),
    @channel NVARCHAR(50) = 'in_app',
    @subject NVARCHAR(500) = NULL,
    @message NVARCHAR(MAX),
    @data NVARCHAR(MAX) = NULL,
    @priority NVARCHAR(20) = 'normal'
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [dbo].[notifications] (
        recipient_id, tenant_id, event_type, channel, subject, message, data, priority,
        status, created_at
    )
    OUTPUT INSERTED.*
    VALUES (
        @recipient_id, @tenant_id, @event_type, @channel, @subject, @message, @data, @priority,
        'pending', GETUTCDATE()
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateSystemEvent]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== SYSTEM EVENTS ====================

-- SP: Create System Event
-- FIX: Changed severity parameter name from @severity to match column
CREATE OR ALTER PROCEDURE [dbo].[sp_CreateSystemEvent]
    @tenant_id BIGINT = NULL,
    @user_id BIGINT = NULL,
    @event_type NVARCHAR(100),
    @event_name NVARCHAR(255),
    @event_data NVARCHAR(MAX) = NULL,
    @source NVARCHAR(100) = NULL,
    @session_id BIGINT = NULL,
    @ip_address NVARCHAR(45) = NULL,
    @user_agent NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [dbo].[system_events] (
        tenant_id, user_id, event_type, event_name, event_data,
        source, session_id, ip_address, user_agent,
        created_at
    )
    VALUES (
        @tenant_id, @user_id, @event_type, @event_name, @event_data,
        @source, @session_id, @ip_address, @user_agent,
        GETUTCDATE()
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateTenant]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== TENANTS ====================

-- SP: Create Tenant
CREATE OR ALTER PROCEDURE [dbo].[sp_CreateTenant]
    @tenant_type NVARCHAR(20),
    @name NVARCHAR(255),
    @slug NVARCHAR(100),
    @owner_user_id BIGINT,
    @timezone NVARCHAR(50) = 'UTC',
    @locale NVARCHAR(10) = 'en-US'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Create tenant
        DECLARE @tenantId BIGINT;
        
        INSERT INTO [dbo].[tenants] (
            tenant_type, name, slug, owner_user_id,
            timezone, locale, status, created_at, created_by
        )
        VALUES (
            @tenant_type, @name, @slug, @owner_user_id,
            @timezone, @locale, 'active', GETUTCDATE(), @owner_user_id
        );
        
        SET @tenantId = SCOPE_IDENTITY();
        
        -- FIX: Get a valid role_id for owner role
        DECLARE @ownerRoleId BIGINT;
        SELECT TOP 1 @ownerRoleId = id 
        FROM [dbo].[roles] 
        WHERE name = 'owner' AND is_system_role = 1;
        
        -- If no owner role exists, create a basic role reference
        IF @ownerRoleId IS NULL
        BEGIN
            -- Insert a default owner role for the tenant
            INSERT INTO [dbo].[roles] (tenant_id, name, display_name, is_system_role, hierarchy_level, created_at)
            VALUES (@tenantId, 'owner', 'Owner', 1, 100, GETUTCDATE());
            SET @ownerRoleId = SCOPE_IDENTITY();
        END
        
        -- Add owner as member with owner role
        INSERT INTO [dbo].[tenant_members] (
            tenant_id, user_id, role_id, member_type, joined_at, created_at
        )
        VALUES (
            @tenantId, @owner_user_id, @ownerRoleId, 'staff', GETUTCDATE(), GETUTCDATE()
        );
        
        -- Return created tenant
        SELECT * FROM [dbo].[tenants] WHERE id = @tenantId;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateUser]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

 CREATE    PROCEDURE [dbo].[sp_CreateUser]
    @email NVARCHAR(320),
    @password_hash NVARCHAR(255),
    @first_name NVARCHAR(100) = NULL,
    @last_name NVARCHAR(100) = NULL,
    @public_key NVARCHAR(MAX),
    @encrypted_private_key NVARCHAR(MAX),
    @user_type NVARCHAR(50) = 'pending',
    @created_by BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [dbo].[users] (
        email, password_hash, first_name, last_name, 
        display_name, user_type, status,
        public_key, encrypted_private_key, key_version, key_created_at,
        created_at, created_by
    )
    OUTPUT INSERTED.*
    VALUES (
        @email, @password_hash, @first_name, @last_name,
        CONCAT(ISNULL(@first_name, ''), ' ', ISNULL(@last_name, '')), 
        @user_type, 'pending',
        @public_key, @encrypted_private_key, 1, GETUTCDATE(),
        GETUTCDATE(), @created_by
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateUserSession]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- SP: Create User Session
-- FIX: Removed session_type and tenant_id parameters that don't exist in table
CREATE OR ALTER PROCEDURE [dbo].[sp_CreateUserSession]
    @user_id BIGINT,
    @active_tenant_id BIGINT = NULL,
    @session_token NVARCHAR(512),
    @ip_address NVARCHAR(45),
    @device_name NVARCHAR(255) = NULL,
    @browser_name NVARCHAR(100) = NULL,
    @os_name NVARCHAR(100) = NULL,
    @expires_at DATETIME2(7)
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [dbo].[user_sessions] (
        user_id, active_tenant_id, session_token,
        ip_address, device_name, browser_name, os_name, expires_at,
        last_activity_at, is_active, created_at
    )
    OUTPUT INSERTED.*
    VALUES (
        @user_id, @active_tenant_id, @session_token,
        @ip_address, @device_name, @browser_name, @os_name, @expires_at,
        GETUTCDATE(), 1, GETUTCDATE()
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateVerificationCode]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== VERIFICATION CODES ====================

-- SP: Create Verification Code
CREATE OR ALTER PROCEDURE [dbo].[sp_CreateVerificationCode]
    @user_id BIGINT = NULL,
    @email NVARCHAR(320),
    @code NVARCHAR(10),
    @code_type NVARCHAR(20),
    @expires_at DATETIME2(7),
    @max_attempts INT = 5,
    @ip_address NVARCHAR(45) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Invalidate previous codes of same type
    UPDATE [dbo].[verification_codes]
    SET used_at = GETUTCDATE()
    WHERE email = @email 
        AND code_type = @code_type 
        AND used_at IS NULL;
    
    -- Create new code
    INSERT INTO [dbo].[verification_codes] (
        user_id, email, code, code_type, expires_at, 
        max_attempts, attempts, ip_address, created_at
    )
    OUTPUT INSERTED.*
    VALUES (
        @user_id, @email, @code, @code_type, @expires_at,
        @max_attempts, 0, @ip_address, GETUTCDATE()
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_DeleteEmailTemplate]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 5. Delete Email Template
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_DeleteEmailTemplate]
    @id BIGINT,
    @organizationId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM email_templates
    OUTPUT 1 AS affected_rows
    WHERE id = @id AND tenant_id = @organizationId;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_EndUserSession]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- SP: End User Session
-- FIX: Changed logged_out_at to use updated_at (column doesn't exist in table)
CREATE OR ALTER PROCEDURE [dbo].[sp_EndUserSession]
    @session_token NVARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE [dbo].[user_sessions]
    SET is_active = 0,
        updated_at = GETUTCDATE()
    WHERE session_token = @session_token;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetActiveSession]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- SP: Get Active Session
CREATE OR ALTER PROCEDURE [dbo].[sp_GetActiveSession]
    @session_token NVARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT *
    FROM [dbo].[user_sessions]
    WHERE session_token = @session_token
        AND is_active = 1
        AND expires_at > GETUTCDATE();
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetAuditLogs]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_GetAuditLogs]
    @userId BIGINT = NULL,
    @tenantId BIGINT = NULL,
    @entityType NVARCHAR(100) = NULL,
    @startDate DATETIME2(7) = NULL,
    @endDate DATETIME2(7) = NULL,
    @limit INT = 100,
    @offset INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM audit_logs
    WHERE 1=1
        AND (@userId IS NULL OR user_id = @userId)
        AND (@tenantId IS NULL OR tenant_id = @tenantId)
        AND (@entityType IS NULL OR entity_type = @entityType)
        AND (@startDate IS NULL OR created_at >= @startDate)
        AND (@endDate IS NULL OR created_at <= @endDate)
    ORDER BY created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
END

GO

/****** Object:  StoredProcedure [dbo].[sp_GetEmailTemplate]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO





-- ============================================
-- 2. Get Email Template
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetEmailTemplate]
    @tenant_id BIGINT = NULL,
    @category NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Try to get tenant-specific template first
    IF @tenant_id IS NOT NULL
    BEGIN
        SELECT TOP 1 *
        FROM email_templates
        WHERE tenant_id = @tenant_id 
          AND category = @category 
          AND is_active = 1
        ORDER BY created_at DESC;

        IF @@ROWCOUNT > 0
            RETURN;
    END

    -- Fall back to system-wide template
    SELECT TOP 1 *
    FROM email_templates
    WHERE (tenant_id IS NULL OR tenant_id = 0)
      AND category = @category 
      AND is_active = 1
    ORDER BY created_at DESC;

END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetOrganizationTemplates]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 4. Get Tenant Templates
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetOrganizationTemplates]
    @organizationId BIGINT,
    @includeGlobal BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @includeGlobal = 1
    BEGIN
        SELECT *
        FROM email_templates
        WHERE (tenant_id = @organizationId OR tenant_id IS NULL)
          AND is_active = 1
        ORDER BY tenant_id DESC, category, created_at DESC;
    END
    ELSE
    BEGIN
        SELECT *
        FROM email_templates
        WHERE tenant_id = @organizationId
          AND is_active = 1
        ORDER BY category, created_at DESC;
    END
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetSystemConfigByKey]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== SYSTEM CONFIG ====================

-- SP: Get System Config by Key
-- FIX: Removed environment parameter (doesn't exist in query)
CREATE OR ALTER PROCEDURE [dbo].[sp_GetSystemConfigByKey]
    @config_key NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT *
    FROM [dbo].[system_config]
    WHERE config_key = @config_key;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetTenantMembers]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 11. Get Tenant Members with Roles
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetTenantMembers]
    @tenantId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        tm.id AS member_id,
        tm.member_type,
        tm.joined_at,
        tm.is_active,
        u.id AS user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.last_active_at,
        r.id AS role_id,
        r.name AS role_name,
        r.display_name AS role_display_name
    FROM tenant_members tm
    JOIN users u ON tm.user_id = u.id
    LEFT JOIN roles r ON tm.role_id = r.id
    WHERE tm.tenant_id = @tenantId
    ORDER BY tm.joined_at DESC;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetTenantUsageStats]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 13. Get Tenant Usage Stats
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetTenantUsageStats]
    @tenantId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        -- Limits
        max_staff,
        max_storage_gb,
        max_campaigns,
        max_invitations,
        max_creators,
        max_brands,
        
        -- Current usage
        current_staff,
        current_storage_gb,
        current_campaigns,
        current_invitations,
        current_creators,
        current_brands,
        
        -- Calculated percentages
        CASE WHEN max_staff > 0 
             THEN (CAST(current_staff AS FLOAT) / max_staff) * 100 
             ELSE 0 END AS staff_usage_percent,
        
        CASE WHEN max_storage_gb > 0 
             THEN (CAST(current_storage_gb AS FLOAT) / max_storage_gb) * 100 
             ELSE 0 END AS storage_usage_percent,
        
        CASE WHEN max_campaigns > 0 
             THEN (CAST(current_campaigns AS FLOAT) / max_campaigns) * 100 
             ELSE 0 END AS campaigns_usage_percent
    FROM tenants
    WHERE id = @tenantId;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserAccessibleMenus]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- =====================================================
-- SP: Get User Accessible Menus (if not exists)
-- =====================================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetUserAccessibleMenus]
    @userId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- User's permissions
    SELECT DISTINCT
        p.id as permission_id,
        p.permission_key,
        p.resource,
        p.action,
        p.category
    FROM user_roles ur
    INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = @userId AND ur.is_active = 1
    ORDER BY p.category, p.permission_key;

    -- Accessible menus
    SELECT DISTINCT mp.menu_key
    FROM menu_permissions mp
    WHERE mp.is_required = 1
      AND EXISTS (
        SELECT 1 
        FROM user_roles ur
        INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = @userId 
          AND rp.permission_id = mp.permission_id
          AND ur.is_active = 1
      )
    UNION
    SELECT DISTINCT mp2.menu_key
    FROM menu_permissions mp2
    WHERE mp2.is_required = 0
    ORDER BY menu_key;

    -- Blocked menus (missing required permissions)
    SELECT DISTINCT 
        mp.menu_key,
        STRING_AGG(p.permission_key, ', ') as missing_permissions
    FROM menu_permissions mp
    INNER JOIN permissions p ON mp.permission_id = p.id
    WHERE mp.is_required = 1
      AND NOT EXISTS (
        SELECT 1 
        FROM user_roles ur
        INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = @userId 
          AND rp.permission_id = mp.permission_id
          AND ur.is_active = 1
      )
    GROUP BY mp.menu_key
    ORDER BY mp.menu_key;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserAuthData]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

 -- =====================================================
-- FIXED STORED PROCEDURES FOR FLUERA V3.0
-- Multi-Tenant SaaS with E2E Encryption
-- =====================================================

-- ==================== USER AUTHENTICATION ====================

-- SP: Get User Auth Data (Used in JWT Strategy)
CREATE OR ALTER PROCEDURE [dbo].[sp_GetUserAuthData]
    @userId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Get User Data
    SELECT 
        u.id,
        u.email,
        u.username,
        u.user_type AS userType,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.display_name AS displayName,
        u.avatar_url AS avatarUrl,
        u.is_super_admin AS isSuperAdmin,
        u.email_verified_at AS emailVerifiedAt,
        u.status,
        u.two_factor_enabled AS twoFactorEnabled,
        u.public_key AS publicKey
    FROM [dbo].[users] u
    WHERE u.id = @userId 
        AND u.status = 'active'
        AND u.email_verified_at IS NOT NULL;

    -- Get User Roles (from tenant memberships)
    -- FIX: Changed from tm.role_type to r.name (roles table)
    SELECT 
        STRING_AGG(r.name, ',') AS roles
    FROM [dbo].[tenant_members] tm
    INNER JOIN [dbo].[roles] r ON tm.role_id = r.id
    WHERE tm.user_id = @userId 
        AND tm.is_active = 1;

    -- Get User Permissions (from roles)
    SELECT 
	STRING_AGG(p.permission_key, ',') WITHIN GROUP (ORDER BY p.permission_key) AS permissions
    FROM [dbo].[tenant_members] tm
    INNER JOIN [dbo].[role_permissions] rp ON tm.role_id = rp.role_id
    INNER JOIN [dbo].[permissions] p ON rp.permission_id = p.id
    WHERE tm.user_id = @userId 
        AND tm.is_active = 1;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserSessions]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 9. Get User Sessions
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_GetUserSessions]
    @userId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        id,
        active_tenant_id,
        device_name,
        device_type,
        browser_name,
        os_name,
        ip_address,
        last_activity_at,
        is_active,
        expires_at,
        created_at
    FROM user_sessions
    WHERE user_id = @userId
    ORDER BY last_activity_at DESC;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_IncrementTemplateUsage]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 6. Increment Template Usage
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_IncrementTemplateUsage]
    @template_id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE email_templates
    SET usage_count = usage_count + 1
    WHERE id = @template_id;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_ListMenuPermissions]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- SP: List Menu Permissions (if not exists)
-- =====================================================
CREATE OR ALTER PROCEDURE [dbo].[sp_ListMenuPermissions]
    @page INT = 1,
    @limit INT = 50,
    @search NVARCHAR(255) = NULL,
    @menuKey NVARCHAR(100) = NULL,
    @category NVARCHAR(100) = NULL,
    @sortBy NVARCHAR(50) = 'created_at',
    @sortOrder NVARCHAR(4) = 'DESC'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@page - 1) * @limit;

    -- Main query
    SELECT 
        mp.id,
        mp.menu_key,
        mp.permission_id,
        mp.is_required,
        mp.applicable_to,
        mp.created_at,
        mp.updated_at,
        p.permission_key,
        p.resource,
        p.action,
        p.category,
        p.description,
        p.is_system_permission
    FROM menu_permissions mp
    INNER JOIN permissions p ON mp.permission_id = p.id
    WHERE 1=1
        AND (@menuKey IS NULL OR mp.menu_key = @menuKey)
        AND (@category IS NULL OR p.category = @category)
        AND (@search IS NULL OR mp.menu_key LIKE '%' + @search + '%' OR p.permission_key LIKE '%' + @search + '%')
    ORDER BY 
        CASE WHEN @sortBy = 'menu_key' AND @sortOrder = 'ASC' THEN mp.menu_key END ASC,
        CASE WHEN @sortBy = 'menu_key' AND @sortOrder = 'DESC' THEN mp.menu_key END DESC,
        CASE WHEN @sortBy = 'created_at' AND @sortOrder = 'ASC' THEN mp.created_at END ASC,
        CASE WHEN @sortBy = 'created_at' AND @sortOrder = 'DESC' THEN mp.created_at END DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

    -- Pagination metadata
    SELECT 
        @page AS currentPage,
        @limit AS itemsPerPage,
        COUNT(*) AS totalItems,
        CEILING(CAST(COUNT(*) AS FLOAT) / @limit) AS totalPages,
        CASE WHEN @page < CEILING(CAST(COUNT(*) AS FLOAT) / @limit) THEN 1 ELSE 0 END AS hasNextPage,
        CASE WHEN @page > 1 THEN 1 ELSE 0 END AS hasPreviousPage
    FROM menu_permissions mp
    INNER JOIN permissions p ON mp.permission_id = p.id
    WHERE 1=1
        AND (@menuKey IS NULL OR mp.menu_key = @menuKey)
        AND (@category IS NULL OR p.category = @category)
        AND (@search IS NULL OR mp.menu_key LIKE '%' + @search + '%' OR p.permission_key LIKE '%' + @search + '%');
END
GO

/****** Object:  StoredProcedure [dbo].[sp_ListPermissions]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_ListPermissions]
    @category NVARCHAR(100) = NULL,
    @scope NVARCHAR(20) = 'all',
    @page INT = 1,
    @limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@page - 1) * @limit;

    -- Get filtered permissions
    SELECT 
        p.id,
        p.permission_key,
        p.resource,
        p.action,
        p.description,
        p.category,
        p.is_system_permission,
        p.created_at,
        p.updated_at
    FROM permissions p
    WHERE (@category IS NULL OR p.category = @category)
    AND (
        @scope = 'all' 
        OR (@scope = 'system' AND p.is_system_permission = 1)
        OR (@scope = 'custom' AND p.is_system_permission = 0)
    )
    ORDER BY p.category, p.resource, p.action
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

    -- Get total count for pagination
    SELECT 
        @page AS currentPage,
        @limit AS itemsPerPage,
        COUNT(*) AS totalItems,
        CEILING(CAST(COUNT(*) AS FLOAT) / @limit) AS totalPages,
        CASE WHEN @page < CEILING(CAST(COUNT(*) AS FLOAT) / @limit) THEN 1 ELSE 0 END AS hasNextPage,
        CASE WHEN @page > 1 THEN 1 ELSE 0 END AS hasPreviousPage
    FROM permissions p
    WHERE (@category IS NULL OR p.category = @category)
    AND (
        @scope = 'all' 
        OR (@scope = 'system' AND p.is_system_permission = 1)
        OR (@scope = 'custom' AND p.is_system_permission = 0)
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_RotateTenantKeys]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 10. Rotate Tenant Encryption Keys
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_RotateTenantKeys]
    @tenantId BIGINT,
    @newPublicKey NVARCHAR(MAX),
    @newEncryptedPrivateKey NVARCHAR(MAX),
    @rotatedBy BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @currentVersion INT;

        SELECT @currentVersion = key_version
        FROM tenants
        WHERE id = @tenantId;

        -- Update tenant keys
        UPDATE tenants
        SET public_key = @newPublicKey,
            encrypted_private_key = @newEncryptedPrivateKey,
            key_version = @currentVersion + 1,
            key_rotated_at = GETUTCDATE(),
            updated_at = GETUTCDATE(),
            updated_by = @rotatedBy
        WHERE id = @tenantId;

        -- Log key rotation
        INSERT INTO audit_logs (
            tenant_id, user_id, entity_type, entity_id, action_type,
            old_values, new_values
        )
        VALUES (
            @tenantId, @rotatedBy, 'tenants', @tenantId, 'KEY_ROTATION',
            JSON_QUERY('{"key_version": ' + CAST(@currentVersion AS NVARCHAR(10)) + '}'),
            JSON_QUERY('{"key_version": ' + CAST(@currentVersion + 1 AS NVARCHAR(10)) + '}')
        );

        COMMIT TRANSACTION;

        SELECT 
            id,
            key_version,
            key_rotated_at
        FROM tenants
        WHERE id = @tenantId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_UpdateSessionActivity]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 14. Update Session Activity
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateSessionActivity]
    @sessionId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE user_sessions
    SET last_activity_at = GETUTCDATE()
    WHERE id = @sessionId AND is_active = 1;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_UpsertEmailTemplate]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 3. Upsert Email Template
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_UpsertEmailTemplate]
    @id BIGINT = NULL,
    @tenantId BIGINT = NULL,
    @name NVARCHAR(255),
    @category NVARCHAR(100),
    @subject NVARCHAR(500),
    @bodyHtml NVARCHAR(MAX),
    @bodyText NVARCHAR(MAX) = NULL,
    @variables NVARCHAR(MAX) = NULL,
    @userId BIGINT,
    @isActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @id IS NULL
    BEGIN
        -- INSERT
        INSERT INTO email_templates (
            tenant_id, name, category, subject, body_html, body_text,
            variables, is_active, created_by
        )
        OUTPUT INSERTED.id
        VALUES (
            @tenantId, @name, @category, @subject, @bodyHtml, @bodyText,
            @variables, @isActive, @userId
        );
    END
    ELSE
    BEGIN
        -- UPDATE
        UPDATE email_templates
        SET name = @name,
            category = @category,
            subject = @subject,
            body_html = @bodyHtml,
            body_text = @bodyText,
            variables = @variables,
            is_active = @isActive,
            updated_at = GETUTCDATE(),
            updated_by = @userId
        OUTPUT INSERTED.id
        WHERE id = @id;
    END
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_UpsertOAuthProvider]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== OAUTH PROVIDERS ====================

-- SP: Upsert OAuth Provider
-- FIX: Changed table name from oauth_providers to user_social_accounts
CREATE OR ALTER PROCEDURE [dbo].[sp_UpsertOAuthProvider]
    @user_id BIGINT,
    @provider NVARCHAR(50),
    @provider_user_id NVARCHAR(255),
    @email NVARCHAR(320),
    @access_token NVARCHAR(MAX),
    @refresh_token NVARCHAR(MAX) = NULL,
    @profile_data NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    MERGE [dbo].[user_social_accounts] AS target
    USING (SELECT @user_id AS user_id, @provider AS provider) AS source
    ON (target.user_id = source.user_id AND target.provider = source.provider)
    WHEN MATCHED THEN
        UPDATE SET
            access_token = @access_token,
            refresh_token = @refresh_token,
            profile_data = @profile_data,
            updated_at = GETUTCDATE()
    WHEN NOT MATCHED THEN
        INSERT (user_id, provider, provider_user_id, provider_email, access_token, refresh_token, profile_data, created_at)
        VALUES (@user_id, @provider, @provider_user_id, @email, @access_token, @refresh_token, @profile_data, GETUTCDATE())
    OUTPUT INSERTED.*;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_UpsertSystemConfig]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- SP: Upsert System Config
-- FIX: Removed environment parameter (column doesn't exist in table)
CREATE OR ALTER PROCEDURE [dbo].[sp_UpsertSystemConfig]
    @config_key NVARCHAR(255),
    @config_value NVARCHAR(MAX),
    @config_type NVARCHAR(50) = 'string',
    @is_encrypted BIT = 0,
    @description NVARCHAR(MAX) = NULL,
    @created_by BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    MERGE [dbo].[system_config] AS target
    USING (SELECT @config_key AS config_key) AS source
    ON (target.config_key = source.config_key)
    WHEN MATCHED THEN
        UPDATE SET
            config_value = @config_value,
            config_type = @config_type,
            is_encrypted = @is_encrypted,
            updated_at = GETUTCDATE(),
            updated_by = @created_by
    WHEN NOT MATCHED THEN
        INSERT (config_key, config_value, config_type, is_encrypted, created_at, created_by)
        VALUES (@config_key, @config_value, @config_type, @is_encrypted, GETUTCDATE(), @created_by)
    OUTPUT INSERTED.*;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_VerifyTenantAccess]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- 12. Verify Tenant Access
-- ============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_VerifyTenantAccess]
    @userId BIGINT,
    @tenantId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        CASE 
            WHEN COUNT(*) > 0 THEN 1 
            ELSE 0 
        END AS has_access
    FROM tenant_members
    WHERE user_id = @userId
      AND tenant_id = @tenantId
      AND is_active = 1;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_VerifyUserEmail]    Script Date: 05-11-2025 23:40:28 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[sp_VerifyUserEmail]
    @email NVARCHAR(320),
    @code NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        DECLARE @userId BIGINT;
        DECLARE @codeId BIGINT;
        
        SELECT TOP 1 
            @userId = user_id,
            @codeId = id
        FROM [dbo].[verification_codes]
        WHERE email = @email 
            AND code = @code
            AND code_type = 'email_verify'  -- ✅ FIXED: Changed from 'email_verification'
            AND used_at IS NULL
            AND expires_at > GETUTCDATE()
            AND attempts < max_attempts
        ORDER BY created_at DESC;
        
        -- ✅ FIXED: Added error handling
        IF @userId IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, 'Invalid or expired verification code', 1;
        END
        
        -- Mark code as used
        UPDATE [dbo].[verification_codes]
        SET used_at = GETUTCDATE(),
            attempts = attempts + 1
        WHERE id = @codeId;
        
        -- Update user
        UPDATE [dbo].[users]
        SET email_verified_at = GETUTCDATE(),
            status = 'active',
            updated_at = GETUTCDATE()
        WHERE id = @userId;
        
        -- Return updated user
        SELECT * FROM [dbo].[users] WHERE id = @userId;
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


-- =====================================================
-- MISSING STORED PROCEDURES
-- =====================================================

-- SP: Create Security Event
CREATE OR ALTER PROCEDURE [dbo].[sp_CreateSecurityEvent]
    @tenant_id BIGINT = NULL,
    @user_id BIGINT = NULL,
    @event_type NVARCHAR(100),
    @event_category NVARCHAR(50),
    @severity NVARCHAR(20),
    @description NVARCHAR(MAX),
    @ip_address NVARCHAR(45) = NULL,
    @user_agent NVARCHAR(MAX) = NULL,
    @location NVARCHAR(MAX) = NULL,
    @resource_type NVARCHAR(50) = NULL,
    @resource_id BIGINT = NULL,
    @action_taken NVARCHAR(MAX) = NULL,
    @risk_score INT = 0,
    @is_anomaly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [dbo].[security_events] (
        tenant_id, user_id, event_type, event_category, severity,
        description, ip_address, user_agent, location,
        resource_type, resource_id, action_taken, risk_score, is_anomaly,
        is_resolved, created_at
    )
    OUTPUT INSERTED.*
    VALUES (
        @tenant_id, @user_id, @event_type, @event_category, @severity,
        @description, @ip_address, @user_agent, @location,
        @resource_type, @resource_id, @action_taken, @risk_score, @is_anomaly,
        0, GETUTCDATE()
    );
END
GO

-- =====================================================
-- SYSTEM ROLES AND PERMISSIONS SETUP
-- =====================================================

USE [fluera_new_structure]
GO

-- ============================================
-- 1. INSERT SYSTEM ROLES
-- ============================================

SET IDENTITY_INSERT [dbo].[roles] ON;
GO

INSERT INTO [dbo].[roles] (
    id, tenant_id, name, display_name, description, 
    is_system_role, is_default, hierarchy_level, created_at
)
VALUES
-- SaaS Owner Roles (No tenant, system-wide)
(1, NULL, 'super_admin', 'Super Administrator', 'Full system access with all privileges', 1, 0, 1000, GETUTCDATE()),
(2, NULL, 'saas_admin', 'SaaS Administrator', 'Platform-wide administrative access', 1, 0, 900, GETUTCDATE()),

-- Tenant-specific System Roles
(3, NULL, 'agency_admin', 'Agency Administrator', 'Full access within agency tenant', 1, 1, 800, GETUTCDATE()),
(4, NULL, 'brand_admin', 'Brand Administrator', 'Full access within brand tenant', 1, 1, 800, GETUTCDATE()),
(5, NULL, 'creator_admin', 'Creator Administrator', 'Full access within creator profile', 1, 1, 800, GETUTCDATE()),
(6, NULL, 'owner', 'Owner', 'Tenant owner with full control', 1, 0, 850, GETUTCDATE());

SET IDENTITY_INSERT [dbo].[roles] OFF;
GO

-- ============================================
-- 2. INSERT SYSTEM PERMISSIONS
-- ============================================

SET IDENTITY_INSERT [dbo].[permissions] ON;
GO

INSERT INTO [dbo].[permissions] (
    id, permission_key, resource, action, description, category, is_system_permission, created_at
)
VALUES
-- System Management
(1, 'system:manage', 'system', 'manage', 'Full system management access', 'System', 1, GETUTCDATE()),
(2, 'system:read', 'system', 'read', 'View system information', 'System', 1, GETUTCDATE()),

-- User Management
(3, 'users:create', 'users', 'create', 'Create new users', 'Users', 1, GETUTCDATE()),
(4, 'users:read', 'users', 'read', 'View user information', 'Users', 1, GETUTCDATE()),
(5, 'users:write', 'users', 'write', 'Update user information', 'Users', 1, GETUTCDATE()),
(6, 'users:delete', 'users', 'delete', 'Delete users', 'Users', 1, GETUTCDATE()),

-- Tenant Management
(7, 'tenants:create', 'tenants', 'create', 'Create new tenants', 'Tenants', 1, GETUTCDATE()),
(8, 'tenants:read', 'tenants', 'read', 'View tenant information', 'Tenants', 1, GETUTCDATE()),
(9, 'tenants:write', 'tenants', 'write', 'Update tenant information', 'Tenants', 1, GETUTCDATE()),
(10, 'tenants:delete', 'tenants', 'delete', 'Delete tenants', 'Tenants', 1, GETUTCDATE()),

-- Role Management
(11, 'roles:create', 'roles', 'create', 'Create new roles', 'RBAC', 1, GETUTCDATE()),
(12, 'roles:read', 'roles', 'read', 'View role information', 'RBAC', 1, GETUTCDATE()),
(13, 'roles:write', 'roles', 'write', 'Update role information', 'RBAC', 1, GETUTCDATE()),
(14, 'roles:delete', 'roles', 'delete', 'Delete roles', 'RBAC', 1, GETUTCDATE()),

-- Permission Management
(15, 'permissions:create', 'permissions', 'create', 'Create new permissions', 'RBAC', 1, GETUTCDATE()),
(16, 'permissions:read', 'permissions', 'read', 'View permission information', 'RBAC', 1, GETUTCDATE()),
(17, 'permissions:write', 'permissions', 'write', 'Update permission information', 'RBAC', 1, GETUTCDATE()),
(18, 'permissions:delete', 'permissions', 'delete', 'Delete permissions', 'RBAC', 1, GETUTCDATE()),

-- Role Permission Management
(19, 'role-permissions:read', 'role-permissions', 'read', 'View role permissions', 'RBAC', 1, GETUTCDATE()),
(20, 'role-permissions:write', 'role-permissions', 'write', 'Assign/remove role permissions', 'RBAC', 1, GETUTCDATE()),

-- User Role Management
(21, 'user-roles:read', 'user-roles', 'read', 'View user roles', 'RBAC', 1, GETUTCDATE()),
(22, 'user-roles:write', 'user-roles', 'write', 'Assign/remove user roles', 'RBAC', 1, GETUTCDATE()),

-- Menu Permission Management
(23, 'menu-permissions:read', 'menu-permissions', 'read', 'View menu permissions', 'RBAC', 1, GETUTCDATE()),
(24, 'menu-permissions:write', 'menu-permissions', 'write', 'Manage menu permissions', 'RBAC', 1, GETUTCDATE()),

-- Campaign Management
(25, 'campaigns:create', 'campaigns', 'create', 'Create campaigns', 'Campaigns', 1, GETUTCDATE()),
(26, 'campaigns:read', 'campaigns', 'read', 'View campaigns', 'Campaigns', 1, GETUTCDATE()),
(27, 'campaigns:write', 'campaigns', 'write', 'Update campaigns', 'Campaigns', 1, GETUTCDATE()),
(28, 'campaigns:delete', 'campaigns', 'delete', 'Delete campaigns', 'Campaigns', 1, GETUTCDATE()),

-- Content Management
(29, 'content:create', 'content', 'create', 'Upload content', 'Content', 1, GETUTCDATE()),
(30, 'content:read', 'content', 'read', 'View content', 'Content', 1, GETUTCDATE()),
(31, 'content:write', 'content', 'write', 'Update content', 'Content', 1, GETUTCDATE()),
(32, 'content:delete', 'content', 'delete', 'Delete content', 'Content', 1, GETUTCDATE()),
(33, 'content:approve', 'content', 'approve', 'Approve content', 'Content', 1, GETUTCDATE()),

-- Audit Logs
(34, 'audit-logs:read', 'audit-logs', 'read', 'View audit logs', 'System', 1, GETUTCDATE()),
(35, 'audit-logs:create', 'audit-logs', 'create', 'Create audit logs', 'System', 1, GETUTCDATE()),

-- System Events
(36, 'system-events:read', 'system-events', 'read', 'View system events', 'System', 1, GETUTCDATE()),
(37, 'system-events:create', 'system-events', 'create', 'Create system events', 'System', 1, GETUTCDATE());

SET IDENTITY_INSERT [dbo].[permissions] OFF;
GO

-- ============================================
-- 3. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- Super Admin - ALL permissions
INSERT INTO [dbo].[role_permissions] (role_id, permission_id, created_at)
SELECT 1, id, GETUTCDATE()
FROM [dbo].[permissions]
WHERE is_system_permission = 1;

-- SaaS Admin - Most permissions except system:manage
INSERT INTO [dbo].[role_permissions] (role_id, permission_id, created_at)
SELECT 2, id, GETUTCDATE()
FROM [dbo].[permissions]
WHERE is_system_permission = 1
    AND permission_key NOT IN ('system:manage', 'permissions:delete', 'roles:delete');

-- Agency Admin - Agency-specific permissions
INSERT INTO [dbo].[role_permissions] (role_id, permission_id, created_at)
VALUES
(3, 4, GETUTCDATE()),  -- users:read
(3, 5, GETUTCDATE()),  -- users:write
(3, 8, GETUTCDATE()),  -- tenants:read
(3, 9, GETUTCDATE()),  -- tenants:write
(3, 12, GETUTCDATE()), -- roles:read
(3, 16, GETUTCDATE()), -- permissions:read
(3, 19, GETUTCDATE()), -- role-permissions:read
(3, 21, GETUTCDATE()), -- user-roles:read
(3, 22, GETUTCDATE()), -- user-roles:write
(3, 25, GETUTCDATE()), -- campaigns:create
(3, 26, GETUTCDATE()), -- campaigns:read
(3, 27, GETUTCDATE()), -- campaigns:write
(3, 28, GETUTCDATE()), -- campaigns:delete
(3, 30, GETUTCDATE()), -- content:read
(3, 31, GETUTCDATE()), -- content:write
(3, 33, GETUTCDATE()), -- content:approve
(3, 34, GETUTCDATE()); -- audit-logs:read

-- Brand Admin - Brand-specific permissions
INSERT INTO [dbo].[role_permissions] (role_id, permission_id, created_at)
VALUES
(4, 4, GETUTCDATE()),  -- users:read
(4, 5, GETUTCDATE()),  -- users:write
(4, 8, GETUTCDATE()),  -- tenants:read
(4, 9, GETUTCDATE()),  -- tenants:write
(4, 12, GETUTCDATE()), -- roles:read
(4, 16, GETUTCDATE()), -- permissions:read
(4, 21, GETUTCDATE()), -- user-roles:read
(4, 25, GETUTCDATE()), -- campaigns:create
(4, 26, GETUTCDATE()), -- campaigns:read
(4, 27, GETUTCDATE()), -- campaigns:write
(4, 30, GETUTCDATE()), -- content:read
(4, 31, GETUTCDATE()), -- content:write
(4, 33, GETUTCDATE()), -- content:approve
(4, 34, GETUTCDATE()); -- audit-logs:read

-- Creator Admin - Creator-specific permissions
INSERT INTO [dbo].[role_permissions] (role_id, permission_id, created_at)
VALUES
(5, 4, GETUTCDATE()),  -- users:read
(5, 8, GETUTCDATE()),  -- tenants:read
(5, 9, GETUTCDATE()),  -- tenants:write
(5, 26, GETUTCDATE()), -- campaigns:read
(5, 29, GETUTCDATE()), -- content:create
(5, 30, GETUTCDATE()), -- content:read
(5, 31, GETUTCDATE()); -- content:write

-- Owner - Full tenant access
INSERT INTO [dbo].[role_permissions] (role_id, permission_id, created_at)
SELECT 6, id, GETUTCDATE()
FROM [dbo].[permissions]
WHERE permission_key NOT LIKE 'system:%'
    AND is_system_permission = 1;

GO

-- ============================================
-- 4. ASSIGN ROLES TO TEST USERS
-- ============================================

-- Assuming users with IDs 1-5 exist
INSERT INTO [dbo].[user_roles] (user_id, role_id, is_active, assigned_at, created_at)
VALUES
(5, 1, 1, GETUTCDATE(), GETUTCDATE()), -- User 5: Super Admin
(1, 3, 1, GETUTCDATE(), GETUTCDATE()), -- User 1: Agency Admin
(2, 3, 1, GETUTCDATE(), GETUTCDATE()), -- User 2: Agency Admin
(3, 4, 1, GETUTCDATE(), GETUTCDATE()), -- User 3: Brand Admin
(4, 5, 1, GETUTCDATE(), GETUTCDATE()); -- User 4: Creator Admin

GO
 
PRINT 'System roles, permissions, and menu permissions setup completed successfully!'
GO


--

 -- 1. EMAIL VERIFICATION TEMPLATE - UPDATE
UPDATE [dbo].[email_templates]
SET body_html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 560px; margin: 12px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="padding: 40px 40px 32px 40px;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">Verify your email</h1>
            <p style="margin: 0; font-size: 14px; font-weight: 400; color: #6b7280; line-height: 1.5;">
                Hello {{firstName}}, please use the verification code below to complete your registration.
            </p>
        </div>
        <div style="padding: 0 40px 32px 40px;">
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 24px; text-align: center;">
                <div style="font-size: 32px; font-weight: 600; letter-spacing: 0.25em; color: #111827; font-family: ''Courier New'', monospace;">
                    {{code}}
                </div>
            </div>
            <p style="margin: 20px 0 0 0; font-size: 13px; font-weight: 400; color: #9ca3af; text-align: center;">
                This code expires in {{expiryMinutes}} minutes
            </p>
        </div>
        <div style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; line-height: 1.5;">
                If you didn''t request this, you can safely ignore this email.
            </p>
        </div>
        <div style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; text-align: center;">
                © {{currentYear}} Fluera. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE category = 'email_verification' AND tenant_id = 0;

-- 2. PASSWORD RESET TEMPLATE - UPDATE
UPDATE [dbo].[email_templates]
SET body_html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 560px; margin: 12px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="padding: 40px 40px 32px 40px;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">Reset your password</h1>
            <p style="margin: 0; font-size: 14px; font-weight: 400; color: #6b7280; line-height: 1.5;">
                We received a request to reset your password. Click the button below to choose a new password.
            </p>
        </div>
        <div style="padding: 0 40px 32px 40px;">
            <div style="text-align: center;">
                <a href="{{resetLink}}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                    Reset Password
                </a>
            </div>
            <p style="margin: 24px 0 0 0; font-size: 13px; font-weight: 400; color: #9ca3af; text-align: center;">
                This link expires in 1 hour
            </p>
        </div>
        <div style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; line-height: 1.5;">
                If you didn''t request this, please ignore this email or contact support if you have concerns.
            </p>
        </div>
        <div style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; text-align: center;">
                © {{currentYear}} Fluera. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE category = 'password_reset' AND tenant_id = 0;

-- 3. WELCOME EMAIL TEMPLATE - UPDATE
UPDATE [dbo].[email_templates]
SET body_html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 560px; margin: 12px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="padding: 40px 40px 32px 40px;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">Welcome to Fluera</h1>
            <p style="margin: 0; font-size: 14px; font-weight: 400; color: #6b7280; line-height: 1.5;">
                Hello {{firstName}}, your account is now active and ready to use.
            </p>
        </div>
        <div style="padding: 0 40px 32px 40px;">
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 24px;">
                <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 500; color: #111827;">Getting started:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; font-weight: 400; color: #6b7280; line-height: 1.8;">
                    <li>Complete your profile</li>
                    <li>Explore campaigns and collaborations</li>
                    <li>Connect with your network</li>
                </ul>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="{{loginUrl}}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                    Go to Dashboard
                </a>
            </div>
        </div>
        <div style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; line-height: 1.5;">
                Need help? Visit our documentation or contact support.
            </p>
        </div>
        <div style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; text-align: center;">
                © {{currentYear}} Fluera. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE category = 'welcome' AND tenant_id = 0;

-- 4. INVITATION EMAIL TEMPLATE - UPDATE
UPDATE [dbo].[email_templates]
SET body_html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 560px; margin: 12px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="padding: 40px 40px 32px 40px;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">You''ve been invited</h1>
            <p style="margin: 0; font-size: 14px; font-weight: 400; color: #6b7280; line-height: 1.5;">
                {{inviterName}} has invited you to join {{tenantName}} on Fluera.
            </p>
        </div>
        <div style="padding: 0 40px 32px 40px;">
            <div style="text-align: center;">
                <a href="{{inviteLink}}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                    Accept Invitation
                </a>
            </div>
            <p style="margin: 24px 0 0 0; font-size: 13px; font-weight: 400; color: #9ca3af; text-align: center;">
                This invitation expires in 7 days
            </p>
        </div>
        <div style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; line-height: 1.5;">
                If you weren''t expecting this invitation, you can safely ignore this email.
            </p>
        </div>
        <div style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; text-align: center;">
                © {{currentYear}} Fluera. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE category = 'invitation' AND tenant_id = 0;

-- 5. TWO-FACTOR AUTHENTICATION (2FA) CODE TEMPLATE - UPDATE
UPDATE [dbo].[email_templates]
SET body_html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 560px; margin: 12px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="padding: 40px 40px 32px 40px;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">Security code</h1>
            <p style="margin: 0; font-size: 14px; font-weight: 400; color: #6b7280; line-height: 1.5;">
                Hello {{firstName}}, use this code to complete your sign in.
            </p>
        </div>
        <div style="padding: 0 40px 32px 40px;">
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 24px; text-align: center;">
                <div style="font-size: 32px; font-weight: 600; letter-spacing: 0.25em; color: #111827; font-family: ''Courier New'', monospace;">
                    {{code}}
                </div>
            </div>
            <p style="margin: 20px 0 0 0; font-size: 13px; font-weight: 400; color: #9ca3af; text-align: center;">
                This code expires in {{expiryMinutes}} minutes
            </p>
        </div>
        <div style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; line-height: 1.5;">
                Never share this code with anyone. Fluera will never ask for this code.
            </p>
        </div>
        <div style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; font-size: 12px; font-weight: 400; color: #9ca3af; text-align: center;">
                © {{currentYear}} Fluera. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE category = '2fa_code' AND tenant_id = 0;


-- =====================================================
-- INSERT MENU PERMISSIONS FOR ACCESS CONTROL MODULE
-- Links menu items to required permissions
-- =====================================================

-- Dashboard (No special permissions required - all users can access)
-- Not inserting anything for dashboard as it's public

-- Access Control - Main Menu (requires reading roles OR permissions)
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control', p.id, 0, 1
FROM permissions p
WHERE p.permission_key IN ('roles:read', 'permissions:read');

-- Access Control > Roles
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.roles', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'roles:read';

-- Access Control > Permissions
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.permissions', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'permissions:read';

-- Access Control > Role Permissions
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.role-permissions', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'role-permissions:read';

-- Access Control > User Roles
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.user-roles', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'user-roles:read';

-- Access Control > Menu Permissions
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.menu-permissions', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'menu-permissions:read';

-- Access Control > ABAC Attributes (future use)
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.attributes', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'system:manage';

-- Access Control > ABAC Policies (future use)
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.policies', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'system:manage';

-- Access Control > Policy Evaluation (future use)
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.policy-evaluation', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'system:manage';

-- Access Control > Resource Attributes (future use)
INSERT INTO menu_permissions (menu_key, permission_id, is_required, created_by)
SELECT 'access-control.resource-attributes', p.id, 1, 1
FROM permissions p
WHERE p.permission_key = 'system:manage';

-- =====================================================
-- VERIFY INSERTS
-- =====================================================
SELECT 
    mp.menu_key,
    p.permission_key,
    p.resource,
    p.action,
    mp.is_required,
    mp.created_at
FROM menu_permissions mp
JOIN permissions p ON mp.permission_id = p.id
ORDER BY mp.menu_key, p.permission_key;

-- =====================================================
-- CHECK WHICH MENUS A SPECIFIC USER CAN ACCESS
-- =====================================================
-- Replace @userId with actual user ID to test
DECLARE @TestUserId INT = 5; -- Change this to test different users

SELECT DISTINCT mp.menu_key
FROM menu_permissions mp
WHERE mp.is_required = 1
  AND EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = @TestUserId 
      AND ur.is_active = 1
      AND rp.permission_id = mp.permission_id
  )
ORDER BY mp.menu_key;