import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import gamificationService from '../services/gamification.js';

const router = Router();
router.use(authMiddleware);

// Employee endpoints

// GET /gamification/stats - Get gamification stats for current user
router.get('/stats', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const stats = await gamificationService.getStats(organizationId, employeeId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    res.status(500).json({ error: 'Failed to fetch gamification stats' });
  }
});

// GET /gamification/leaderboard - Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { period = 'all' } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(organizationId, period);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /gamification/badges - Get all badges for current user
router.get('/badges', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const badges = await gamificationService.getAllBadges(organizationId, employeeId);
    res.json(badges);
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// GET /gamification/points-history - Get points history
router.get('/points-history', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const { limit, offset } = req.query;
    const history = await gamificationService.getPointsHistory(
      organizationId,
      employeeId,
      limit,
      offset
    );
    res.json(history);
  } catch (error) {
    console.error('Error fetching points history:', error);
    res.status(500).json({ error: 'Failed to fetch points history' });
  }
});

// GET /gamification/rewards - Get reward catalog
router.get('/rewards', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const rewards = await gamificationService.getRewardCatalog(organizationId);
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// POST /gamification/rewards/:id/redeem - Redeem a reward
router.post('/rewards/:id/redeem', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const rewardId = req.params.id;
    const result = await gamificationService.redeemReward(organizationId, employeeId, rewardId);
    res.json(result);
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ error: 'Failed to redeem reward' });
  }
});

// GET /gamification/redemptions - Get current user's redemptions
router.get('/redemptions', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const redemptions = await gamificationService.getMyRedemptions(organizationId, employeeId);
    res.json(redemptions);
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    res.status(500).json({ error: 'Failed to fetch redemptions' });
  }
});

// GET /gamification/offers - Get affiliate offers
router.get('/offers', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const offers = await gamificationService.getAffiliateOffers(organizationId);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching affiliate offers:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate offers' });
  }
});

// Manager endpoints

// POST /gamification/rewards - Create a new reward
router.post('/rewards', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { name, description, category, pointsCost, quantityAvailable } = req.body;
    const reward = await gamificationService.createReward(
      organizationId,
      { name, description, category, points_cost: pointsCost, quantity_available: quantityAvailable },
      userId
    );
    res.json(reward);
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

// PUT /gamification/rewards/:id - Update a reward
router.put('/rewards/:id', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const rewardId = req.params.id;
    const updates = req.body;
    const reward = await gamificationService.updateReward(rewardId, organizationId, updates);
    res.json(reward);
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

// DELETE /gamification/rewards/:id - Delete a reward
router.delete('/rewards/:id', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const rewardId = req.params.id;
    await gamificationService.deleteReward(rewardId, organizationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

// GET /gamification/redemptions/pending - Get pending redemptions
router.get('/redemptions/pending', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const redemptions = await gamificationService.getPendingRedemptions(organizationId);
    res.json(redemptions);
  } catch (error) {
    console.error('Error fetching pending redemptions:', error);
    res.status(500).json({ error: 'Failed to fetch pending redemptions' });
  }
});

// POST /gamification/redemptions/:id/approve - Approve a redemption
router.post('/redemptions/:id/approve', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const redemptionId = req.params.id;
    const result = await gamificationService.updateRedemptionStatus(
      redemptionId,
      organizationId,
      'approved',
      userId
    );
    res.json(result);
  } catch (error) {
    console.error('Error approving redemption:', error);
    res.status(500).json({ error: 'Failed to approve redemption' });
  }
});

// POST /gamification/redemptions/:id/reject - Reject a redemption
router.post('/redemptions/:id/reject', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const redemptionId = req.params.id;
    const { notes } = req.body;
    const result = await gamificationService.updateRedemptionStatus(
      redemptionId,
      organizationId,
      'rejected',
      userId,
      notes
    );
    res.json(result);
  } catch (error) {
    console.error('Error rejecting redemption:', error);
    res.status(500).json({ error: 'Failed to reject redemption' });
  }
});

// Admin endpoints

// POST /gamification/offers - Create affiliate offer
router.post('/offers', requireRole('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { title, description, provider, category, discount_percentage, affiliate_link, terms, expires_at } = req.body;

    const result = await db.query(
      `INSERT INTO affiliate_offers
       (organization_id, title, description, provider, category, discount_percentage, affiliate_link, terms, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [organizationId, title, description, provider, category, discount_percentage, affiliate_link, terms, expires_at]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating affiliate offer:', error);
    res.status(500).json({ error: 'Failed to create affiliate offer' });
  }
});

// PUT /gamification/offers/:id - Update affiliate offer
router.put('/offers/:id', requireRole('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const offerId = req.params.id;
    const { title, description, provider, category, discount_percentage, affiliate_link, terms, expires_at, is_active } = req.body;

    const result = await db.query(
      `UPDATE affiliate_offers
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           provider = COALESCE($3, provider),
           category = COALESCE($4, category),
           discount_percentage = COALESCE($5, discount_percentage),
           affiliate_link = COALESCE($6, affiliate_link),
           terms = COALESCE($7, terms),
           expires_at = COALESCE($8, expires_at),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
       WHERE id = $10 AND organization_id = $11
       RETURNING *`,
      [title, description, provider, category, discount_percentage, affiliate_link, terms, expires_at, is_active, offerId, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Affiliate offer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating affiliate offer:', error);
    res.status(500).json({ error: 'Failed to update affiliate offer' });
  }
});

// DELETE /gamification/offers/:id - Soft delete affiliate offer
router.delete('/offers/:id', requireRole('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const offerId = req.params.id;

    const result = await db.query(
      `UPDATE affiliate_offers
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [offerId, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Affiliate offer not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting affiliate offer:', error);
    res.status(500).json({ error: 'Failed to delete affiliate offer' });
  }
});

export default router;
