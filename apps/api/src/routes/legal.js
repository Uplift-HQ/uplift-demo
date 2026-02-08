// ============================================================
// LEGAL ROUTES
// Terms acceptance and consent management API endpoints
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

// GET /api/legal/terms/current - Get current terms that need acceptance
router.get('/terms/current', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, type, version, title, content, summary, effective_date
       FROM terms_versions
       WHERE is_current = true AND requires_acceptance = true
       ORDER BY type`
    );

    res.json({ terms: result.rows });
  } catch (error) {
    console.error('Get current terms error:', error);
    res.status(500).json({ error: 'Failed to get current terms' });
  }
});

// GET /api/legal/terms/:type - Get specific terms by type
router.get('/terms/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { version } = req.query;

    let query, params;
    if (version) {
      query = `SELECT * FROM terms_versions WHERE type = $1 AND version = $2`;
      params = [type, version];
    } else {
      query = `SELECT * FROM terms_versions WHERE type = $1 AND is_current = true`;
      params = [type];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Terms not found' });
    }

    res.json({ terms: result.rows[0] });
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({ error: 'Failed to get terms' });
  }
});

// GET /api/legal/terms/history/:type - Get version history for a terms type
router.get('/terms/history/:type', async (req, res) => {
  try {
    const { type } = req.params;

    const result = await db.query(
      `SELECT id, version, title, effective_date, is_current, created_at
       FROM terms_versions
       WHERE type = $1
       ORDER BY effective_date DESC`,
      [type]
    );

    res.json({ versions: result.rows });
  } catch (error) {
    console.error('Get terms history error:', error);
    res.status(500).json({ error: 'Failed to get terms history' });
  }
});

// GET /api/legal/my-consents - Get user's consent status
router.get('/my-consents', authMiddleware, async (req, res) => {
  try {
    const { id: userId } = req.user;

    // Get current terms that need acceptance
    const currentTermsResult = await db.query(
      `SELECT id, type, version, title, effective_date
       FROM terms_versions
       WHERE is_current = true AND requires_acceptance = true`
    );

    // Get user's consents
    const consentsResult = await db.query(
      `SELECT uc.*, tv.type, tv.version, tv.title
       FROM user_consents uc
       JOIN terms_versions tv ON tv.id = uc.terms_version_id
       WHERE uc.user_id = $1`,
      [userId]
    );

    // Get marketing consent
    const marketingResult = await db.query(
      `SELECT * FROM marketing_consents WHERE user_id = $1`,
      [userId]
    );

    // Determine which terms need acceptance
    const acceptedTermsIds = consentsResult.rows.map(c => c.terms_version_id);
    const pendingTerms = currentTermsResult.rows.filter(t => !acceptedTermsIds.includes(t.id));

    res.json({
      consents: consentsResult.rows,
      pendingTerms,
      allAccepted: pendingTerms.length === 0,
      marketing: marketingResult.rows[0] || {
        email_marketing: false,
        sms_marketing: false,
        push_notifications: true,
        product_updates: true
      }
    });
  } catch (error) {
    console.error('Get my consents error:', error);
    res.status(500).json({ error: 'Failed to get consents' });
  }
});

// POST /api/legal/accept - Accept terms
router.post('/accept', authMiddleware, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { termsVersionIds } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!termsVersionIds || !Array.isArray(termsVersionIds) || termsVersionIds.length === 0) {
      return res.status(400).json({ error: 'termsVersionIds array is required' });
    }

    // Verify all terms exist and are current
    const termsResult = await db.query(
      `SELECT id FROM terms_versions
       WHERE id = ANY($1::uuid[]) AND is_current = true`,
      [termsVersionIds]
    );

    if (termsResult.rows.length !== termsVersionIds.length) {
      return res.status(400).json({ error: 'One or more terms versions are invalid or not current' });
    }

    // Record consents
    const acceptedAt = new Date();
    for (const termsId of termsVersionIds) {
      await db.query(
        `INSERT INTO user_consents (user_id, terms_version_id, accepted_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, terms_version_id) DO UPDATE SET accepted_at = $3`,
        [userId, termsId, acceptedAt, ip, userAgent]
      );
    }

    res.json({
      success: true,
      acceptedAt,
      message: 'Terms accepted successfully'
    });
  } catch (error) {
    console.error('Accept terms error:', error);
    res.status(500).json({ error: 'Failed to accept terms' });
  }
});

// PUT /api/legal/marketing - Update marketing preferences
router.put('/marketing', authMiddleware, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { emailMarketing, smsMarketing, pushNotifications, productUpdates } = req.body;

    const result = await db.query(
      `INSERT INTO marketing_consents (user_id, email_marketing, sms_marketing, push_notifications, product_updates)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         email_marketing = COALESCE($2, marketing_consents.email_marketing),
         sms_marketing = COALESCE($3, marketing_consents.sms_marketing),
         push_notifications = COALESCE($4, marketing_consents.push_notifications),
         product_updates = COALESCE($5, marketing_consents.product_updates),
         updated_at = NOW()
       RETURNING *`,
      [userId, emailMarketing, smsMarketing, pushNotifications, productUpdates]
    );

    res.json({
      success: true,
      marketing: result.rows[0]
    });
  } catch (error) {
    console.error('Update marketing preferences error:', error);
    res.status(500).json({ error: 'Failed to update marketing preferences' });
  }
});

// GET /api/legal/check-acceptance - Check if user needs to accept terms (for middleware)
router.get('/check-acceptance', authMiddleware, async (req, res) => {
  try {
    const { id: userId } = req.user;

    // Get current terms that require acceptance
    const currentTermsResult = await db.query(
      `SELECT id, type, version, title
       FROM terms_versions
       WHERE is_current = true AND requires_acceptance = true`
    );

    // Get user's consents
    const consentsResult = await db.query(
      `SELECT terms_version_id FROM user_consents WHERE user_id = $1`,
      [userId]
    );

    const acceptedIds = consentsResult.rows.map(c => c.terms_version_id);
    const pendingTerms = currentTermsResult.rows.filter(t => !acceptedIds.includes(t.id));

    res.json({
      requiresAcceptance: pendingTerms.length > 0,
      pendingTerms
    });
  } catch (error) {
    console.error('Check acceptance error:', error);
    res.status(500).json({ error: 'Failed to check acceptance status' });
  }
});

// ==================== CONSENT WITHDRAWAL ====================

// POST /api/legal/withdraw/:termsId - Withdraw consent for specific terms
router.post('/withdraw/:termsId', authMiddleware, async (req, res) => {
  try {
    const { id: userId, organization_id: organizationId } = req.user;
    const { termsId } = req.params;
    const { reason } = req.body;

    // Check if consent exists and is active
    const existing = await db.query(`
      SELECT id FROM user_consents
      WHERE user_id = $1 AND terms_version_id = $2 AND withdrawn_at IS NULL
    `, [userId, termsId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Consent not found or already withdrawn' });
    }

    // Record withdrawal
    await db.query(`
      UPDATE user_consents
      SET withdrawn_at = NOW()
      WHERE user_id = $1 AND terms_version_id = $2
    `, [userId, termsId]);

    // Log the withdrawal in audit log
    try {
      await db.query(`
        INSERT INTO audit_log (organization_id, user_id, action, entity_type, entity_id, details, ip_address)
        VALUES ($1, $2, 'consent_withdrawn', 'terms_version', $3, $4, $5)
      `, [organizationId, userId, termsId, JSON.stringify({ reason }), req.ip]);
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('Audit log error:', auditError);
    }

    res.json({
      success: true,
      message: 'Consent withdrawn successfully',
      withdrawnAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to withdraw consent:', error);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

// GET /api/legal/my-consents/detailed - Get all consents with withdrawal option
router.get('/my-consents/detailed', authMiddleware, async (req, res) => {
  try {
    const { id: userId } = req.user;

    const consents = await db.query(`
      SELECT
        tv.id as terms_id,
        tv.type,
        tv.version,
        tv.title,
        tv.summary,
        tv.effective_date,
        uc.accepted_at,
        uc.withdrawn_at,
        CASE WHEN uc.accepted_at IS NOT NULL AND uc.withdrawn_at IS NULL THEN true ELSE false END as is_active
      FROM terms_versions tv
      LEFT JOIN user_consents uc ON uc.terms_version_id = tv.id AND uc.user_id = $1
      WHERE tv.is_current = true
      ORDER BY tv.type
    `, [userId]);

    // Get marketing consent
    const marketingResult = await db.query(`
      SELECT * FROM marketing_consents WHERE user_id = $1
    `, [userId]);

    res.json({
      consents: consents.rows,
      marketing: marketingResult.rows[0] || null
    });
  } catch (error) {
    console.error('Failed to get detailed consents:', error);
    res.status(500).json({ error: 'Failed to get consents' });
  }
});

// POST /api/legal/request-deletion - Request account deletion (GDPR)
router.post('/request-deletion', authMiddleware, async (req, res) => {
  try {
    const { id: userId, organization_id: organizationId } = req.user;
    const { reason, confirmEmail } = req.body;

    // Verify email confirmation
    const userResult = await db.query(`
      SELECT email FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].email !== confirmEmail) {
      return res.status(400).json({ error: 'Email confirmation does not match' });
    }

    // Mark account for deletion (30-day grace period)
    await db.query(`
      UPDATE users SET deletion_requested_at = NOW()
      WHERE id = $1
    `, [userId]);

    // Log the request
    try {
      await db.query(`
        INSERT INTO audit_log (organization_id, user_id, action, entity_type, entity_id, details, ip_address)
        VALUES ($1, $2, 'deletion_requested', 'user', $2, $3, $4)
      `, [organizationId, userId, JSON.stringify({ reason }), req.ip]);
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    res.json({
      success: true,
      message: 'Account deletion requested. Your account and data will be permanently deleted after 30 days.',
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Failed to request deletion:', error);
    res.status(500).json({ error: 'Failed to request account deletion' });
  }
});

