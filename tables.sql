-- =====================================================
-- Fluera SaaS Platform - Complete Updated Schema
-- Minimal changes, maximum coverage
-- =====================================================

-- ==================== SYSTEM & CONFIG ====================

CREATE TABLE [dbo].[system_config] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [config_key] NVARCHAR(255) UNIQUE NOT NULL,
    [config_value] NVARCHAR(MAX),
    [config_type] NVARCHAR(50) DEFAULT 'string',
    [is_encrypted] BIT DEFAULT 0,
    [environment] NVARCHAR(50) DEFAULT 'production',
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[audit_logs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [entity_type] NVARCHAR(100) NOT NULL,
    [entity_id] BIGINT,
    [action_type] NVARCHAR(50) NOT NULL,
    [old_values] NVARCHAR(MAX),
    [new_values] NVARCHAR(MAX),
    [user_id] BIGINT,
    [session_id] BIGINT,
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [organization_id] BIGINT,
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[system_events] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
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

-- ==================== SUBSCRIPTION PLANS ====================

CREATE TABLE [dbo].[subscription_plans] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [plan_name] NVARCHAR(100) UNIQUE NOT NULL,
    [plan_slug] NVARCHAR(50) UNIQUE NOT NULL,
    [plan_type] NVARCHAR(20) NOT NULL, -- 'agency', 'creator', 'brand'
    [price_monthly] DECIMAL(10,2),
    [price_yearly] DECIMAL(10,2),
    [currency] NVARCHAR(3) DEFAULT 'USD',
    [trial_days] INT DEFAULT 14,
    [max_users] INT DEFAULT 10,
    [max_creators] INT DEFAULT 100,
    [max_brands] INT DEFAULT 50,
    [max_campaigns] INT DEFAULT 100,
    [max_storage_gb] INT DEFAULT 50,
    [max_invitations] INT DEFAULT 100,
    [features] NVARCHAR(MAX), -- JSON array
    [is_active] BIT DEFAULT 1,
    [sort_order] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== ORGANIZATIONS ====================

CREATE TABLE [dbo].[organizations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    [slug] NVARCHAR(100) UNIQUE NOT NULL,
    [subdomain] NVARCHAR(100) , -- NEW: subdomain.fluera.io
    [custom_domain] NVARCHAR(255) , -- NEW: custom domain
    [domain_verified_at] DATETIME2(7), -- NEW
    [domain] NVARCHAR(255),
    [logo_url] NVARCHAR(MAX),
    [description] NVARCHAR(MAX),
    [industry] NVARCHAR(100),
    [company_size] NVARCHAR(50),
    [timezone] NVARCHAR(50) DEFAULT 'UTC',
    [locale] NVARCHAR(10) DEFAULT 'en-US',
    [currency] NVARCHAR(3) DEFAULT 'USD',
    
    -- Subscription fields
    [subscription_plan_id] BIGINT, -- NEW: link to plan
    [subscription_status] NVARCHAR(20) DEFAULT 'trial', -- 'trial', 'active', 'expired', 'cancelled'
    [is_trial] BIT DEFAULT 1, -- NEW
    [trial_started_at] DATETIME2(7), -- NEW
    [trial_ends_at] DATETIME2(7), -- NEW
    [subscription_started_at] DATETIME2(7), -- NEW
    [subscription_expires_at] DATETIME2(7),
    
    -- Usage limits
    [max_users] INT DEFAULT 10,
    [max_creators] INT DEFAULT 100,
    [max_brands] INT DEFAULT 50, -- NEW
    [max_campaigns] INT DEFAULT 100, -- NEW
    [max_storage_gb] INT DEFAULT 10,
    [max_invitations] INT DEFAULT 100, -- NEW
    
    -- Current usage
    [current_users] INT DEFAULT 0,
    [current_creators] INT DEFAULT 0,
    [current_brands] INT DEFAULT 0, -- NEW
    [current_campaigns] INT DEFAULT 0, -- NEW
    [current_storage_gb] DECIMAL(10,2) DEFAULT 0,
    [current_invitations] INT DEFAULT 0, -- NEW
    
    [settings] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[subscription_history] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [from_plan] NVARCHAR(50),
    [to_plan] NVARCHAR(50) NOT NULL,
    [change_type] NVARCHAR(20) NOT NULL, -- 'trial_start', 'upgrade', 'downgrade', 'renewal', 'cancellation'
    [change_reason] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[organization_features] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [feature_key] NVARCHAR(100) NOT NULL,
    [is_enabled] BIT DEFAULT 1,
    [limit_value] INT,
    [used_value] INT DEFAULT 0,
    [reset_period] NVARCHAR(20), -- 'daily', 'monthly', 'yearly', 'never'
    [last_reset_at] DATETIME2(7),
    [feature_metadata] NVARCHAR(MAX), -- NEW
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([organization_id], [feature_key])
);

CREATE TABLE [dbo].[organization_usage] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [metric_name] NVARCHAR(100) NOT NULL,
    [metric_value] DECIMAL(15,4),
    [measurement_period] DATE,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([organization_id], [metric_name], [measurement_period])
);

