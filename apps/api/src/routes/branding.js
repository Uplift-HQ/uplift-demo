// ============================================================
// BRANDING API ROUTES
// White-label branding endpoints for organizations
// ============================================================

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import storageService from '../services/storage.js';

const router = Router();

// ============================================================
// HELPERS
// ============================================================

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const LOGO_TYPE_TO_COLUMN = {
  primary: 'logo_url',
  dark: 'logo_dark_url',
  favicon: 'favicon_url',
  email: 'email_logo_url',
  login_background: 'login_background_url',
};

/**
 * Check if an organization has a specific feature enabled.
 * Checks the org's features JSONB and falls back to plan-level defaults.
 */
async function checkFeature(orgId, featureName) {
  const result = await db.query(
    `SELECT features, plan FROM organizations WHERE id = $1`,
    [orgId]
  );

  if (!result.rows[0]) return false;

  const { features, plan } = result.rows[0];

  // Check org-level feature flags first
  if (features && typeof features === 'object' && featureName in features) {
    return !!features[featureName];
  }

  // Plan-level defaults: enterprise and business plans get custom_branding
  const PLAN_FEATURES = {
    enterprise: ['custom_branding'],
    business: ['custom_branding'],
    professional: [],
    starter: [],
    trial: [],
  };

  const planFeatures = PLAN_FEATURES[plan] || [];
  return planFeatures.includes(featureName);
}

// Multer config for logo uploads: 2MB max, images only
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, and SVG files are allowed'), false);
    }
    cb(null, true);
  },
});

// ============================================================
// GET /api/branding — PUBLIC (no auth required)
// Mobile apps call this on startup before login.
// Identifies org by ?org=slug query param or subdomain.
// ============================================================

router.get('/branding', async (req, res) => {
  try {
    const slug = req.query.org || extractSubdomain(req);

    if (!slug) {
      return res.status(400).json({ error: 'Organization slug is required. Pass ?org=slug or use a subdomain.' });
    }

    const result = await db.query(
      `SELECT
         name, slug, brand_name, primary_color, secondary_color,
         logo_url, logo_dark_url, favicon_url,
         login_background_url, email_logo_url
       FROM organizations
       WHERE slug = $1`,
      [slug]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = result.rows[0];

    res.json({
      branding: {
        brandName: org.brand_name || org.name,
        primaryColor: org.primary_color || '#F26522',
        secondaryColor: org.secondary_color || null,
        logoUrl: org.logo_url || null,
        logoDarkUrl: org.logo_dark_url || null,
        faviconUrl: org.favicon_url || null,
        loginBackgroundUrl: org.login_background_url || null,
        emailLogoUrl: org.email_logo_url || null,
      },
    });
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: 'Failed to get branding' });
  }
});

/**
 * Extract subdomain from Host header.
 * e.g. "acme.uplift.app" -> "acme"
 */
