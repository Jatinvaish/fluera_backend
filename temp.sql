-- ============================================
-- FLUERA CHAT SYSTEM - NO ENCRYPTION VERSION
 -- ============================================
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



-- ==================== CHAT CHANNELS ====================
CREATE TABLE [dbo].[chat_channels] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [created_by_tenant_id] BIGINT NOT NULL,
    [name] NVARCHAR(255),
    [description] NVARCHAR(MAX),
    [channel_type] NVARCHAR(20) DEFAULT 'group', -- 'direct', 'group', 'campaign'
    
    -- Related entities
    [related_type] NVARCHAR(50), -- 'campaign', 'contract', etc.
    [related_id] BIGINT,
    
    -- Participants
    [participant_tenant_ids] NVARCHAR(MAX), -- Comma-separated for quick lookup
    [member_count] INT DEFAULT 0,
    
    -- Settings
    [is_private] BIT DEFAULT 1,
    [is_archived] BIT DEFAULT 0,
    
    -- Activity tracking
    [message_count] INT DEFAULT 0,
    [last_message_at] DATETIME2(7),
    [last_activity_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    
    -- Metadata
    [settings] NVARCHAR(MAX), -- JSON
    [metadata] NVARCHAR(MAX), -- JSON
    
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_channels_tenant] ON [dbo].[chat_channels] ([created_by_tenant_id]);
CREATE INDEX [IX_channels_type] ON [dbo].[chat_channels] ([channel_type], [is_archived]);

