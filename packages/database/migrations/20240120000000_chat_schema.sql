-- ============================================================
-- CHAT & MESSAGING SCHEMA
-- Internal team communication
-- ============================================================

-- Chat channels (team chats, location chats, direct messages)
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Channel info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'group' CHECK (type IN ('group', 'direct', 'location', 'department', 'announcement')),

  -- For location/department channels
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,

  -- Settings
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channel members
CREATE TABLE IF NOT EXISTS chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_muted BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ,

  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(channel_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),

  -- For replies
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- Attachments (stored as JSON array)
  attachments JSONB DEFAULT '[]',

  -- Status
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_location ON chat_channels(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_channels_department ON chat_channels(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);