function extractSubdomain(req) {
  const host = req.headers.host || '';
  const parts = host.split('.');
  // Only treat as subdomain if there are 3+ parts (sub.domain.tld)
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

// ============================================================
// PUT /api/organization/branding — Auth required, admin only
// Update branding fields. Requires custom_branding feature.
// ============================================================

router.put('/organization/branding', authMiddleware, async (req, res) => {
  try {
    const { organizationId, role } = req.user;

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Feature flag check
    const hasFeature = await checkFeature(organizationId, 'custom_branding');
    if (!hasFeature) {
      return res.status(403).json({ error: 'Custom branding requires an upgraded plan' });
    }

    const {
      brandName,
      primaryColor,
      secondaryColor,
      customCss,
    } = req.body;

    // Validate hex colors if provided
    if (primaryColor !== undefined && !HEX_COLOR_REGEX.test(primaryColor)) {
      return res.status(400).json({ error: 'Invalid primaryColor. Must be a hex color like #FF6B35.' });
    }
    if (secondaryColor !== undefined && !HEX_COLOR_REGEX.test(secondaryColor)) {
      return res.status(400).json({ error: 'Invalid secondaryColor. Must be a hex color like #1E3A5F.' });
    }

    const setClauses = [];
    const values = [organizationId];
    let i = 2;

    if (brandName !== undefined) {
      setClauses.push(`brand_name = $${i++}`);
      values.push(brandName);
    }
    if (primaryColor !== undefined) {
      setClauses.push(`primary_color = $${i++}`);
      values.push(primaryColor);
    }
    if (secondaryColor !== undefined) {
      setClauses.push(`secondary_color = $${i++}`);
      values.push(secondaryColor);
    }
    if (customCss !== undefined) {
      setClauses.push(`custom_css = $${i++}`);
      values.push(customCss);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClauses.push(`branding_updated_at = NOW()`);

    const result = await db.query(
      `UPDATE organizations SET ${setClauses.join(', ')} WHERE id = $1
       RETURNING name, slug, brand_name, primary_color, secondary_color,
                 logo_url, logo_dark_url, favicon_url,
                 login_background_url, email_logo_url, custom_css, branding_updated_at`,
      values
    );

    const org = result.rows[0];

    res.json({
      branding: {
        brandName: org.brand_name || org.name,
        primaryColor: org.primary_color,
        secondaryColor: org.secondary_color,
        logoUrl: org.logo_url,
        logoDarkUrl: org.logo_dark_url,
        faviconUrl: org.favicon_url,
        loginBackgroundUrl: org.login_background_url,
        emailLogoUrl: org.email_logo_url,
        customCss: org.custom_css,
        updatedAt: org.branding_updated_at,
      },
    });
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// ============================================================
// POST /api/organization/branding/logo — Auth required, admin only
// Upload a logo. Accepts multipart/form-data with `logo` field.
// Query param `type`: primary, dark, favicon, email, login_background
// ============================================================

router.post('/organization/branding/logo', authMiddleware, (req, res, next) => {
  logoUpload.single('logo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { organizationId, role } = req.user;

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hasFeature = await checkFeature(organizationId, 'custom_branding');
    if (!hasFeature) {
      return res.status(403).json({ error: 'Custom branding requires an upgraded plan' });
    }

    const type = req.query.type || req.body.type || 'primary';
    const column = LOGO_TYPE_TO_COLUMN[type];

    if (!column) {
      return res.status(400).json({
        error: `Invalid logo type. Must be one of: ${Object.keys(LOGO_TYPE_TO_COLUMN).join(', ')}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use the "logo" field.' });
    }

    // Upload to storage
    const key = storageService.generateKey(`branding/${organizationId}`, req.file.originalname);
    const { url } = await storageService.upload(req.file.buffer, key, req.file.mimetype);

    // Update the appropriate column
    await db.query(
      `UPDATE organizations SET ${column} = $2, branding_updated_at = NOW() WHERE id = $1`,
      [organizationId, url]
    );

    res.json({ url, type });
  } catch (error) {
    console.error('Upload branding logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// ============================================================
// DELETE /api/organization/branding/logo/:type — Auth required, admin only
// Remove a logo by type.
// ============================================================

router.delete('/organization/branding/logo/:type', authMiddleware, async (req, res) => {
  try {
    const { organizationId, role } = req.user;

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hasFeature = await checkFeature(organizationId, 'custom_branding');
    if (!hasFeature) {
      return res.status(403).json({ error: 'Custom branding requires an upgraded plan' });
    }

    const { type } = req.params;
    const column = LOGO_TYPE_TO_COLUMN[type];

    if (!column) {
      return res.status(400).json({
        error: `Invalid logo type. Must be one of: ${Object.keys(LOGO_TYPE_TO_COLUMN).join(', ')}`,
      });
    }

    // Get current URL so we can delete from storage
    const current = await db.query(
      `SELECT ${column} FROM organizations WHERE id = $1`,
      [organizationId]
    );

    const currentUrl = current.rows[0]?.[column];

    // Null out the column
    await db.query(
      `UPDATE organizations SET ${column} = NULL, branding_updated_at = NOW() WHERE id = $1`,
      [organizationId]
    );

    // Best-effort delete from storage (extract key from URL)
    if (currentUrl && currentUrl.includes('branding/')) {
      try {
        const key = currentUrl.substring(currentUrl.indexOf('branding/'));
        await storageService.remove(key);
      } catch (e) {
        console.warn('Failed to delete old logo from storage:', e.message);
      }
    }

    res.json({ success: true, type });
  } catch (error) {
    console.error('Delete branding logo error:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

export default router;
export { checkFeature };
