// ============================================================
// COOKIE CONSENT API
// GDPR/PECR compliant cookie consent management
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../lib/database.js';

const router = Router();

// Get or create visitor ID
const getVisitorId = (req, res) => {
  let visitorId = req.cookies?.visitor_id;

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    res.cookie('visitor_id', visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }

  return visitorId;
};

// GET /api/cookies/consent - Get current consent status
router.get('/consent', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const visitorId = getVisitorId(req, res);

    const result = await db.query(`
      SELECT essential, analytics, marketing, preferences, consent_given_at
      FROM cookie_consents
      WHERE (user_id = $1 OR visitor_id = $2)
        AND withdrawn_at IS NULL
      ORDER BY consent_given_at DESC
      LIMIT 1
    `, [userId, visitorId]);

    if (result.rows.length === 0) {
      return res.json({
        hasConsent: false,
        consent: null
      });
    }

    res.json({
      hasConsent: true,
      consent: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to get cookie consent:', error);
    res.status(500).json({ error: 'Failed to get consent' });
  }
});

// POST /api/cookies/consent - Save consent
router.post('/consent', async (req, res) => {
  try {
    const { analytics, marketing, preferences } = req.body;
    const userId = req.user?.id || null;
    const visitorId = getVisitorId(req, res);

    await db.query(`
      INSERT INTO cookie_consents (user_id, visitor_id, essential, analytics, marketing, preferences, ip_address, user_agent)
      VALUES ($1, $2, true, $3, $4, $5, $6, $7)
    `, [
      userId,
      visitorId,
      analytics || false,
      marketing || false,
      preferences || false,
      req.ip,
      req.get('User-Agent')
    ]);

    // Set consent cookie for frontend
    res.cookie('cookie_consent', JSON.stringify({
      essential: true,
      analytics: analytics || false,
      marketing: marketing || false,
      preferences: preferences || false,
    }), {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save cookie consent:', error);
    res.status(500).json({ error: 'Failed to save consent' });
  }
});

// PUT /api/cookies/consent - Update consent
router.put('/consent', async (req, res) => {
  try {
    const { analytics, marketing, preferences } = req.body;
    const userId = req.user?.id || null;
    const visitorId = req.cookies?.visitor_id;

    // Mark old consent as updated
    await db.query(`
      UPDATE cookie_consents
      SET consent_updated_at = NOW()
      WHERE (user_id = $1 OR visitor_id = $2)
        AND withdrawn_at IS NULL
    `, [userId, visitorId]);

    // Insert new consent record
    await db.query(`
      INSERT INTO cookie_consents (user_id, visitor_id, essential, analytics, marketing, preferences, ip_address, user_agent)
      VALUES ($1, $2, true, $3, $4, $5, $6, $7)
    `, [
      userId,
      visitorId,
      analytics || false,
      marketing || false,
      preferences || false,
      req.ip,
      req.get('User-Agent')
    ]);

    // Update consent cookie
    res.cookie('cookie_consent', JSON.stringify({
      essential: true,
      analytics: analytics || false,
      marketing: marketing || false,
      preferences: preferences || false,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update cookie consent:', error);
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

// POST /api/cookies/withdraw - Withdraw consent
router.post('/withdraw', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const visitorId = req.cookies?.visitor_id;

    await db.query(`
      UPDATE cookie_consents
      SET withdrawn_at = NOW()
      WHERE (user_id = $1 OR visitor_id = $2)
        AND withdrawn_at IS NULL
    `, [userId, visitorId]);

    // Clear consent cookie
    res.clearCookie('cookie_consent');

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to withdraw consent:', error);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

export default router;
