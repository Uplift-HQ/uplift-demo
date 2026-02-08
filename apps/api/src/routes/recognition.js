// ============================================================
// RECOGNITION ROUTES
// Kudos, badges, awards, and peer recognition
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// -------------------- RECOGNITIONS (KUDOS) --------------------

// Get recognition feed (public recognitions)
router.get('/feed', async (req, res) => {
  const { limit = 20, offset = 0, category } = req.query;

  let query = `
    SELECT r.*,
           fu.first_name as from_first_name, fu.last_name as from_last_name, fu.avatar_url as from_avatar,
           tu.first_name as to_first_name, tu.last_name as to_last_name, tu.avatar_url as to_avatar
    FROM recognitions r
    JOIN users fu ON fu.id = r.from_user_id
    JOIN users tu ON tu.id = r.to_user_id
    WHERE r.organization_id = $1 AND r.is_public = true
  `;
  const params = [req.user.organizationId];
  let paramIndex = 2;

  if (category) {
    query += ` AND r.category = $${paramIndex++}`;
    params.push(category);
  }

  query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await db.query(query, params);

  res.json({ recognitions: result.rows });
});

// Get my received recognitions
router.get('/received', async (req, res) => {
  const result = await db.query(`
    SELECT r.*,
           fu.first_name as from_first_name, fu.last_name as from_last_name, fu.avatar_url as from_avatar
    FROM recognitions r
    JOIN users fu ON fu.id = r.from_user_id
    WHERE r.to_user_id = $1
    ORDER BY r.created_at DESC
  `, [req.user.userId]);

  res.json({ recognitions: result.rows });
});

// Get my given recognitions
router.get('/given', async (req, res) => {
  const result = await db.query(`
    SELECT r.*,
           tu.first_name as to_first_name, tu.last_name as to_last_name, tu.avatar_url as to_avatar
    FROM recognitions r
    JOIN users tu ON tu.id = r.to_user_id
    WHERE r.from_user_id = $1
    ORDER BY r.created_at DESC
  `, [req.user.userId]);

  res.json({ recognitions: result.rows });
});

