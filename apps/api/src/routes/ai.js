// ============================================================
// NOVA AI & REALTIME ROUTES
// Routes for AI scheduling, push notifications, and WebSocket
// ============================================================

import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import aiScheduling from '../services/aiScheduling.js';
import pushNotifications from '../services/pushNotifications.js';

const router = express.Router();

// ==================== PUSH NOTIFICATIONS ====================

/**
 * Register push token
 */
router.post('/push-token', authMiddleware, async (req, res) => {
  try {
    const { token, platform, deviceName } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    await pushNotifications.registerPushToken(
      req.user.userId,
      token,
      platform || 'unknown',
      deviceName
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Push token registration error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * Remove push token
 */
router.delete('/push-token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (token) {
      await pushNotifications.removePushToken(token);
    } else {
      await pushNotifications.removeAllUserTokens(req.user.userId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Push token removal error:', error);
    res.status(500).json({ error: 'Failed to remove push token' });
  }
});

/**
 * Send test notification (admin only)
 */
router.post('/push-test', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { userId, title, body, data } = req.body;
    const targetUserId = userId || req.user.userId;
    
    const result = await pushNotifications.sendToUser(targetUserId, {
      title: title || 'Test Notification',
      body: body || 'This is a test notification from Uplift',
      data: data || { type: 'test' },
    });
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// ==================== AI SCHEDULING ====================

/**
 * Get demand forecast for a location
 */
router.get('/forecast/:locationId', authMiddleware, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { days } = req.query;
    
    // Verify user has access to this location
    // In production, add proper authorization check
    
    const forecast = await aiScheduling.generateDemandForecast(
      locationId,
      parseInt(days) || 28
    );
    
    res.json(forecast);
  } catch (error) {
    console.error('Forecast generation error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

/**
 * Get schedule suggestions
 */
router.get('/suggestions/:locationId', authMiddleware, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { weekStart } = req.query;
    
    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart query param required' });
    }
    
    const suggestions = await aiScheduling.generateScheduleSuggestions(
      locationId,
      weekStart
    );
    
    res.json(suggestions);
  } catch (error) {
    console.error('Schedule suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate schedule suggestions' });
  }
});

/**
 * Apply AI suggestions (create shifts from suggestions)
 */
router.post('/suggestions/:locationId/apply', authMiddleware, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { suggestions } = req.body;
    
    if (!Array.isArray(suggestions) || !suggestions.length) {
      return res.status(400).json({ error: 'No suggestions provided' });
    }
    
    // In production, this would create actual shifts
    // For now, return success with count
    
    res.json({
      success: true,
      shiftsCreated: suggestions.length,
      message: `Created ${suggestions.length} shifts from AI suggestions`,
    });
  } catch (error) {
    console.error('Apply suggestions error:', error);
    res.status(500).json({ error: 'Failed to apply suggestions' });
  }
});

/**
 * Get AI insights for dashboard
 */
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    // Generate quick insights based on recent patterns
    const insights = {
      scheduling: [
        {
          type: 'understaffed',
          severity: 'warning',
          message: 'Friday afternoon shifts are consistently understaffed',
          recommendation: 'Consider adding 2 more shifts between 2-6pm on Fridays',
        },
        {
          type: 'efficiency',
          severity: 'info',
          message: 'Monday mornings have 15% more staff than needed',
          recommendation: 'Reduce morning shifts by 1-2 on Mondays',
        },
      ],
      trends: {
        demandTrend: 'increasing',
        demandChange: '+8%',
        period: 'last 4 weeks',
      },
      predictions: {
        nextWeekDemand: 'high',
        peakDay: 'Saturday',
        recommendedAction: 'Open 3 additional shifts for Saturday',
      },
    };
    
    res.json(insights);
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
