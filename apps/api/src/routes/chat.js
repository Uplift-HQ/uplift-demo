// ============================================================
// CHAT API ROUTES
// Team messaging and communication
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== CHANNELS ====================

// Get user's channels
router.get('/channels', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    const channels = await db.query(`
      SELECT c.*,
             cm.last_read_at,
             cm.is_muted,
             (SELECT COUNT(*) FROM chat_messages m
              WHERE m.channel_id = c.id
              AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
              AND m.is_deleted = false) as unread_count,
             (SELECT json_build_object(
                'content', m.content,
                'sender_name', u.first_name || ' ' || u.last_name,
                'created_at', m.created_at
              )
              FROM chat_messages m
              JOIN users u ON u.id = m.sender_id
              WHERE m.channel_id = c.id AND m.is_deleted = false
              ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chat_channels c
      JOIN chat_channel_members cm ON cm.channel_id = c.id
      WHERE cm.user_id = $1
        AND c.organization_id = $2
        AND c.is_archived = false
      ORDER BY c.updated_at DESC
    `, [userId, organizationId]);

    res.json({ channels: channels.rows });
  } catch (error) {
    console.error('Failed to get channels:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// Create channel
router.post('/channels', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { name, description, type, memberIds, locationId, departmentId, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const channel = await db.query(`
      INSERT INTO chat_channels (organization_id, name, description, type, location_id, department_id, is_private, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [organizationId, name, description, type || 'group', locationId, departmentId, isPrivate || false, userId]);

    // Add creator as admin
    await db.query(`
      INSERT INTO chat_channel_members (channel_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `, [channel.rows[0].id, userId]);

    // Add other members
    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await db.query(`
            INSERT INTO chat_channel_members (channel_id, user_id, role)
            VALUES ($1, $2, 'member')
            ON CONFLICT DO NOTHING
          `, [channel.rows[0].id, memberId]);
        }
      }
    }

    res.status(201).json({ channel: channel.rows[0] });
  } catch (error) {
    console.error('Failed to create channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Get channel details with members
router.get('/channels/:id', async (req, res) => {
  try {
    const { userId } = req.user;

    // Check if user is a member
    const memberCheck = await db.query(`
      SELECT 1 FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2
    `, [req.params.id, userId]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    const channel = await db.query(`
      SELECT c.*,
             (SELECT json_agg(json_build_object(
               'id', u.id,
               'name', u.first_name || ' ' || u.last_name,
               'avatar', u.avatar_url,
               'role', cm.role,
               'joined_at', cm.joined_at
             ))
             FROM chat_channel_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.channel_id = c.id) as members
      FROM chat_channels c
      WHERE c.id = $1
    `, [req.params.id]);

    if (channel.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ channel: channel.rows[0] });
  } catch (error) {
    console.error('Failed to get channel:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
});

// Update channel
router.patch('/channels/:id', async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, description, isArchived } = req.body;

    // Check if user is admin of channel
    const adminCheck = await db.query(`
      SELECT 1 FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2 AND role = 'admin'
    `, [req.params.id, userId]);

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Must be channel admin' });
    }

    const result = await db.query(`
      UPDATE chat_channels
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          is_archived = COALESCE($3, is_archived),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [name, description, isArchived, req.params.id]);

    res.json({ channel: result.rows[0] });
  } catch (error) {
    console.error('Failed to update channel:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// Add member to channel
router.post('/channels/:id/members', async (req, res) => {
  try {
    const { userId } = req.user;
    const { memberId } = req.body;

    // Check if user is admin of channel
    const adminCheck = await db.query(`
      SELECT 1 FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2 AND role = 'admin'
    `, [req.params.id, userId]);

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Must be channel admin' });
    }

    await db.query(`
      INSERT INTO chat_channel_members (channel_id, user_id, role)
      VALUES ($1, $2, 'member')
      ON CONFLICT DO NOTHING
    `, [req.params.id, memberId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to add member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Leave channel
router.delete('/channels/:id/members/me', async (req, res) => {
  try {
    const { userId } = req.user;

    await db.query(`
      DELETE FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2
    `, [req.params.id, userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to leave channel:', error);
    res.status(500).json({ error: 'Failed to leave channel' });
  }
});

// ==================== MESSAGES ====================

// Get messages for a channel
router.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const { userId } = req.user;
    const { before, limit = 50 } = req.query;

    // Check if user is a member
    const memberCheck = await db.query(`
      SELECT 1 FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2
    `, [req.params.channelId, userId]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    let query = `
      SELECT m.*,
             u.first_name || ' ' || u.last_name as sender_name,
             u.avatar_url as sender_avatar,
             (SELECT json_agg(json_build_object('emoji', r.emoji, 'user_id', r.user_id, 'user_name', ru.first_name))
              FROM chat_reactions r
              JOIN users ru ON ru.id = r.user_id
              WHERE r.message_id = m.id) as reactions,
             (SELECT json_build_object(
                'id', rm.id,
                'content', rm.content,
                'sender_name', rmu.first_name || ' ' || rmu.last_name
              )
              FROM chat_messages rm
              JOIN users rmu ON rmu.id = rm.sender_id
              WHERE rm.id = m.reply_to_id) as reply_to
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.channel_id = $1
        AND m.is_deleted = false
    `;
    const params = [req.params.channelId];

    if (before) {
      query += ` AND m.created_at < $2`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const messages = await db.query(query, params);

    // Update last_read_at
    await db.query(`
      UPDATE chat_channel_members
      SET last_read_at = NOW()
      WHERE channel_id = $1 AND user_id = $2
    `, [req.params.channelId, userId]);

    res.json({ messages: messages.rows.reverse() });
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message
router.post('/channels/:channelId/messages', async (req, res) => {
  try {
    const { userId } = req.user;
    const { content, messageType, replyToId, attachments } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if user is a member
    const memberCheck = await db.query(`
      SELECT 1 FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2
    `, [req.params.channelId, userId]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    const message = await db.query(`
      INSERT INTO chat_messages (channel_id, sender_id, content, message_type, reply_to_id, attachments)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.params.channelId, userId, content.trim(), messageType || 'text', replyToId, JSON.stringify(attachments || [])]);

    // Update channel's updated_at
    await db.query(`
      UPDATE chat_channels SET updated_at = NOW() WHERE id = $1
    `, [req.params.channelId]);

    // Get full message with sender info
    const fullMessage = await db.query(`
      SELECT m.*, u.first_name || ' ' || u.last_name as sender_name, u.avatar_url as sender_avatar
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = $1
    `, [message.rows[0].id]);

    res.status(201).json({ message: fullMessage.rows[0] });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Edit message
router.patch('/messages/:messageId', async (req, res) => {
  try {
    const { userId } = req.user;
    const { content } = req.body;

    // Check if user is the sender
    const message = await db.query(`
      SELECT sender_id FROM chat_messages WHERE id = $1
    `, [req.params.messageId]);

    if (message.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.rows[0].sender_id !== userId) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    const result = await db.query(`
      UPDATE chat_messages
      SET content = $1, is_edited = true, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [content, req.params.messageId]);

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Failed to edit message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message (soft delete)
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { userId } = req.user;

    // Check if user is the sender
    const message = await db.query(`
      SELECT sender_id FROM chat_messages WHERE id = $1
    `, [req.params.messageId]);

    if (message.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.rows[0].sender_id !== userId) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    await db.query(`
      UPDATE chat_messages SET is_deleted = true, updated_at = NOW() WHERE id = $1
    `, [req.params.messageId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ==================== REACTIONS ====================

// Add reaction
router.post('/messages/:messageId/reactions', async (req, res) => {
  try {
    const { userId } = req.user;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    await db.query(`
      INSERT INTO chat_reactions (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING
    `, [req.params.messageId, userId, emoji]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to add reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction
router.delete('/messages/:messageId/reactions/:emoji', async (req, res) => {
  try {
    const { userId } = req.user;

    await db.query(`
      DELETE FROM chat_reactions
      WHERE message_id = $1 AND user_id = $2 AND emoji = $3
    `, [req.params.messageId, userId, req.params.emoji]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// ==================== DIRECT MESSAGES ====================

// Start or get direct message channel
router.post('/direct', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // Check if DM channel already exists between these users
    const existingChannel = await db.query(`
      SELECT c.* FROM chat_channels c
      JOIN chat_channel_members cm1 ON cm1.channel_id = c.id AND cm1.user_id = $1
      JOIN chat_channel_members cm2 ON cm2.channel_id = c.id AND cm2.user_id = $2
      WHERE c.type = 'direct' AND c.organization_id = $3
      LIMIT 1
    `, [userId, recipientId, organizationId]);

    if (existingChannel.rows.length > 0) {
      return res.json({ channel: existingChannel.rows[0] });
    }

    // Get recipient name for channel name
    const recipient = await db.query(`
      SELECT first_name, last_name FROM users WHERE id = $1
    `, [recipientId]);

    if (recipient.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Create new DM channel
    const channel = await db.query(`
      INSERT INTO chat_channels (organization_id, name, type, is_private, created_by)
      VALUES ($1, $2, 'direct', true, $3)
      RETURNING *
    `, [organizationId, `DM: ${recipient.rows[0].first_name} ${recipient.rows[0].last_name}`, userId]);

    // Add both users
    await db.query(`
      INSERT INTO chat_channel_members (channel_id, user_id, role) VALUES ($1, $2, 'member'), ($1, $3, 'member')
    `, [channel.rows[0].id, userId, recipientId]);

    res.status(201).json({ channel: channel.rows[0] });
  } catch (error) {
    console.error('Failed to start DM:', error);
    res.status(500).json({ error: 'Failed to start direct message' });
  }
});

export default router;
