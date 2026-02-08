// ============================================================
// ONBOARDING ROUTES
// Customer onboarding wizard API endpoints
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

// Define onboarding steps
const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', required: true },
  { id: 'company_profile', title: 'Company Profile', required: true },
  { id: 'locations', title: 'Add Locations', required: true },
  { id: 'departments', title: 'Set Up Departments', required: false },
  { id: 'roles', title: 'Configure Roles', required: false },
  { id: 'invite_team', title: 'Invite Team Members', required: true },
  { id: 'billing', title: 'Set Up Billing', required: true },
  { id: 'complete', title: 'Complete', required: true }
];

// GET /api/onboarding/status - Get current onboarding status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const { organization_id } = req.user;

    // Get or create onboarding progress
    let result = await db.query(
      `SELECT * FROM onboarding_progress WHERE organization_id = $1`,
      [organization_id]
    );

    let progress;
    if (result.rows.length === 0) {
      // Create initial progress record
      result = await db.query(
        `INSERT INTO onboarding_progress (organization_id, current_step, completed_steps, skipped_steps)
         VALUES ($1, 'welcome', '[]'::jsonb, '[]'::jsonb)
         RETURNING *`,
        [organization_id]
      );
    }
    progress = result.rows[0];

    // Calculate progress percentage
    const completedSteps = progress.completed_steps || [];
    const skippedSteps = progress.skipped_steps || [];
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.required);
    const completedRequired = requiredSteps.filter(s =>
      completedSteps.includes(s.id) || skippedSteps.includes(s.id)
    ).length;
    const progressPercent = Math.round((completedRequired / requiredSteps.length) * 100);

    res.json({
      currentStep: progress.current_step,
      completedSteps: completedSteps,
      skippedSteps: skippedSteps,
      isCompleted: progress.is_completed,
      completedAt: progress.completed_at,
      progressPercent,
      steps: ONBOARDING_STEPS.map(step => ({
        ...step,
        isCompleted: completedSteps.includes(step.id),
        isSkipped: skippedSteps.includes(step.id),
        isCurrent: step.id === progress.current_step
      }))
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

// GET /api/onboarding/steps - Get all onboarding steps definition
router.get('/steps', authMiddleware, async (req, res) => {
  res.json({ steps: ONBOARDING_STEPS });
});

// POST /api/onboarding/complete-step - Mark a step as completed
router.post('/complete-step', authMiddleware, async (req, res) => {
  try {
    const { organization_id, id: userId } = req.user;
    const { stepId, stepData } = req.body;

    if (!stepId) {
      return res.status(400).json({ error: 'stepId is required' });
    }

    // Validate step exists
    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return res.status(400).json({ error: 'Invalid step ID' });
    }

    // Get current progress
    const progressResult = await db.query(
      `SELECT * FROM onboarding_progress WHERE organization_id = $1`,
      [organization_id]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Onboarding not started' });
    }

    const progress = progressResult.rows[0];
    const completedSteps = progress.completed_steps || [];

    // Add step to completed if not already there
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    // Determine next step
    let nextStep = progress.current_step;
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      nextStep = ONBOARDING_STEPS[stepIndex + 1].id;
    }

    // Check if all required steps are completed
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.required);
    const skippedSteps = progress.skipped_steps || [];
    const allRequiredDone = requiredSteps.every(s =>
      completedSteps.includes(s.id) || skippedSteps.includes(s.id)
    );
    const isCompleted = stepId === 'complete' || allRequiredDone;

    // Update progress
    await db.query(
      `UPDATE onboarding_progress
       SET completed_steps = $1::jsonb,
           current_step = $2,
           is_completed = $3,
           completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END
       WHERE organization_id = $4`,
      [JSON.stringify(completedSteps), nextStep, isCompleted, organization_id]
    );

    // Log the step completion
    await db.query(
      `INSERT INTO onboarding_step_log (organization_id, user_id, step_name, action, step_data)
       VALUES ($1, $2, $3, 'completed', $4::jsonb)`,
      [organization_id, userId, stepId, stepData ? JSON.stringify(stepData) : null]
    );

    res.json({
      success: true,
      completedSteps,
      currentStep: nextStep,
      isCompleted,
      message: isCompleted ? 'Onboarding completed!' : `Step "${stepId}" completed`
    });
  } catch (error) {
    console.error('Complete step error:', error);
    res.status(500).json({ error: 'Failed to complete step' });
  }
});

