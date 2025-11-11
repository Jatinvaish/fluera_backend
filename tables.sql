
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