-- ==================== USERS & AUTHENTICATION ====================

CREATE TABLE [dbo].[users] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [email] NVARCHAR(320) UNIQUE NOT NULL,
    [username] NVARCHAR(100) NULL,
    [password_hash] NVARCHAR(255), -- NULL allowed for social login only
    [user_type] NVARCHAR(50) NOT NULL DEFAULT 'staff', -- NEW: 'owner', 'agency_admin', 'creator', 'brand_admin', 'staff', 'manager'
    
    -- Profile
    [first_name] NVARCHAR(100),
    [last_name] NVARCHAR(100),
    [display_name] NVARCHAR(200),
    [avatar_url] NVARCHAR(MAX),
    [phone] NVARCHAR(20),
    [timezone] NVARCHAR(50) DEFAULT 'UTC',
    [locale] NVARCHAR(10) DEFAULT 'en-US',
    [department] NVARCHAR(100),
    [job_title] NVARCHAR(100),
    [employee_id] NVARCHAR(50),
    [manager_id] BIGINT,
    
    -- Verification
    [email_verified_at] DATETIME2(7),
    [phone_verified_at] DATETIME2(7),
    
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
    
    -- Invitation tracking NEW
    [invitations_sent] INT DEFAULT 0,
    [invitations_limit] INT DEFAULT 10,
    
    [preferences] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'active',
    [is_system_user] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- NEW: Verification codes for OTP/2FA