// Give recognition (kudos)
router.post('/', async (req, res) => {
  const { to_user_id, message, category = 'kudos', is_public = true } = req.body;

  if (!to_user_id || !message) {
    return res.status(400).json({ error: 'Recipient and message required' });
  }

  if (to_user_id === req.user.userId) {
    return res.status(400).json({ error: 'Cannot recognize yourself' });
  }

  // Verify recipient is in same org
  const recipientCheck = await db.query(
    `SELECT id FROM users WHERE id = $1 AND organization_id = $2`,
    [to_user_id, req.user.organizationId]
  );

  if (recipientCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  // Default points by category
  const pointsByCategory = {
    kudos: 10,
    teamwork: 15,
    innovation: 20,
    customer_service: 15,
    leadership: 20,
    going_extra_mile: 25,
    mentorship: 20,
  };

  const points = pointsByCategory[category] || 10;

  const result = await db.query(`
    INSERT INTO recognitions (organization_id, from_user_id, to_user_id, message, category, points_awarded, is_public)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [req.user.organizationId, req.user.userId, to_user_id, message, category, points, is_public]);

  // Award points to recipient
  await db.query(`
    INSERT INTO recognition_points (user_id, organization_id, points_balance, points_earned_total)
    VALUES ($1, $2, $3, $3)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      points_balance = recognition_points.points_balance + $3,
      points_earned_total = recognition_points.points_earned_total + $3,
      updated_at = NOW()
  `, [to_user_id, req.user.organizationId, points]);

  // Log transaction
  await db.query(`
    INSERT INTO points_transactions (user_id, organization_id, transaction_type, points, reference_type, reference_id, description)
    VALUES ($1, $2, 'earned_kudos', $3, 'recognition', $4, $5)
  `, [to_user_id, req.user.organizationId, points, result.rows[0].id, `Kudos from colleague`]);

  res.status(201).json({ recognition: result.rows[0] });
});

// Add reaction to recognition
router.post('/:id/react', async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji required' });
  }

  // Get current reactions
  const current = await db.query(
    `SELECT reactions FROM recognitions WHERE id = $1 AND organization_id = $2`,
    [id, req.user.organizationId]
  );

  if (current.rows.length === 0) {
    return res.status(404).json({ error: 'Recognition not found' });
  }

  let reactions = current.rows[0].reactions || [];

  // Remove existing reaction from this user
  reactions = reactions.filter(r => r.user_id !== req.user.userId);

  // Add new reaction
  reactions.push({ user_id: req.user.userId, emoji, created_at: new Date().toISOString() });

  await db.query(
    `UPDATE recognitions SET reactions = $1 WHERE id = $2`,
    [JSON.stringify(reactions), id]
  );

  res.json({ success: true, reactions });
});

// -------------------- BADGES --------------------

// Get all badges (organization's badge catalog)
router.get('/badges', async (req, res) => {
  const result = await db.query(`
    SELECT * FROM badges
    WHERE organization_id = $1 AND is_active = true
    ORDER BY category, name
  `, [req.user.organizationId]);

  res.json({ badges: result.rows });
});

// Get my badges
router.get('/badges/mine', async (req, res) => {
  const result = await db.query(`
    SELECT ub.*, b.name, b.description, b.icon_url, b.category, b.points_value,
           au.first_name as awarded_by_first_name, au.last_name as awarded_by_last_name
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    LEFT JOIN users au ON au.id = ub.awarded_by
    WHERE ub.user_id = $1
    ORDER BY ub.awarded_at DESC
  `, [req.user.userId]);

  res.json({ badges: result.rows });
});

// Create badge (admin only)
router.post('/badges', requireRole(['admin', 'superadmin']), async (req, res) => {
  const { name, description, icon_url, category = 'achievement', points_value = 50, criteria } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Badge name required' });
  }

  const result = await db.query(`
    INSERT INTO badges (organization_id, name, description, icon_url, category, points_value, criteria, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [req.user.organizationId, name, description, icon_url, category, points_value, criteria || {}, req.user.userId]);

  res.status(201).json({ badge: result.rows[0] });
});

// Award badge to user (manager/admin)
router.post('/badges/:badgeId/award', requireRole(['manager', 'admin', 'superadmin']), async (req, res) => {
  const { badgeId } = req.params;
  const { user_id, reason } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Verify badge exists
  const badge = await db.query(
    `SELECT * FROM badges WHERE id = $1 AND organization_id = $2`,
    [badgeId, req.user.organizationId]
  );

  if (badge.rows.length === 0) {
    return res.status(404).json({ error: 'Badge not found' });
  }

  // Award badge
  const result = await db.query(`
    INSERT INTO user_badges (user_id, badge_id, awarded_by, awarded_reason)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING *
  `, [user_id, badgeId, req.user.userId, reason]);

  if (result.rows.length === 0) {
    return res.status(409).json({ error: 'User already has this badge' });
  }

  // Award points
  const points = badge.rows[0].points_value;
  await db.query(`
    INSERT INTO recognition_points (user_id, organization_id, points_balance, points_earned_total)
    VALUES ($1, $2, $3, $3)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      points_balance = recognition_points.points_balance + $3,
      points_earned_total = recognition_points.points_earned_total + $3,
      updated_at = NOW()
  `, [user_id, req.user.organizationId, points]);

  // Log transaction
  await db.query(`
    INSERT INTO points_transactions (user_id, organization_id, transaction_type, points, reference_type, reference_id, description)
    VALUES ($1, $2, 'earned_badge', $3, 'badge', $4, $5)
  `, [user_id, req.user.organizationId, points, badgeId, `Earned badge: ${badge.rows[0].name}`]);

  res.status(201).json({ userBadge: result.rows[0], badge: badge.rows[0] });
});

// -------------------- AWARDS --------------------

// Get all awards
router.get('/awards', async (req, res) => {
  const result = await db.query(`
    SELECT * FROM awards
    WHERE organization_id = $1 AND is_active = true
    ORDER BY award_type, name
  `, [req.user.organizationId]);

  res.json({ awards: result.rows });
});

// Create award (admin only)
router.post('/awards', requireRole(['admin', 'superadmin']), async (req, res) => {
  const { name, description, award_type = 'monthly', prize_description, prize_value, nomination_required = true } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Award name required' });
  }

  const result = await db.query(`
    INSERT INTO awards (organization_id, name, description, award_type, prize_description, prize_value, nomination_required)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [req.user.organizationId, name, description, award_type, prize_description, prize_value, nomination_required]);

  res.status(201).json({ award: result.rows[0] });
});

// Nominate for award
router.post('/awards/:awardId/nominate', async (req, res) => {
  const { awardId } = req.params;
  const { nominee_user_id, reason, period } = req.body;

  if (!nominee_user_id || !reason) {
    return res.status(400).json({ error: 'Nominee and reason required' });
  }

  if (nominee_user_id === req.user.userId) {
    return res.status(400).json({ error: 'Cannot nominate yourself' });
  }

  // Verify award exists
  const award = await db.query(
    `SELECT * FROM awards WHERE id = $1 AND organization_id = $2`,
    [awardId, req.user.organizationId]
  );

  if (award.rows.length === 0) {
    return res.status(404).json({ error: 'Award not found' });
  }

  // Calculate period if not provided
  const nominationPeriod = period || new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  const result = await db.query(`
    INSERT INTO award_nominations (award_id, nominee_user_id, nominator_user_id, nomination_reason, period)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [awardId, nominee_user_id, req.user.userId, reason, nominationPeriod]);

  res.status(201).json({ nomination: result.rows[0] });
});

// Get nominations for award (manager/admin)
router.get('/awards/:awardId/nominations', requireRole(['manager', 'admin', 'superadmin']), async (req, res) => {
  const { awardId } = req.params;
  const { period, status } = req.query;

  let query = `
    SELECT an.*,
           nu.first_name as nominee_first_name, nu.last_name as nominee_last_name, nu.avatar_url as nominee_avatar,
           nr.first_name as nominator_first_name, nr.last_name as nominator_last_name
    FROM award_nominations an
    JOIN users nu ON nu.id = an.nominee_user_id
    JOIN users nr ON nr.id = an.nominator_user_id
    JOIN awards a ON a.id = an.award_id
    WHERE an.award_id = $1 AND a.organization_id = $2
  `;
  const params = [awardId, req.user.organizationId];
  let paramIndex = 3;

  if (period) {
    query += ` AND an.period = $${paramIndex++}`;
    params.push(period);
  }

  if (status) {
    query += ` AND an.status = $${paramIndex++}`;
    params.push(status);
  }

  query += ` ORDER BY an.created_at DESC`;

  const result = await db.query(query, params);

  res.json({ nominations: result.rows });
});

// Select award winner (admin only)
router.post('/awards/:awardId/winner', requireRole(['admin', 'superadmin']), async (req, res) => {
  const { awardId } = req.params;
  const { nomination_id, winner_user_id, period, announcement_text } = req.body;

  if (!winner_user_id || !period) {
    return res.status(400).json({ error: 'Winner and period required' });
  }

  // Update nomination status if provided
  if (nomination_id) {
    await db.query(
      `UPDATE award_nominations SET status = 'winner' WHERE id = $1`,
      [nomination_id]
    );
  }

  // Get award details
  const award = await db.query(
    `SELECT * FROM awards WHERE id = $1 AND organization_id = $2`,
    [awardId, req.user.organizationId]
  );

  if (award.rows.length === 0) {
    return res.status(404).json({ error: 'Award not found' });
  }

  const result = await db.query(`
    INSERT INTO award_winners (award_id, nomination_id, winner_user_id, period, announcement_text, announced_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [awardId, nomination_id, winner_user_id, period, announcement_text, req.user.userId]);

  // Award bonus points
  await db.query(`
    INSERT INTO recognition_points (user_id, organization_id, points_balance, points_earned_total)
    VALUES ($1, $2, 100, 100)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      points_balance = recognition_points.points_balance + 100,
      points_earned_total = recognition_points.points_earned_total + 100,
      updated_at = NOW()
  `, [winner_user_id, req.user.organizationId]);

  // Log transaction
  await db.query(`
    INSERT INTO points_transactions (user_id, organization_id, transaction_type, points, reference_type, reference_id, description)
    VALUES ($1, $2, 'earned_award', 100, 'award', $3, $4)
  `, [winner_user_id, req.user.organizationId, awardId, `Won award: ${award.rows[0].name}`]);

  res.status(201).json({ winner: result.rows[0] });
});

// Get past award winners
router.get('/awards/:awardId/winners', async (req, res) => {
  const { awardId } = req.params;

  const result = await db.query(`
    SELECT aw.*,
           u.first_name, u.last_name, u.avatar_url,
           ab.first_name as announced_by_first_name, ab.last_name as announced_by_last_name
    FROM award_winners aw
    JOIN users u ON u.id = aw.winner_user_id
    LEFT JOIN users ab ON ab.id = aw.announced_by
    JOIN awards a ON a.id = aw.award_id
    WHERE aw.award_id = $1 AND a.organization_id = $2
    ORDER BY aw.announced_at DESC
  `, [awardId, req.user.organizationId]);

  res.json({ winners: result.rows });
});

// -------------------- POINTS & LEADERBOARD --------------------

// Get my points
router.get('/points', async (req, res) => {
  const result = await db.query(`
    SELECT * FROM recognition_points
    WHERE user_id = $1 AND organization_id = $2
  `, [req.user.userId, req.user.organizationId]);

  const points = result.rows[0] || { points_balance: 0, points_earned_total: 0, points_redeemed_total: 0, level: 1 };

  res.json({ points });
});

// Get points transaction history
router.get('/points/history', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const result = await db.query(`
    SELECT * FROM points_transactions
    WHERE user_id = $1 AND organization_id = $2
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `, [req.user.userId, req.user.organizationId, parseInt(limit), parseInt(offset)]);

  res.json({ transactions: result.rows });
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  const { period = 'all_time', limit = 10 } = req.query;

  let query;

  if (period === 'all_time') {
    query = `
      SELECT rp.*, u.first_name, u.last_name, u.avatar_url,
             (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count
      FROM recognition_points rp
      JOIN users u ON u.id = rp.user_id
      WHERE rp.organization_id = $1
      ORDER BY rp.points_earned_total DESC
      LIMIT $2
    `;
  } else {
    // Monthly leaderboard based on transactions
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    query = `
      SELECT u.id as user_id, u.first_name, u.last_name, u.avatar_url,
             COALESCE(SUM(pt.points), 0) as points_this_period,
             (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count
      FROM users u
      LEFT JOIN points_transactions pt ON pt.user_id = u.id
        AND pt.points > 0
        AND pt.created_at >= '${startDate.toISOString()}'
      WHERE u.organization_id = $1
      GROUP BY u.id
      HAVING COALESCE(SUM(pt.points), 0) > 0
      ORDER BY points_this_period DESC
      LIMIT $2
    `;
  }

  const result = await db.query(query, [req.user.organizationId, parseInt(limit)]);

  res.json({ leaderboard: result.rows, period });
});

// -------------------- STATS --------------------

// Get recognition stats (manager/admin)
router.get('/stats', requireRole(['manager', 'admin', 'superadmin']), async (req, res) => {
  const [
    totalRecognitions,
    thisMonthRecognitions,
    topCategories,
    badgesAwarded,
  ] = await Promise.all([
    db.query(
      `SELECT COUNT(*) FROM recognitions WHERE organization_id = $1`,
      [req.user.organizationId]
    ),
    db.query(
      `SELECT COUNT(*) FROM recognitions
       WHERE organization_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [req.user.organizationId]
    ),
    db.query(
      `SELECT category, COUNT(*) as count FROM recognitions
       WHERE organization_id = $1
       GROUP BY category ORDER BY count DESC LIMIT 5`,
      [req.user.organizationId]
    ),
    db.query(
      `SELECT COUNT(*) FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE b.organization_id = $1`,
      [req.user.organizationId]
    ),
  ]);

  res.json({
    totalRecognitions: parseInt(totalRecognitions.rows[0].count),
    thisMonthRecognitions: parseInt(thisMonthRecognitions.rows[0].count),
    topCategories: topCategories.rows,
    badgesAwarded: parseInt(badgesAwarded.rows[0].count),
  });
});

export default router;
