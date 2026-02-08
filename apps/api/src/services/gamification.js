import { db } from '../lib/database.js';
import { notificationService } from './notifications.js';

/**
 * Award points to an employee
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @param {number} amount - Points amount to award
 * @param {string} type - Points type (e.g., 'shift_completion', 'recognition', 'training', 'bonus', 'manual_adjustment')
 * @param {string} refType - Reference type (e.g., 'shift', 'recognition', 'training')
 * @param {string} refId - Reference ID
 * @param {string} description - Description of the award
 * @returns {Promise<number>} New balance
 */
export async function awardPoints(orgId, empId, amount, type, refType, refId, description) {
  // Insert into points ledger
  await db.query(
    `INSERT INTO points_ledger (organization_id, employee_id, amount, type, reference_type, reference_id, description, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [orgId, empId, amount, type, refType, refId, description]
  );

  // Upsert employee_points - increment balance and total_earned
  const result = await db.query(
    `INSERT INTO employee_points (organization_id, employee_id, balance, total_earned, updated_at)
     VALUES ($1, $2, $3, $3, NOW())
     ON CONFLICT (employee_id)
     DO UPDATE SET
       balance = employee_points.balance + $3,
       total_earned = employee_points.total_earned + $3,
       updated_at = NOW()
     RETURNING balance`,
    [orgId, empId, amount]
  );

  return result.rows[0].balance;
}

/**
 * Spend points for redemption
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @param {number} amount - Points amount to spend
 * @param {string} refId - Reference ID (e.g., redemption ID)
 * @param {string} description - Description of the spend
 * @returns {Promise<number>} New balance
 */
export async function spendPoints(orgId, empId, amount, refId, description) {
  // Check balance
  const balanceResult = await db.query(
    `SELECT balance FROM employee_points WHERE organization_id = $1 AND employee_id = $2`,
    [orgId, empId]
  );

  if (!balanceResult.rows[0] || balanceResult.rows[0].balance < amount) {
    throw new Error('Insufficient points balance');
  }

  // Insert negative ledger entry
  await db.query(
    `INSERT INTO points_ledger (organization_id, employee_id, amount, type, reference_type, reference_id, description, created_at)
     VALUES ($1, $2, $3, 'redemption', 'reward_redemption', $4, $5, NOW())`,
    [orgId, empId, -amount, refId, description]
  );

  // Deduct balance
  const result = await db.query(
    `UPDATE employee_points
     SET balance = balance - $3, updated_at = NOW()
     WHERE organization_id = $1 AND employee_id = $2
     RETURNING balance`,
    [orgId, empId, amount]
  );

  return result.rows[0].balance;
}

/**
 * Get employee gamification stats
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @returns {Promise<Object>} Stats object
 */
export async function getStats(orgId, empId) {
  // Get employee_points row
  const pointsResult = await db.query(
    `SELECT balance, total_earned, current_streak, longest_streak
     FROM employee_points
     WHERE organization_id = $1 AND employee_id = $2`,
    [orgId, empId]
  );

  const points = pointsResult.rows[0] || {
    balance: 0,
    total_earned: 0,
    current_streak: 0,
    longest_streak: 0
  };

  const totalEarned = points.total_earned || 0;

  // Calculate level
  const level = Math.floor(totalEarned / 500) + 1;

  // Calculate rank
  const rankResult = await db.query(
    `SELECT COUNT(*) + 1 as rank
     FROM employee_points
     WHERE organization_id = $1 AND total_earned > $2`,
    [orgId, totalEarned]
  );

  const rank = parseInt(rankResult.rows[0].rank);

  return {
    balance: points.balance,
    totalEarned: totalEarned,
    currentStreak: points.current_streak || 0,
    longestStreak: points.longest_streak || 0,
    level,
    rank,
    currentXP: totalEarned % 500,
    nextLevelXP: 500
  };
}

/**
 * Get leaderboard
 * @param {string} orgId - Organization ID
 * @param {string} period - 'week', 'month', or 'all'
 * @returns {Promise<Array>} Top 50 employees
 */
export async function getLeaderboard(orgId, period) {
  let query;
  let params;

  if (period === 'all') {
    query = `
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.avatar_url,
        COALESCE(ep.total_earned, 0) as points,
        ROW_NUMBER() OVER (ORDER BY COALESCE(ep.total_earned, 0) DESC) as rank
      FROM employees e
      LEFT JOIN employee_points ep ON ep.employee_id = e.id AND ep.organization_id = e.organization_id
      WHERE e.organization_id = $1
      ORDER BY points DESC
      LIMIT 50
    `;
    params = [orgId];
  } else {
    let dateFilter;
    if (period === 'week') {
      dateFilter = `pl.created_at >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'month') {
      dateFilter = `pl.created_at >= NOW() - INTERVAL '30 days'`;
    }

    query = `
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.avatar_url,
        COALESCE(SUM(pl.amount), 0) as points,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pl.amount), 0) DESC) as rank
      FROM employees e
      LEFT JOIN points_ledger pl ON pl.employee_id = e.id AND pl.organization_id = e.organization_id AND ${dateFilter}
      WHERE e.organization_id = $1
      GROUP BY e.id, e.first_name, e.last_name, e.avatar_url
      ORDER BY points DESC
      LIMIT 50
    `;
    params = [orgId];
  }

  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Get all badges with earned status for employee
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @returns {Promise<Array>} All badges with earned status
 */