CREATE TABLE [dbo].[verification_codes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT,
    [email] NVARCHAR(320),
    [phone] NVARCHAR(20),
    [code] NVARCHAR(10) NOT NULL,
    [code_type] NVARCHAR(20) NOT NULL, -- 'email_verify', 'login_otp', 'phone_verify', '2fa'
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

-- NEW: Universal invitation system
CREATE TABLE [dbo].[invitations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [invited_by] BIGINT NOT NULL,
    [invitee_email] NVARCHAR(320) NOT NULL,
    [invitee_phone] NVARCHAR(20),
    [invitee_name] NVARCHAR(255),
    [invitee_type] NVARCHAR(50) NOT NULL, -- 'creator', 'brand', 'staff', 'manager', 'accountant'
    [role_id] BIGINT,
    [invitation_token] NVARCHAR(255) UNIQUE NOT NULL,
    [invitation_message] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'declined'
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

CREATE TABLE [dbo].[user_sessions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
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
    [is_active] BIT DEFAULT 1,
    [last_activity_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [expires_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[user_social_accounts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [provider] NVARCHAR(50) NOT NULL, -- 'google', 'microsoft', 'facebook', 'twitter', 'apple'
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

-- ==================== ONBOARDING ====================

-- NEW: Custom onboarding forms
CREATE TABLE [dbo].[onboarding_forms] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [form_name] NVARCHAR(255) NOT NULL,
    [form_type] NVARCHAR(50) NOT NULL, -- 'creator', 'brand', 'staff'
    [form_config] NVARCHAR(MAX) NOT NULL, -- JSON structure
    [is_default] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- NEW: Onboarding progress tracking
CREATE TABLE [dbo].[onboarding_responses] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [form_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [organization_id] BIGINT NOT NULL,
    [response_data] NVARCHAR(MAX) NOT NULL, -- JSON
    [completion_percent] INT DEFAULT 0,
    [current_step] INT DEFAULT 1,
    [total_steps] INT,
    [status] NVARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'approved', 'rejected'
    [submitted_at] DATETIME2(7),
    [approved_at] DATETIME2(7),
    [approved_by] BIGINT,
    [rejection_reason] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== RBAC SYSTEM ====================

CREATE TABLE [dbo].[roles] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
    [name] NVARCHAR(100) NOT NULL,
    [display_name] NVARCHAR(255),
    [description] NVARCHAR(MAX),
    [color] NVARCHAR(7),
    [is_system_role] BIT DEFAULT 0,
    [is_default] BIT DEFAULT 0,
    [hierarchy_level] INT DEFAULT 0,
    [permissions_count] INT DEFAULT 0,
    [users_count] INT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([organization_id], [name])
);

CREATE TABLE [dbo].[permissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(100) UNIQUE NOT NULL,
    [resource] NVARCHAR(100) NOT NULL,
    [action] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(MAX),
    [category] NVARCHAR(100),
    [is_system_permission] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([resource], [action])
);

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

-- NEW: Role-based limits
CREATE TABLE [dbo].[role_limits] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
    [role_id] BIGINT NOT NULL,
    [limit_type] NVARCHAR(50) NOT NULL, -- 'invitations', 'campaigns', 'contracts', 'storage'
    [limit_value] INT NOT NULL,
    [current_usage] INT DEFAULT 0,
    [reset_period] NVARCHAR(20), -- 'daily', 'monthly', 'yearly', 'never'
    [last_reset_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([role_id], [limit_type])
);

-- ==================== ABAC SYSTEM ====================

CREATE TABLE [dbo].[abac_attributes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(100) UNIQUE NOT NULL,
    [category] NVARCHAR(50) NOT NULL,
    [data_type] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(MAX),
    [is_system_attribute] BIT DEFAULT 0,
    [validation_rules] NVARCHAR(MAX),
    [default_value] NVARCHAR(MAX),
    [is_required] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[user_attributes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [attribute_id] BIGINT NOT NULL,
    [value] NVARCHAR(MAX) NOT NULL,
    [valid_from] DATETIME2(7) DEFAULT GETUTCDATE(),
    [valid_until] DATETIME2(7),
    [source] NVARCHAR(50) DEFAULT 'manual',
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([user_id], [attribute_id])
);

CREATE TABLE [dbo].[resource_attributes] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [resource_type] NVARCHAR(100) NOT NULL,
    [resource_id] BIGINT NOT NULL,
    [attribute_id] BIGINT NOT NULL,
    [value] NVARCHAR(MAX) NOT NULL,
    [valid_from] DATETIME2(7) DEFAULT GETUTCDATE(),
    [valid_until] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([resource_type], [resource_id], [attribute_id])
);

CREATE TABLE [dbo].[abac_policies] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [organization_id] BIGINT,
    [policy_document] NVARCHAR(MAX) NOT NULL,
    [priority] INT DEFAULT 0,
    [effect] NVARCHAR(10) NOT NULL CHECK ([effect] IN ('PERMIT', 'DENY')),
    [target_conditions] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [version] INT DEFAULT 1,
    [parent_policy_id] BIGINT,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[abac_evaluation_cache] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [cache_key] NVARCHAR(512) UNIQUE NOT NULL,
    [decision] NVARCHAR(10) NOT NULL CHECK ([decision] IN ('PERMIT', 'DENY', 'INDETERMINATE')),
    [applicable_policies] NVARCHAR(MAX),
    [evaluation_time_ms] INT,
    [hit_count] INT DEFAULT 1,
    [expires_at] DATETIME2(7),
    [last_accessed_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[abac_evaluation_logs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT,
    [resource_type] NVARCHAR(100),
    [resource_id] BIGINT,
    [action] NVARCHAR(100),
    [context] NVARCHAR(MAX),
    [decision] NVARCHAR(10),
    [policies_evaluated] NVARCHAR(MAX),
    [evaluation_time_ms] INT,
    [cache_hit] BIT DEFAULT 0,
    [timestamp] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== EMAIL MANAGEMENT ====================

CREATE TABLE [dbo].[email_accounts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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
    [retry_count] INT DEFAULT 0,
    [inbox_folder] NVARCHAR(255) DEFAULT 'INBOX',
    [sent_folder] NVARCHAR(255) DEFAULT 'Sent',
    [settings] NVARCHAR(MAX),
    [is_primary] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([organization_id], [email_address])
);

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
    [organization_id] BIGINT NOT NULL,
    [email_account_id] BIGINT NOT NULL,
    [message_id] NVARCHAR(255),
    [thread_id] NVARCHAR(255),
    [parent_message_id] BIGINT,
    [subject] NVARCHAR(500),
    [sender_email] NVARCHAR(320),
    [sender_name] NVARCHAR(255),
    [reply_to_email] NVARCHAR(320),
    [reply_to_name] NVARCHAR(255),
    [recipients_to] NVARCHAR(MAX),
    [recipients_cc] NVARCHAR(MAX),
    [recipients_bcc] NVARCHAR(MAX),
    [body_text] NVARCHAR(MAX),
    [body_html] NVARCHAR(MAX),
    [snippet] NVARCHAR(MAX),
    [size_bytes] INT,
    [attachments_count] INT DEFAULT 0,
    [is_read] BIT DEFAULT 0,
    [is_important] BIT DEFAULT 0,
    [is_starred] BIT DEFAULT 0,
    [is_draft] BIT DEFAULT 0,
    [is_sent] BIT DEFAULT 0,
    [is_spam] BIT DEFAULT 0,
    [is_trash] BIT DEFAULT 0,
    [is_inquiry] BIT DEFAULT 0, -- Brand inquiry detection
    [inquiry_confidence] DECIMAL(3,2),
    [sentiment_score] DECIMAL(3,2),
    [priority_level] INT DEFAULT 0,
    [assigned_to] BIGINT, -- NEW: Assigned manager for inquiries
    [labels] NVARCHAR(MAX),
    [headers] NVARCHAR(MAX),
    [received_at] DATETIME2(7),
    [sent_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[email_attachments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [organization_id] BIGINT NOT NULL,
    [filename] NVARCHAR(500),
    [content_type] NVARCHAR(200),
    [size_bytes] INT,
    [attachment_id] NVARCHAR(255),
    [file_url] NVARCHAR(MAX),
    [file_path] NVARCHAR(1000),
    [is_inline] BIT DEFAULT 0,
    [content_disposition] NVARCHAR(100),
    [checksum] NVARCHAR(64),
    [virus_scan_status] NVARCHAR(20) DEFAULT 'pending',
    [virus_scan_result] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[email_templates] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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
    [organization_id] BIGINT NOT NULL,
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

-- ==================== CREATOR MANAGEMENT ====================

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

CREATE TABLE [dbo].[creators] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [user_id] BIGINT,
    [first_name] NVARCHAR(100) NOT NULL,
    [last_name] NVARCHAR(100),
    [stage_name] NVARCHAR(200),
    [email] NVARCHAR(320) UNIQUE NOT NULL,
    [phone] NVARCHAR(20),
    [date_of_birth] DATE,
    [gender] NVARCHAR(20),
    [bio] NVARCHAR(MAX),
    [profile_image_url] NVARCHAR(MAX),
    [cover_image_url] NVARCHAR(MAX),
    [location] NVARCHAR(MAX),
    [languages] NVARCHAR(MAX),
    [categories] NVARCHAR(MAX),
    [primary_category_id] BIGINT,
    
    -- Social metrics
    [follower_count_instagram] INT DEFAULT 0,
    [follower_count_youtube] INT DEFAULT 0,
    [follower_count_tiktok] INT DEFAULT 0,
    [follower_count_twitter] INT DEFAULT 0,
    [follower_count_total] INT DEFAULT 0,
    [engagement_rate_avg] DECIMAL(5,2),
    
    -- Performance
    [rating] DECIMAL(3,2) DEFAULT 5.0,
    [rating_count] INT DEFAULT 0,
    [total_campaigns] INT DEFAULT 0,
    [completed_campaigns] INT DEFAULT 0,
    [success_rate] DECIMAL(5,2),
    
    -- Preferences
    [preferred_brands] NVARCHAR(MAX),
    [excluded_brands] NVARCHAR(MAX),
    [content_types] NVARCHAR(MAX),
    [availability_status] NVARCHAR(20) DEFAULT 'available',
    
    -- Onboarding
    [onboarding_status] NVARCHAR(20) DEFAULT 'pending',
    [onboarding_step] INT DEFAULT 0,
    [kyc_status] NVARCHAR(20) DEFAULT 'pending',
    [bank_details] NVARCHAR(MAX),
    [tax_details] NVARCHAR(MAX),
    [contract_signed_at] DATETIME2(7),
    
    -- Invitation tracking NEW
    [invitations_sent] INT DEFAULT 0,
    [invitations_limit] INT DEFAULT 5,
    
    [status] NVARCHAR(20) DEFAULT 'active',
    [tags] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[creator_social_accounts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [creator_id] BIGINT NOT NULL,
    [platform] NVARCHAR(50) NOT NULL,
    [username] NVARCHAR(255) NOT NULL,
    [url] NVARCHAR(MAX) NOT NULL,
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
    UNIQUE([creator_id], [platform], [username])
);

CREATE TABLE [dbo].[creator_rate_cards] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [creator_id] BIGINT NOT NULL,
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

CREATE TABLE [dbo].[creator_availability] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [creator_id] BIGINT NOT NULL,
    [date] DATE NOT NULL,
    [is_available] BIT DEFAULT 1,
    [availability_type] NVARCHAR(20) DEFAULT 'full',
    [hours_available] INT DEFAULT 8,
    [notes] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([creator_id], [date])
);

CREATE TABLE [dbo].[creator_metrics] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [creator_id] BIGINT NOT NULL,
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
    UNIQUE([creator_id], [platform], [metric_date])
);

CREATE TABLE [dbo].[creator_documents] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [creator_id] BIGINT NOT NULL,
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

-- NEW: Creator staff (personal team)
CREATE TABLE [dbo].[creator_staff] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [creator_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [staff_role] NVARCHAR(50) NOT NULL, -- 'manager', 'accountant', 'assistant'
    [permissions] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([creator_id], [user_id])
);

-- ==================== BRAND MANAGEMENT ====================

CREATE TABLE [dbo].[brands] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL, -- Agency managing this brand
    [name] NVARCHAR(255) NOT NULL,
    [slug] NVARCHAR(100),
    [logo_url] NVARCHAR(MAX),
    [website_url] NVARCHAR(MAX),
    [industry] NVARCHAR(100),
    [description] NVARCHAR(MAX),
    
    -- Contact info
    [primary_contact_name] NVARCHAR(255),
    [primary_contact_email] NVARCHAR(320),
    [primary_contact_phone] NVARCHAR(20),
    [billing_address] NVARCHAR(MAX),
    
    -- Payment
    [payment_terms] INT DEFAULT 30,
    [preferred_payment_method] NVARCHAR(50),
    
    -- Brand guidelines
    [brand_guidelines_url] NVARCHAR(MAX),
    [content_approval_required] BIT DEFAULT 1,
    [auto_approve_creators] BIT DEFAULT 0,
    [blacklisted_creators] NVARCHAR(MAX),
    [preferred_creators] NVARCHAR(MAX),
    [budget_range] NVARCHAR(MAX),
    [campaign_objectives] NVARCHAR(MAX),
    [target_demographics] NVARCHAR(MAX),
    [brand_values] NVARCHAR(MAX),
    [content_restrictions] NVARCHAR(MAX),
    
    -- Performance
    [rating] DECIMAL(3,2) DEFAULT 5.0,
    [rating_count] INT DEFAULT 0,
    [total_campaigns] INT DEFAULT 0,
    [total_spent] DECIMAL(12,2) DEFAULT 0,
    
    -- NEW fields
    [is_direct_brand] BIT DEFAULT 0, -- Direct brand vs agency-managed
    [parent_organization_id] BIGINT, -- If brand has own org
    [invitations_sent] INT DEFAULT 0,
    [invitations_limit] INT DEFAULT 10,
    
    [status] NVARCHAR(20) DEFAULT 'active',
    [tags] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([organization_id], [slug])
);

-- NEW: Brand users (staff)
CREATE TABLE [dbo].[brand_users] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [brand_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [role] NVARCHAR(50) NOT NULL, -- 'admin', 'manager', 'accountant', 'viewer'
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([brand_id], [user_id])
);

-- NEW: Agency-Brand relationships
CREATE TABLE [dbo].[agency_brands] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [agency_id] BIGINT NOT NULL, -- organization_id
    [brand_id] BIGINT NOT NULL,
    [relationship_type] NVARCHAR(50) DEFAULT 'partner',
    [status] NVARCHAR(20) DEFAULT 'active',
    [started_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [ended_at] DATETIME2(7),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([agency_id], [brand_id])
);

-- NEW: Direct Brand-Creator relationships
CREATE TABLE [dbo].[brand_creators] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [brand_id] BIGINT NOT NULL,
    [creator_id] BIGINT NOT NULL,
    [relationship_type] NVARCHAR(50) DEFAULT 'direct',
    [referring_agency_id] BIGINT,
    [status] NVARCHAR(20) DEFAULT 'active',
    [started_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [ended_at] DATETIME2(7),
    [total_campaigns] INT DEFAULT 0,
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([brand_id], [creator_id])
);

-- ==================== PORTFOLIO MANAGEMENT ====================

CREATE TABLE [dbo].[portfolios] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [creator_ids] NVARCHAR(MAX),
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
    [last_viewed_at] DATETIME2(7),
    [status] NVARCHAR(20) DEFAULT 'draft',
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[portfolio_templates] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
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

-- NEW: Portfolio selections by brands
CREATE TABLE [dbo].[portfolio_selections] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [portfolio_id] BIGINT NOT NULL,
    [share_id] BIGINT NOT NULL,
    [selected_creator_ids] NVARCHAR(MAX) NOT NULL,
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

-- ==================== CAMPAIGN MANAGEMENT ====================

CREATE TABLE [dbo].[campaign_types] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
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
    [organization_id] BIGINT NOT NULL,
    [brand_id] BIGINT NOT NULL,
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
    
    -- Budget
    [budget_total] DECIMAL(12,2),
    [budget_allocated] DECIMAL(12,2) DEFAULT 0,
    [budget_spent] DECIMAL(12,2) DEFAULT 0,
    
    -- Creator count
    [creator_count_target] INT,
    [creator_count_assigned] INT DEFAULT 0,
    
    -- Dates
    [start_date] DATE,
    [end_date] DATE,
    [content_submission_deadline] DATE,
    [approval_deadline] DATE,
    [go_live_date] DATE,
    
    -- Team
    [campaign_manager_id] BIGINT,
    [account_manager_id] BIGINT,
    
    -- Approvals
    [approval_workflow] NVARCHAR(MAX),
    [auto_approve_content] BIT DEFAULT 0,
    [content_approval_required] BIT DEFAULT 1,
    [legal_approval_required] BIT DEFAULT 0,
    
    -- Rights
    [usage_rights_duration] INT DEFAULT 90,
    [exclusivity_period] INT DEFAULT 0,
    
    [performance_metrics] NVARCHAR(MAX),
    [success_criteria] NVARCHAR(MAX),
    [status] NVARCHAR(20) DEFAULT 'draft',
    [priority] NVARCHAR(20) DEFAULT 'medium',
    [visibility] NVARCHAR(20) DEFAULT 'private',
    [tags] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[campaign_creators] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [campaign_id] BIGINT NOT NULL,
    [creator_id] BIGINT NOT NULL,
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
    UNIQUE([campaign_id], [creator_id])
);

CREATE TABLE [dbo].[campaign_tasks] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [campaign_id] BIGINT NOT NULL,
    [creator_id] BIGINT,
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
    [organization_id] BIGINT NOT NULL,
    [campaign_id] BIGINT NOT NULL,
    [creator_id] BIGINT NOT NULL,
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
    
    -- Version control
    [version] INT DEFAULT 1,
    [parent_submission_id] BIGINT,
    [review_round] INT DEFAULT 1, -- NEW
    [max_review_rounds] INT DEFAULT 3, -- NEW
    
    -- Security
    [watermark_applied] BIT DEFAULT 0,
    [drm_protected] BIT DEFAULT 0,
    [download_protection] BIT DEFAULT 1,
    [screenshot_protected] BIT DEFAULT 1, -- NEW
    
    -- Tracking
    [view_count] INT DEFAULT 0,
    [download_count] INT DEFAULT 0,
    [share_count] INT DEFAULT 0,
    
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

CREATE TABLE [dbo].[content_reviews] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [submission_id] BIGINT NOT NULL,
    [organization_id] BIGINT NOT NULL,
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
    [comment_category] NVARCHAR(50), -- NEW: 'audio', 'visual', 'text', 'general'
    [timestamp_seconds] DECIMAL(8,3), -- For video comments
    [start_timestamp_seconds] DECIMAL(8,3), -- NEW: Range start
    [end_timestamp_seconds] DECIMAL(8,3), -- NEW: Range end
    [coordinates] NVARCHAR(MAX), -- For image annotations
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

-- NEW: Track unauthorized access attempts
CREATE TABLE [dbo].[content_access_violations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [submission_id] BIGINT NOT NULL,
    [user_id] BIGINT,
    [violation_type] NVARCHAR(50) NOT NULL, -- 'download_attempt', 'screenshot_attempt', 'unauthorized_access'
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [device_fingerprint] NVARCHAR(255),
    [detected_at] DATETIME2(7) DEFAULT GETUTCDATE(),
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
    [organization_id] BIGINT NOT NULL,
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
    [organization_id] BIGINT NOT NULL,
    [template_id] BIGINT,
    [contract_number] NVARCHAR(100) UNIQUE NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [contract_type] NVARCHAR(50) NOT NULL,
    [party_a_type] NVARCHAR(20) NOT NULL,
    [party_a_id] BIGINT,
    [party_a_name] NVARCHAR(255) NOT NULL,
    [party_a_email] NVARCHAR(320),
    [party_b_type] NVARCHAR(20) NOT NULL,
    [party_b_id] BIGINT,
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
    [termination_clause] NVARCHAR(MAX),
    [termination_notice_period] INT,
    [confidentiality_period] INT,
    [governing_law] NVARCHAR(100),
    [dispute_resolution] NVARCHAR(100),
    [force_majeure_clause] NVARCHAR(MAX),
    [amendment_count] INT DEFAULT 0,
    [last_amended_at] DATETIME2(7),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- NEW: Contract review rounds
CREATE TABLE [dbo].[contract_review_rounds] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [contract_id] BIGINT NOT NULL,
    [round_number] INT NOT NULL,
    [review_type] NVARCHAR(50) NOT NULL, -- 'pre_publish', 'post_publish', 'amendment'
    [initiated_by] BIGINT NOT NULL,
    [initiator_role] NVARCHAR(50) NOT NULL, -- 'brand', 'agency', 'creator', 'manager'
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

-- NEW: Detailed contract modifications tracking
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

-- NEW: Role-based contract permissions per stage
CREATE TABLE [dbo].[contract_stage_permissions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
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
    UNIQUE([organization_id], [contract_stage], [role_type])
);

CREATE TABLE [dbo].[contract_signatures] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [contract_id] BIGINT NOT NULL,
    [signer_type] NVARCHAR(20) NOT NULL,
    [signer_id] BIGINT,
    [signer_name] NVARCHAR(255) NOT NULL,
    [signer_email] NVARCHAR(320) NOT NULL,
    [signer_role] NVARCHAR(100),
    [signature_type] NVARCHAR(20) NOT NULL,
    [signature_method] NVARCHAR(50),
    [signature_image_url] NVARCHAR(MAX),
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [signed_at] DATETIME2(7),
    [signature_token] NVARCHAR(255),
    [verification_code] NVARCHAR(50),
    [is_witnessed] BIT DEFAULT 0,
    [witness_name] NVARCHAR(255),
    [witness_email] NVARCHAR(320),
    [witness_signed_at] DATETIME2(7),
    [status] NVARCHAR(20) DEFAULT 'pending',
    [sent_at] DATETIME2(7),
    [reminder_sent_count] INT DEFAULT 0,
    [last_reminder_sent_at] DATETIME2(7),
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

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

-- ==================== PAYMENT & FINANCIAL ====================

CREATE TABLE [dbo].[payment_methods] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
    [user_id] BIGINT,
    [creator_id] BIGINT,
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

CREATE TABLE [dbo].[invoices] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [invoice_number] NVARCHAR(100) UNIQUE NOT NULL,
    [invoice_type] NVARCHAR(20) NOT NULL,
    [related_type] NVARCHAR(50),
    [related_id] BIGINT,
    [recipient_type] NVARCHAR(20) NOT NULL,
    [recipient_id] BIGINT NOT NULL,
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
    [creator_id] BIGINT,
    [metadata] NVARCHAR(MAX),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[payments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [invoice_id] BIGINT,
    [payment_type] NVARCHAR(20) NOT NULL,
    [transaction_type] NVARCHAR(50) NOT NULL,
    [payer_type] NVARCHAR(20),
    [payer_id] BIGINT,
    [payer_name] NVARCHAR(255),
    [payee_type] NVARCHAR(20),
    [payee_id] BIGINT,
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

CREATE TABLE [dbo].[payout_batches] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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
    [organization_id] BIGINT NOT NULL,
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
    UNIQUE([organization_id], [report_type], [period_start], [period_end])
);

-- ==================== MESSAGING & COLLABORATION ====================

CREATE TABLE [dbo].[chat_channels] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [channel_type] NVARCHAR(20) DEFAULT 'group',
    [related_type] NVARCHAR(50),
    [related_id] BIGINT,
    [is_private] BIT DEFAULT 0,
    [is_archived] BIT DEFAULT 0,
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

CREATE TABLE [dbo].[chat_channel_members] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [channel_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [role] NVARCHAR(20) DEFAULT 'member',
    [joined_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [left_at] DATETIME2(7),
    [last_read_message_id] BIGINT,
    [last_read_at] DATETIME2(7),
    [notification_settings] NVARCHAR(MAX),
    [is_muted] BIT DEFAULT 0,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([channel_id], [user_id])
);

CREATE TABLE [dbo].[messages] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [channel_id] BIGINT NOT NULL,
    [sender_id] BIGINT NOT NULL,
    [message_type] NVARCHAR(20) DEFAULT 'text',
    [content] NVARCHAR(MAX),
    [formatted_content] NVARCHAR(MAX),
    [reply_to_message_id] BIGINT,
    [thread_id] BIGINT,
    [attachments] NVARCHAR(MAX),
    [mentions] NVARCHAR(MAX),
    [reactions] NVARCHAR(MAX),
    [is_edited] BIT DEFAULT 0,
    [edited_at] DATETIME2(7),
    [is_deleted] BIT DEFAULT 0,
    [deleted_at] DATETIME2(7),
    [deleted_by] BIGINT,
    [is_pinned] BIT DEFAULT 0,
    [pinned_at] DATETIME2(7),
    [pinned_by] BIGINT,
    [search_vector] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX),
    [sent_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[message_attachments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [organization_id] BIGINT NOT NULL,
    [filename] NVARCHAR(500) NOT NULL,
    [original_filename] NVARCHAR(500),
    [file_size] BIGINT NOT NULL,
    [mime_type] NVARCHAR(200) NOT NULL,
    [file_url] NVARCHAR(MAX) NOT NULL,
    [thumbnail_url] NVARCHAR(MAX),
    [file_hash] NVARCHAR(64),
    [virus_scan_status] NVARCHAR(20) DEFAULT 'pending',
    [virus_scan_result] NVARCHAR(MAX),
    [download_count] INT DEFAULT 0,
    [is_deleted] BIT DEFAULT 0,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[message_reactions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [organization_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [emoji] NVARCHAR(50) NOT NULL,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([message_id], [user_id], [emoji])
);

-- ==================== WORKFLOW AUTOMATION ====================

CREATE TABLE [dbo].[workflows] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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

CREATE TABLE [dbo].[workflow_executions] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [workflow_id] BIGINT NOT NULL,
    [organization_id] BIGINT NOT NULL,
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

CREATE TABLE [dbo].[ai_conversations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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

CREATE TABLE [dbo].[ai_training_data] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
    [data_type] NVARCHAR(50) NOT NULL,
    [input_data] NVARCHAR(MAX) NOT NULL,
    [expected_output] NVARCHAR(MAX),
    [actual_output] NVARCHAR(MAX),
    [feedback_score] INT,
    [is_approved] BIT DEFAULT 0,
    [approved_by] BIGINT,
    [approved_at] DATETIME2(7),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

-- ==================== NOTIFICATIONS ====================

CREATE TABLE [dbo].[notification_templates] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
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
    [organization_id] BIGINT,
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

-- ==================== FILE MANAGEMENT ====================

CREATE TABLE [dbo].[files] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE TABLE [dbo].[file_shares] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [file_id] BIGINT NOT NULL,
    [share_type] NVARCHAR(20) NOT NULL,
    [shared_with_user_id] BIGINT,
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

-- ==================== ANALYTICS & REPORTING ====================

CREATE TABLE [dbo].[analytics_events] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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

CREATE TABLE [dbo].[dashboard_widgets] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
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
    [organization_id] BIGINT NOT NULL,
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

-- ==================== INTEGRATIONS & WEBHOOKS ====================

CREATE TABLE [dbo].[integrations] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [integration_type] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [configuration] NVARCHAR(MAX) NOT NULL,
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

CREATE TABLE [dbo].[webhooks] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
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

-- ==================== SYSTEM MONITORING ====================

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

CREATE TABLE [dbo].[error_logs] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT,
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

-- NEW: Organization staff table
CREATE TABLE [dbo].[organization_staff] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [organization_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [staff_type] NVARCHAR(50) NOT NULL, -- 'accountant', 'manager', 'assistant', 'admin'
    [department] NVARCHAR(100),
    [reports_to] BIGINT,
    [permissions] NVARCHAR(MAX),
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT,
    UNIQUE([organization_id], [user_id])
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE NONCLUSTERED INDEX [IX_users_organization_email] ON [dbo].[users] ([organization_id], [email]);
CREATE NONCLUSTERED INDEX [IX_users_organization_active] ON [dbo].[users] ([organization_id], [status]) WHERE [status] = 'active';
CREATE NONCLUSTERED INDEX [IX_users_email] ON [dbo].[users] ([email]) INCLUDE ([password_hash], [status]);
CREATE NONCLUSTERED INDEX [IX_user_sessions_token] ON [dbo].[user_sessions] ([session_token]) INCLUDE ([user_id], [expires_at], [is_active]);
CREATE NONCLUSTERED INDEX [IX_user_roles_lookup] ON [dbo].[user_roles] ([user_id], [is_active]) INCLUDE ([role_id]);

CREATE NONCLUSTERED INDEX [IX_invitations_email_status] ON [dbo].[invitations] ([invitee_email], [status]);
CREATE NONCLUSTERED INDEX [IX_invitations_token] ON [dbo].[invitations] ([invitation_token]);
CREATE NONCLUSTERED INDEX [IX_verification_codes_lookup] ON [dbo].[verification_codes] ([email], [code_type], [used_at]);

CREATE NONCLUSTERED INDEX [IX_creators_organization] ON [dbo].[creators] ([organization_id], [status]);
CREATE NONCLUSTERED INDEX [IX_creators_search] ON [dbo].[creators] ([organization_id], [status]) INCLUDE ([first_name], [last_name], [stage_name], [follower_count_total], [rating]);
CREATE NONCLUSTERED INDEX [IX_creator_social_platform] ON [dbo].[creator_social_accounts] ([creator_id], [platform]);

CREATE NONCLUSTERED INDEX [IX_brands_organization] ON [dbo].[brands] ([organization_id], [status]);
CREATE NONCLUSTERED INDEX [IX_agency_brands_lookup] ON [dbo].[agency_brands] ([agency_id], [brand_id], [status]);
CREATE NONCLUSTERED INDEX [IX_brand_creators_lookup] ON [dbo].[brand_creators] ([brand_id], [creator_id], [status]);

CREATE NONCLUSTERED INDEX [IX_campaigns_organization_status] ON [dbo].[campaigns] ([organization_id], [status]);
CREATE NONCLUSTERED INDEX [IX_campaign_creators_lookup] ON [dbo].[campaign_creators] ([campaign_id], [creator_id]);

CREATE NONCLUSTERED INDEX [IX_contracts_organization] ON [dbo].[contracts] ([organization_id], [status]);
CREATE NONCLUSTERED INDEX [IX_contract_signatures_status] ON [dbo].[contract_signatures] ([contract_id], [status]);

CREATE NONCLUSTERED INDEX [IX_email_messages_account_received] ON [dbo].[email_messages] ([email_account_id], [received_at] DESC);
CREATE NONCLUSTERED INDEX [IX_email_messages_inquiry] ON [dbo].[email_messages] ([organization_id], [is_inquiry], [assigned_to]);

CREATE NONCLUSTERED INDEX [IX_messages_channel_sent] ON [dbo].[messages] ([channel_id], [sent_at] DESC);
CREATE NONCLUSTERED INDEX [IX_chat_members_user] ON [dbo].[chat_channel_members] ([user_id], [is_active]);

CREATE NONCLUSTERED INDEX [IX_content_submissions_campaign] ON [dbo].[content_submissions] ([campaign_id], [status]);
CREATE NONCLUSTERED INDEX [IX_content_submissions_creator] ON [dbo].[content_submissions] ([creator_id], [status]);

CREATE NONCLUSTERED INDEX [IX_payments_organization_date] ON [dbo].[payments] ([organization_id], [created_at] DESC);
CREATE NONCLUSTERED INDEX [IX_invoices_status] ON [dbo].[invoices] ([organization_id], [status]);

CREATE NONCLUSTERED INDEX [IX_files_organization] ON [dbo].[files] ([organization_id], [created_at] DESC);
CREATE NONCLUSTERED INDEX [IX_files_hash] ON [dbo].[files] ([file_hash]);

CREATE NONCLUSTERED INDEX [IX_notifications_recipient] ON [dbo].[notifications] ([recipient_id], [status], [created_at] DESC);

-- =====================================================
-- END OF SCHEMA
-- =====================================================