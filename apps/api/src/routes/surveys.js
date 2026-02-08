// ============================================================
// SURVEYS API ROUTES
// Employee surveys, eNPS, lifecycle surveys, analytics
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import crypto from 'crypto';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== SURVEYS CRUD ====================

// Get all surveys
router.get('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { status, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT s.*,
             u.first_name || ' ' || u.last_name as created_by_name,
             (SELECT COUNT(*) FROM survey_invitations WHERE survey_id = s.id) as target_count,
             (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id AND is_complete = TRUE) as response_count
      FROM surveys s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.organization_id = $1
    `;
    const params = [organizationId];

    if (status && status !== 'all') {
      query += ` AND s.status = $${params.length + 1}`;
      params.push(status);
    }

    if (type) {
      query += ` AND s.type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Calculate participation rate for each survey
    const surveys = result.rows.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type,
      status: s.status,
      questions: s.questions?.length || 0,
      responses: parseInt(s.response_count) || 0,
      total: parseInt(s.target_count) || 0,
      participation: s.target_count > 0 ? Math.round((s.response_count / s.target_count) * 100) : 0,
      enps: s.enps_score,
      closesOn: s.closes_on,
      createdBy: s.created_by_name,
      createdAt: s.created_at,
    }));

    res.json({ surveys });
  } catch (error) {
    console.error('Failed to get surveys:', error);
    res.status(500).json({ error: 'Failed to get surveys' });
  }
});