export async function getAllBadges(orgId, empId) {
  const result = await db.query(
    `SELECT
       b.id,
       b.name,
       b.description,
       b.icon,
       b.requirement_type,
       b.requirement_value,
       b.organization_id,
       CASE WHEN eb.id IS NOT NULL THEN true ELSE false END as earned,
       eb.earned_at
     FROM badges b
     LEFT JOIN employee_badges eb ON eb.badge_id = b.id AND eb.employee_id = $2 AND eb.organization_id = $1
     WHERE b.organization_id IS NULL OR b.organization_id = $1
     ORDER BY earned DESC, b.name ASC`,
    [orgId, empId]
  );

  return result.rows;
}

/**
 * Check requirements and award any newly qualified badges
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @returns {Promise<Array>} Newly awarded badges
 */
export async function checkAndAwardBadges(orgId, empId) {
  // Get stats needed for badge checks
  const stats = await getStats(orgId, empId);

  // Get shift completion count
  const shiftsResult = await db.query(
    `SELECT COUNT(*) as count FROM shifts WHERE employee_id = $1 AND organization_id = $2 AND status = 'completed'`,
    [empId, orgId]
  );
  const shiftsCompleted = parseInt(shiftsResult.rows[0].count);

  // Get peer recognitions count
  const recognitionsResult = await db.query(
    `SELECT COUNT(*) as count FROM points_ledger WHERE employee_id = $1 AND organization_id = $2 AND type = 'recognition'`,
    [empId, orgId]
  );
  const recognitionsReceived = parseInt(recognitionsResult.rows[0].count);

  // Get unearned badges
  const unearnedResult = await db.query(
    `SELECT b.*
     FROM badges b
     WHERE (b.organization_id IS NULL OR b.organization_id = $1)
       AND NOT EXISTS (
         SELECT 1 FROM employee_badges eb
         WHERE eb.badge_id = b.id AND eb.employee_id = $2 AND eb.organization_id = $1
       )`,
    [orgId, empId]
  );

  const newlyAwarded = [];

  for (const badge of unearnedResult.rows) {
    let qualified = false;

    switch (badge.requirement_type) {
      case 'shifts_completed':
        qualified = shiftsCompleted >= badge.requirement_value;
        break;
      case 'points_earned':
        qualified = stats.totalEarned >= badge.requirement_value;
        break;
      case 'streak_days':
        qualified = stats.longestStreak >= badge.requirement_value;
        break;
      case 'peer_recognitions':
        qualified = recognitionsReceived >= badge.requirement_value;
        break;
      case 'level_reached':
        qualified = stats.level >= badge.requirement_value;
        break;
    }

    if (qualified) {
      // Award badge
      await db.query(
        `INSERT INTO employee_badges (organization_id, employee_id, badge_id, earned_at)
         VALUES ($1, $2, $3, NOW())`,
        [orgId, empId, badge.id]
      );

      newlyAwarded.push(badge);

      // Send notification
      await notificationService.create(empId, {
        type: 'badge_earned',
        title: 'New Badge Earned!',
        message: `You've earned the "${badge.name}" badge!`
      });
    }
  }

  return newlyAwarded;
}

