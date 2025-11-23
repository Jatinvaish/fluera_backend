USE [fluera_new_structure]
GO

/****** Object:  Table [dbo].[activities]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[activities](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[activity_type] [nvarchar](50) NOT NULL,
	[subject_type] [nvarchar](50) NULL,
	[subject_id] [bigint] NULL,
	[action] [nvarchar](50) NOT NULL,
	[description] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[is_read] [bit] NULL,
	[read_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[ai_conversations]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[ai_conversations](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[conversation_type] [nvarchar](50) NULL,
	[title] [nvarchar](255) NULL,
	[context] [nvarchar](max) NULL,
	[message_count] [int] NULL,
	[is_active] [bit] NULL,
	[last_message_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[ai_messages]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[ai_messages](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[conversation_id] [bigint] NOT NULL,
	[sender_type] [nvarchar](10) NOT NULL,
	[message_content] [nvarchar](max) NOT NULL,
	[message_tokens] [int] NULL,
	[response_time_ms] [int] NULL,
	[model_used] [nvarchar](100) NULL,
	[confidence_score] [decimal](3, 2) NULL,
	[intent_detected] [nvarchar](100) NULL,
	[entities_extracted] [nvarchar](max) NULL,
	[actions_suggested] [nvarchar](max) NULL,
	[feedback_rating] [int] NULL,
	[feedback_comment] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[analytics_events]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[analytics_events](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NULL,
	[session_id] [bigint] NULL,
	[event_name] [nvarchar](100) NOT NULL,
	[event_category] [nvarchar](50) NOT NULL,
	[event_action] [nvarchar](50) NULL,
	[event_label] [nvarchar](255) NULL,
	[event_value] [decimal](10, 2) NULL,
	[page_url] [nvarchar](max) NULL,
	[referrer_url] [nvarchar](max) NULL,
	[user_agent] [nvarchar](max) NULL,
	[ip_address] [nvarchar](45) NULL,
	[properties] [nvarchar](max) NULL,
	[timestamp] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[audit_logs]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[audit_logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[user_id] [bigint] NULL,
	[entity_type] [nvarchar](100) NOT NULL,
	[entity_id] [bigint] NULL,
	[action_type] [nvarchar](50) NOT NULL,
	[old_values] [nvarchar](max) NULL,
	[new_values] [nvarchar](max) NULL,
	[ip_address] [nvarchar](45) NULL,
	[user_agent] [nvarchar](max) NULL,
	[session_id] [bigint] NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[batch_payments]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[batch_payments](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[batch_id] [bigint] NOT NULL,
	[payment_id] [bigint] NOT NULL,
	[sequence_number] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[batch_id] ASC,
	[payment_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[bookmarks]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[bookmarks](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[bookmarkable_type] [nvarchar](50) NOT NULL,
	[bookmarkable_id] [bigint] NOT NULL,
	[folder] [nvarchar](255) NULL,
	[notes] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[user_id] ASC,
	[bookmarkable_type] ASC,
	[bookmarkable_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[brand_profiles]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[brand_profiles](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[website_url] [nvarchar](max) NULL,
	[industry] [nvarchar](100) NULL,
	[description] [nvarchar](max) NULL,
	[brand_guidelines_url] [nvarchar](max) NULL,
	[target_demographics] [nvarchar](max) NULL,
	[budget_range] [nvarchar](max) NULL,
	[campaign_objectives] [nvarchar](max) NULL,
	[brand_values] [nvarchar](max) NULL,
	[content_restrictions] [nvarchar](max) NULL,
	[primary_contact_name] [nvarchar](255) NULL,
	[primary_contact_email] [nvarchar](320) NULL,
	[primary_contact_phone] [nvarchar](20) NULL,
	[billing_address] [nvarchar](max) NULL,
	[content_approval_required] [bit] NULL,
	[auto_approve_creators] [bit] NULL,
	[blacklisted_creators] [nvarchar](max) NULL,
	[preferred_creators] [nvarchar](max) NULL,
	[payment_terms] [int] NULL,
	[preferred_payment_method] [nvarchar](50) NULL,
	[rating] [decimal](3, 2) NULL,
	[rating_count] [int] NULL,
	[total_campaigns] [int] NULL,
	[total_spent] [decimal](12, 2) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[calendar_events]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[calendar_events](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[event_type] [nvarchar](50) NOT NULL,
	[title] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[location] [nvarchar](max) NULL,
	[start_time] [datetime2](7) NOT NULL,
	[end_time] [datetime2](7) NOT NULL,
	[all_day] [bit] NULL,
	[timezone] [nvarchar](50) NULL,
	[organizer_id] [bigint] NOT NULL,
	[attendees] [nvarchar](max) NULL,
	[meeting_url] [nvarchar](max) NULL,
	[meeting_provider] [nvarchar](50) NULL,
	[related_type] [nvarchar](50) NULL,
	[related_id] [bigint] NULL,
	[recurrence_rule] [nvarchar](max) NULL,
	[recurrence_parent_id] [bigint] NULL,
	[reminder_minutes] [int] NULL,
	[is_private] [bit] NULL,
	[status] [nvarchar](20) NULL,
	[color] [nvarchar](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[campaign_participants]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[campaign_participants](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[campaign_id] [bigint] NOT NULL,
	[creator_tenant_id] [bigint] NOT NULL,
	[status] [nvarchar](20) NULL,
	[invitation_sent_at] [datetime2](7) NULL,
	[response_deadline] [datetime2](7) NULL,
	[accepted_at] [datetime2](7) NULL,
	[declined_at] [datetime2](7) NULL,
	[decline_reason] [nvarchar](max) NULL,
	[deliverables] [nvarchar](max) NULL,
	[agreed_rate] [decimal](10, 2) NULL,
	[currency] [nvarchar](3) NULL,
	[bonus_amount] [decimal](10, 2) NULL,
	[payment_status] [nvarchar](20) NULL,
	[payment_due_date] [date] NULL,
	[content_submitted_at] [datetime2](7) NULL,
	[content_approved_at] [datetime2](7) NULL,
	[content_rejected_at] [datetime2](7) NULL,
	[rejection_reason] [nvarchar](max) NULL,
	[revision_count] [int] NULL,
	[performance_metrics] [nvarchar](max) NULL,
	[rating] [decimal](3, 2) NULL,
	[feedback] [nvarchar](max) NULL,
	[notes] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[campaign_id] ASC,
	[creator_tenant_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[campaign_tasks]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[campaign_tasks](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[campaign_id] [bigint] NOT NULL,
	[creator_tenant_id] [bigint] NULL,
	[assigned_to] [bigint] NULL,
	[task_type] [nvarchar](50) NOT NULL,
	[title] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[priority] [nvarchar](20) NULL,
	[status] [nvarchar](20) NULL,
	[due_date] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[estimated_hours] [decimal](4, 2) NULL,
	[actual_hours] [decimal](4, 2) NULL,
	[dependencies] [nvarchar](max) NULL,
	[attachments] [nvarchar](max) NULL,
	[comments_count] [int] NULL,
	[checklist] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[campaign_types]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[campaign_types](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[name] [nvarchar](100) NOT NULL,
	[description] [nvarchar](max) NULL,
	[default_duration_days] [int] NULL,
	[default_workflow] [nvarchar](max) NULL,
	[required_deliverables] [nvarchar](max) NULL,
	[pricing_model] [nvarchar](50) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[campaigns]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[campaigns](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[created_by_tenant_id] [bigint] NOT NULL,
	[brand_tenant_id] [bigint] NULL,
	[campaign_type_id] [bigint] NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[brief_document_url] [nvarchar](max) NULL,
	[objectives] [nvarchar](max) NULL,
	[target_audience] [nvarchar](max) NULL,
	[hashtags] [nvarchar](max) NULL,
	[mentions] [nvarchar](max) NULL,
	[content_requirements] [nvarchar](max) NULL,
	[deliverables] [nvarchar](max) NULL,
	[budget_total] [decimal](12, 2) NULL,
	[budget_allocated] [decimal](12, 2) NULL,
	[budget_spent] [decimal](12, 2) NULL,
	[currency] [nvarchar](3) NULL,
	[creator_count_target] [int] NULL,
	[creator_count_assigned] [int] NULL,
	[start_date] [date] NULL,
	[end_date] [date] NULL,
	[content_submission_deadline] [date] NULL,
	[approval_deadline] [date] NULL,
	[go_live_date] [date] NULL,
	[campaign_manager_id] [bigint] NULL,
	[account_manager_id] [bigint] NULL,
	[approval_workflow] [nvarchar](max) NULL,
	[auto_approve_content] [bit] NULL,
	[content_approval_required] [bit] NULL,
	[legal_approval_required] [bit] NULL,
	[usage_rights_duration] [int] NULL,
	[exclusivity_period] [int] NULL,
	[visibility] [nvarchar](20) NULL,
	[shared_with_tenants] [nvarchar](max) NULL,
	[performance_metrics] [nvarchar](max) NULL,
	[success_criteria] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[priority] [nvarchar](20) NULL,
	[tags] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[chat_channels]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[chat_channels](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[created_by_tenant_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NULL,
	[description] [nvarchar](max) NULL,
	[channel_type] [nvarchar](20) NULL,
	[related_type] [nvarchar](50) NULL,
	[related_id] [bigint] NULL,
	[participant_tenant_ids] [nvarchar](max) NULL,
	[member_count] [int] NULL,
	[is_private] [bit] NULL,
	[is_archived] [bit] NULL,
	[message_count] [int] NULL,
	[last_message_at] [datetime2](7) NULL,
	[last_activity_at] [datetime2](7) NULL,
	[settings] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[chat_participants]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[chat_participants](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[channel_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[role] [nvarchar](20) NULL,
	[joined_at] [datetime2](7) NULL,
	[left_at] [datetime2](7) NULL,
	[last_read_message_id] [bigint] NULL,
	[last_read_at] [datetime2](7) NULL,
	[notification_settings] [nvarchar](max) NULL,
	[is_muted] [bit] NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
	[is_pinned] [int] NULL,
	[mute_until] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[channel_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[comments]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[comments](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[commentable_type] [nvarchar](50) NOT NULL,
	[commentable_id] [bigint] NOT NULL,
	[parent_comment_id] [bigint] NULL,
	[user_id] [bigint] NOT NULL,
	[comment_text] [nvarchar](max) NOT NULL,
	[mentions] [nvarchar](max) NULL,
	[attachments] [nvarchar](max) NULL,
	[is_edited] [bit] NULL,
	[edited_at] [datetime2](7) NULL,
	[is_deleted] [bit] NULL,
	[deleted_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[content_access_violations]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[content_access_violations](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[submission_id] [bigint] NOT NULL,
	[user_id] [bigint] NULL,
	[violation_type] [nvarchar](50) NOT NULL,
	[ip_address] [nvarchar](45) NULL,
	[user_agent] [nvarchar](max) NULL,
	[device_fingerprint] [nvarchar](255) NULL,
	[detected_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[content_performance]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[content_performance](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[submission_id] [bigint] NOT NULL,
	[platform] [nvarchar](50) NOT NULL,
	[post_url] [nvarchar](max) NULL,
	[platform_post_id] [nvarchar](255) NULL,
	[published_at] [datetime2](7) NULL,
	[likes] [int] NULL,
	[comments] [int] NULL,
	[shares] [int] NULL,
	[saves] [int] NULL,
	[views] [int] NULL,
	[reach] [int] NULL,
	[impressions] [int] NULL,
	[engagement_rate] [decimal](5, 2) NULL,
	[click_through_rate] [decimal](5, 2) NULL,
	[conversion_rate] [decimal](5, 2) NULL,
	[cost_per_engagement] [decimal](8, 2) NULL,
	[cost_per_click] [decimal](8, 2) NULL,
	[roi] [decimal](8, 2) NULL,
	[sentiment_score] [decimal](3, 2) NULL,
	[top_comments] [nvarchar](max) NULL,
	[performance_grade] [nvarchar](2) NULL,
	[last_updated_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[content_review_comments]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[content_review_comments](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[submission_id] [bigint] NOT NULL,
	[review_id] [bigint] NULL,
	[commenter_id] [bigint] NOT NULL,
	[comment_text] [nvarchar](max) NOT NULL,
	[comment_type] [nvarchar](20) NULL,
	[comment_category] [nvarchar](50) NULL,
	[timestamp_seconds] [decimal](8, 3) NULL,
	[start_timestamp_seconds] [decimal](8, 3) NULL,
	[end_timestamp_seconds] [decimal](8, 3) NULL,
	[coordinates] [nvarchar](max) NULL,
	[is_resolved] [bit] NULL,
	[resolved_by] [bigint] NULL,
	[resolved_at] [datetime2](7) NULL,
	[parent_comment_id] [bigint] NULL,
	[attachments] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[content_reviews]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[content_reviews](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[submission_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[reviewer_id] [bigint] NOT NULL,
	[review_type] [nvarchar](20) NOT NULL,
	[status] [nvarchar](20) NOT NULL,
	[overall_rating] [int] NULL,
	[brand_alignment_rating] [int] NULL,
	[quality_rating] [int] NULL,
	[creativity_rating] [int] NULL,
	[feedback] [nvarchar](max) NULL,
	[revision_notes] [nvarchar](max) NULL,
	[approval_conditions] [nvarchar](max) NULL,
	[review_checklist] [nvarchar](max) NULL,
	[time_spent_minutes] [int] NULL,
	[reviewed_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[content_submissions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[content_submissions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[campaign_id] [bigint] NOT NULL,
	[submission_type] [nvarchar](50) NOT NULL,
	[title] [nvarchar](255) NULL,
	[description] [nvarchar](max) NULL,
	[content_type] [nvarchar](50) NOT NULL,
	[platform] [nvarchar](50) NOT NULL,
	[file_urls] [nvarchar](max) NOT NULL,
	[thumbnail_url] [nvarchar](max) NULL,
	[caption] [nvarchar](max) NULL,
	[hashtags] [nvarchar](max) NULL,
	[mentions] [nvarchar](max) NULL,
	[duration_seconds] [int] NULL,
	[dimensions] [nvarchar](max) NULL,
	[file_sizes] [nvarchar](max) NULL,
	[mime_types] [nvarchar](max) NULL,
	[scheduled_publish_time] [datetime2](7) NULL,
	[submission_notes] [nvarchar](max) NULL,
	[version] [int] NULL,
	[parent_submission_id] [bigint] NULL,
	[review_round] [int] NULL,
	[max_review_rounds] [int] NULL,
	[watermark_applied] [bit] NULL,
	[drm_protected] [bit] NULL,
	[download_protection] [bit] NULL,
	[screenshot_protected] [bit] NULL,
	[view_count] [int] NULL,
	[download_count] [int] NULL,
	[share_count] [int] NULL,
	[shared_with_tenants] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[submitted_at] [datetime2](7) NULL,
	[reviewed_at] [datetime2](7) NULL,
	[approved_at] [datetime2](7) NULL,
	[rejected_at] [datetime2](7) NULL,
	[published_at] [datetime2](7) NULL,
	[reviewer_id] [bigint] NULL,
	[approval_notes] [nvarchar](max) NULL,
	[rejection_reason] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[contract_modifications]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[contract_modifications](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[contract_id] [bigint] NOT NULL,
	[review_round_id] [bigint] NULL,
	[modified_by] [bigint] NOT NULL,
	[modifier_role] [nvarchar](50) NOT NULL,
	[modification_type] [nvarchar](50) NOT NULL,
	[section_modified] [nvarchar](255) NULL,
	[old_content] [nvarchar](max) NULL,
	[new_content] [nvarchar](max) NULL,
	[change_reason] [nvarchar](max) NULL,
	[requires_approval] [bit] NULL,
	[approved_by] [bigint] NULL,
	[approved_at] [datetime2](7) NULL,
	[rejected_by] [bigint] NULL,
	[rejected_at] [datetime2](7) NULL,
	[rejection_reason] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[contract_review_rounds]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[contract_review_rounds](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[contract_id] [bigint] NOT NULL,
	[round_number] [int] NOT NULL,
	[review_type] [nvarchar](50) NOT NULL,
	[initiated_by] [bigint] NOT NULL,
	[initiator_role] [nvarchar](50) NOT NULL,
	[status] [nvarchar](20) NULL,
	[max_modifications] [int] NULL,
	[current_modifications] [int] NULL,
	[started_at] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[deadline] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[contract_id] ASC,
	[round_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[contract_signatures]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[contract_signatures](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[contract_id] [bigint] NOT NULL,
	[signer_type] [nvarchar](20) NOT NULL,
	[signer_tenant_id] [bigint] NULL,
	[signer_user_id] [bigint] NULL,
	[signer_name] [nvarchar](255) NOT NULL,
	[signer_email] [nvarchar](320) NOT NULL,
	[signer_role] [nvarchar](100) NULL,
	[signature_type] [nvarchar](20) NOT NULL,
	[signature_method] [nvarchar](50) NULL,
	[signature_image_url] [nvarchar](max) NULL,
	[ip_address] [nvarchar](45) NULL,
	[user_agent] [nvarchar](max) NULL,
	[signed_at] [datetime2](7) NULL,
	[status] [nvarchar](20) NULL,
	[sent_at] [datetime2](7) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[contract_stage_permissions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[contract_stage_permissions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[contract_stage] [nvarchar](50) NOT NULL,
	[role_type] [nvarchar](50) NOT NULL,
	[can_view] [bit] NULL,
	[can_edit] [bit] NULL,
	[can_comment] [bit] NULL,
	[can_approve] [bit] NULL,
	[max_modifications] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[contract_stage] ASC,
	[role_type] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[contract_templates]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[contract_templates](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[template_type] [nvarchar](50) NOT NULL,
	[category] [nvarchar](100) NULL,
	[description] [nvarchar](max) NULL,
	[template_content] [nvarchar](max) NOT NULL,
	[variables] [nvarchar](max) NULL,
	[version] [nvarchar](20) NULL,
	[is_default] [bit] NULL,
	[requires_legal_review] [bit] NULL,
	[auto_renewal] [bit] NULL,
	[renewal_period] [int] NULL,
	[is_active] [bit] NULL,
	[usage_count] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[contract_versions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[contract_versions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[contract_id] [bigint] NOT NULL,
	[version_number] [int] NOT NULL,
	[content] [nvarchar](max) NOT NULL,
	[variables_data] [nvarchar](max) NULL,
	[changes_summary] [nvarchar](max) NULL,
	[change_reason] [nvarchar](500) NULL,
	[previous_version_id] [bigint] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[contract_id] ASC,
	[version_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[contracts]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[contracts](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[template_id] [bigint] NULL,
	[contract_number] [nvarchar](100) NOT NULL,
	[title] [nvarchar](255) NOT NULL,
	[contract_type] [nvarchar](50) NOT NULL,
	[party_a_type] [nvarchar](20) NOT NULL,
	[party_a_tenant_id] [bigint] NULL,
	[party_a_name] [nvarchar](255) NOT NULL,
	[party_a_email] [nvarchar](320) NULL,
	[party_b_type] [nvarchar](20) NOT NULL,
	[party_b_tenant_id] [bigint] NULL,
	[party_b_name] [nvarchar](255) NOT NULL,
	[party_b_email] [nvarchar](320) NULL,
	[related_campaign_id] [bigint] NULL,
	[content] [nvarchar](max) NOT NULL,
	[variables_data] [nvarchar](max) NULL,
	[contract_value] [decimal](12, 2) NULL,
	[currency] [nvarchar](3) NULL,
	[start_date] [date] NULL,
	[end_date] [date] NULL,
	[auto_renewal] [bit] NULL,
	[renewal_period] [int] NULL,
	[renewal_count] [int] NULL,
	[status] [nvarchar](20) NULL,
	[signature_required_from] [nvarchar](max) NULL,
	[signatures_completed] [int] NULL,
	[signatures_required] [int] NULL,
	[fully_signed_at] [datetime2](7) NULL,
	[docusign_envelope_id] [nvarchar](255) NULL,
	[document_urls] [nvarchar](max) NULL,
	[legal_reviewed] [bit] NULL,
	[legal_reviewer_id] [bigint] NULL,
	[legal_reviewed_at] [datetime2](7) NULL,
	[legal_notes] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[contract_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[creator_availability]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[creator_availability](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[date] [date] NOT NULL,
	[is_available] [bit] NULL,
	[availability_type] [nvarchar](20) NULL,
	[hours_available] [int] NULL,
	[notes] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[creator_categories]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[creator_categories](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[name] [nvarchar](100) NOT NULL,
	[slug] [nvarchar](100) NOT NULL,
	[description] [nvarchar](max) NULL,
	[parent_category_id] [bigint] NULL,
	[level] [int] NULL,
	[sort_order] [int] NULL,
	[icon_url] [nvarchar](max) NULL,
	[color] [nvarchar](7) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[slug] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[creator_documents]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[creator_documents](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[document_type] [nvarchar](50) NOT NULL,
	[document_name] [nvarchar](255) NULL,
	[file_url] [nvarchar](max) NOT NULL,
	[file_size] [int] NULL,
	[file_type] [nvarchar](100) NULL,
	[verification_status] [nvarchar](20) NULL,
	[verified_at] [datetime2](7) NULL,
	[verified_by] [bigint] NULL,
	[rejection_reason] [nvarchar](max) NULL,
	[expiry_date] [date] NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[creator_metrics]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[creator_metrics](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[platform] [nvarchar](50) NOT NULL,
	[metric_date] [date] NOT NULL,
	[followers] [int] NULL,
	[following] [int] NULL,
	[posts] [int] NULL,
	[likes] [int] NULL,
	[comments] [int] NULL,
	[shares] [int] NULL,
	[views] [int] NULL,
	[engagement_rate] [decimal](5, 2) NULL,
	[reach] [int] NULL,
	[impressions] [int] NULL,
	[saves] [int] NULL,
	[profile_visits] [int] NULL,
	[website_clicks] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[platform] ASC,
	[metric_date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[creator_profiles]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[creator_profiles](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[stage_name] [nvarchar](200) NULL,
	[bio] [nvarchar](max) NULL,
	[date_of_birth] [date] NULL,
	[gender] [nvarchar](20) NULL,
	[profile_image_url] [nvarchar](max) NULL,
	[cover_image_url] [nvarchar](max) NULL,
	[location] [nvarchar](max) NULL,
	[languages] [nvarchar](max) NULL,
	[categories] [nvarchar](max) NULL,
	[follower_count_total] [int] NULL,
	[engagement_rate_avg] [decimal](5, 2) NULL,
	[rating] [decimal](3, 2) NULL,
	[rating_count] [int] NULL,
	[total_campaigns] [int] NULL,
	[completed_campaigns] [int] NULL,
	[success_rate] [decimal](5, 2) NULL,
	[preferred_brands] [nvarchar](max) NULL,
	[excluded_brands] [nvarchar](max) NULL,
	[content_types] [nvarchar](max) NULL,
	[availability_status] [nvarchar](20) NULL,
	[kyc_status] [nvarchar](20) NULL,
	[bank_details] [nvarchar](max) NULL,
	[tax_details] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[creator_rate_cards]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[creator_rate_cards](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[platform] [nvarchar](50) NOT NULL,
	[content_type] [nvarchar](100) NOT NULL,
	[deliverable_type] [nvarchar](100) NULL,
	[base_rate] [decimal](10, 2) NOT NULL,
	[currency] [nvarchar](3) NULL,
	[rate_type] [nvarchar](20) NULL,
	[min_rate] [decimal](10, 2) NULL,
	[max_rate] [decimal](10, 2) NULL,
	[duration_hours] [int] NULL,
	[revisions_included] [int] NULL,
	[usage_rights_duration] [int] NULL,
	[commercial_usage_rate] [decimal](10, 2) NULL,
	[rush_delivery_rate] [decimal](10, 2) NULL,
	[additional_requirements] [nvarchar](max) NULL,
	[is_negotiable] [bit] NULL,
	[is_active] [bit] NULL,
	[effective_from] [date] NULL,
	[effective_until] [date] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[creator_social_accounts]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[creator_social_accounts](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[platform] [nvarchar](50) NOT NULL,
	[username] [nvarchar](255) NOT NULL,
	[url] [nvarchar](max) NULL,
	[follower_count] [int] NULL,
	[following_count] [int] NULL,
	[posts_count] [int] NULL,
	[engagement_rate] [decimal](5, 2) NULL,
	[avg_likes] [int] NULL,
	[avg_comments] [int] NULL,
	[avg_shares] [int] NULL,
	[avg_views] [int] NULL,
	[is_verified] [bit] NULL,
	[is_business_account] [bit] NULL,
	[last_sync_at] [datetime2](7) NULL,
	[sync_status] [nvarchar](20) NULL,
	[api_data] [nvarchar](max) NULL,
	[is_primary] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[platform] ASC,
	[username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[dashboard_widgets]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[dashboard_widgets](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[user_id] [bigint] NULL,
	[widget_type] [nvarchar](50) NOT NULL,
	[widget_name] [nvarchar](255) NOT NULL,
	[configuration] [nvarchar](max) NOT NULL,
	[position_x] [int] NULL,
	[position_y] [int] NULL,
	[width] [int] NULL,
	[height] [int] NULL,
	[dashboard_tab] [nvarchar](100) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[email_accounts]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[email_accounts](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[provider] [nvarchar](50) NOT NULL,
	[email_address] [nvarchar](320) NOT NULL,
	[display_name] [nvarchar](255) NULL,
	[imap_host] [nvarchar](255) NULL,
	[imap_port] [int] NULL,
	[imap_encryption] [nvarchar](10) NULL,
	[smtp_host] [nvarchar](255) NULL,
	[smtp_port] [int] NULL,
	[smtp_encryption] [nvarchar](10) NULL,
	[access_token] [nvarchar](max) NULL,
	[refresh_token] [nvarchar](max) NULL,
	[token_expires_at] [datetime2](7) NULL,
	[credentials_encrypted] [nvarchar](max) NULL,
	[sync_enabled] [bit] NULL,
	[last_sync_at] [datetime2](7) NULL,
	[sync_status] [nvarchar](20) NULL,
	[error_message] [nvarchar](max) NULL,
	[settings] [nvarchar](max) NULL,
	[is_primary] [bit] NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[email_address] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[email_attachments]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[email_attachments](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[message_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[encrypted_filename] [nvarchar](max) NULL,
	[encrypted_file_url] [nvarchar](max) NULL,
	[encrypted_file_key] [nvarchar](max) NULL,
	[encryption_iv] [nvarchar](max) NULL,
	[encryption_auth_tag] [nvarchar](max) NULL,
	[is_encrypted] [bit] NULL,
	[content_type] [nvarchar](200) NULL,
	[size_bytes] [int] NULL,
	[attachment_id] [nvarchar](255) NULL,
	[file_hash] [nvarchar](64) NULL,
	[is_inline] [bit] NULL,
	[virus_scan_status] [nvarchar](20) NULL,
	[virus_scan_result] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[email_folders]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[email_folders](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[email_account_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[display_name] [nvarchar](255) NULL,
	[folder_type] [nvarchar](50) NULL,
	[parent_folder_id] [bigint] NULL,
	[message_count] [int] NULL,
	[unread_count] [int] NULL,
	[sort_order] [int] NULL,
	[is_selectable] [bit] NULL,
	[attributes] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[email_account_id] ASC,
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[email_messages]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[email_messages](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[email_account_id] [bigint] NOT NULL,
	[message_id] [nvarchar](255) NULL,
	[thread_id] [nvarchar](255) NULL,
	[parent_message_id] [bigint] NULL,
	[encrypted_subject] [nvarchar](max) NULL,
	[encrypted_body_text] [nvarchar](max) NULL,
	[encrypted_body_html] [nvarchar](max) NULL,
	[encryption_iv] [nvarchar](max) NULL,
	[encryption_auth_tag] [nvarchar](max) NULL,
	[encryption_key_version] [int] NULL,
	[is_encrypted] [bit] NULL,
	[sender_email] [nvarchar](320) NULL,
	[sender_name] [nvarchar](255) NULL,
	[reply_to_email] [nvarchar](320) NULL,
	[reply_to_name] [nvarchar](255) NULL,
	[recipients_to] [nvarchar](max) NULL,
	[recipients_cc] [nvarchar](max) NULL,
	[recipients_bcc] [nvarchar](max) NULL,
	[snippet] [nvarchar](500) NULL,
	[size_bytes] [int] NULL,
	[attachments_count] [int] NULL,
	[is_read] [bit] NULL,
	[is_important] [bit] NULL,
	[is_starred] [bit] NULL,
	[is_draft] [bit] NULL,
	[is_sent] [bit] NULL,
	[is_spam] [bit] NULL,
	[is_trash] [bit] NULL,
	[is_inquiry] [bit] NULL,
	[inquiry_confidence] [decimal](3, 2) NULL,
	[sentiment_score] [decimal](3, 2) NULL,
	[priority_level] [int] NULL,
	[assigned_to] [bigint] NULL,
	[labels] [nvarchar](max) NULL,
	[headers] [nvarchar](max) NULL,
	[shared_with_tenants] [nvarchar](max) NULL,
	[sharing_settings] [nvarchar](max) NULL,
	[received_at] [datetime2](7) NULL,
	[sent_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[email_rules]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[email_rules](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[email_account_id] [bigint] NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[conditions] [nvarchar](max) NOT NULL,
	[actions] [nvarchar](max) NOT NULL,
	[priority] [int] NULL,
	[is_active] [bit] NULL,
	[execution_count] [int] NULL,
	[last_executed_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[email_templates]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[email_templates](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[category] [nvarchar](100) NULL,
	[subject] [nvarchar](500) NULL,
	[body_html] [nvarchar](max) NULL,
	[body_text] [nvarchar](max) NULL,
	[variables] [nvarchar](max) NULL,
	[usage_count] [int] NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[encryption_audit_logs]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[encryption_audit_logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[operation_type] [nvarchar](50) NOT NULL,
	[entity_type] [nvarchar](50) NOT NULL,
	[entity_id] [bigint] NOT NULL,
	[key_id] [bigint] NULL,
	[key_version] [int] NULL,
	[algorithm_used] [nvarchar](50) NULL,
	[user_id] [bigint] NULL,
	[tenant_id] [bigint] NULL,
	[success] [bit] NOT NULL,
	[error_message] [nvarchar](max) NULL,
	[ip_address] [nvarchar](45) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[encryption_keys]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[encryption_keys](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[key_type] [nvarchar](50) NOT NULL,
	[entity_type] [nvarchar](50) NULL,
	[entity_id] [bigint] NULL,
	[key_version] [int] NOT NULL,
	[algorithm] [nvarchar](50) NOT NULL,
	[encrypted_key] [nvarchar](max) NOT NULL,
	[public_key] [nvarchar](max) NULL,
	[key_fingerprint] [nvarchar](64) NOT NULL,
	[key_purpose] [nvarchar](100) NULL,
	[is_active] [bit] NULL,
	[expires_at] [datetime2](7) NULL,
	[rotated_from_key_id] [bigint] NULL,
	[rotation_reason] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[error_logs]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[error_logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[user_id] [bigint] NULL,
	[error_type] [nvarchar](100) NOT NULL,
	[error_message] [nvarchar](max) NOT NULL,
	[error_code] [nvarchar](50) NULL,
	[stack_trace] [nvarchar](max) NULL,
	[request_url] [nvarchar](max) NULL,
	[request_method] [nvarchar](10) NULL,
	[request_headers] [nvarchar](max) NULL,
	[request_body] [nvarchar](max) NULL,
	[response_status] [int] NULL,
	[severity] [nvarchar](20) NULL,
	[resolved] [bit] NULL,
	[resolved_at] [datetime2](7) NULL,
	[resolved_by] [bigint] NULL,
	[occurrence_count] [int] NULL,
	[first_occurred_at] [datetime2](7) NULL,
	[last_occurred_at] [datetime2](7) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[event_attendees]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[event_attendees](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[event_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[response_status] [nvarchar](20) NULL,
	[responded_at] [datetime2](7) NULL,
	[is_organizer] [bit] NULL,
	[is_optional] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[event_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[file_processing_jobs]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[file_processing_jobs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[file_id] [bigint] NOT NULL,
	[job_type] [nvarchar](50) NOT NULL,
	[status] [nvarchar](20) NULL,
	[progress_percent] [int] NULL,
	[started_at] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[error_message] [nvarchar](max) NULL,
	[input_parameters] [nvarchar](max) NULL,
	[output_data] [nvarchar](max) NULL,
	[processing_time_seconds] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[file_shares]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[file_shares](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[file_id] [bigint] NOT NULL,
	[share_type] [nvarchar](20) NOT NULL,
	[shared_with_user_id] [bigint] NULL,
	[shared_with_tenant_id] [bigint] NULL,
	[shared_with_email] [nvarchar](320) NULL,
	[access_token] [nvarchar](255) NULL,
	[password_hash] [nvarchar](255) NULL,
	[permissions] [nvarchar](max) NULL,
	[expires_at] [datetime2](7) NULL,
	[max_downloads] [int] NULL,
	[download_count] [int] NULL,
	[last_accessed_at] [datetime2](7) NULL,
	[access_count] [int] NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[access_token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[files]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[files](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[uploaded_by] [bigint] NOT NULL,
	[filename] [nvarchar](500) NOT NULL,
	[original_filename] [nvarchar](500) NOT NULL,
	[file_path] [nvarchar](1000) NOT NULL,
	[file_url] [nvarchar](max) NOT NULL,
	[file_size] [bigint] NOT NULL,
	[mime_type] [nvarchar](200) NOT NULL,
	[file_extension] [nvarchar](20) NULL,
	[file_hash] [nvarchar](64) NULL,
	[dimensions] [nvarchar](max) NULL,
	[duration_seconds] [int] NULL,
	[metadata] [nvarchar](max) NULL,
	[folder_path] [nvarchar](1000) NULL,
	[tags] [nvarchar](max) NULL,
	[is_public] [bit] NULL,
	[is_temporary] [bit] NULL,
	[expires_at] [datetime2](7) NULL,
	[download_count] [int] NULL,
	[virus_scan_status] [nvarchar](20) NULL,
	[virus_scan_result] [nvarchar](max) NULL,
	[processing_status] [nvarchar](20) NULL,
	[thumbnail_url] [nvarchar](max) NULL,
	[preview_url] [nvarchar](max) NULL,
	[compressed_url] [nvarchar](max) NULL,
	[watermarked_url] [nvarchar](max) NULL,
	[encrypted_file_key] [nvarchar](max) NULL,
	[encryption_iv] [nvarchar](max) NULL,
	[encryption_auth_tag] [nvarchar](max) NULL,
	[is_encrypted] [bit] NULL,
	[shared_with_tenants] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[file_hash] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[financial_reports]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[financial_reports](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[report_type] [nvarchar](50) NOT NULL,
	[report_name] [nvarchar](255) NOT NULL,
	[period_type] [nvarchar](20) NOT NULL,
	[period_start] [date] NOT NULL,
	[period_end] [date] NOT NULL,
	[total_revenue] [decimal](12, 2) NULL,
	[total_expenses] [decimal](12, 2) NULL,
	[total_profit] [decimal](12, 2) NULL,
	[creator_payments] [decimal](12, 2) NULL,
	[platform_fees] [decimal](12, 2) NULL,
	[tax_amount] [decimal](12, 2) NULL,
	[report_data] [nvarchar](max) NOT NULL,
	[generated_at] [datetime2](7) NULL,
	[file_url] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[report_type] ASC,
	[period_start] ASC,
	[period_end] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[integrations]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[integrations](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[integration_type] [nvarchar](50) NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[configuration] [nvarchar](max) NULL,
	[credentials_encrypted] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[last_sync_at] [datetime2](7) NULL,
	[sync_frequency_minutes] [int] NULL,
	[error_message] [nvarchar](max) NULL,
	[error_count] [int] NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[invitations]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[invitations](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[invited_by] [bigint] NOT NULL,
	[invitee_email] [nvarchar](320) NOT NULL,
	[invitee_phone] [nvarchar](20) NULL,
	[invitee_name] [nvarchar](255) NULL,
	[invitee_type] [nvarchar](50) NOT NULL,
	[role_id] [bigint] NULL,
	[invitation_token] [nvarchar](255) NOT NULL,
	[invitation_message] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[expires_at] [datetime2](7) NOT NULL,
	[accepted_at] [datetime2](7) NULL,
	[declined_at] [datetime2](7) NULL,
	[decline_reason] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[invitation_token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[invoice_items]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[invoice_items](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[invoice_id] [bigint] NOT NULL,
	[line_number] [int] NOT NULL,
	[item_type] [nvarchar](50) NOT NULL,
	[description] [nvarchar](500) NOT NULL,
	[quantity] [decimal](10, 2) NULL,
	[unit_price] [decimal](10, 2) NOT NULL,
	[discount_percent] [decimal](5, 2) NULL,
	[discount_amount] [decimal](10, 2) NULL,
	[tax_rate] [decimal](5, 2) NULL,
	[tax_amount] [decimal](10, 2) NULL,
	[line_total] [decimal](12, 2) NOT NULL,
	[sku] [nvarchar](100) NULL,
	[category] [nvarchar](100) NULL,
	[campaign_id] [bigint] NULL,
	[creator_tenant_id] [bigint] NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[invoices]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[invoices](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[invoice_number] [nvarchar](100) NOT NULL,
	[invoice_type] [nvarchar](20) NOT NULL,
	[related_type] [nvarchar](50) NULL,
	[related_id] [bigint] NULL,
	[recipient_type] [nvarchar](20) NOT NULL,
	[recipient_tenant_id] [bigint] NULL,
	[recipient_name] [nvarchar](255) NOT NULL,
	[recipient_email] [nvarchar](320) NULL,
	[recipient_address] [nvarchar](max) NULL,
	[bill_to_address] [nvarchar](max) NULL,
	[ship_to_address] [nvarchar](max) NULL,
	[subtotal] [decimal](12, 2) NOT NULL,
	[tax_amount] [decimal](12, 2) NULL,
	[discount_amount] [decimal](12, 2) NULL,
	[total_amount] [decimal](12, 2) NOT NULL,
	[currency] [nvarchar](3) NULL,
	[exchange_rate] [decimal](10, 4) NULL,
	[payment_terms] [int] NULL,
	[due_date] [date] NULL,
	[issue_date] [date] NULL,
	[service_period_start] [date] NULL,
	[service_period_end] [date] NULL,
	[notes] [nvarchar](max) NULL,
	[terms_conditions] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[sent_at] [datetime2](7) NULL,
	[paid_at] [datetime2](7) NULL,
	[payment_method] [nvarchar](50) NULL,
	[payment_reference] [nvarchar](255) NULL,
	[late_fee_amount] [decimal](10, 2) NULL,
	[reminder_sent_count] [int] NULL,
	[last_reminder_sent_at] [datetime2](7) NULL,
	[pdf_url] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[invoice_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[key_rotation_schedule]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[key_rotation_schedule](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[entity_type] [nvarchar](50) NOT NULL,
	[entity_id] [bigint] NOT NULL,
	[current_key_id] [bigint] NOT NULL,
	[rotation_frequency_days] [int] NULL,
	[last_rotated_at] [datetime2](7) NULL,
	[next_rotation_at] [datetime2](7) NOT NULL,
	[auto_rotate] [bit] NULL,
	[rotation_policy] [nvarchar](max) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[entity_type] ASC,
	[entity_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[menu_permissions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[menu_permissions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[menu_key] [nvarchar](100) NOT NULL,
	[permission_id] [bigint] NOT NULL,
	[applicable_to] [nvarchar](max) NULL,
	[is_required] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[menu_key] ASC,
	[permission_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[message_attachments]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[message_attachments](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[message_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[file_url] [nvarchar](max) NOT NULL,
	[filename] [nvarchar](500) NOT NULL,
	[file_size] [bigint] NOT NULL,
	[mime_type] [nvarchar](200) NOT NULL,
	[file_hash] [nvarchar](64) NULL,
	[thumbnail_url] [nvarchar](max) NULL,
	[virus_scan_status] [nvarchar](20) NULL,
	[virus_scan_result] [nvarchar](max) NULL,
	[download_count] [int] NULL,
	[is_deleted] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[message_queue]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[message_queue](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[message_id] [bigint] NOT NULL,
	[channel_id] [bigint] NOT NULL,
	[queued_at] [datetime2](7) NULL,
	[expires_at] [datetime2](7) NOT NULL,
	[delivered_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[message_reactions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[message_reactions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[message_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[emoji] [nvarchar](50) NOT NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[message_id] ASC,
	[user_id] ASC,
	[emoji] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[message_read_receipts]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[message_read_receipts](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[message_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[status] [nvarchar](20) NOT NULL,
	[delivered_at] [datetime2](7) NULL,
	[read_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[messages]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[messages](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[channel_id] [bigint] NOT NULL,
	[sender_tenant_id] [bigint] NOT NULL,
	[sender_user_id] [bigint] NOT NULL,
	[message_type] [nvarchar](20) NULL,
	[content] [nvarchar](max) NOT NULL,
	[has_attachments] [bit] NULL,
	[has_mentions] [bit] NULL,
	[reply_to_message_id] [bigint] NULL,
	[thread_id] [bigint] NULL,
	[is_edited] [bit] NULL,
	[edited_at] [datetime2](7) NULL,
	[is_deleted] [bit] NULL,
	[deleted_at] [datetime2](7) NULL,
	[deleted_by] [bigint] NULL,
	[is_pinned] [bit] NULL,
	[pinned_at] [datetime2](7) NULL,
	[pinned_by] [bigint] NULL,
	[metadata] [nvarchar](max) NULL,
	[sent_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
	[reply_count] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[notes]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[notes](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[title] [nvarchar](255) NULL,
	[content] [nvarchar](max) NOT NULL,
	[content_type] [nvarchar](20) NULL,
	[related_type] [nvarchar](50) NULL,
	[related_id] [bigint] NULL,
	[tags] [nvarchar](max) NULL,
	[is_pinned] [bit] NULL,
	[is_archived] [bit] NULL,
	[folder_path] [nvarchar](1000) NULL,
	[encrypted_content] [nvarchar](max) NULL,
	[encryption_iv] [nvarchar](max) NULL,
	[encryption_auth_tag] [nvarchar](max) NULL,
	[is_encrypted] [bit] NULL,
	[shared_with] [nvarchar](max) NULL,
	[last_edited_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[notification_preferences]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[notification_preferences](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[event_type] [nvarchar](100) NOT NULL,
	[email_enabled] [bit] NULL,
	[sms_enabled] [bit] NULL,
	[push_enabled] [bit] NULL,
	[in_app_enabled] [bit] NULL,
	[frequency] [nvarchar](20) NULL,
	[quiet_hours_start] [time](7) NULL,
	[quiet_hours_end] [time](7) NULL,
	[timezone] [nvarchar](50) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[user_id] ASC,
	[event_type] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[notification_templates]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[notification_templates](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[name] [nvarchar](255) NOT NULL,
	[event_type] [nvarchar](100) NOT NULL,
	[channel] [nvarchar](50) NOT NULL,
	[subject_template] [nvarchar](500) NULL,
	[body_template] [nvarchar](max) NOT NULL,
	[variables] [nvarchar](max) NULL,
	[is_system_template] [bit] NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[notifications]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[notifications](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[recipient_id] [bigint] NOT NULL,
	[event_type] [nvarchar](100) NOT NULL,
	[channel] [nvarchar](50) NOT NULL,
	[priority] [nvarchar](20) NULL,
	[subject] [nvarchar](500) NULL,
	[message] [nvarchar](max) NOT NULL,
	[data] [nvarchar](max) NULL,
	[template_id] [bigint] NULL,
	[scheduled_at] [datetime2](7) NULL,
	[sent_at] [datetime2](7) NULL,
	[delivered_at] [datetime2](7) NULL,
	[read_at] [datetime2](7) NULL,
	[clicked_at] [datetime2](7) NULL,
	[status] [nvarchar](20) NULL,
	[error_message] [nvarchar](max) NULL,
	[retry_count] [int] NULL,
	[max_retries] [int] NULL,
	[next_retry_at] [datetime2](7) NULL,
	[provider_message_id] [nvarchar](255) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[password_reset_tokens]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[password_reset_tokens](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[token] [nvarchar](255) NOT NULL,
	[expires_at] [datetime2](7) NOT NULL,
	[used_at] [datetime2](7) NULL,
	[ip_address] [nvarchar](45) NULL,
	[user_agent] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[payment_methods]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[payment_methods](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NULL,
	[method_type] [nvarchar](50) NOT NULL,
	[provider] [nvarchar](50) NULL,
	[account_name] [nvarchar](255) NULL,
	[account_number_encrypted] [nvarchar](max) NULL,
	[routing_number_encrypted] [nvarchar](max) NULL,
	[iban_encrypted] [nvarchar](max) NULL,
	[swift_code] [nvarchar](20) NULL,
	[bank_name] [nvarchar](255) NULL,
	[bank_address] [nvarchar](max) NULL,
	[paypal_email] [nvarchar](320) NULL,
	[crypto_wallet_address] [nvarchar](max) NULL,
	[crypto_network] [nvarchar](50) NULL,
	[provider_customer_id] [nvarchar](255) NULL,
	[provider_payment_method_id] [nvarchar](255) NULL,
	[currency] [nvarchar](3) NULL,
	[is_default] [bit] NULL,
	[is_verified] [bit] NULL,
	[verified_at] [datetime2](7) NULL,
	[last_used_at] [datetime2](7) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[payments]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[payments](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[invoice_id] [bigint] NULL,
	[payment_type] [nvarchar](20) NOT NULL,
	[transaction_type] [nvarchar](50) NOT NULL,
	[payer_type] [nvarchar](20) NULL,
	[payer_tenant_id] [bigint] NULL,
	[payer_name] [nvarchar](255) NULL,
	[payee_type] [nvarchar](20) NULL,
	[payee_tenant_id] [bigint] NULL,
	[payee_name] [nvarchar](255) NULL,
	[amount] [decimal](12, 2) NOT NULL,
	[currency] [nvarchar](3) NULL,
	[exchange_rate] [decimal](10, 4) NULL,
	[base_amount] [decimal](12, 2) NULL,
	[fee_amount] [decimal](10, 2) NULL,
	[net_amount] [decimal](12, 2) NULL,
	[payment_method_id] [bigint] NULL,
	[payment_gateway] [nvarchar](50) NULL,
	[gateway_transaction_id] [nvarchar](255) NULL,
	[gateway_fee] [decimal](10, 2) NULL,
	[reference_number] [nvarchar](255) NULL,
	[description] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[initiated_at] [datetime2](7) NULL,
	[processed_at] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[failed_at] [datetime2](7) NULL,
	[failure_reason] [nvarchar](max) NULL,
	[retry_count] [int] NULL,
	[next_retry_at] [datetime2](7) NULL,
	[webhook_data] [nvarchar](max) NULL,
	[reconciliation_status] [nvarchar](20) NULL,
	[reconciled_at] [datetime2](7) NULL,
	[bank_statement_reference] [nvarchar](255) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[payout_batches]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[payout_batches](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[batch_number] [nvarchar](100) NOT NULL,
	[batch_type] [nvarchar](20) NULL,
	[total_amount] [decimal](12, 2) NOT NULL,
	[currency] [nvarchar](3) NULL,
	[payment_count] [int] NULL,
	[successful_payments] [int] NULL,
	[failed_payments] [int] NULL,
	[processing_fee] [decimal](10, 2) NULL,
	[status] [nvarchar](20) NULL,
	[scheduled_at] [datetime2](7) NULL,
	[started_at] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[gateway_batch_id] [nvarchar](255) NULL,
	[notes] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[batch_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[permissions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[permissions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[permission_key] [nvarchar](100) NOT NULL,
	[resource] [nvarchar](100) NOT NULL,
	[action] [nvarchar](50) NOT NULL,
	[description] [nvarchar](max) NULL,
	[category] [nvarchar](100) NULL,
	[applicable_to] [nvarchar](max) NULL,
	[is_system_permission] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[permission_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[portfolio_selections]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[portfolio_selections](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[portfolio_id] [bigint] NOT NULL,
	[share_id] [bigint] NOT NULL,
	[selected_creator_tenant_ids] [nvarchar](max) NOT NULL,
	[brand_email] [nvarchar](320) NULL,
	[brand_name] [nvarchar](255) NULL,
	[brand_message] [nvarchar](max) NULL,
	[selection_date] [datetime2](7) NULL,
	[status] [nvarchar](20) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[portfolio_shares]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[portfolio_shares](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[portfolio_id] [bigint] NOT NULL,
	[share_type] [nvarchar](20) NOT NULL,
	[recipient_email] [nvarchar](320) NULL,
	[recipient_name] [nvarchar](255) NULL,
	[access_token] [nvarchar](255) NOT NULL,
	[password_hash] [nvarchar](255) NULL,
	[expires_at] [datetime2](7) NULL,
	[view_count] [int] NULL,
	[last_viewed_at] [datetime2](7) NULL,
	[viewer_info] [nvarchar](max) NULL,
	[permissions] [nvarchar](max) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[access_token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[portfolio_templates]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[portfolio_templates](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[thumbnail_url] [nvarchar](max) NULL,
	[template_config] [nvarchar](max) NOT NULL,
	[is_default] [bit] NULL,
	[is_public] [bit] NULL,
	[usage_count] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[portfolios]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[portfolios](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[creator_tenant_ids] [nvarchar](max) NULL,
	[brand_categories] [nvarchar](max) NULL,
	[target_audience] [nvarchar](max) NULL,
	[total_reach] [int] NULL,
	[avg_engagement_rate] [decimal](5, 2) NULL,
	[template_id] [bigint] NULL,
	[cover_image_url] [nvarchar](max) NULL,
	[is_public] [bit] NULL,
	[share_token] [nvarchar](255) NULL,
	[share_expires_at] [datetime2](7) NULL,
	[view_count] [int] NULL,
	[download_count] [int] NULL,
	[status] [nvarchar](20) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[share_token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[report_instances]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[report_instances](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[report_id] [bigint] NOT NULL,
	[generated_at] [datetime2](7) NULL,
	[generation_time_seconds] [int] NULL,
	[file_url] [nvarchar](max) NULL,
	[file_format] [nvarchar](20) NULL,
	[row_count] [int] NULL,
	[status] [nvarchar](20) NULL,
	[error_message] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[reports]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[reports](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[report_type] [nvarchar](50) NOT NULL,
	[configuration] [nvarchar](max) NOT NULL,
	[schedule_type] [nvarchar](20) NULL,
	[schedule_config] [nvarchar](max) NULL,
	[last_generated_at] [datetime2](7) NULL,
	[next_generation_at] [datetime2](7) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[resource_access_logs]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[resource_access_logs](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[resource_type] [nvarchar](50) NOT NULL,
	[resource_id] [bigint] NOT NULL,
	[user_id] [bigint] NULL,
	[tenant_id] [bigint] NULL,
	[action] [nvarchar](50) NOT NULL,
	[ip_address] [nvarchar](45) NULL,
	[user_agent] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[accessed_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[resource_permissions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[resource_permissions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[resource_type] [nvarchar](50) NOT NULL,
	[resource_id] [bigint] NOT NULL,
	[entity_type] [nvarchar](20) NOT NULL,
	[entity_id] [bigint] NOT NULL,
	[permission_type] [nvarchar](20) NOT NULL,
	[granted_by] [bigint] NOT NULL,
	[expires_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[resource_type] ASC,
	[resource_id] ASC,
	[entity_type] ASC,
	[entity_id] ASC,
	[permission_type] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[resource_shares]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[resource_shares](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[resource_type] [nvarchar](50) NOT NULL,
	[resource_id] [bigint] NOT NULL,
	[share_token] [nvarchar](255) NOT NULL,
	[share_type] [nvarchar](20) NOT NULL,
	[recipient_email] [nvarchar](320) NULL,
	[recipient_user_id] [bigint] NULL,
	[recipient_tenant_id] [bigint] NULL,
	[password_protected] [bit] NULL,
	[password_hash] [nvarchar](255) NULL,
	[requires_login] [bit] NULL,
	[allow_download] [bit] NULL,
	[expires_at] [datetime2](7) NULL,
	[max_views] [int] NULL,
	[view_count] [int] NULL,
	[revoked_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[share_token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[role_limits]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[role_limits](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[role_id] [bigint] NOT NULL,
	[limit_type] [nvarchar](50) NOT NULL,
	[limit_value] [int] NOT NULL,
	[current_usage] [int] NULL,
	[reset_period] [nvarchar](20) NULL,
	[last_reset_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[role_id] ASC,
	[limit_type] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[role_permissions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[role_permissions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[role_id] [bigint] NOT NULL,
	[permission_id] [bigint] NOT NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[role_id] ASC,
	[permission_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[roles]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[roles](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[name] [nvarchar](100) NOT NULL,
	[display_name] [nvarchar](255) NULL,
	[description] [nvarchar](max) NULL,
	[is_system_role] [bit] NULL,
	[is_default] [bit] NULL,
	[hierarchy_level] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[saved_filters]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[saved_filters](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[filter_name] [nvarchar](255) NOT NULL,
	[resource_type] [nvarchar](50) NOT NULL,
	[filter_criteria] [nvarchar](max) NOT NULL,
	[is_default] [bit] NULL,
	[is_shared] [bit] NULL,
	[shared_with] [nvarchar](max) NULL,
	[usage_count] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[security_events]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[security_events](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[user_id] [bigint] NULL,
	[event_type] [nvarchar](100) NOT NULL,
	[event_category] [nvarchar](50) NOT NULL,
	[severity] [nvarchar](20) NOT NULL,
	[description] [nvarchar](max) NOT NULL,
	[ip_address] [nvarchar](45) NULL,
	[user_agent] [nvarchar](max) NULL,
	[location] [nvarchar](max) NULL,
	[resource_type] [nvarchar](50) NULL,
	[resource_id] [bigint] NULL,
	[action_taken] [nvarchar](max) NULL,
	[risk_score] [int] NULL,
	[is_anomaly] [bit] NULL,
	[is_resolved] [bit] NULL,
	[resolved_at] [datetime2](7) NULL,
	[resolved_by] [bigint] NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[subscription_history]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[subscription_history](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[from_plan_id] [bigint] NULL,
	[to_plan_id] [bigint] NOT NULL,
	[change_type] [nvarchar](20) NOT NULL,
	[change_reason] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[subscription_plans]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[subscription_plans](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[plan_name] [nvarchar](100) NOT NULL,
	[plan_slug] [nvarchar](50) NOT NULL,
	[plan_type] [nvarchar](20) NOT NULL,
	[price_monthly] [decimal](10, 2) NULL,
	[price_yearly] [decimal](10, 2) NULL,
	[currency] [nvarchar](3) NULL,
	[trial_days] [int] NULL,
	[max_staff] [int] NULL,
	[max_storage_gb] [int] NULL,
	[max_campaigns] [int] NULL,
	[max_invitations] [int] NULL,
	[max_integrations] [int] NULL,
	[max_creators] [int] NULL,
	[max_brands] [int] NULL,
	[features] [nvarchar](max) NULL,
	[is_active] [bit] NULL,
	[sort_order] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[plan_slug] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[system_config]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[system_config](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[config_key] [nvarchar](255) NOT NULL,
	[config_value] [nvarchar](max) NULL,
	[config_type] [nvarchar](50) NULL,
	[is_encrypted] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[system_events]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[system_events](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[user_id] [bigint] NULL,
	[event_type] [nvarchar](100) NOT NULL,
	[event_name] [nvarchar](255) NOT NULL,
	[event_data] [nvarchar](max) NULL,
	[source] [nvarchar](100) NULL,
	[session_id] [bigint] NULL,
	[ip_address] [nvarchar](45) NULL,
	[user_agent] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[system_metrics]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[system_metrics](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[metric_name] [nvarchar](100) NOT NULL,
	[metric_value] [decimal](15, 4) NOT NULL,
	[metric_unit] [nvarchar](50) NULL,
	[dimensions] [nvarchar](max) NULL,
	[timestamp] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[taggables]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[taggables](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tag_id] [bigint] NOT NULL,
	[taggable_type] [nvarchar](50) NOT NULL,
	[taggable_id] [bigint] NOT NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tag_id] ASC,
	[taggable_type] ASC,
	[taggable_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tags]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tags](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NULL,
	[name] [nvarchar](100) NOT NULL,
	[slug] [nvarchar](100) NOT NULL,
	[color] [nvarchar](7) NULL,
	[icon] [nvarchar](50) NULL,
	[category] [nvarchar](100) NULL,
	[usage_count] [int] NULL,
	[is_system_tag] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[slug] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tasks]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tasks](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[task_type] [nvarchar](50) NOT NULL,
	[title] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[priority] [nvarchar](20) NULL,
	[status] [nvarchar](20) NULL,
	[assigned_to] [bigint] NULL,
	[assigned_by] [bigint] NULL,
	[related_type] [nvarchar](50) NULL,
	[related_id] [bigint] NULL,
	[due_date] [datetime2](7) NULL,
	[start_date] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[estimated_hours] [decimal](4, 2) NULL,
	[actual_hours] [decimal](4, 2) NULL,
	[tags] [nvarchar](max) NULL,
	[attachments] [nvarchar](max) NULL,
	[checklist] [nvarchar](max) NULL,
	[dependencies] [nvarchar](max) NULL,
	[recurrence_rule] [nvarchar](max) NULL,
	[parent_task_id] [bigint] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tenant_members]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tenant_members](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[user_id] [bigint] NOT NULL,
	[role_id] [bigint] NOT NULL,
	[member_type] [nvarchar](20) NOT NULL,
	[department] [nvarchar](100) NULL,
	[reports_to] [bigint] NULL,
	[joined_at] [datetime2](7) NULL,
	[left_at] [datetime2](7) NULL,
	[is_active] [bit] NULL,
	[permissions_override] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tenant_relationships]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tenant_relationships](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[primary_tenant_id] [bigint] NOT NULL,
	[related_tenant_id] [bigint] NOT NULL,
	[relationship_type] [nvarchar](50) NOT NULL,
	[permissions] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[started_at] [datetime2](7) NULL,
	[ended_at] [datetime2](7) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[primary_tenant_id] ASC,
	[related_tenant_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tenant_usage]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tenant_usage](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[metric_name] [nvarchar](100) NOT NULL,
	[metric_value] [decimal](15, 4) NULL,
	[measurement_period] [date] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[tenant_id] ASC,
	[metric_name] ASC,
	[measurement_period] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[tenants]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tenants](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_type] [nvarchar](20) NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[slug] [nvarchar](100) NOT NULL,
	[owner_user_id] [bigint] NOT NULL,
	[logo_url] [nvarchar](max) NULL,
	[subdomain] [nvarchar](100) NULL,
	[custom_domain] [nvarchar](255) NULL,
	[domain_verified_at] [datetime2](7) NULL,
	[timezone] [nvarchar](50) NULL,
	[locale] [nvarchar](10) NULL,
	[currency] [nvarchar](3) NULL,
	[settings] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[subscription_plan_id] [bigint] NULL,
	[subscription_status] [nvarchar](20) NULL,
	[is_trial] [bit] NULL,
	[trial_started_at] [datetime2](7) NULL,
	[trial_ends_at] [datetime2](7) NULL,
	[subscription_started_at] [datetime2](7) NULL,
	[subscription_expires_at] [datetime2](7) NULL,
	[max_staff] [int] NULL,
	[max_storage_gb] [int] NULL,
	[max_campaigns] [int] NULL,
	[max_invitations] [int] NULL,
	[max_creators] [int] NULL,
	[max_brands] [int] NULL,
	[current_staff] [int] NULL,
	[current_storage_gb] [decimal](10, 2) NULL,
	[current_campaigns] [int] NULL,
	[current_invitations] [int] NULL,
	[current_creators] [int] NULL,
	[current_brands] [int] NULL,
	[public_key] [nvarchar](max) NULL,
	[encrypted_private_key] [nvarchar](max) NULL,
	[key_version] [int] NULL,
	[key_created_at] [datetime2](7) NULL,
	[key_rotated_at] [datetime2](7) NULL,
	[status] [nvarchar](20) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[slug] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[user_encryption_keys]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[user_encryption_keys](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[public_key_pem] [nvarchar](max) NOT NULL,
	[encrypted_private_key_pem] [nvarchar](max) NOT NULL,
	[key_algorithm] [nvarchar](50) NULL,
	[key_encryption_algorithm] [nvarchar](50) NULL,
	[key_fingerprint] [nvarchar](64) NOT NULL,
	[key_fingerprint_short] [nvarchar](16) NOT NULL,
	[status] [nvarchar](20) NULL,
	[key_version] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[expires_at] [datetime2](7) NULL,
	[revoked_at] [datetime2](7) NULL,
	[revoke_reason] [nvarchar](max) NULL,
	[backup_encrypted_private_key] [nvarchar](max) NULL,
	[backup_created_at] [datetime2](7) NULL,
	[rotated_from_key_id] [bigint] NULL,
	[next_rotation_at] [datetime2](7) NULL,
	[rotation_required] [bit] NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[user_roles]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[user_roles](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[role_id] [bigint] NOT NULL,
	[assigned_at] [datetime2](7) NULL,
	[expires_at] [datetime2](7) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[user_id] ASC,
	[role_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[user_sessions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[user_sessions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[active_tenant_id] [bigint] NULL,
	[session_token] [nvarchar](512) NOT NULL,
	[refresh_token] [nvarchar](512) NULL,
	[device_fingerprint] [nvarchar](255) NULL,
	[device_name] [nvarchar](255) NULL,
	[device_type] [nvarchar](50) NULL,
	[browser_name] [nvarchar](100) NULL,
	[browser_version] [nvarchar](50) NULL,
	[os_name] [nvarchar](100) NULL,
	[os_version] [nvarchar](50) NULL,
	[ip_address] [nvarchar](45) NULL,
	[location] [nvarchar](max) NULL,
	[encrypted_session_key] [nvarchar](max) NULL,
	[session_key_version] [int] NULL,
	[is_active] [bit] NULL,
	[last_activity_at] [datetime2](7) NULL,
	[expires_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[refresh_token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[session_token] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[user_social_accounts]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[user_social_accounts](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NOT NULL,
	[provider] [nvarchar](50) NOT NULL,
	[provider_user_id] [nvarchar](255) NOT NULL,
	[provider_username] [nvarchar](255) NULL,
	[provider_email] [nvarchar](320) NULL,
	[access_token] [nvarchar](max) NULL,
	[refresh_token] [nvarchar](max) NULL,
	[token_expires_at] [datetime2](7) NULL,
	[profile_data] [nvarchar](max) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[provider] ASC,
	[provider_user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[users]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[users](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[email] [nvarchar](320) NOT NULL,
	[username] [nvarchar](100) NULL,
	[password_hash] [nvarchar](255) NULL,
	[user_type] [nvarchar](50) NOT NULL,
	[is_super_admin] [bit] NULL,
	[first_name] [nvarchar](100) NULL,
	[last_name] [nvarchar](100) NULL,
	[display_name] [nvarchar](200) NULL,
	[avatar_url] [nvarchar](max) NULL,
	[phone] [nvarchar](20) NULL,
	[timezone] [nvarchar](50) NULL,
	[locale] [nvarchar](10) NULL,
	[key_version] [int] NULL,
	[key_created_at] [datetime2](7) NULL,
	[key_rotated_at] [datetime2](7) NULL,
	[email_verified_at] [datetime2](7) NULL,
	[phone_verified_at] [datetime2](7) NULL,
	[onboarding_completed_at] [datetime2](7) NULL,
	[onboarding_step] [int] NULL,
	[last_login_at] [datetime2](7) NULL,
	[last_active_at] [datetime2](7) NULL,
	[login_count] [int] NULL,
	[failed_login_count] [int] NULL,
	[locked_until] [datetime2](7) NULL,
	[password_changed_at] [datetime2](7) NULL,
	[must_change_password] [bit] NULL,
	[two_factor_enabled] [bit] NULL,
	[two_factor_secret] [nvarchar](255) NULL,
	[backup_codes] [nvarchar](max) NULL,
	[preferences] [nvarchar](max) NULL,
	[metadata] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[is_system_user] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[verification_codes]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[verification_codes](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_id] [bigint] NULL,
	[email] [nvarchar](320) NULL,
	[phone] [nvarchar](20) NULL,
	[code] [nvarchar](10) NOT NULL,
	[code_type] [nvarchar](20) NOT NULL,
	[expires_at] [datetime2](7) NOT NULL,
	[used_at] [datetime2](7) NULL,
	[ip_address] [nvarchar](45) NULL,
	[attempts] [int] NULL,
	[max_attempts] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[webhook_deliveries]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[webhook_deliveries](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[webhook_id] [bigint] NOT NULL,
	[event_type] [nvarchar](100) NOT NULL,
	[event_data] [nvarchar](max) NOT NULL,
	[http_status] [int] NULL,
	[response_body] [nvarchar](max) NULL,
	[response_headers] [nvarchar](max) NULL,
	[delivery_duration_ms] [int] NULL,
	[attempt_number] [int] NULL,
	[max_attempts] [int] NULL,
	[status] [nvarchar](20) NOT NULL,
	[error_message] [nvarchar](max) NULL,
	[next_retry_at] [datetime2](7) NULL,
	[delivered_at] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[webhooks]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[webhooks](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[url] [nvarchar](max) NOT NULL,
	[secret_key] [nvarchar](255) NULL,
	[events] [nvarchar](max) NOT NULL,
	[is_active] [bit] NULL,
	[retry_attempts] [int] NULL,
	[timeout_seconds] [int] NULL,
	[last_triggered_at] [datetime2](7) NULL,
	[success_count] [int] NULL,
	[failure_count] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[workflow_executions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[workflow_executions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[workflow_id] [bigint] NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[execution_name] [nvarchar](255) NULL,
	[trigger_data] [nvarchar](max) NULL,
	[context_data] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[started_at] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[duration_seconds] [int] NULL,
	[steps_total] [int] NULL,
	[steps_completed] [int] NULL,
	[steps_failed] [int] NULL,
	[current_step_id] [bigint] NULL,
	[error_message] [nvarchar](max) NULL,
	[retry_count] [int] NULL,
	[max_retries] [int] NULL,
	[next_retry_at] [datetime2](7) NULL,
	[metadata] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[workflow_step_executions]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[workflow_step_executions](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[execution_id] [bigint] NOT NULL,
	[step_id] [nvarchar](100) NOT NULL,
	[step_name] [nvarchar](255) NULL,
	[step_type] [nvarchar](50) NOT NULL,
	[input_data] [nvarchar](max) NULL,
	[output_data] [nvarchar](max) NULL,
	[status] [nvarchar](20) NULL,
	[started_at] [datetime2](7) NULL,
	[completed_at] [datetime2](7) NULL,
	[duration_seconds] [int] NULL,
	[error_message] [nvarchar](max) NULL,
	[retry_count] [int] NULL,
	[sequence_number] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[workflows]    Script Date: 23-11-2025 11:39:34 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[workflows](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[tenant_id] [bigint] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[category] [nvarchar](100) NULL,
	[trigger_type] [nvarchar](50) NOT NULL,
	[trigger_conditions] [nvarchar](max) NULL,
	[workflow_definition] [nvarchar](max) NOT NULL,
	[variables] [nvarchar](max) NULL,
	[is_active] [bit] NULL,
	[is_template] [bit] NULL,
	[execution_count] [int] NULL,
	[success_rate] [decimal](5, 2) NULL,
	[avg_execution_time_seconds] [int] NULL,
	[last_executed_at] [datetime2](7) NULL,
	[version] [int] NULL,
	[created_at] [datetime2](7) NULL,
	[created_by] [bigint] NULL,
	[updated_at] [datetime2](7) NULL,
	[updated_by] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[activities] ADD  DEFAULT ((0)) FOR [is_read]
GO

ALTER TABLE [dbo].[activities] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[activities] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[ai_conversations] ADD  DEFAULT ('general') FOR [conversation_type]
GO

ALTER TABLE [dbo].[ai_conversations] ADD  DEFAULT ((0)) FOR [message_count]
GO

ALTER TABLE [dbo].[ai_conversations] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[ai_conversations] ADD  DEFAULT (getutcdate()) FOR [last_message_at]
GO

ALTER TABLE [dbo].[ai_conversations] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[ai_conversations] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[ai_messages] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[ai_messages] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[analytics_events] ADD  DEFAULT (getutcdate()) FOR [timestamp]
GO

ALTER TABLE [dbo].[analytics_events] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[analytics_events] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[audit_logs] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[audit_logs] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[batch_payments] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[batch_payments] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[bookmarks] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[bookmarks] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT ((1)) FOR [content_approval_required]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT ((0)) FOR [auto_approve_creators]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT ((30)) FOR [payment_terms]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT ((5.0)) FOR [rating]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT ((0)) FOR [rating_count]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT ((0)) FOR [total_campaigns]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT ((0)) FOR [total_spent]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[brand_profiles] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[calendar_events] ADD  DEFAULT ((0)) FOR [all_day]
GO

ALTER TABLE [dbo].[calendar_events] ADD  DEFAULT ((15)) FOR [reminder_minutes]
GO

ALTER TABLE [dbo].[calendar_events] ADD  DEFAULT ((0)) FOR [is_private]
GO

ALTER TABLE [dbo].[calendar_events] ADD  DEFAULT ('confirmed') FOR [status]
GO

ALTER TABLE [dbo].[calendar_events] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[calendar_events] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[campaign_participants] ADD  DEFAULT ('invited') FOR [status]
GO

ALTER TABLE [dbo].[campaign_participants] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[campaign_participants] ADD  DEFAULT ((0)) FOR [bonus_amount]
GO

ALTER TABLE [dbo].[campaign_participants] ADD  DEFAULT ('pending') FOR [payment_status]
GO

ALTER TABLE [dbo].[campaign_participants] ADD  DEFAULT ((0)) FOR [revision_count]
GO

ALTER TABLE [dbo].[campaign_participants] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[campaign_participants] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[campaign_tasks] ADD  DEFAULT ('medium') FOR [priority]
GO

ALTER TABLE [dbo].[campaign_tasks] ADD  DEFAULT ('todo') FOR [status]
GO

ALTER TABLE [dbo].[campaign_tasks] ADD  DEFAULT ((0)) FOR [comments_count]
GO

ALTER TABLE [dbo].[campaign_tasks] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[campaign_tasks] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[campaign_types] ADD  DEFAULT ((30)) FOR [default_duration_days]
GO

ALTER TABLE [dbo].[campaign_types] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[campaign_types] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[campaign_types] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((0)) FOR [budget_allocated]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((0)) FOR [budget_spent]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((0)) FOR [creator_count_assigned]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((0)) FOR [auto_approve_content]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((1)) FOR [content_approval_required]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((0)) FOR [legal_approval_required]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((90)) FOR [usage_rights_duration]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ((0)) FOR [exclusivity_period]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ('private') FOR [visibility]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ('draft') FOR [status]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT ('medium') FOR [priority]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[campaigns] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT ('group') FOR [channel_type]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT ((0)) FOR [member_count]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT ((1)) FOR [is_private]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT ((0)) FOR [is_archived]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT ((0)) FOR [message_count]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT (getutcdate()) FOR [last_activity_at]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[chat_channels] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[chat_participants] ADD  DEFAULT ('member') FOR [role]
GO

ALTER TABLE [dbo].[chat_participants] ADD  DEFAULT (getutcdate()) FOR [joined_at]
GO

ALTER TABLE [dbo].[chat_participants] ADD  DEFAULT ((0)) FOR [is_muted]
GO

ALTER TABLE [dbo].[chat_participants] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[chat_participants] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[chat_participants] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[comments] ADD  DEFAULT ((0)) FOR [is_edited]
GO

ALTER TABLE [dbo].[comments] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[comments] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[comments] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[content_access_violations] ADD  DEFAULT (getutcdate()) FOR [detected_at]
GO

ALTER TABLE [dbo].[content_access_violations] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[content_access_violations] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT ((0)) FOR [likes]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT ((0)) FOR [comments]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT ((0)) FOR [shares]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT ((0)) FOR [saves]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT ((0)) FOR [views]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT ((0)) FOR [reach]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT ((0)) FOR [impressions]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT (getutcdate()) FOR [last_updated_at]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[content_performance] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[content_review_comments] ADD  DEFAULT ('general') FOR [comment_type]
GO

ALTER TABLE [dbo].[content_review_comments] ADD  DEFAULT ((0)) FOR [is_resolved]
GO

ALTER TABLE [dbo].[content_review_comments] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[content_review_comments] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[content_reviews] ADD  DEFAULT (getutcdate()) FOR [reviewed_at]
GO

ALTER TABLE [dbo].[content_reviews] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[content_reviews] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((1)) FOR [version]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((1)) FOR [review_round]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((3)) FOR [max_review_rounds]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((0)) FOR [watermark_applied]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((0)) FOR [drm_protected]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((1)) FOR [download_protection]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((1)) FOR [screenshot_protected]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((0)) FOR [view_count]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((0)) FOR [download_count]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ((0)) FOR [share_count]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT ('submitted') FOR [status]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT (getutcdate()) FOR [submitted_at]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[content_submissions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[contract_modifications] ADD  DEFAULT ((1)) FOR [requires_approval]
GO

ALTER TABLE [dbo].[contract_modifications] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[contract_modifications] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[contract_review_rounds] ADD  DEFAULT ('in_progress') FOR [status]
GO

ALTER TABLE [dbo].[contract_review_rounds] ADD  DEFAULT ((3)) FOR [max_modifications]
GO

ALTER TABLE [dbo].[contract_review_rounds] ADD  DEFAULT ((0)) FOR [current_modifications]
GO

ALTER TABLE [dbo].[contract_review_rounds] ADD  DEFAULT (getutcdate()) FOR [started_at]
GO

ALTER TABLE [dbo].[contract_review_rounds] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[contract_review_rounds] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[contract_signatures] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[contract_signatures] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[contract_signatures] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[contract_stage_permissions] ADD  DEFAULT ((1)) FOR [can_view]
GO

ALTER TABLE [dbo].[contract_stage_permissions] ADD  DEFAULT ((0)) FOR [can_edit]
GO

ALTER TABLE [dbo].[contract_stage_permissions] ADD  DEFAULT ((1)) FOR [can_comment]
GO

ALTER TABLE [dbo].[contract_stage_permissions] ADD  DEFAULT ((0)) FOR [can_approve]
GO

ALTER TABLE [dbo].[contract_stage_permissions] ADD  DEFAULT ((0)) FOR [max_modifications]
GO

ALTER TABLE [dbo].[contract_stage_permissions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[contract_stage_permissions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT ('1.0') FOR [version]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT ((0)) FOR [is_default]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT ((0)) FOR [requires_legal_review]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT ((0)) FOR [auto_renewal]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT ((0)) FOR [usage_count]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[contract_templates] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[contract_versions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[contract_versions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT ((0)) FOR [auto_renewal]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT ((0)) FOR [renewal_count]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT ('draft') FOR [status]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT ((0)) FOR [signatures_completed]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT ((2)) FOR [signatures_required]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT ((0)) FOR [legal_reviewed]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[contracts] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[creator_availability] ADD  DEFAULT ((1)) FOR [is_available]
GO

ALTER TABLE [dbo].[creator_availability] ADD  DEFAULT ('full') FOR [availability_type]
GO

ALTER TABLE [dbo].[creator_availability] ADD  DEFAULT ((8)) FOR [hours_available]
GO

ALTER TABLE [dbo].[creator_availability] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[creator_availability] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[creator_categories] ADD  DEFAULT ((0)) FOR [level]
GO

ALTER TABLE [dbo].[creator_categories] ADD  DEFAULT ((0)) FOR [sort_order]
GO

ALTER TABLE [dbo].[creator_categories] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[creator_categories] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[creator_categories] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[creator_documents] ADD  DEFAULT ('pending') FOR [verification_status]
GO

ALTER TABLE [dbo].[creator_documents] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[creator_documents] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [followers]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [following]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [posts]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [likes]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [comments]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [shares]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [views]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [reach]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [impressions]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [saves]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [profile_visits]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT ((0)) FOR [website_clicks]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[creator_metrics] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT ((0)) FOR [follower_count_total]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT ((5.0)) FOR [rating]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT ((0)) FOR [rating_count]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT ((0)) FOR [total_campaigns]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT ((0)) FOR [completed_campaigns]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT ('available') FOR [availability_status]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT ('pending') FOR [kyc_status]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[creator_profiles] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT ('fixed') FOR [rate_type]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT ((2)) FOR [revisions_included]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT ((0)) FOR [is_negotiable]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT (CONVERT([date],getutcdate())) FOR [effective_from]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[creator_rate_cards] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [follower_count]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [following_count]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [posts_count]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [avg_likes]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [avg_comments]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [avg_shares]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [avg_views]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [is_verified]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [is_business_account]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ('pending') FOR [sync_status]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT ((0)) FOR [is_primary]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[creator_social_accounts] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT ((0)) FOR [position_x]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT ((0)) FOR [position_y]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT ((4)) FOR [width]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT ((3)) FOR [height]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT ('default') FOR [dashboard_tab]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[dashboard_widgets] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ((993)) FOR [imap_port]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ('ssl') FOR [imap_encryption]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ((587)) FOR [smtp_port]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ('tls') FOR [smtp_encryption]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ((1)) FOR [sync_enabled]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ('active') FOR [sync_status]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ((0)) FOR [is_primary]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[email_accounts] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[email_attachments] ADD  DEFAULT ((1)) FOR [is_encrypted]
GO

ALTER TABLE [dbo].[email_attachments] ADD  DEFAULT ((0)) FOR [is_inline]
GO

ALTER TABLE [dbo].[email_attachments] ADD  DEFAULT ('pending') FOR [virus_scan_status]
GO

ALTER TABLE [dbo].[email_attachments] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[email_attachments] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[email_folders] ADD  DEFAULT ((0)) FOR [message_count]
GO

ALTER TABLE [dbo].[email_folders] ADD  DEFAULT ((0)) FOR [unread_count]
GO

ALTER TABLE [dbo].[email_folders] ADD  DEFAULT ((0)) FOR [sort_order]
GO

ALTER TABLE [dbo].[email_folders] ADD  DEFAULT ((1)) FOR [is_selectable]
GO

ALTER TABLE [dbo].[email_folders] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[email_folders] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((1)) FOR [encryption_key_version]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((1)) FOR [is_encrypted]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [attachments_count]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_read]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_important]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_starred]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_draft]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_sent]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_spam]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_trash]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [is_inquiry]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT ((0)) FOR [priority_level]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[email_messages] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[email_rules] ADD  DEFAULT ((0)) FOR [priority]
GO

ALTER TABLE [dbo].[email_rules] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[email_rules] ADD  DEFAULT ((0)) FOR [execution_count]
GO

ALTER TABLE [dbo].[email_rules] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[email_rules] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[email_templates] ADD  DEFAULT ((0)) FOR [usage_count]
GO

ALTER TABLE [dbo].[email_templates] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[email_templates] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[email_templates] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[encryption_audit_logs] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[encryption_audit_logs] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[encryption_keys] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[encryption_keys] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[encryption_keys] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[error_logs] ADD  DEFAULT ('error') FOR [severity]
GO

ALTER TABLE [dbo].[error_logs] ADD  DEFAULT ((0)) FOR [resolved]
GO

ALTER TABLE [dbo].[error_logs] ADD  DEFAULT ((1)) FOR [occurrence_count]
GO

ALTER TABLE [dbo].[error_logs] ADD  DEFAULT (getutcdate()) FOR [first_occurred_at]
GO

ALTER TABLE [dbo].[error_logs] ADD  DEFAULT (getutcdate()) FOR [last_occurred_at]
GO

ALTER TABLE [dbo].[error_logs] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[error_logs] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[event_attendees] ADD  DEFAULT ('pending') FOR [response_status]
GO

ALTER TABLE [dbo].[event_attendees] ADD  DEFAULT ((0)) FOR [is_organizer]
GO

ALTER TABLE [dbo].[event_attendees] ADD  DEFAULT ((0)) FOR [is_optional]
GO

ALTER TABLE [dbo].[event_attendees] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[event_attendees] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[file_processing_jobs] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[file_processing_jobs] ADD  DEFAULT ((0)) FOR [progress_percent]
GO

ALTER TABLE [dbo].[file_processing_jobs] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[file_processing_jobs] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[file_shares] ADD  DEFAULT ((0)) FOR [download_count]
GO

ALTER TABLE [dbo].[file_shares] ADD  DEFAULT ((0)) FOR [access_count]
GO

ALTER TABLE [dbo].[file_shares] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[file_shares] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[file_shares] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT ('/') FOR [folder_path]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT ((0)) FOR [is_public]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT ((0)) FOR [is_temporary]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT ((0)) FOR [download_count]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT ('pending') FOR [virus_scan_status]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT ('pending') FOR [processing_status]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT ((0)) FOR [is_encrypted]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[files] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT ((0)) FOR [total_revenue]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT ((0)) FOR [total_expenses]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT ((0)) FOR [total_profit]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT ((0)) FOR [creator_payments]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT ((0)) FOR [platform_fees]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT ((0)) FOR [tax_amount]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT (getutcdate()) FOR [generated_at]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[financial_reports] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[integrations] ADD  DEFAULT ('active') FOR [status]
GO

ALTER TABLE [dbo].[integrations] ADD  DEFAULT ((60)) FOR [sync_frequency_minutes]
GO

ALTER TABLE [dbo].[integrations] ADD  DEFAULT ((0)) FOR [error_count]
GO

ALTER TABLE [dbo].[integrations] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[integrations] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[integrations] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[invitations] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[invitations] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[invitations] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[invoice_items] ADD  DEFAULT ((1)) FOR [quantity]
GO

ALTER TABLE [dbo].[invoice_items] ADD  DEFAULT ((0)) FOR [discount_percent]
GO

ALTER TABLE [dbo].[invoice_items] ADD  DEFAULT ((0)) FOR [discount_amount]
GO

ALTER TABLE [dbo].[invoice_items] ADD  DEFAULT ((0)) FOR [tax_rate]
GO

ALTER TABLE [dbo].[invoice_items] ADD  DEFAULT ((0)) FOR [tax_amount]
GO

ALTER TABLE [dbo].[invoice_items] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[invoice_items] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ((0)) FOR [subtotal]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ((0)) FOR [tax_amount]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ((0)) FOR [discount_amount]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ((1)) FOR [exchange_rate]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ((30)) FOR [payment_terms]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT (CONVERT([date],getutcdate())) FOR [issue_date]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ('draft') FOR [status]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ((0)) FOR [late_fee_amount]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT ((0)) FOR [reminder_sent_count]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[invoices] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[key_rotation_schedule] ADD  DEFAULT ((90)) FOR [rotation_frequency_days]
GO

ALTER TABLE [dbo].[key_rotation_schedule] ADD  DEFAULT ((1)) FOR [auto_rotate]
GO

ALTER TABLE [dbo].[key_rotation_schedule] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[key_rotation_schedule] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[key_rotation_schedule] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[menu_permissions] ADD  DEFAULT ((1)) FOR [is_required]
GO

ALTER TABLE [dbo].[menu_permissions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[menu_permissions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[message_attachments] ADD  DEFAULT ('pending') FOR [virus_scan_status]
GO

ALTER TABLE [dbo].[message_attachments] ADD  DEFAULT ((0)) FOR [download_count]
GO

ALTER TABLE [dbo].[message_attachments] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[message_attachments] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[message_attachments] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[message_queue] ADD  DEFAULT (getutcdate()) FOR [queued_at]
GO

ALTER TABLE [dbo].[message_reactions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[message_reactions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[message_read_receipts] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT ('text') FOR [message_type]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT ((0)) FOR [has_attachments]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT ((0)) FOR [has_mentions]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT ((0)) FOR [is_edited]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT ((0)) FOR [is_deleted]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT ((0)) FOR [is_pinned]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT (getutcdate()) FOR [sent_at]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[messages] ADD  DEFAULT ((0)) FOR [reply_count]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT ('markdown') FOR [content_type]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT ((0)) FOR [is_pinned]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT ((0)) FOR [is_archived]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT ('/') FOR [folder_path]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT ((0)) FOR [is_encrypted]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT (getutcdate()) FOR [last_edited_at]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[notes] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[notification_preferences] ADD  DEFAULT ((1)) FOR [email_enabled]
GO

ALTER TABLE [dbo].[notification_preferences] ADD  DEFAULT ((0)) FOR [sms_enabled]
GO

ALTER TABLE [dbo].[notification_preferences] ADD  DEFAULT ((1)) FOR [push_enabled]
GO

ALTER TABLE [dbo].[notification_preferences] ADD  DEFAULT ((1)) FOR [in_app_enabled]
GO

ALTER TABLE [dbo].[notification_preferences] ADD  DEFAULT ('immediate') FOR [frequency]
GO

ALTER TABLE [dbo].[notification_preferences] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[notification_preferences] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[notification_templates] ADD  DEFAULT ((0)) FOR [is_system_template]
GO

ALTER TABLE [dbo].[notification_templates] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[notification_templates] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[notification_templates] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[notifications] ADD  DEFAULT ('normal') FOR [priority]
GO

ALTER TABLE [dbo].[notifications] ADD  DEFAULT (getutcdate()) FOR [scheduled_at]
GO

ALTER TABLE [dbo].[notifications] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[notifications] ADD  DEFAULT ((0)) FOR [retry_count]
GO

ALTER TABLE [dbo].[notifications] ADD  DEFAULT ((3)) FOR [max_retries]
GO

ALTER TABLE [dbo].[notifications] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[notifications] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[password_reset_tokens] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[password_reset_tokens] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[payment_methods] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[payment_methods] ADD  DEFAULT ((0)) FOR [is_default]
GO

ALTER TABLE [dbo].[payment_methods] ADD  DEFAULT ((0)) FOR [is_verified]
GO

ALTER TABLE [dbo].[payment_methods] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[payment_methods] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT ((1)) FOR [exchange_rate]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT ((0)) FOR [fee_amount]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT ((0)) FOR [gateway_fee]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT (getutcdate()) FOR [initiated_at]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT ((0)) FOR [retry_count]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT ('pending') FOR [reconciliation_status]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[payments] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT ('creator_payout') FOR [batch_type]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT ((0)) FOR [payment_count]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT ((0)) FOR [successful_payments]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT ((0)) FOR [failed_payments]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT ((0)) FOR [processing_fee]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT ('draft') FOR [status]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[payout_batches] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[permissions] ADD  DEFAULT ((0)) FOR [is_system_permission]
GO

ALTER TABLE [dbo].[permissions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[permissions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[portfolio_selections] ADD  DEFAULT (getutcdate()) FOR [selection_date]
GO

ALTER TABLE [dbo].[portfolio_selections] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[portfolio_selections] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[portfolio_selections] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[portfolio_shares] ADD  DEFAULT ((0)) FOR [view_count]
GO

ALTER TABLE [dbo].[portfolio_shares] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[portfolio_shares] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[portfolio_shares] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[portfolio_templates] ADD  DEFAULT ((0)) FOR [is_default]
GO

ALTER TABLE [dbo].[portfolio_templates] ADD  DEFAULT ((0)) FOR [is_public]
GO

ALTER TABLE [dbo].[portfolio_templates] ADD  DEFAULT ((0)) FOR [usage_count]
GO

ALTER TABLE [dbo].[portfolio_templates] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[portfolio_templates] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[portfolios] ADD  DEFAULT ((0)) FOR [total_reach]
GO

ALTER TABLE [dbo].[portfolios] ADD  DEFAULT ((0)) FOR [is_public]
GO

ALTER TABLE [dbo].[portfolios] ADD  DEFAULT ((0)) FOR [view_count]
GO

ALTER TABLE [dbo].[portfolios] ADD  DEFAULT ((0)) FOR [download_count]
GO

ALTER TABLE [dbo].[portfolios] ADD  DEFAULT ('draft') FOR [status]
GO

ALTER TABLE [dbo].[portfolios] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[portfolios] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[report_instances] ADD  DEFAULT (getutcdate()) FOR [generated_at]
GO

ALTER TABLE [dbo].[report_instances] ADD  DEFAULT ('completed') FOR [status]
GO

ALTER TABLE [dbo].[report_instances] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[report_instances] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[reports] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[reports] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[reports] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[resource_access_logs] ADD  DEFAULT (getutcdate()) FOR [accessed_at]
GO

ALTER TABLE [dbo].[resource_permissions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[resource_permissions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[resource_shares] ADD  DEFAULT ((0)) FOR [password_protected]
GO

ALTER TABLE [dbo].[resource_shares] ADD  DEFAULT ((1)) FOR [requires_login]
GO

ALTER TABLE [dbo].[resource_shares] ADD  DEFAULT ((0)) FOR [allow_download]
GO

ALTER TABLE [dbo].[resource_shares] ADD  DEFAULT ((0)) FOR [view_count]
GO

ALTER TABLE [dbo].[resource_shares] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[resource_shares] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[role_limits] ADD  DEFAULT ((0)) FOR [current_usage]
GO

ALTER TABLE [dbo].[role_limits] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[role_limits] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[role_permissions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[role_permissions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ((0)) FOR [is_system_role]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ((0)) FOR [is_default]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT ((0)) FOR [hierarchy_level]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[roles] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[saved_filters] ADD  DEFAULT ((0)) FOR [is_default]
GO

ALTER TABLE [dbo].[saved_filters] ADD  DEFAULT ((0)) FOR [is_shared]
GO

ALTER TABLE [dbo].[saved_filters] ADD  DEFAULT ((0)) FOR [usage_count]
GO

ALTER TABLE [dbo].[saved_filters] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[saved_filters] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[security_events] ADD  DEFAULT ((0)) FOR [risk_score]
GO

ALTER TABLE [dbo].[security_events] ADD  DEFAULT ((0)) FOR [is_anomaly]
GO

ALTER TABLE [dbo].[security_events] ADD  DEFAULT ((0)) FOR [is_resolved]
GO

ALTER TABLE [dbo].[security_events] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[security_events] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[subscription_history] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[subscription_history] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((14)) FOR [trial_days]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((5)) FOR [max_staff]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((10)) FOR [max_storage_gb]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((10)) FOR [max_campaigns]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((20)) FOR [max_invitations]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((5)) FOR [max_integrations]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((100)) FOR [max_creators]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((50)) FOR [max_brands]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT ((0)) FOR [sort_order]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[subscription_plans] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[system_config] ADD  DEFAULT ('string') FOR [config_type]
GO

ALTER TABLE [dbo].[system_config] ADD  DEFAULT ((0)) FOR [is_encrypted]
GO

ALTER TABLE [dbo].[system_config] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[system_config] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[system_events] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[system_events] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[system_metrics] ADD  DEFAULT (getutcdate()) FOR [timestamp]
GO

ALTER TABLE [dbo].[system_metrics] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[system_metrics] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[taggables] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[taggables] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[tags] ADD  DEFAULT ((0)) FOR [usage_count]
GO

ALTER TABLE [dbo].[tags] ADD  DEFAULT ((0)) FOR [is_system_tag]
GO

ALTER TABLE [dbo].[tags] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[tags] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[tasks] ADD  DEFAULT ('medium') FOR [priority]
GO

ALTER TABLE [dbo].[tasks] ADD  DEFAULT ('todo') FOR [status]
GO

ALTER TABLE [dbo].[tasks] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[tasks] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[tenant_members] ADD  DEFAULT ('staff') FOR [member_type]
GO

ALTER TABLE [dbo].[tenant_members] ADD  DEFAULT (getutcdate()) FOR [joined_at]
GO

ALTER TABLE [dbo].[tenant_members] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[tenant_members] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[tenant_members] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[tenant_relationships] ADD  DEFAULT ('active') FOR [status]
GO

ALTER TABLE [dbo].[tenant_relationships] ADD  DEFAULT (getutcdate()) FOR [started_at]
GO

ALTER TABLE [dbo].[tenant_relationships] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[tenant_relationships] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[tenant_usage] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[tenant_usage] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ('UTC') FOR [timezone]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ('en-US') FOR [locale]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ('USD') FOR [currency]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ('trial') FOR [subscription_status]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((1)) FOR [is_trial]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((5)) FOR [max_staff]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((10)) FOR [max_storage_gb]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((10)) FOR [max_campaigns]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((20)) FOR [max_invitations]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((100)) FOR [max_creators]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((50)) FOR [max_brands]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((0)) FOR [current_staff]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((0)) FOR [current_storage_gb]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((0)) FOR [current_campaigns]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((0)) FOR [current_invitations]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((0)) FOR [current_creators]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((0)) FOR [current_brands]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((1)) FOR [key_version]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ('active') FOR [status]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[tenants] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[user_encryption_keys] ADD  DEFAULT ('RSA-4096') FOR [key_algorithm]
GO

ALTER TABLE [dbo].[user_encryption_keys] ADD  DEFAULT ('AES-256-GCM') FOR [key_encryption_algorithm]
GO

ALTER TABLE [dbo].[user_encryption_keys] ADD  DEFAULT ('active') FOR [status]
GO

ALTER TABLE [dbo].[user_encryption_keys] ADD  DEFAULT ((1)) FOR [key_version]
GO

ALTER TABLE [dbo].[user_encryption_keys] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[user_encryption_keys] ADD  DEFAULT ((0)) FOR [rotation_required]
GO

ALTER TABLE [dbo].[user_encryption_keys] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[user_roles] ADD  DEFAULT (getutcdate()) FOR [assigned_at]
GO

ALTER TABLE [dbo].[user_roles] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[user_roles] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[user_roles] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[user_sessions] ADD  DEFAULT ((1)) FOR [session_key_version]
GO

ALTER TABLE [dbo].[user_sessions] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[user_sessions] ADD  DEFAULT (getutcdate()) FOR [last_activity_at]
GO

ALTER TABLE [dbo].[user_sessions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[user_sessions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[user_social_accounts] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[user_social_accounts] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[user_social_accounts] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ('pending') FOR [user_type]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [is_super_admin]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ('UTC') FOR [timezone]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ('en-US') FOR [locale]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((1)) FOR [key_version]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [onboarding_step]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [login_count]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [failed_login_count]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [must_change_password]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [two_factor_enabled]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT ((0)) FOR [is_system_user]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[users] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[verification_codes] ADD  DEFAULT ((0)) FOR [attempts]
GO

ALTER TABLE [dbo].[verification_codes] ADD  DEFAULT ((5)) FOR [max_attempts]
GO

ALTER TABLE [dbo].[verification_codes] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[verification_codes] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[webhook_deliveries] ADD  DEFAULT ((1)) FOR [attempt_number]
GO

ALTER TABLE [dbo].[webhook_deliveries] ADD  DEFAULT ((3)) FOR [max_attempts]
GO

ALTER TABLE [dbo].[webhook_deliveries] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[webhook_deliveries] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[webhooks] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[webhooks] ADD  DEFAULT ((3)) FOR [retry_attempts]
GO

ALTER TABLE [dbo].[webhooks] ADD  DEFAULT ((30)) FOR [timeout_seconds]
GO

ALTER TABLE [dbo].[webhooks] ADD  DEFAULT ((0)) FOR [success_count]
GO

ALTER TABLE [dbo].[webhooks] ADD  DEFAULT ((0)) FOR [failure_count]
GO

ALTER TABLE [dbo].[webhooks] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[webhooks] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT ('running') FOR [status]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT (getutcdate()) FOR [started_at]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT ((0)) FOR [steps_total]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT ((0)) FOR [steps_completed]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT ((0)) FOR [steps_failed]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT ((0)) FOR [retry_count]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT ((3)) FOR [max_retries]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[workflow_executions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[workflow_step_executions] ADD  DEFAULT ('pending') FOR [status]
GO

ALTER TABLE [dbo].[workflow_step_executions] ADD  DEFAULT ((0)) FOR [retry_count]
GO

ALTER TABLE [dbo].[workflow_step_executions] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[workflow_step_executions] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[workflows] ADD  DEFAULT ((1)) FOR [is_active]
GO

ALTER TABLE [dbo].[workflows] ADD  DEFAULT ((0)) FOR [is_template]
GO

ALTER TABLE [dbo].[workflows] ADD  DEFAULT ((0)) FOR [execution_count]
GO

ALTER TABLE [dbo].[workflows] ADD  DEFAULT ((1)) FOR [version]
GO

ALTER TABLE [dbo].[workflows] ADD  DEFAULT (getutcdate()) FOR [created_at]
GO

ALTER TABLE [dbo].[workflows] ADD  DEFAULT (getutcdate()) FOR [updated_at]
GO

ALTER TABLE [dbo].[ai_messages]  WITH CHECK ADD CHECK  (([feedback_rating]>=(1) AND [feedback_rating]<=(5)))
GO

ALTER TABLE [dbo].[ai_messages]  WITH CHECK ADD CHECK  (([sender_type]='assistant' OR [sender_type]='user'))
GO

ALTER TABLE [dbo].[content_reviews]  WITH CHECK ADD CHECK  (([brand_alignment_rating]>=(1) AND [brand_alignment_rating]<=(5)))
GO

ALTER TABLE [dbo].[content_reviews]  WITH CHECK ADD CHECK  (([creativity_rating]>=(1) AND [creativity_rating]<=(5)))
GO

ALTER TABLE [dbo].[content_reviews]  WITH CHECK ADD CHECK  (([overall_rating]>=(1) AND [overall_rating]<=(5)))
GO

ALTER TABLE [dbo].[content_reviews]  WITH CHECK ADD CHECK  (([quality_rating]>=(1) AND [quality_rating]<=(5)))
GO

ALTER TABLE [dbo].[subscription_plans]  WITH CHECK ADD CHECK  (([plan_type]='creator' OR [plan_type]='brand' OR [plan_type]='agency'))
GO

ALTER TABLE [dbo].[tenants]  WITH CHECK ADD CHECK  (([tenant_type]='creator' OR [tenant_type]='brand' OR [tenant_type]='agency'))
GO




USE [fluera_new_structure]
GO

/****** Object:  StoredProcedure [dbo].[sp_CheckResourcePermission]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

 -- ✅ CHANGE: Make @tenantId nullable
CREATE   PROCEDURE [dbo].[sp_CheckResourcePermission]
    @userId BIGINT,
    @tenantId BIGINT = NULL, -- ✅ NOW NULLABLE
    @resourceType NVARCHAR(50),
    @resourceId BIGINT,
    @permissionType NVARCHAR(20)
AS
BEGIN
    -- ✅ For NULL tenantId (global admins), check global permissions only
    IF @tenantId IS NULL
    BEGIN
        -- Check only direct user permissions (no tenant filtering)
        SELECT COUNT(*) as has_permission
        FROM resource_permissions
        WHERE resource_type = @resourceType
          AND resource_id = @resourceId
          AND entity_type = 'user'
          AND entity_id = @userId
          AND permission_type = @permissionType
          AND (expires_at IS NULL OR expires_at > GETUTCDATE());
          
        RETURN;
    END
    
    -- Regular tenant-based permission check (existing logic)
    -- ...
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CleanupExpiredSessions]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 15. Cleanup Expired Sessions
-- ============================================
CREATE     PROCEDURE [dbo].[sp_CleanupExpiredSessions]
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE user_sessions
    SET is_active = 0
    WHERE expires_at < GETUTCDATE() AND is_active = 1;

    SELECT @@ROWCOUNT AS sessions_cleaned;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateAuditLog]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 8. Create Audit Log
-- ============================================
CREATE     PROCEDURE [dbo].[sp_CreateAuditLog]
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

/****** Object:  StoredProcedure [dbo].[sp_CreateChannel_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[sp_CreateChannel_Fast]
    @tenantId BIGINT,
    @userId BIGINT,
    @name NVARCHAR(255),
    @channelType NVARCHAR(20),
    @participantIds NVARCHAR(MAX),
    @description NVARCHAR(MAX) = NULL,
    @isPrivate BIT = 1,
    @relatedType NVARCHAR(50) = NULL,
    @relatedId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @channelId BIGINT;
    
    BEGIN TRANSACTION;
    
    -- Create channel
    INSERT INTO chat_channels (
        created_by_tenant_id, name, description, channel_type,
        related_type, related_id, participant_tenant_ids, is_private,
        created_at, created_by, updated_at, updated_by
    )
    VALUES (
        @tenantId, @name, @description, @channelType,
        @relatedType, @relatedId, @participantIds, @isPrivate,
        GETUTCDATE(), @userId, GETUTCDATE(), @userId
    );
    
    SET @channelId = SCOPE_IDENTITY();
    
    -- Add participants (ensuring no duplicates)
    WITH DistinctParticipants AS (
        SELECT DISTINCT CAST(value AS BIGINT) AS user_id
        FROM STRING_SPLIT(@participantIds, ',')
        WHERE RTRIM(value) <> '' 
        AND ISNUMERIC(value) = 1
    )
    INSERT INTO chat_participants (channel_id, tenant_id, user_id, role, created_at, created_by, updated_at, updated_by)
    SELECT 
        @channelId,
        @tenantId,
        dp.user_id,
        CASE WHEN dp.user_id = @userId THEN 'owner' ELSE 'member' END,
        GETUTCDATE(),
        @userId,
        GETUTCDATE(),
        @userId
    FROM DistinctParticipants dp
    WHERE NOT EXISTS (
        SELECT 1 
        FROM chat_participants cp
        WHERE cp.channel_id = @channelId 
        AND cp.user_id = dp.user_id
    );
    
    -- Update member count
    UPDATE chat_channels
    SET member_count = (
        SELECT COUNT(*) 
        FROM chat_participants 
        WHERE channel_id = @channelId AND is_active = 1
    )
    WHERE id = @channelId;
    
    COMMIT TRANSACTION;
    
    SELECT @channelId as channel_id;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateChatNotification]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- 3. Create notification helper procedure
CREATE   PROCEDURE [dbo].[sp_CreateChatNotification]
    @recipientId BIGINT,
    @tenantId BIGINT,
    @eventType NVARCHAR(100),
    @message NVARCHAR(MAX),
    @data NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO notifications (
        recipient_id, tenant_id, event_type, channel, 
        message, data, priority, status, created_at
    )
    VALUES (
        @recipientId, @tenantId, @eventType, 'in_app',
        @message, @data, 'normal', 'pending', GETUTCDATE()
    );
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateErrorLog]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



CREATE   PROCEDURE [dbo].[sp_CreateErrorLog]
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

/****** Object:  StoredProcedure [dbo].[sp_CreateNotification]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ==================== NOTIFICATIONS ====================

-- SP: Create Notification
-- FIX: Changed user_id to recipient_id and added event_type, channel
CREATE     PROCEDURE [dbo].[sp_CreateNotification]
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

/****** Object:  StoredProcedure [dbo].[sp_CreateReadReceiptsBulk_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== 4. CREATE READ RECEIPTS (BULK) ====================
CREATE PROCEDURE [dbo].[sp_CreateReadReceiptsBulk_Fast]
    @messageId BIGINT,
    @channelId BIGINT,
    @senderId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO message_read_receipts (message_id, user_id, status, created_at)
    SELECT 
        @messageId,
        user_id,
        'sent',
        SYSUTCDATETIME()
    FROM chat_participants WITH (NOLOCK)
    WHERE channel_id = @channelId
    AND user_id != @senderId
    AND is_active = 1;
    
    SELECT @@ROWCOUNT as receipts_created;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateSecurityEvent]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- =====================================================
-- MISSING STORED PROCEDURES
-- =====================================================

-- SP: Create Security Event
CREATE     PROCEDURE [dbo].[sp_CreateSecurityEvent]
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

/****** Object:  StoredProcedure [dbo].[sp_CreateSystemEvent]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ==================== SYSTEM EVENTS ====================

-- SP: Create System Event
-- FIX: Changed severity parameter name from @severity to match column
CREATE     PROCEDURE [dbo].[sp_CreateSystemEvent]
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

/****** Object:  StoredProcedure [dbo].[sp_CreateTenant]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


CREATE   PROCEDURE [dbo].[sp_CreateTenant]
    @tenant_type NVARCHAR(20),
    @name NVARCHAR(255),
    @slug NVARCHAR(100),
    @owner_user_id BIGINT,
    @timezone NVARCHAR(50) = 'UTC',
    @locale NVARCHAR(10) = 'en-US',
    @metadata NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @tenantId BIGINT;
        DECLARE @defaultRole NVARCHAR(50);
        DECLARE @ownerRoleId BIGINT;

        ----------------------------------------------
        -- 1️⃣ Create Tenant
        ----------------------------------------------
        INSERT INTO [dbo].[tenants] (
            tenant_type, name, slug, owner_user_id,
            timezone, locale, metadata, status,
            created_at, created_by
        )
        VALUES (
            @tenant_type, @name, @slug, @owner_user_id,
            @timezone, @locale, @metadata, 'active',
            GETUTCDATE(), @owner_user_id
        );

        SET @tenantId = SCOPE_IDENTITY();

        ----------------------------------------------
        -- 2️⃣ Determine Default Owner Role
        ----------------------------------------------
        SET @defaultRole = (
            CASE 
                WHEN @tenant_type = 'agency' THEN 'agency_admin'
                WHEN @tenant_type = 'brand' THEN 'brand_admin'
                WHEN @tenant_type = 'creator' THEN 'creator_admin'
                ELSE 'super_admin'
            END
        );

        ----------------------------------------------
        -- 3️⃣ Fetch Role ID
        ----------------------------------------------
        SELECT TOP 1 @ownerRoleId = id
        FROM [dbo].[roles]
        WHERE name = @defaultRole AND is_system_role = 1;

        ----------------------------------------------
        -- 4️⃣ Add Owner in tenant_members
        ----------------------------------------------
        INSERT INTO [dbo].[tenant_members] (
            tenant_id, user_id, role_id, member_type, joined_at, created_at
        )
        VALUES (
            @tenantId, @owner_user_id, @ownerRoleId,
            @tenant_type, GETUTCDATE(), GETUTCDATE()
        );

        ----------------------------------------------
        -- 5️⃣ Assign Role in user_roles (Idempotent)
        ----------------------------------------------
        IF NOT EXISTS (
            SELECT 1 
            FROM [dbo].[user_roles]
            WHERE user_id = @owner_user_id 
              AND role_id = @ownerRoleId
        )
        BEGIN
            INSERT INTO [dbo].[user_roles] (
                user_id, role_id, created_by, updated_by
            )
            VALUES (
                @owner_user_id, @ownerRoleId,
                @owner_user_id, @owner_user_id
            );
        END

        ----------------------------------------------
        -- 6️⃣ Return created tenant
        ----------------------------------------------
        SELECT * 
        FROM [dbo].[tenants] 
        WHERE id = @tenantId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateUser]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



 CREATE        PROCEDURE [dbo].[sp_CreateUser]
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
        key_version, key_created_at,
        created_at, created_by
    )
    OUTPUT INSERTED.*
    VALUES (
        @email, @password_hash, @first_name, @last_name,
        CONCAT(ISNULL(@first_name, ''), ' ', ISNULL(@last_name, '')), 
        @user_type, 'pending',
        1, GETUTCDATE(),
        GETUTCDATE(), @created_by
    );
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateUserEncryptionKey]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- Create procedure to create/update user encryption key
CREATE   PROCEDURE [dbo].[sp_CreateUserEncryptionKey]
    @UserId BIGINT,
    @PublicKeyPem NVARCHAR(MAX),
    @EncryptedPrivateKeyPem NVARCHAR(MAX),
    @BackupEncryptedPrivateKey NVARCHAR(MAX) = NULL,
    @CreatedBy BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Deactivate existing keys
        UPDATE [dbo].[user_encryption_keys]
        SET status = 'inactive',
            updated_at = GETUTCDATE()
        WHERE user_id = @UserId
        AND status = 'active';
        -- Calculate fingerprints
        DECLARE @KeyFingerprint NVARCHAR(64) = SUBSTRING(CONVERT(NVARCHAR(MAX), HASHBYTES('SHA2_256', @PublicKeyPem), 2), 1, 64);
        DECLARE @KeyFingerprintShort NVARCHAR(16) = SUBSTRING(@KeyFingerprint, 1, 16);
        -- Insert new key
        INSERT INTO [dbo].[user_encryption_keys] (
            user_id,
            public_key_pem,
            encrypted_private_key_pem,
            key_fingerprint,
            key_fingerprint_short,
            backup_encrypted_private_key,
            backup_created_at,
            status,
            key_version,
            created_at,
            created_by
        )
        VALUES (
            @UserId,
            @PublicKeyPem,
            @EncryptedPrivateKeyPem,
            @KeyFingerprint,
            @KeyFingerprintShort,
            @BackupEncryptedPrivateKey,
            CASE WHEN @BackupEncryptedPrivateKey IS NOT NULL THEN GETUTCDATE() ELSE NULL END,
            'active',
            ISNULL((SELECT MAX(key_version) FROM [dbo].[user_encryption_keys] WHERE user_id = @UserId), 0) + 1,
            GETUTCDATE(),
            COALESCE(@CreatedBy, @UserId)
        );
        SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS KeyId;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateUserSession]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- SP: Create User Session
-- FIX: Removed session_type and tenant_id parameters that don't exist in table
CREATE     PROCEDURE [dbo].[sp_CreateUserSession]
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

/****** Object:  StoredProcedure [dbo].[sp_CreateVerificationCode]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ==================== VERIFICATION CODES ====================

-- SP: Create Verification Code
CREATE     PROCEDURE [dbo].[sp_CreateVerificationCode]
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

/****** Object:  StoredProcedure [dbo].[sp_DeleteEmailTemplate]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 5. Delete Email Template
-- ============================================
CREATE     PROCEDURE [dbo].[sp_DeleteEmailTemplate]
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

/****** Object:  StoredProcedure [dbo].[sp_EndUserSession]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- SP: End User Session
-- FIX: Changed logged_out_at to use updated_at (column doesn't exist in table)
CREATE     PROCEDURE [dbo].[sp_EndUserSession]
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

/****** Object:  StoredProcedure [dbo].[sp_GetActiveSession]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- SP: Get Active Session
CREATE     PROCEDURE [dbo].[sp_GetActiveSession]
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

/****** Object:  StoredProcedure [dbo].[sp_GetAuditLogs]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


CREATE     PROCEDURE [dbo].[sp_GetAuditLogs]
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

/****** Object:  StoredProcedure [dbo].[sp_GetChannelMembers_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== 6. GET CHANNEL MEMBERS ====================
CREATE PROCEDURE [dbo].[sp_GetChannelMembers_Fast]
    @channelId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT user_id
    FROM chat_participants WITH (NOLOCK)
    WHERE channel_id = @channelId
    AND is_active = 1;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetEmailTemplate]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO






-- ============================================
-- 2. Get Email Template
-- ============================================
CREATE     PROCEDURE [dbo].[sp_GetEmailTemplate]
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

/****** Object:  StoredProcedure [dbo].[sp_GetMessages_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== 2. GET MESSAGES ====================
CREATE PROCEDURE [dbo].[sp_GetMessages_Fast]
    @channelId BIGINT,
    @limit INT = 50,
    @beforeId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@limit)
        m.id,
        m.sender_user_id,
        m.message_type,
        m.content, -- ✅ Plain text
        m.has_attachments,
        m.has_mentions,
        m.reply_to_message_id,
        m.thread_id,
        m.sent_at,
        m.is_edited,
        m.edited_at,
        u.first_name,
        u.last_name,
        u.avatar_url,
        ISNULL((SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id), 0) as reaction_count
    FROM messages m WITH (NOLOCK)
    INNER JOIN users u WITH (NOLOCK) ON m.sender_user_id = u.id
    WHERE m.channel_id = @channelId
    AND m.is_deleted = 0
    AND (@beforeId IS NULL OR m.id < @beforeId)
    ORDER BY m.sent_at DESC;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetOrganizationTemplates]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 4. Get Tenant Templates
-- ============================================
CREATE     PROCEDURE [dbo].[sp_GetOrganizationTemplates]
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

/****** Object:  StoredProcedure [dbo].[sp_GetSystemConfigByKey]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ==================== SYSTEM CONFIG ====================

-- SP: Get System Config by Key
-- FIX: Removed environment parameter (doesn't exist in query)
CREATE     PROCEDURE [dbo].[sp_GetSystemConfigByKey]
    @config_key NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT *
    FROM [dbo].[system_config]
    WHERE config_key = @config_key;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetTenantMembers]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 11. Get Tenant Members with Roles
-- ============================================
CREATE     PROCEDURE [dbo].[sp_GetTenantMembers]
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

/****** Object:  StoredProcedure [dbo].[sp_GetTenantUsageStats]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 13. Get Tenant Usage Stats
-- ============================================
CREATE     PROCEDURE [dbo].[sp_GetTenantUsageStats]
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

/****** Object:  StoredProcedure [dbo].[sp_GetUnreadCount_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== 8. GET UNREAD COUNT ====================
CREATE PROCEDURE [dbo].[sp_GetUnreadCount_Fast]
    @userId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT COUNT(*) as unread_count
    FROM chat_participants cp WITH (NOLOCK)
    INNER JOIN messages m WITH (NOLOCK) 
        ON m.channel_id = cp.channel_id
    WHERE cp.user_id = @userId
    AND cp.is_active = 1
    AND m.sent_at > ISNULL(cp.last_read_at, '1900-01-01')
    AND m.sender_user_id != @userId
    AND m.is_deleted = 0;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserAccessibleMenus]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ============================================
-- FIXED: sp_GetUserAccessibleMenus - Production Ready
-- Handles ALL user types correctly with proper menu filtering
-- ============================================

CREATE     PROCEDURE [dbo].[sp_GetUserAccessibleMenus]
    @userId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 🔍 Get user details with proper type checking
    DECLARE @userType NVARCHAR(50);
    DECLARE @isSuperAdmin BIT = 0;
    DECLARE @tenantId INT = NULL;

    SELECT 
        @userType = u.user_type,
        @isSuperAdmin = ISNULL(u.is_super_admin, 0),
        @tenantId = tm.tenant_id
    FROM users u
    LEFT JOIN tenant_members tm ON u.id = tm.user_id AND tm.is_active = 1
    WHERE u.id = @userId;

    -- ✅ Check if user exists
    IF @userType IS NULL
    BEGIN
        RAISERROR('User not found', 16, 1);
        RETURN;
    END;

    -- 📊 RESULT SET 1: User's Effective Permissions
    -- Super admins get ALL permissions, others get role-based
    IF @isSuperAdmin = 1 OR @userType IN ('super_admin', 'owner')
    BEGIN
        -- Super admin: ALL permissions
        SELECT DISTINCT
            p.id,
            p.permission_key,
            p.resource,
            p.action,
            p.category,
            p.description,
            1 as is_super_admin
        FROM permissions p        
        ORDER BY p.category, p.resource, p.action;
    END
    ELSE
    BEGIN
        -- Regular users: Role-based permissions
        SELECT DISTINCT
            p.id,
            p.permission_key,
            p.resource,
            p.action,
            p.category,
            p.description,
            0 as is_super_admin
        FROM user_roles ur
        INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = @userId 
            AND ur.is_active = 1
        ORDER BY p.category, p.resource, p.action;
    END;

    -- 📊 RESULT SET 2: Accessible Menus (with proper hierarchy)
    -- Super admins see ALL menus, others see only permitted ones
    IF @isSuperAdmin = 1 OR @userType IN ('super_admin', 'owner')
    BEGIN
        -- Super admin: ALL menus
        SELECT DISTINCT
            mp.menu_key,
            mp.is_required,
            1 as has_access,
            'Super Admin - Full Access' as access_reason
        FROM menu_permissions mp
        ORDER BY mp.menu_key;
    END
    ELSE
    BEGIN
        -- Regular users: Check each menu's required permissions
        WITH UserPermissionKeys AS (
            SELECT DISTINCT p.permission_key
            FROM user_roles ur
            INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
            INNER JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = @userId 
                AND ur.is_active = 1
        ),
        MenuAccessCheck AS (
            SELECT 
                mp.menu_key,
                mp.permission_id,
                p.permission_key,
                mp.is_required,
                CASE 
                    WHEN upk.permission_key IS NOT NULL THEN 1 
                    ELSE 0 
                END as has_permission
            FROM menu_permissions mp
            INNER JOIN permissions p ON mp.permission_id = p.id
            LEFT JOIN UserPermissionKeys upk ON p.permission_key = upk.permission_key
        ),
        MenuAccessSummary AS (
            SELECT 
                menu_key,
                COUNT(*) as total_permissions,
                SUM(CASE WHEN is_required = 1 THEN 1 ELSE 0 END) as required_permissions,
                SUM(CASE WHEN is_required = 1 AND has_permission = 1 THEN 1 ELSE 0 END) as satisfied_required,
                SUM(CASE WHEN has_permission = 1 THEN 1 ELSE 0 END) as granted_permissions
            FROM MenuAccessCheck
            GROUP BY menu_key
        )
        SELECT 
            menu_key,
            CASE 
                WHEN required_permissions = 0 THEN 1 -- No required perms = accessible
                WHEN satisfied_required = required_permissions THEN 1 -- All required satisfied
                ELSE 0 
            END as has_access,
            CASE 
                WHEN required_permissions = 0 THEN 'No permissions required'
                WHEN satisfied_required = required_permissions THEN 
                    CAST(satisfied_required AS VARCHAR) + '/' + CAST(required_permissions AS VARCHAR) + ' required permissions granted'
                ELSE 
                    'Missing ' + CAST(required_permissions - satisfied_required AS VARCHAR) + ' required permissions'
            END as access_reason,
            required_permissions,
            satisfied_required,
            granted_permissions
        FROM MenuAccessSummary
        ORDER BY menu_key;
    END;

    -- 📊 RESULT SET 3: Blocked Menus with Reasons
    -- Only for regular users (super admins never blocked)
    IF @isSuperAdmin = 1 OR @userType IN ('super_admin', 'owner')
    BEGIN
        -- Super admin: No blocked menus
        SELECT 
            NULL as menu_key,
            NULL as missing_permissions,
            'Super Admin - No Restrictions' as block_reason
        WHERE 1 = 0; -- Return empty result set with correct structure
    END
    ELSE
    BEGIN
        WITH UserPermissionKeys AS (
            SELECT DISTINCT p.permission_key
            FROM user_roles ur
            INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
            INNER JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = @userId 
                AND ur.is_active = 1
        ),
        BlockedMenus AS (
            SELECT 
                mp.menu_key,
                p.permission_key,
                mp.is_required
            FROM menu_permissions mp
            INNER JOIN permissions p ON mp.permission_id = p.id
            LEFT JOIN UserPermissionKeys upk ON p.permission_key = upk.permission_key
            WHERE mp.is_required = 1 
                AND upk.permission_key IS NULL
        )
        SELECT 
            menu_key,
            STRING_AGG(permission_key, ', ') as missing_permissions,
            'Missing required permissions: ' + STRING_AGG(permission_key, ', ') as block_reason
        FROM BlockedMenus
        GROUP BY menu_key
        ORDER BY menu_key;
    END;

    -- 📊 RESULT SET 4: User Context (for debugging & logging)
    SELECT 
        @userId as user_id,
        @userType as user_type,
        @isSuperAdmin as is_super_admin,
        @tenantId as tenant_id,
        CASE 
            WHEN @isSuperAdmin = 1 OR @userType IN ('super_admin', 'owner') THEN 'FULL_ACCESS'
            ELSE 'ROLE_BASED'
        END as access_mode,
        GETUTCDATE() as checked_at;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserAuthData]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- FIXED: sp_GetUserAuthData - Returns COMPLETE User Data
-- =====================================================
CREATE   PROCEDURE [dbo].[sp_GetUserAuthData] 
    @userId BIGINT 
AS 
BEGIN 
    SET NOCOUNT ON; 
    
    -- ============================================
    -- RESULT SET 1: User Data (with userType)
    -- ============================================
    SELECT 
        u.id, 
        u.email, 
        u.username, 
        u.user_type AS userType,  -- ✅ FIX: Map to camelCase
        u.first_name AS firstName, 
        u.last_name AS lastName, 
        u.display_name AS displayName, 
        u.avatar_url AS avatarUrl, 
        ISNULL(u.is_super_admin, 0) AS isSuperAdmin, 
        u.email_verified_at AS emailVerifiedAt, 
        u.status, 
        ISNULL(u.two_factor_enabled, 0) AS twoFactorEnabled,
        uek.public_key_pem AS publicKey,  -- From user_encryption_keys
        -- ✅ FIX: Get active tenant ID from tenant_members
        (SELECT TOP 1 tenant_id 
         FROM tenant_members 
         WHERE user_id = u.id 
           AND is_active = 1 
         ORDER BY joined_at DESC) AS activeTenantId
    FROM [dbo].[users] u 
    LEFT JOIN [dbo].[user_encryption_keys] uek 
        ON u.id = uek.user_id 
        AND uek.status = 'active'
    WHERE u.id = @userId 
        AND u.status = 'active' 
        AND u.email_verified_at IS NOT NULL; 
    
    -- ============================================
    -- RESULT SET 2: User Roles (comma-separated)
    -- ============================================
    SELECT STRING_AGG(r.name, ',') AS roles 
    FROM [dbo].[user_roles] ur
    INNER JOIN [dbo].[roles] r ON ur.role_id = r.id 
    WHERE ur.user_id = @userId 
        AND ur.is_active = 1; 
    
    -- ============================================
    -- RESULT SET 3: User Permissions (comma-separated)
    -- ============================================
    SELECT STRING_AGG(p.permission_key, ',') WITHIN GROUP (ORDER BY p.permission_key) AS permissions 
    FROM [dbo].[user_roles] ur
    INNER JOIN [dbo].[role_permissions] rp ON ur.role_id = rp.role_id 
    INNER JOIN [dbo].[permissions] p ON rp.permission_id = p.id 
    WHERE ur.user_id = @userId 
        AND ur.is_active = 1; 
    
    -- ============================================
    -- RESULT SET 4: All Accessible Tenants (NEW)
    -- ============================================
    SELECT 
        tm.tenant_id AS tenantId,
        t.name AS tenantName,
        t.tenant_type AS tenantType,
        t.slug AS tenantSlug,
        r.name AS roleName,
        r.display_name AS roleDisplayName,
        tm.is_active AS isActive,
        tm.joined_at AS joinedAt
    FROM [dbo].[tenant_members] tm
    INNER JOIN [dbo].[tenants] t ON tm.tenant_id = t.id
    LEFT JOIN [dbo].[roles] r ON tm.role_id = r.id
    WHERE tm.user_id = @userId 
        AND tm.is_active = 1
        AND t.status = 'active'
    ORDER BY 
        CASE WHEN tm.role_id IN (
            SELECT id FROM roles WHERE name IN ('owner', 'super_admin', 'agency_admin', 'brand_admin', 'creator_admin')
        ) THEN 0 ELSE 1 END,
        tm.joined_at DESC;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserChannels_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== 7. GET USER CHANNELS ====================
CREATE PROCEDURE [dbo].[sp_GetUserChannels_Fast]
    @userId BIGINT,
    @limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@limit)
        c.id as channel_id,
        c.name,
        c.channel_type,
        c.last_message_at,
        c.message_count,
        cp.last_read_message_id,
        cp.is_muted,
        (
            SELECT COUNT(*) 
            FROM messages m WITH (NOLOCK)
            WHERE m.channel_id = c.id
            AND m.sent_at > ISNULL(cp.last_read_at, '1900-01-01')
            AND m.sender_user_id != @userId
            AND m.is_deleted = 0
        ) as unread_count
    FROM chat_participants cp WITH (NOLOCK)
    INNER JOIN chat_channels c WITH (NOLOCK) ON cp.channel_id = c.id
    WHERE cp.user_id = @userId
    AND cp.is_active = 1
    ORDER BY c.last_activity_at DESC;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserChannels_Ultra]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- 3. GET USER CHANNELS (30ms target)
CREATE   PROCEDURE [dbo].[sp_GetUserChannels_Ultra]
    @userId BIGINT,
    @tenantId BIGINT,
    @limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@limit)
        c.id,
        c.name,
        c.channel_type,
        c.is_private,
        c.last_activity_at,
        c.message_count,
        cp.role as user_role,
        cp.encrypted_channel_key,
        cp.last_read_message_id,
        ISNULL((
            SELECT COUNT(*) 
            FROM messages m WITH (NOLOCK)
            WHERE m.channel_id = c.id 
            AND m.is_deleted = 0
            AND (cp.last_read_message_id IS NULL OR m.id > cp.last_read_message_id)
        ), 0) as unread_count
    FROM chat_channels c WITH (NOLOCK, INDEX(IX_channels_tenant_activity_ULTRA))
    INNER JOIN chat_participants cp WITH (NOLOCK, INDEX(IX_participants_user_tenant_ULTRA)) 
        ON c.id = cp.channel_id
    WHERE cp.user_id = @userId
    AND cp.is_active = 1
    AND c.created_by_tenant_id = @tenantId
    AND c.is_archived = 0
    ORDER BY c.last_activity_at DESC;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserEncryptionKey]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- Create procedure to get user's active encryption key
CREATE   PROCEDURE [dbo].[sp_GetUserEncryptionKey]
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1
        id,
        user_id,
        public_key_pem,
        key_fingerprint,
        key_fingerprint_short,
        key_version,
        status,
        created_at,
        expires_at
    FROM [dbo].[user_encryption_keys]
    WHERE user_id = @UserId
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > GETUTCDATE())
    ORDER BY key_version DESC;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUserSessions]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 9. Get User Sessions
-- ============================================
CREATE     PROCEDURE [dbo].[sp_GetUserSessions]
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

/****** Object:  StoredProcedure [dbo].[sp_IncrementTemplateUsage]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 6. Increment Template Usage
-- ============================================
CREATE     PROCEDURE [dbo].[sp_IncrementTemplateUsage]
    @template_id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE email_templates
    SET usage_count = usage_count + 1
    WHERE id = @template_id;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_ListMenuPermissions]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ==================== sp_ListMenuPermissions ====================
CREATE     PROCEDURE [dbo].[sp_ListMenuPermissions]
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
    DECLARE @totalCount INT;

    -- Build where clause
    DECLARE @whereClause NVARCHAR(MAX) = 'WHERE 1=1';

    IF @menuKey IS NOT NULL
        SET @whereClause = @whereClause + ' AND mp.menu_key = @menuKey';

    IF @category IS NOT NULL
        SET @whereClause = @whereClause + ' AND p.category = @category';

    IF @search IS NOT NULL
        SET @whereClause = @whereClause + ' AND (mp.menu_key LIKE ''%'' + @search + ''%'' OR p.permission_key LIKE ''%'' + @search + ''%'')';

    -- Get total count
    DECLARE @countQuery NVARCHAR(MAX) = 
        'SELECT @totalCount = COUNT(*) 
         FROM menu_permissions mp
         INNER JOIN permissions p ON mp.permission_id = p.id ' + @whereClause;
    
    EXEC sp_executesql @countQuery,
        N'@menuKey NVARCHAR(100), @category NVARCHAR(100), @search NVARCHAR(255), @totalCount INT OUTPUT',
        @menuKey, @category, @search, @totalCount OUTPUT;

    -- Build sort clause
    DECLARE @orderBy NVARCHAR(100) = 
        CASE @sortBy
            WHEN 'menu_key' THEN 'mp.menu_key'
            WHEN 'permission_name' THEN 'p.permission_key'
            ELSE 'mp.created_at'
        END + ' ' + @sortOrder;

    -- Get paginated results
    DECLARE @dataQuery NVARCHAR(MAX) =
        'SELECT 
            mp.id,
            mp.menu_key,
            mp.permission_id,
            mp.is_required,
            mp.created_at,
            p.permission_key,
            p.resource,
            p.action,
            p.category,
            p.description
         FROM menu_permissions mp
         INNER JOIN permissions p ON mp.permission_id = p.id ' + @whereClause +
        ' ORDER BY ' + @orderBy +
        ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

    EXEC sp_executesql @dataQuery,
        N'@menuKey NVARCHAR(100), @category NVARCHAR(100), @search NVARCHAR(255), @offset INT, @limit INT',
        @menuKey, @category, @search, @offset, @limit;

    -- Return metadata
    SELECT 
        @page as currentPage,
        @limit as itemsPerPage,
        @totalCount as totalItems,
        CEILING(CAST(@totalCount AS FLOAT) / @limit) as totalPages,
        CASE WHEN @page * @limit < @totalCount THEN 1 ELSE 0 END as hasNextPage,
        CASE WHEN @page > 1 THEN 1 ELSE 0 END as hasPreviousPage;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_ListPermissions]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ==================== sp_ListPermissions ====================
CREATE     PROCEDURE [dbo].[sp_ListPermissions]
    @category NVARCHAR(100) = NULL,
    @scope NVARCHAR(20) = 'all',
    @page INT = 1,
    @limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@page - 1) * @limit;
    DECLARE @totalCount INT;

    -- Build where clause
    DECLARE @whereClause NVARCHAR(MAX) = 'WHERE 1=1';

    IF @category IS NOT NULL
        SET @whereClause = @whereClause + ' AND p.category = @category';

    IF @scope = 'system'
        SET @whereClause = @whereClause + ' AND p.is_system_permission = 1';
    ELSE IF @scope = 'custom'
        SET @whereClause = @whereClause + ' AND p.is_system_permission = 0';

    -- Get total count
    DECLARE @countQuery NVARCHAR(MAX) = 
        'SELECT @totalCount = COUNT(*) FROM permissions p ' + @whereClause;
    
    EXEC sp_executesql @countQuery,
        N'@category NVARCHAR(100), @totalCount INT OUTPUT',
        @category, @totalCount OUTPUT;

    -- Get paginated results
    DECLARE @dataQuery NVARCHAR(MAX) =
        'SELECT 
            p.id,
            p.permission_key,
            p.resource,
            p.action,
            p.description,
            p.category,
            p.is_system_permission,
            p.created_at,
            (SELECT COUNT(*) FROM role_permissions rp WHERE rp.permission_id = p.id) as roles_count
         FROM permissions p ' + @whereClause +
        ' ORDER BY p.category, p.permission_key
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

    EXEC sp_executesql @dataQuery,
        N'@category NVARCHAR(100), @offset INT, @limit INT',
        @category, @offset, @limit;

    -- Return metadata
    SELECT 
        @page as currentPage,
        @limit as itemsPerPage,
        @totalCount as totalItems,
        CEILING(CAST(@totalCount AS FLOAT) / @limit) as totalPages,
        CASE WHEN @page * @limit < @totalCount THEN 1 ELSE 0 END as hasNextPage,
        CASE WHEN @page > 1 THEN 1 ELSE 0 END as hasPreviousPage;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_ListRoles]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_ListRoles]
    @scope NVARCHAR(20) = 'all',
    @tenantId BIGINT = NULL,
    @page INT = 1,
    @limit INT = 50,
    @userType NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@page - 1) * @limit;
    DECLARE @totalCount INT;
    
    DECLARE @whereClause NVARCHAR(MAX) = '';
    
    IF @scope = 'system'
        SET @whereClause = 'WHERE r.is_system_role = 1';
    ELSE IF @scope = 'tenant'
        SET @whereClause = 'WHERE r.tenant_id = @tenantId';
    ELSE IF @scope = 'all'
    BEGIN
        IF @tenantId IS NOT NULL
            SET @whereClause = 'WHERE r.tenant_id = @tenantId';
        ELSE IF @userType IN ('owner', 'superadmin', 'super_admin')
            SET @whereClause = 'WHERE 1=1';
        ELSE
            SET @whereClause = 'WHERE r.is_system_role = 1';
    END
    
    DECLARE @countQuery NVARCHAR(MAX) = 
        'SELECT @totalCount = COUNT(*) FROM roles r ' + @whereClause;
    
    EXEC sp_executesql @countQuery, 
        N'@tenantId BIGINT, @totalCount INT OUTPUT', 
        @tenantId, @totalCount OUTPUT;
    
    DECLARE @dataQuery NVARCHAR(MAX) = 
        'SELECT 
            r.id,
            r.tenant_id,
            r.name,
            r.display_name,
            r.description,
            r.is_system_role,
            r.is_default,
            r.hierarchy_level,
            r.created_at,
            r.updated_at,
            (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id AND ur.is_active = 1) as users_count,
            (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permissions_count
         FROM roles r ' + @whereClause + 
        ' ORDER BY r.hierarchy_level DESC, r.name ASC
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    
    EXEC sp_executesql @dataQuery,
        N'@tenantId BIGINT, @offset INT, @limit INT',
        @tenantId, @offset, @limit;
    
    SELECT 
        @page as currentPage,
        @limit as itemsPerPage,
        @totalCount as totalItems,
        CEILING(CAST(@totalCount AS FLOAT) / @limit) as totalPages,
        CASE WHEN @page * @limit < @totalCount THEN 1 ELSE 0 END as hasNextPage,
        CASE WHEN @page > 1 THEN 1 ELSE 0 END as hasPreviousPage;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_MarkAsRead_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== 5. MARK AS READ ====================
CREATE PROCEDURE [dbo].[sp_MarkAsRead_Fast]
    @messageId BIGINT,
    @userId BIGINT,
    @channelId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @now DATETIME2(7) = SYSUTCDATETIME();
    
    -- Update read receipt
    UPDATE message_read_receipts
    SET status = 'read',
        read_at = @now
    WHERE message_id = @messageId
    AND user_id = @userId;
    
    -- Update participant's last read
    UPDATE chat_participants
    SET last_read_message_id = @messageId,
        last_read_at = @now,
        updated_at = @now
    WHERE channel_id = @channelId
    AND user_id = @userId;
    
    SELECT @@ROWCOUNT as updated;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_RotateTenantKeys]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 10. Rotate Tenant Encryption Keys
-- ============================================
CREATE     PROCEDURE [dbo].[sp_RotateTenantKeys]
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

/****** Object:  StoredProcedure [dbo].[sp_RotateUserEncryptionKey]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- Create procedure for key rotation
CREATE   PROCEDURE [dbo].[sp_RotateUserEncryptionKey]
    @UserId BIGINT,
    @NewPublicKeyPem NVARCHAR(MAX),
    @NewEncryptedPrivateKeyPem NVARCHAR(MAX),
    @BackupEncryptedPrivateKey NVARCHAR(MAX) = NULL,
    @RotationReason NVARCHAR(MAX) = 'scheduled',
    @RotatedBy BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Get current key
        DECLARE @OldKeyId BIGINT;
        SELECT TOP 1 @OldKeyId = id
        FROM [dbo].[user_encryption_keys]
        WHERE user_id = @UserId
        AND status = 'active'
        ORDER BY key_version DESC;
        -- Mark old key as rotated
        UPDATE [dbo].[user_encryption_keys]
        SET status = 'rotated',
            revoked_at = GETUTCDATE(),
            revoke_reason = @RotationReason,
            updated_at = GETUTCDATE(),
            updated_by = COALESCE(@RotatedBy, @UserId)
        WHERE id = @OldKeyId;
        -- Calculate fingerprints
        DECLARE @KeyFingerprint NVARCHAR(64) = SUBSTRING(CONVERT(NVARCHAR(MAX), HASHBYTES('SHA2_256', @NewPublicKeyPem), 2), 1, 64);
        DECLARE @KeyFingerprintShort NVARCHAR(16) = SUBSTRING(@KeyFingerprint, 1, 16);
        -- Insert new key
        INSERT INTO [dbo].[user_encryption_keys] (
            user_id,
            public_key_pem,
            encrypted_private_key_pem,
            key_fingerprint,
            key_fingerprint_short,
            backup_encrypted_private_key,
            backup_created_at,
            status,
            key_version,
            rotated_from_key_id,
            created_at,
            created_by,
            next_rotation_at
        )
        VALUES (
            @UserId,
            @NewPublicKeyPem,
            @NewEncryptedPrivateKeyPem,
            @KeyFingerprint,
            @KeyFingerprintShort,
            @BackupEncryptedPrivateKey,
            CASE WHEN @BackupEncryptedPrivateKey IS NOT NULL THEN GETUTCDATE() ELSE NULL END,
            'active',
            ISNULL((SELECT MAX(key_version) FROM [dbo].[user_encryption_keys] WHERE user_id = @UserId), 0) + 1,
            @OldKeyId,
            GETUTCDATE(),
            COALESCE(@RotatedBy, @UserId),
            DATEADD(YEAR, 1, GETUTCDATE()) -- Next rotation in 1 year
        );
        SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS NewKeyId, @OldKeyId AS OldKeyId;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO

/****** Object:  StoredProcedure [dbo].[sp_SendMessage_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- ============================================
-- CHAT STORED PROCEDURES - NO ENCRYPTION
-- Ultra-fast, simple, no encryption overhead
-- ============================================

-- ==================== 1. SEND MESSAGE ====================
CREATE PROCEDURE [dbo].[sp_SendMessage_Fast]
    @channelId BIGINT,
    @userId BIGINT,
    @tenantId BIGINT,
    @messageType NVARCHAR(20),
    @content NVARCHAR(MAX), -- ✅ Plain text, no encryption
    @hasAttachments BIT = 0,
    @hasMentions BIT = 0,
    @replyToMessageId BIGINT = NULL,
    @threadId BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @messageId BIGINT;
    DECLARE @now DATETIME2(7) = SYSUTCDATETIME();
    
    BEGIN TRANSACTION;
    
    -- Insert message
    INSERT INTO messages (
        channel_id, sender_tenant_id, sender_user_id, message_type,
        content, has_attachments, has_mentions,
        reply_to_message_id, thread_id, 
        sent_at, created_at, created_by
    )
    VALUES (
        @channelId, @tenantId, @userId, @messageType,
        @content, @hasAttachments, @hasMentions,
        @replyToMessageId, @threadId,
        @now, @now, @userId
    );
    
    SET @messageId = SCOPE_IDENTITY();
    
    -- Update channel stats
    UPDATE chat_channels
    SET message_count = message_count + 1,
        last_message_at = @now,
        last_activity_at = @now
    WHERE id = @channelId;
    
    COMMIT TRANSACTION;
    
    -- Return message data
    SELECT 
        @messageId as id,
        @channelId as channel_id,
        @userId as sender_user_id,
        @tenantId as sender_tenant_id,
        @messageType as message_type,
        @now as sent_at;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_UpdateSessionActivity]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 14. Update Session Activity
-- ============================================
CREATE     PROCEDURE [dbo].[sp_UpdateSessionActivity]
    @sessionId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE user_sessions
    SET last_activity_at = GETUTCDATE()
    WHERE id = @sessionId AND is_active = 1;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_UpsertEmailTemplate]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 3. Upsert Email Template
-- ============================================
CREATE     PROCEDURE [dbo].[sp_UpsertEmailTemplate]
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

/****** Object:  StoredProcedure [dbo].[sp_UpsertOAuthProvider]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ==================== OAUTH PROVIDERS ====================

-- SP: Upsert OAuth Provider
-- FIX: Changed table name from oauth_providers to user_social_accounts
CREATE     PROCEDURE [dbo].[sp_UpsertOAuthProvider]
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

/****** Object:  StoredProcedure [dbo].[sp_UpsertSystemConfig]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- SP: Upsert System Config
-- FIX: Removed environment parameter (column doesn't exist in table)
CREATE     PROCEDURE [dbo].[sp_UpsertSystemConfig]
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

/****** Object:  StoredProcedure [dbo].[sp_ValidateMessageSend_Fast]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO


-- ==================== 3. VALIDATE MESSAGE SEND ====================
CREATE PROCEDURE [dbo].[sp_ValidateMessageSend_Fast]
    @channelId BIGINT,
    @userId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        CASE WHEN cp.user_id IS NOT NULL THEN 1 ELSE 0 END as isMember,
        (
            SELECT STRING_AGG(CAST(user_id AS VARCHAR(20)), ',')
            FROM chat_participants WITH (NOLOCK)
            WHERE channel_id = @channelId AND is_active = 1
        ) as participant_ids
    FROM chat_channels c WITH (NOLOCK)
    LEFT JOIN chat_participants cp WITH (NOLOCK) 
        ON cp.channel_id = c.id 
        AND cp.user_id = @userId 
        AND cp.is_active = 1
    WHERE c.id = @channelId;
END;
GO

/****** Object:  StoredProcedure [dbo].[sp_VerifyTenantAccess]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



-- ============================================
-- 12. Verify Tenant Access
-- ============================================
CREATE     PROCEDURE [dbo].[sp_VerifyTenantAccess]
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

/****** Object:  StoredProcedure [dbo].[sp_VerifyUserEmail]    Script Date: 23-11-2025 11:40:11 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO



CREATE   PROCEDURE [dbo].[sp_VerifyUserEmail]
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