// Get survey by ID
router.get('/:id', async (req, res) => {
  try {
    const { organizationId, role, employeeId } = req.user;
    const { id } = req.params;

    const result = await db.query(`
      SELECT s.*,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM surveys s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = $1 AND s.organization_id = $2
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const survey = result.rows[0];

    // If employee, check if they're invited
    if (role === 'employee') {
      const invitation = await db.query(`
        SELECT * FROM survey_invitations
        WHERE survey_id = $1 AND employee_id = $2
      `, [id, employeeId]);

      if (invitation.rows.length === 0 && survey.target_type !== 'all') {
        return res.status(403).json({ error: 'Not authorized to view this survey' });
      }
    }

    res.json({ survey });
  } catch (error) {
    console.error('Failed to get survey:', error);
    res.status(500).json({ error: 'Failed to get survey' });
  }
});

// Create survey
router.post('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const {
      name,
      description,
      type,
      templateId,
      questions,
      targetType = 'all',
      targetIds,
      closesOn,
      isAnonymous = true,
      allowComments = true,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // If templateId provided, copy questions from template
    let surveyQuestions = questions || [];
    if (templateId && !questions) {
      const template = await db.query(
        'SELECT questions FROM survey_templates WHERE id = $1',
        [templateId]
      );
      if (template.rows.length > 0) {
        surveyQuestions = template.rows[0].questions;
      }
    }

    const result = await db.query(`
      INSERT INTO surveys (
        organization_id, template_id, name, description, type,
        questions, target_type, target_ids, closes_on,
        is_anonymous, allow_comments, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      organizationId, templateId, name, description, type,
      JSON.stringify(surveyQuestions), targetType, targetIds || [],
      closesOn, isAnonymous, allowComments, userId
    ]);

    res.status(201).json({ survey: result.rows[0] });
  } catch (error) {
    console.error('Failed to create survey:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

// Update survey
router.put('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    // Only allow updates if survey is in draft status
    const existing = await db.query(
      'SELECT status FROM surveys WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (existing.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Can only edit draft surveys' });
    }

    const fields = [];
    const params = [id, organizationId];
    let paramIndex = 3;

    const allowedFields = ['name', 'description', 'questions', 'target_type', 'target_ids', 'closes_on', 'is_anonymous', 'allow_comments'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        params.push(field === 'questions' ? JSON.stringify(updates[field]) : updates[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = NOW()');

    const result = await db.query(`
      UPDATE surveys
      SET ${fields.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, params);

    res.json({ survey: result.rows[0] });
  } catch (error) {
    console.error('Failed to update survey:', error);
    res.status(500).json({ error: 'Failed to update survey' });
  }
});

// Publish/launch survey
router.post('/:id/publish', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { id } = req.params;

    // Get survey
    const survey = await db.query(
      'SELECT * FROM surveys WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Survey is already published' });
    }

    // Get target employees
    let employees;
    const s = survey.rows[0];

    if (s.target_type === 'all') {
      employees = await db.query(
        'SELECT id FROM employees WHERE organization_id = $1 AND status = $2',
        [organizationId, 'active']
      );
    } else if (s.target_type === 'department') {
      employees = await db.query(
        'SELECT id FROM employees WHERE organization_id = $1 AND status = $2 AND department_id = ANY($3)',
        [organizationId, 'active', s.target_ids]
      );
    } else if (s.target_type === 'location') {
      employees = await db.query(
        'SELECT id FROM employees WHERE organization_id = $1 AND status = $2 AND primary_location_id = ANY($3)',
        [organizationId, 'active', s.target_ids]
      );
    } else {
      employees = await db.query(
        'SELECT id FROM employees WHERE organization_id = $1 AND status = $2 AND id = ANY($3)',
        [organizationId, 'active', s.target_ids]
      );
    }

    // Create invitations
    for (const emp of employees.rows) {
      const token = crypto.randomBytes(32).toString('hex');
      await db.query(`
        INSERT INTO survey_invitations (survey_id, employee_id, token, status)
        VALUES ($1, $2, $3, 'pending')
        ON CONFLICT (survey_id, employee_id) DO NOTHING
      `, [id, emp.id, token]);
    }

    // Update survey status
    await db.query(`
      UPDATE surveys
      SET status = 'active', published_by = $1, published_at = NOW(), target_count = $2, updated_at = NOW()
      WHERE id = $3
    `, [userId, employees.rows.length, id]);

    res.json({ success: true, invitationsSent: employees.rows.length });
  } catch (error) {
    console.error('Failed to publish survey:', error);
    res.status(500).json({ error: 'Failed to publish survey' });
  }
});

// Close survey
router.post('/:id/close', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE surveys
      SET status = 'closed', closed_by = $1, closed_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND status = 'active'
      RETURNING *
    `, [userId, id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found or not active' });
    }

    res.json({ survey: result.rows[0] });
  } catch (error) {
    console.error('Failed to close survey:', error);
    res.status(500).json({ error: 'Failed to close survey' });
  }
});

// ==================== RESPONSES ====================

// Submit response
router.post('/:id/respond', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;
    const { id } = req.params;
    const { answers } = req.body;

    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Check survey exists and is active
    const survey = await db.query(
      'SELECT * FROM surveys WHERE id = $1 AND organization_id = $2 AND status = $3',
      [id, organizationId, 'active']
    );

    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found or not active' });
    }

    const s = survey.rows[0];

    // Check if already responded
    const existing = await db.query(
      'SELECT id FROM survey_responses WHERE survey_id = $1 AND employee_id = $2',
      [id, employeeId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already responded to this survey' });
    }

    // Calculate eNPS if there's an NPS question
    let enpsResponse = null;
    const questions = s.questions || [];
    const npsQuestion = questions.find(q => q.type === 'nps');
    if (npsQuestion && answers[npsQuestion.id] !== undefined) {
      const score = parseInt(answers[npsQuestion.id]);
      if (score >= 9) enpsResponse = 100; // Promoter
      else if (score >= 7) enpsResponse = 0; // Passive
      else enpsResponse = -100; // Detractor
    }

    // Calculate overall score (average of rating questions)
    const ratingQuestions = questions.filter(q => q.type === 'rating');
    let overallScore = null;
    if (ratingQuestions.length > 0) {
      const scores = ratingQuestions
        .map(q => answers[q.id])
        .filter(a => a !== undefined && !isNaN(a));
      if (scores.length > 0) {
        overallScore = scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length;
      }
    }

    // Create response
    const anonymousId = s.is_anonymous ? crypto.randomBytes(16).toString('hex') : null;

    const response = await db.query(`
      INSERT INTO survey_responses (
        survey_id, employee_id, anonymous_id, answers, enps_response, overall_score, completed_at, is_complete
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), TRUE)
      RETURNING *
    `, [id, s.is_anonymous ? null : employeeId, anonymousId, JSON.stringify(answers), enpsResponse, overallScore]);

    // Update invitation status
    await db.query(`
      UPDATE survey_invitations
      SET status = 'completed', completed_at = NOW()
      WHERE survey_id = $1 AND employee_id = $2
    `, [id, employeeId]);

    // Update survey response count
    await db.query(`
      UPDATE surveys
      SET response_count = response_count + 1,
          participation_rate = (
            SELECT ROUND((COUNT(*) FILTER (WHERE is_complete = TRUE)::DECIMAL / NULLIF(target_count, 0)) * 100, 2)
            FROM survey_responses WHERE survey_id = $1
          ),
          updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.status(201).json({ success: true, responseId: response.rows[0].id });
  } catch (error) {
    console.error('Failed to submit response:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// Get my pending surveys
router.get('/my/pending', async (req, res) => {
  try {
    const { organizationId, employeeId } = req.user;

    const result = await db.query(`
      SELECT s.id, s.name, s.description, s.type, s.closes_on,
             si.status as invitation_status
      FROM surveys s
      JOIN survey_invitations si ON si.survey_id = s.id
      WHERE s.organization_id = $1
        AND si.employee_id = $2
        AND s.status = 'active'
        AND si.status IN ('pending', 'sent', 'opened', 'started')
      ORDER BY s.closes_on ASC NULLS LAST
    `, [organizationId, employeeId]);

    res.json({ surveys: result.rows });
  } catch (error) {
    console.error('Failed to get pending surveys:', error);
    res.status(500).json({ error: 'Failed to get pending surveys' });
  }
});

// ==================== RESULTS & ANALYTICS ====================

// Get survey results
router.get('/:id/results', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    // Get survey
    const survey = await db.query(
      'SELECT * FROM surveys WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (survey.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const s = survey.rows[0];

    // Get responses
    const responses = await db.query(`
      SELECT answers, enps_response, overall_score, completed_at
      FROM survey_responses
      WHERE survey_id = $1 AND is_complete = TRUE
    `, [id]);

    // Calculate question-level results
    const questions = s.questions || [];
    const questionResults = questions.map(q => {
      const answersForQ = responses.rows
        .map(r => r.answers[q.id])
        .filter(a => a !== undefined && a !== null);

      if (q.type === 'rating' || q.type === 'nps') {
        const numericAnswers = answersForQ.map(a => parseFloat(a)).filter(a => !isNaN(a));
        const avg = numericAnswers.length > 0
          ? numericAnswers.reduce((a, b) => a + b, 0) / numericAnswers.length
          : 0;

        // Distribution for 1-5 scale
        const distribution = [0, 0, 0, 0, 0];
        numericAnswers.forEach(a => {
          const bucket = Math.min(Math.max(Math.round(a) - 1, 0), 4);
          distribution[bucket]++;
        });

        return {
          id: q.id,
          text: q.text,
          category: q.category,
          type: q.type,
          avg: Math.round(avg * 10) / 10,
          distribution,
          responseCount: numericAnswers.length,
        };
      } else if (q.type === 'choice') {
        const counts = {};
        answersForQ.forEach(a => {
          counts[a] = (counts[a] || 0) + 1;
        });

        return {
          id: q.id,
          text: q.text,
          category: q.category,
          type: q.type,
          counts,
          responseCount: answersForQ.length,
        };
      } else {
        return {
          id: q.id,
          text: q.text,
          category: q.category,
          type: q.type,
          responses: answersForQ.slice(0, 50), // Limit text responses
          responseCount: answersForQ.length,
        };
      }
    });

    // Calculate eNPS
    const enpsResponses = responses.rows.filter(r => r.enps_response !== null);
    let enps = null;
    if (enpsResponses.length > 0) {
      const promoters = enpsResponses.filter(r => r.enps_response === 100).length;
      const detractors = enpsResponses.filter(r => r.enps_response === -100).length;
      enps = Math.round(((promoters - detractors) / enpsResponses.length) * 100);
    }

    res.json({
      survey: {
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        responseCount: responses.rows.length,
        targetCount: s.target_count,
        participationRate: s.target_count > 0 ? Math.round((responses.rows.length / s.target_count) * 100) : 0,
        enps,
      },
      questionResults,
    });
  } catch (error) {
    console.error('Failed to get results:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// ==================== eNPS DASHBOARD ====================

// Get eNPS dashboard data
router.get('/analytics/enps', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get current eNPS from most recent survey with NPS question
    const currentEnps = await db.query(`
      SELECT s.enps_score, s.name, s.closes_on
      FROM surveys s
      WHERE s.organization_id = $1
        AND s.enps_score IS NOT NULL
        AND s.status IN ('active', 'closed')
      ORDER BY COALESCE(s.closed_at, s.created_at) DESC
      LIMIT 1
    `, [organizationId]);

    // Get eNPS history
    const history = await db.query(`
      SELECT period_start, period_end, enps_score, total_responses
      FROM enps_history
      WHERE organization_id = $1
      ORDER BY period_start DESC
      LIMIT 12
    `, [organizationId]);

    // Get eNPS by department (from most recent survey)
    const byDepartment = await db.query(`
      SELECT d.name as department,
             AVG(sr.enps_response) as avg_enps,
             COUNT(*) as response_count
      FROM survey_responses sr
      JOIN employees e ON e.id = sr.employee_id
      JOIN departments d ON d.id = e.department_id
      JOIN surveys s ON s.id = sr.survey_id
      WHERE s.organization_id = $1
        AND sr.enps_response IS NOT NULL
        AND s.status IN ('active', 'closed')
      GROUP BY d.id, d.name
      ORDER BY avg_enps DESC
    `, [organizationId]);

    res.json({
      current: currentEnps.rows[0] || null,
      history: history.rows.reverse(),
      byDepartment: byDepartment.rows.map(d => ({
        dept: d.department,
        score: Math.round(d.avg_enps / 100 * 100), // Convert to -100 to 100 scale
        responses: parseInt(d.response_count),
      })),
    });
  } catch (error) {
    console.error('Failed to get eNPS data:', error);
    res.status(500).json({ error: 'Failed to get eNPS data' });
  }
});

// ==================== TEMPLATES ====================

// Get templates
router.get('/templates/list', async (req, res) => {
  try {
    const { organizationId } = req.user;

    const result = await db.query(`
      SELECT id, name, description, type, is_system,
             jsonb_array_length(questions) as question_count
      FROM survey_templates
      WHERE organization_id IS NULL OR organization_id = $1
      ORDER BY is_system DESC, name ASC
    `, [organizationId]);

    const templates = result.rows.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      questions: t.question_count,
      isSystem: t.is_system,
    }));

    res.json({ templates });
  } catch (error) {
    console.error('Failed to get templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get template details
router.get('/templates/:id', async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const result = await db.query(`
      SELECT * FROM survey_templates
      WHERE id = $1 AND (organization_id IS NULL OR organization_id = $2)
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Failed to get template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Get survey stats summary
router.get('/stats/summary', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const stats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        AVG(participation_rate) FILTER (WHERE status IN ('active', 'closed')) as avg_participation,
        AVG(enps_score) FILTER (WHERE enps_score IS NOT NULL) as avg_enps
      FROM surveys
      WHERE organization_id = $1
    `, [organizationId]);

    const s = stats.rows[0];

    res.json({
      activeSurveys: parseInt(s.active_count) || 0,
      draftSurveys: parseInt(s.draft_count) || 0,
      closedSurveys: parseInt(s.closed_count) || 0,
      avgParticipation: Math.round(s.avg_participation || 0),
      avgEnps: Math.round(s.avg_enps || 0),
    });
  } catch (error) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