/**
 * Get reward catalog for organization
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} Active rewards
 */
export async function getRewardCatalog(orgId) {
  const result = await db.query(
    `SELECT * FROM reward_catalog
     WHERE organization_id = $1 AND is_active = true
     ORDER BY points_cost ASC`,
    [orgId]
  );

  return result.rows;
}

/**
 * Create a new reward
 * @param {string} orgId - Organization ID
 * @param {Object} data - Reward data
 * @param {string} createdBy - Creator user ID
 * @returns {Promise<Object>} Created reward
 */
export async function createReward(orgId, data, createdBy) {
  const result = await db.query(
    `INSERT INTO reward_catalog
     (organization_id, name, description, points_cost, category, quantity_available, is_active, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
     RETURNING *`,
    [
      orgId,
      data.name,
      data.description,
      data.points_cost,
      data.category,
      data.quantity_available,
      createdBy
    ]
  );

  return result.rows[0];
}

/**
 * Update a reward
 * @param {string} rewardId - Reward ID
 * @param {string} orgId - Organization ID
 * @param {Object} data - Updated fields
 * @returns {Promise<Object>} Updated reward
 */
export async function updateReward(rewardId, orgId, data) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramCount++}`);
    values.push(data.description);
  }
  if (data.points_cost !== undefined) {
    fields.push(`points_cost = $${paramCount++}`);
    values.push(data.points_cost);
  }
  if (data.category !== undefined) {
    fields.push(`category = $${paramCount++}`);
    values.push(data.category);
  }
  if (data.quantity_available !== undefined) {
    fields.push(`quantity_available = $${paramCount++}`);
    values.push(data.quantity_available);
  }

  fields.push(`updated_at = NOW()`);
  values.push(rewardId, orgId);

  const result = await db.query(
    `UPDATE reward_catalog
     SET ${fields.join(', ')}
     WHERE id = $${paramCount++} AND organization_id = $${paramCount++}
     RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Soft delete a reward
 * @param {string} rewardId - Reward ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<void>}
 */
export async function deleteReward(rewardId, orgId) {
  await db.query(
    `UPDATE reward_catalog
     SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2`,
    [rewardId, orgId]
  );
}

/**
 * Redeem a reward
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @param {string} rewardId - Reward ID
 * @returns {Promise<Object>} Redemption record
 */
export async function redeemReward(orgId, empId, rewardId) {
  // Check reward exists, is active, and has quantity
  const rewardResult = await db.query(
    `SELECT * FROM reward_catalog
     WHERE id = $1 AND organization_id = $2 AND is_active = true`,
    [rewardId, orgId]
  );

  if (!rewardResult.rows[0]) {
    throw new Error('Reward not found or inactive');
  }

  const reward = rewardResult.rows[0];

  if (reward.quantity_available !== null && reward.quantity_available <= 0) {
    throw new Error('Reward out of stock');
  }

  // Spend points
  await spendPoints(orgId, empId, reward.points_cost, rewardId, `Redeemed: ${reward.name}`);

  // Create redemption record
  const redemptionResult = await db.query(
    `INSERT INTO reward_redemptions
     (organization_id, employee_id, reward_id, points_spent, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     RETURNING *`,
    [orgId, empId, rewardId, reward.points_cost]
  );

  // Decrement quantity if applicable
  if (reward.quantity_available !== null) {
    await db.query(
      `UPDATE reward_catalog
       SET quantity_available = quantity_available - 1, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2`,
      [rewardId, orgId]
    );
  }

  // Send notification
  await notificationService.create(empId, {
    type: 'reward_redeemed',
    title: 'Reward Redeemed',
    message: `You've redeemed "${reward.name}" for ${reward.points_cost} points`
  });

  return redemptionResult.rows[0];
}