// POST /api/legal/cancel-deletion - Cancel account deletion request
router.post('/cancel-deletion', authMiddleware, async (req, res) => {
  try {
    const { id: userId } = req.user;

    const result = await db.query(`
      UPDATE users SET deletion_requested_at = NULL
      WHERE id = $1 AND deletion_requested_at IS NOT NULL
      RETURNING id
    `, [userId]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'No pending deletion request found' });
    }

    res.json({
      success: true,
      message: 'Account deletion cancelled successfully'
    });
  } catch (error) {
    console.error('Failed to cancel deletion:', error);
    res.status(500).json({ error: 'Failed to cancel deletion request' });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin routes for managing terms

// POST /api/legal/admin/terms - Create new terms version (admin only)
router.post('/admin/terms', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, version, title, content, summary, effectiveDate, requiresAcceptance } = req.body;

    if (!type || !version || !title || !content || !effectiveDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new version (not current by default)
    const result = await db.query(
      `INSERT INTO terms_versions (type, version, title, content, summary, effective_date, requires_acceptance, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING *`,
      [type, version, title, content, summary, effectiveDate, requiresAcceptance !== false]
    );

    res.json({
      success: true,
      terms: result.rows[0]
    });
  } catch (error) {
    console.error('Create terms error:', error);
    res.status(500).json({ error: 'Failed to create terms' });
  }
});

// PUT /api/legal/admin/terms/:id/publish - Publish terms version (admin only)
router.put('/admin/terms/:id/publish', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    const { id } = req.params;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get the terms to publish
    const termsResult = await db.query(
      `SELECT type FROM terms_versions WHERE id = $1`,
      [id]
    );

    if (termsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Terms not found' });
    }

    const { type } = termsResult.rows[0];

    // Set all other versions of same type to not current
    await db.query(
      `UPDATE terms_versions SET is_current = false WHERE type = $1`,
      [type]
    );

    // Set this version as current
    await db.query(
      `UPDATE terms_versions SET is_current = true WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Terms published successfully'
    });
  } catch (error) {
    console.error('Publish terms error:', error);
    res.status(500).json({ error: 'Failed to publish terms' });
  }
});

export default router;