-- ==================== CHAT PARTICIPANTS ====================
CREATE TABLE [dbo].[chat_participants] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [channel_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [role] NVARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    
    -- Join/Leave tracking
    [joined_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [left_at] DATETIME2(7),
    
    -- Read tracking
    [last_read_message_id] BIGINT,
    [last_read_at] DATETIME2(7),
    
    -- Notifications
    [notification_settings] NVARCHAR(MAX), -- JSON
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

-- ==================== MESSAGES ====================
CREATE TABLE [dbo].[messages] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [channel_id] BIGINT NOT NULL,
    [sender_tenant_id] BIGINT NOT NULL,
    [sender_user_id] BIGINT NOT NULL,
    [message_type] NVARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'image', 'video'
    
    -- ✅ NO ENCRYPTION - Plain text content
    [content] NVARCHAR(MAX) NOT NULL,
    
    -- Metadata (not encrypted)
    [has_attachments] BIT DEFAULT 0,
    [has_mentions] BIT DEFAULT 0,
    [reply_to_message_id] BIGINT,
    [thread_id] BIGINT,
    
    -- Status
    [is_edited] BIT DEFAULT 0,
    [edited_at] DATETIME2(7),
    [is_deleted] BIT DEFAULT 0,
    [deleted_at] DATETIME2(7),
    [deleted_by] BIGINT,
    [is_pinned] BIT DEFAULT 0,
    [pinned_at] DATETIME2(7),
    [pinned_by] BIGINT,
    
    [metadata] NVARCHAR(MAX), -- JSON
    [sent_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [created_by] BIGINT,
    [updated_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [updated_by] BIGINT
);

CREATE INDEX [IX_messages_channel] ON [dbo].[messages] ([channel_id], [sent_at] DESC);
CREATE INDEX [IX_messages_sender] ON [dbo].[messages] ([sender_user_id]);
CREATE INDEX [IX_messages_thread] ON [dbo].[messages] ([thread_id]) WHERE [thread_id] IS NOT NULL;

-- ==================== MESSAGE ATTACHMENTS ====================
CREATE TABLE [dbo].[message_attachments] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [tenant_id] BIGINT NOT NULL,
    
    -- ✅ NO ENCRYPTION - Plain file data
    [file_url] NVARCHAR(MAX) NOT NULL,
    [filename] NVARCHAR(500) NOT NULL,
    [file_size] BIGINT NOT NULL,
    [mime_type] NVARCHAR(200) NOT NULL,
    [file_hash] NVARCHAR(64), -- For deduplication
    [thumbnail_url] NVARCHAR(MAX),
    
    -- Security
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

-- ==================== MESSAGE REACTIONS ====================
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

CREATE INDEX [IX_reactions] ON [dbo].[message_reactions] ([message_id]);

-- ==================== MESSAGE READ RECEIPTS ====================
CREATE TABLE [dbo].[message_read_receipts] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [message_id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [status] NVARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'read'
    [delivered_at] DATETIME2(7),
    [read_at] DATETIME2(7),
    
    [created_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    
    INDEX [idx_message_receipts] ([message_id], [user_id]),
    INDEX [idx_user_unread] ([user_id], [status])
);

-- ==================== MESSAGE QUEUE (Fallback) ====================
CREATE TABLE [dbo].[message_queue] (
    [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [user_id] BIGINT NOT NULL,
    [message_id] BIGINT NOT NULL,
    [channel_id] BIGINT NOT NULL,
    [queued_at] DATETIME2(7) DEFAULT GETUTCDATE(),
    [expires_at] DATETIME2(7) NOT NULL,
    [delivered_at] DATETIME2(7),
    
    INDEX [IX_message_queue_user_queued] ([user_id], [queued_at])
);

PRINT '✅ Chat tables created successfully (No Encryption)';


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

-- ==================== 9. CREATE CHANNEL ====================
CREATE PROCEDURE [dbo].[sp_CreateChannel_Fast]
    @tenantId BIGINT,
    @userId BIGINT,
    @name NVARCHAR(255),
    @channelType NVARCHAR(20),
    @participantIds NVARCHAR(MAX), -- Comma-separated user IDs
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
        created_by_tenant_id, name, channel_type,
        related_type, related_id, participant_tenant_ids,
        created_at, created_by
    )
    VALUES (
        @tenantId, @name, @channelType,
        @relatedType, @relatedId, @participantIds,
        GETUTCDATE(), @userId
    );
    
    SET @channelId = SCOPE_IDENTITY();
    
    -- Add participants
    INSERT INTO chat_participants (channel_id, tenant_id, user_id, role)
    SELECT 
        @channelId,
        @tenantId,
        CAST(value AS BIGINT),
        CASE WHEN CAST(value AS BIGINT) = @userId THEN 'admin' ELSE 'member' END
    FROM STRING_SPLIT(@participantIds, ',')
    WHERE RTRIM(value) <> '';
    
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

PRINT '✅ Chat stored procedures created successfully (No Encryption)';

-- ==================== FIXED: CREATE CHANNEL ====================
ALTER PROCEDURE [dbo].[sp_CreateChannel_Fast]
    @tenantId BIGINT,
    @userId BIGINT,
    @name NVARCHAR(255),
    @channelType NVARCHAR(20),
    @participantIds NVARCHAR(MAX),
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
        created_by_tenant_id, name, channel_type,
        related_type, related_id, participant_tenant_ids,
        created_at, created_by
    )
    VALUES (
        @tenantId, @name, @channelType,
        @relatedType, @relatedId, @participantIds,
        GETUTCDATE(), @userId
    );
    
    SET @channelId = SCOPE_IDENTITY();
    
    -- ✅ FIX: Add participants only if they don't already exist
    INSERT INTO chat_participants (channel_id, tenant_id, user_id, role, created_at, created_by)
    SELECT 
        @channelId,
        @tenantId,
        CAST(value AS BIGINT),
        CASE WHEN CAST(value AS BIGINT) = @userId THEN 'admin' ELSE 'member' END,
        GETUTCDATE(),
        @userId
    FROM STRING_SPLIT(@participantIds, ',')
    WHERE RTRIM(value) <> ''
    AND NOT EXISTS (
        SELECT 1 
        FROM chat_participants 
        WHERE channel_id = @channelId 
        AND user_id = CAST(value AS BIGINT)
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