/**
 * Get employee's redemptions
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @returns {Promise<Array>} Redemption records
 */
export async function getMyRedemptions(orgId, empId) {
  const result = await db.query(
    `SELECT
       rr.*,
       rc.name as reward_name,
       rc.description as reward_description,
       rc.description as reward_description_full
     FROM reward_redemptions rr
     JOIN reward_catalog rc ON rc.id = rr.reward_id
     WHERE rr.organization_id = $1 AND rr.employee_id = $2
     ORDER BY rr.created_at DESC`,
    [orgId, empId]
  );

  return result.rows;
}

/**
 * Get pending redemptions for admin review
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} Pending redemptions
 */
export async function getPendingRedemptions(orgId) {
  const result = await db.query(
    `SELECT
       rr.*,
       e.first_name,
       e.last_name,
       e.email,
       rc.name as reward_name,
       rc.description as reward_description
     FROM reward_redemptions rr
     JOIN employees e ON e.id = rr.employee_id
     JOIN reward_catalog rc ON rc.id = rr.reward_id
     WHERE rr.organization_id = $1 AND rr.status = 'pending'
     ORDER BY rr.created_at ASC`,
    [orgId]
  );

  return result.rows;
}

/**
 * Update redemption status
 * @param {string} redemptionId - Redemption ID
 * @param {string} orgId - Organization ID
 * @param {string} status - New status ('approved', 'rejected', 'fulfilled')
 * @param {string} reviewedBy - Reviewer user ID
 * @param {string} notes - Review notes
 * @returns {Promise<Object>} Updated redemption
 */