// POST /api/onboarding/skip - Skip a step
router.post('/skip', authMiddleware, async (req, res) => {
  try {
    const { organization_id, id: userId } = req.user;
    const { stepId } = req.body;

    if (!stepId) {
      return res.status(400).json({ error: 'stepId is required' });
    }

    // Validate step exists and is skippable
    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return res.status(400).json({ error: 'Invalid step ID' });
    }

    const step = ONBOARDING_STEPS[stepIndex];
    if (step.required) {
      return res.status(400).json({ error: 'Cannot skip required step' });
    }

    // Get current progress
    const progressResult = await db.query(
      `SELECT * FROM onboarding_progress WHERE organization_id = $1`,
      [organization_id]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Onboarding not started' });
    }

    const progress = progressResult.rows[0];
    const skippedSteps = progress.skipped_steps || [];

    // Add step to skipped if not already there
    if (!skippedSteps.includes(stepId)) {
      skippedSteps.push(stepId);
    }

    // Determine next step
    let nextStep = progress.current_step;
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      nextStep = ONBOARDING_STEPS[stepIndex + 1].id;
    }

    // Update progress
    await db.query(
      `UPDATE onboarding_progress
       SET skipped_steps = $1::jsonb,
           current_step = $2
       WHERE organization_id = $3`,
      [JSON.stringify(skippedSteps), nextStep, organization_id]
    );

    // Log the skip
    await db.query(
      `INSERT INTO onboarding_step_log (organization_id, user_id, step_name, action)
       VALUES ($1, $2, $3, 'skipped')`,
      [organization_id, userId, stepId]
    );

    res.json({
      success: true,
      skippedSteps,
      currentStep: nextStep,
      message: `Step "${stepId}" skipped`
    });
  } catch (error) {
    console.error('Skip step error:', error);
    res.status(500).json({ error: 'Failed to skip step' });
  }
});

// POST /api/onboarding/reset - Reset onboarding (admin only)
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const { organization_id, role } = req.user;

    // Only admins can reset
    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can reset onboarding' });
    }

    await db.query(
      `UPDATE onboarding_progress
       SET current_step = 'welcome',
           completed_steps = '[]'::jsonb,
           skipped_steps = '[]'::jsonb,
           is_completed = false,
           completed_at = NULL
       WHERE organization_id = $1`,
      [organization_id]
    );

    res.json({
      success: true,
      message: 'Onboarding reset successfully'
    });
  } catch (error) {
    console.error('Reset onboarding error:', error);
    res.status(500).json({ error: 'Failed to reset onboarding' });
  }
});

// POST /api/onboarding/go-to-step - Navigate to a specific step
router.post('/go-to-step', authMiddleware, async (req, res) => {
  try {
    const { organization_id, id: userId } = req.user;
    const { stepId } = req.body;

    if (!stepId) {
      return res.status(400).json({ error: 'stepId is required' });
    }

    // Validate step exists
    const stepExists = ONBOARDING_STEPS.some(s => s.id === stepId);
    if (!stepExists) {
      return res.status(400).json({ error: 'Invalid step ID' });
    }

    // Update current step
    await db.query(
      `UPDATE onboarding_progress
       SET current_step = $1
       WHERE organization_id = $2`,
      [stepId, organization_id]
    );

    // Log revisit
    await db.query(
      `INSERT INTO onboarding_step_log (organization_id, user_id, step_name, action)
       VALUES ($1, $2, $3, 'revisited')`,
      [organization_id, userId, stepId]
    );

    res.json({
      success: true,
      currentStep: stepId
    });
  } catch (error) {
    console.error('Go to step error:', error);
    res.status(500).json({ error: 'Failed to navigate to step' });
  }
});

export default router;