export async function updateRedemptionStatus(redemptionId, orgId, status, reviewedBy, notes) {
  // Get redemption details
  const redemptionResult = await db.query(
    `SELECT * FROM reward_redemptions WHERE id = $1 AND organization_id = $2`,
    [redemptionId, orgId]
  );

  if (!redemptionResult.rows[0]) {
    throw new Error('Redemption not found');
  }

  const redemption = redemptionResult.rows[0];

  // Update status
  const result = await db.query(
    `UPDATE reward_redemptions
     SET status = $3, reviewed_by = $4, reviewed_at = NOW(), notes = $5
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [redemptionId, orgId, status, reviewedBy, notes]
  );

  // If rejected, refund points
  if (status === 'rejected') {
    await awardPoints(
      orgId,
      redemption.employee_id,
      redemption.points_spent,
      'manual_adjustment',
      'reward_redemption',
      redemptionId,
      `Refund: Redemption rejected - ${notes || 'No reason provided'}`
    );

    // Also restore quantity
    await db.query(
      `UPDATE reward_catalog
       SET quantity_available = quantity_available + 1, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND quantity_available IS NOT NULL`,
      [redemption.reward_id, orgId]
    );
  }

  // Send notification
  await notificationService.create(redemption.employee_id, {
    type: 'redemption_status',
    title: `Redemption ${status}`,
    message: notes || `Your redemption has been ${status}`
  });

  return result.rows[0];
}

/**
 * Get affiliate offers
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} Active offers
 */
export async function getAffiliateOffers(orgId) {
  const result = await db.query(
    `SELECT * FROM affiliate_offers
     WHERE (organization_id IS NULL OR organization_id = $1) AND is_active = true
     ORDER BY is_featured DESC, sort_order ASC`,
    [orgId]
  );

  return result.rows;
}

/**
 * Get points history
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @param {number} limit - Result limit
 * @param {number} offset - Result offset
 * @returns {Promise<Array>} Points ledger entries
 */
export async function getPointsHistory(orgId, empId, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT * FROM points_ledger
     WHERE organization_id = $1 AND employee_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [orgId, empId, limit, offset]
  );

  return result.rows;
}

/**
 * Handle shift completion event
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @param {string} shiftId - Shift ID
 * @returns {Promise<void>}
 */
export async function onShiftCompleted(orgId, empId, shiftId) {
  // Award 50 points for shift completion
  await awardPoints(
    orgId,
    empId,
    50,
    'shift_completion',
    'shift',
    shiftId,
    'Shift completed'
  );

  // Update streak
  const pointsResult = await db.query(
    `SELECT current_streak, last_activity_date FROM employee_points
     WHERE organization_id = $1 AND employee_id = $2`,
    [orgId, empId]
  );

  let currentStreak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (pointsResult.rows[0] && pointsResult.rows[0].last_activity_date) {
    const lastActivity = new Date(pointsResult.rows[0].last_activity_date);
    lastActivity.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, don't update streak
      currentStreak = pointsResult.rows[0].current_streak;
    } else if (daysDiff === 1) {
      // Yesterday, increment streak
      currentStreak = pointsResult.rows[0].current_streak + 1;
    } else {
      // Gap, reset to 1
      currentStreak = 1;
    }
  }

  // Update streak and last activity
  await db.query(
    `INSERT INTO employee_points (organization_id, employee_id, current_streak, longest_streak, last_activity_date, updated_at)
     VALUES ($1, $2, $3, $3, $4, NOW())
     ON CONFLICT (employee_id)
     DO UPDATE SET
       current_streak = $3,
       longest_streak = GREATEST(employee_points.longest_streak, $3),
       last_activity_date = $4,
       updated_at = NOW()`,
    [orgId, empId, currentStreak, today]
  );

  // Award bonus for 7-day streak
  if (currentStreak === 7) {
    await awardPoints(
      orgId,
      empId,
      100,
      'bonus',
      'streak',
      '7-day-streak',
      '7-day streak bonus!'
    );

    await notificationService.create(empId, {
      type: 'streak_milestone',
      title: '7-Day Streak!',
      message: 'Congratulations! You earned 100 bonus points for a 7-day streak!'
    });
  }

  // Check for new badges
  await checkAndAwardBadges(orgId, empId);
}

/**
 * Handle peer recognition event
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID (recipient)
 * @param {string} recognitionId - Recognition ID
 * @returns {Promise<void>}
 */
export async function onPeerRecognition(orgId, empId, recognitionId) {
  await awardPoints(
    orgId,
    empId,
    25,
    'recognition',
    'peer_recognition',
    recognitionId,
    'Received peer recognition'
  );

  await checkAndAwardBadges(orgId, empId);
}

/**
 * Handle training completion event
 * @param {string} orgId - Organization ID
 * @param {string} empId - Employee ID
 * @param {string} trainingId - Training ID
 * @returns {Promise<void>}
 */
export async function onTrainingCompleted(orgId, empId, trainingId) {
  await awardPoints(
    orgId,
    empId,
    100,
    'training',
    'training_completion',
    trainingId,
    'Training completed'
  );

  await checkAndAwardBadges(orgId, empId);
}

// Export as default service object
const gamificationService = {
  awardPoints,
  spendPoints,
  getStats,
  getLeaderboard,
  getAllBadges,
  checkAndAwardBadges,
  getRewardCatalog,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
  getMyRedemptions,
  getPendingRedemptions,
  updateRedemptionStatus,
  getAffiliateOffers,
  getPointsHistory,
  onShiftCompleted,
  onPeerRecognition,
  onTrainingCompleted
};

export default gamificationService;
