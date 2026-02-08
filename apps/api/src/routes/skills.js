// ============================================================
// SKILLS & INTERNAL MOBILITY ROUTES
// Skills management, job postings, career pathing
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// SKILLS MANAGEMENT
// ============================================================

/**
 * GET /api/skills - List all skills for organization
 */
router.get('/skills', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = `
      SELECT s.*, 
        COUNT(DISTINCT es.employee_id) as employee_count
      FROM skills s
      LEFT JOIN employee_skills es ON es.skill_id = s.id
      WHERE s.organization_id = $1
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;

    if (category) {
      query += ` AND s.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND s.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY s.id ORDER BY s.category, s.name`;

    const result = await db.query(query, params);

    // Get categories for filtering
    const categoriesResult = await db.query(
      `SELECT DISTINCT category FROM skills WHERE organization_id = $1 AND category IS NOT NULL ORDER BY category`,
      [req.user.organizationId]
    );

    res.json({ 
      skills: result.rows,
      categories: categoriesResult.rows.map(r => r.category),
    });
  } catch (error) {
    console.error('List skills error:', error);
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

/**
 * POST /api/skills - Create skill
 */
router.post('/skills', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, category, requiresVerification, expiresAfterDays } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const result = await db.query(
      `INSERT INTO skills (organization_id, name, category, requires_verification, expires_after_days)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.organizationId, name, category, requiresVerification || false, expiresAfterDays]
    );

    res.status(201).json({ skill: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Skill with this name already exists' });
    }
    console.error('Create skill error:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

/**
 * PUT /api/skills/:id - Update skill
 */
router.patch('/skills/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, category, requiresVerification, expiresAfterDays } = req.body;

    const result = await db.query(
      `UPDATE skills 
       SET name = COALESCE($3, name),
           category = COALESCE($4, category),
           requires_verification = COALESCE($5, requires_verification),
           expires_after_days = $6
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [req.params.id, req.user.organizationId, name, category, requiresVerification, expiresAfterDays]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ skill: result.rows[0] });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

/**
 * DELETE /api/skills/:id - Delete skill
 */
router.delete('/skills/:id', requireRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM skills WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

/**
 * GET /api/skills/:id/employees - Get employees with skill
 */
router.get('/skills/:id/employees', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.avatar_url,
              e.role, e.department_id,
              d.name as department,
              es.level, es.verified, es.verified_at, es.expires_at,
              u.first_name as verified_by_name, u.last_name as verified_by_last
       FROM employees e
       JOIN employee_skills es ON es.employee_id = e.id
       LEFT JOIN users u ON u.id = es.verified_by
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE es.skill_id = $1 AND e.organization_id = $2
       ORDER BY es.level DESC, e.first_name`,
      [req.params.id, req.user.organizationId]
    );

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get skill employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

// ============================================================
// EMPLOYEE SKILLS
// ============================================================

/**
 * GET /api/employees/:id/skills - Get employee's skills
 */
router.get('/employees/:id/skills', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT es.*, s.name, s.category, s.requires_verification,
              u.first_name as verified_by_name, u.last_name as verified_by_last
       FROM employee_skills es
       JOIN skills s ON s.id = es.skill_id
       LEFT JOIN users u ON u.id = es.verified_by
       JOIN employees e ON e.id = es.employee_id
       WHERE es.employee_id = $1 AND e.organization_id = $2
       ORDER BY s.category, s.name`,
      [req.params.id, req.user.organizationId]
    );

    res.json({ skills: result.rows });
  } catch (error) {
    console.error('Get employee skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

/**
 * POST /api/employees/:id/skills - Add skill to employee
 */
router.post('/employees/:id/skills', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { skillId, level } = req.body;

    if (!skillId) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    // Verify employee belongs to org
    const empCheck = await db.query(
      `SELECT id FROM employees WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );
    if (!empCheck.rows[0]) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get skill to check expiry
    const skillResult = await db.query(
      `SELECT * FROM skills WHERE id = $1 AND organization_id = $2`,
      [skillId, req.user.organizationId]
    );
    if (!skillResult.rows[0]) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const skill = skillResult.rows[0];
    const expiresAt = skill.expires_after_days 
      ? new Date(Date.now() + skill.expires_after_days * 24 * 60 * 60 * 1000)
      : null;

    const result = await db.query(
      `INSERT INTO employee_skills (employee_id, skill_id, level, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_id, skill_id) DO UPDATE SET level = $3, expires_at = $4
       RETURNING *`,
      [req.params.id, skillId, level || 1, expiresAt]
    );

    res.status(201).json({ employeeSkill: result.rows[0] });
  } catch (error) {
    console.error('Add employee skill error:', error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

/**
 * PUT /api/employees/:empId/skills/:skillId - Update employee skill
 */
router.put('/employees/:empId/skills/:skillId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { level, verified } = req.body;

    let query = `
      UPDATE employee_skills es
      SET level = COALESCE($3, level)
    `;
    const params = [req.params.empId, req.params.skillId, level];

    if (verified !== undefined) {
      query += `, verified = $4, verified_by = $5, verified_at = $6`;
      params.push(verified, verified ? req.user.userId : null, verified ? new Date() : null);
    }

    query += `
      FROM employees e
      WHERE es.employee_id = $1 AND es.skill_id = $2 
        AND es.employee_id = e.id AND e.organization_id = $${params.length + 1}
      RETURNING es.*
    `;
    params.push(req.user.organizationId);

    const result = await db.query(query, params);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Employee skill not found' });
    }

    res.json({ employeeSkill: result.rows[0] });
  } catch (error) {
    console.error('Update employee skill error:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

/**
 * DELETE /api/employees/:empId/skills/:skillId - Remove skill from employee
 */
router.delete('/employees/:empId/skills/:skillId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM employee_skills es
       USING employees e
       WHERE es.employee_id = $1 AND es.skill_id = $2 
         AND es.employee_id = e.id AND e.organization_id = $3
       RETURNING es.id`,
      [req.params.empId, req.params.skillId, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Employee skill not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Remove employee skill error:', error);
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

// ============================================================
// JOB POSTINGS (Internal Mobility)
// ============================================================

/**
 * GET /api/jobs - List job postings
 */
router.get('/jobs', async (req, res) => {
  try {
    const { status, departmentId, locationId } = req.query;
    
    let query = `
      SELECT jp.*, 
        d.name as department_name,
        l.name as location_name,
        r.name as role_name,
        COUNT(ja.id) as application_count
      FROM job_postings jp
      LEFT JOIN departments d ON d.id = jp.department_id
      LEFT JOIN locations l ON l.id = jp.location_id
      LEFT JOIN roles r ON r.id = jp.role_id
      LEFT JOIN job_applications ja ON ja.job_posting_id = jp.id
      WHERE jp.organization_id = $1
    `;
    const params = [req.user.organizationId];
    let paramIndex = 2;

    // Workers only see active internal postings
    if (!['admin', 'manager'].includes(req.user.role)) {
      query += ` AND jp.status = 'active' AND jp.visibility = 'internal'`;
    } else if (status) {
      query += ` AND jp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (departmentId) {
      query += ` AND jp.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    if (locationId) {
      query += ` AND jp.location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    query += ` GROUP BY jp.id, d.name, l.name, r.name ORDER BY jp.created_at DESC`;

    const result = await db.query(query, params);

    res.json({ jobs: result.rows });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

/**
 * GET /api/jobs/:id - Get job posting details
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT jp.*, 
        d.name as department_name,
        l.name as location_name,
        r.name as role_name,
        u.first_name as created_by_name, u.last_name as created_by_last
       FROM job_postings jp
       LEFT JOIN departments d ON d.id = jp.department_id
       LEFT JOIN locations l ON l.id = jp.location_id
       LEFT JOIN roles r ON r.id = jp.role_id
       LEFT JOIN users u ON u.id = jp.created_by
       WHERE jp.id = $1 AND jp.organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get required skills
    const skillsResult = await db.query(
      `SELECT * FROM skills WHERE id = ANY($1)`,
      [result.rows[0].required_skills || []]
    );

    const job = result.rows[0];
    job.requiredSkillsList = skillsResult.rows;

    // Check if current user has applied (if they're an employee)
    const employeeResult = await db.query(
      `SELECT id FROM employees WHERE user_id = $1`,
      [req.user.userId]
    );
    
    if (employeeResult.rows[0]) {
      const applicationResult = await db.query(
        `SELECT * FROM job_applications WHERE job_posting_id = $1 AND employee_id = $2`,
        [req.params.id, employeeResult.rows[0].id]
      );
      job.myApplication = applicationResult.rows[0] || null;
    }

    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

/**
 * POST /api/jobs - Create job posting
 */
router.post('/jobs', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { 
      title, description, roleId, departmentId, locationId,
      employmentType, hourlyRateMin, hourlyRateMax, 
      requiredSkills, visibility, closesAt 
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Job title is required' });
    }

    const result = await db.query(
      `INSERT INTO job_postings (
        organization_id, title, description, role_id, department_id, location_id,
        employment_type, hourly_rate_min, hourly_rate_max, required_skills,
        visibility, closes_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        req.user.organizationId, title, description, roleId, departmentId, locationId,
        employmentType, hourlyRateMin, hourlyRateMax, requiredSkills || [],
        visibility || 'internal', closesAt, req.user.userId
      ]
    );

    res.status(201).json({ job: result.rows[0] });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * PUT /api/jobs/:id - Update job posting
 */
router.put('/jobs/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { 
      title, description, roleId, departmentId, locationId,
      employmentType, hourlyRateMin, hourlyRateMax, 
      requiredSkills, visibility, status, closesAt 
    } = req.body;

    let postedAt = null;
    if (status === 'active') {
      // Check if currently not active, set posted_at
      const current = await db.query(
        `SELECT status, posted_at FROM job_postings WHERE id = $1`,
        [req.params.id]
      );
      if (current.rows[0]?.status !== 'active' && !current.rows[0]?.posted_at) {
        postedAt = new Date();
      }
    }

    const result = await db.query(
      `UPDATE job_postings SET
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        role_id = $5,
        department_id = $6,
        location_id = $7,
        employment_type = COALESCE($8, employment_type),
        hourly_rate_min = $9,
        hourly_rate_max = $10,
        required_skills = COALESCE($11, required_skills),
        visibility = COALESCE($12, visibility),
        status = COALESCE($13, status),
        closes_at = $14,
        posted_at = COALESCE($15, posted_at),
        updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [
        req.params.id, req.user.organizationId, title, description,
        roleId, departmentId, locationId, employmentType,
        hourlyRateMin, hourlyRateMax, requiredSkills, visibility,
        status, closesAt, postedAt
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job: result.rows[0] });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

/**
 * DELETE /api/jobs/:id - Delete job posting
 */
router.delete('/jobs/:id', requireRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM job_postings WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [req.params.id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ============================================================
// JOB APPLICATIONS
// ============================================================

/**
 * GET /api/jobs/:id/applications - Get applications for a job
 */
router.get('/jobs/:id/applications', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ja.*, 
        e.first_name, e.last_name, e.email, e.avatar_url,
        e.hire_date, e.hourly_rate,
        d.name as department_name,
        r.name as role_name
       FROM job_applications ja
       JOIN employees e ON e.id = ja.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN roles r ON r.id = e.role_id
       JOIN job_postings jp ON jp.id = ja.job_posting_id
       WHERE ja.job_posting_id = $1 AND jp.organization_id = $2
       ORDER BY ja.created_at DESC`,
      [req.params.id, req.user.organizationId]
    );

    // Get skills for each applicant
    for (const app of result.rows) {
      const skillsResult = await db.query(
        `SELECT s.name, es.level, es.verified
         FROM employee_skills es
         JOIN skills s ON s.id = es.skill_id
         WHERE es.employee_id = $1`,
        [app.employee_id]
      );
      app.skills = skillsResult.rows;
    }

    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

/**
 * POST /api/jobs/:id/apply - Apply for a job
 */
router.post('/jobs/:id/apply', async (req, res) => {
  try {
    const { coverLetter } = req.body;

    // Get employee ID for current user
    const empResult = await db.query(
      `SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2`,
      [req.user.userId, req.user.organizationId]
    );

    if (!empResult.rows[0]) {
      return res.status(400).json({ error: 'Employee record not found' });
    }

    // Verify job exists and is open
    const jobResult = await db.query(
      `SELECT * FROM job_postings 
       WHERE id = $1 AND organization_id = $2 AND status = 'active'`,
      [req.params.id, req.user.organizationId]
    );

    if (!jobResult.rows[0]) {
      return res.status(404).json({ error: 'Job not found or not accepting applications' });
    }

    const result = await db.query(
      `INSERT INTO job_applications (job_posting_id, employee_id, cover_letter)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, empResult.rows[0].id, coverLetter]
    );

    res.status(201).json({ application: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }
    console.error('Apply error:', error);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

/**
 * PUT /api/jobs/:jobId/applications/:appId - Update application status
 */
router.put('/jobs/:jobId/applications/:appId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status, interviewScheduledAt } = req.body;

    const result = await db.query(
      `UPDATE job_applications ja
       SET status = COALESCE($3, status),
           interview_scheduled_at = $4,
           updated_at = NOW()
       FROM job_postings jp
       WHERE ja.id = $1 AND ja.job_posting_id = $2 
         AND ja.job_posting_id = jp.id AND jp.organization_id = $5
       RETURNING ja.*`,
      [req.params.appId, req.params.jobId, status, interviewScheduledAt, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application: result.rows[0] });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// ============================================================
// SKILLS MATCHING
// ============================================================

/**
 * GET /api/jobs/:id/matches - Get employees matching job skills
 */
router.get('/jobs/:id/matches', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const jobResult = await db.query(
      `SELECT required_skills FROM job_postings WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user.organizationId]
    );

    if (!jobResult.rows[0]) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const requiredSkills = jobResult.rows[0].required_skills || [];

    if (requiredSkills.length === 0) {
      return res.json({ matches: [] });
    }

    // Find employees with matching skills
    const result = await db.query(
      `SELECT 
        e.id, e.first_name, e.last_name, e.email, e.avatar_url,
        d.name as department_name,
        r.name as role_name,
        COUNT(DISTINCT es.skill_id) FILTER (WHERE es.skill_id = ANY($2)) as matched_skills,
        array_length($2, 1) as required_skills_count,
        ROUND(COUNT(DISTINCT es.skill_id) FILTER (WHERE es.skill_id = ANY($2))::numeric / 
              NULLIF(array_length($2, 1), 0) * 100, 0) as match_percentage
       FROM employees e
       LEFT JOIN employee_skills es ON es.employee_id = e.id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE e.organization_id = $1 AND e.status = 'active'
       GROUP BY e.id, d.name, r.name
       HAVING COUNT(DISTINCT es.skill_id) FILTER (WHERE es.skill_id = ANY($2)) > 0
       ORDER BY matched_skills DESC, e.first_name`,
      [req.user.organizationId, requiredSkills]
    );

    res.json({ matches: result.rows });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

/**
 * GET /api/employees/:id/career-paths - Get potential career paths
 */
router.get('/employees/:id/career-paths', async (req, res) => {
  try {
    // Get employee's current skills
    const skillsResult = await db.query(
      `SELECT skill_id FROM employee_skills WHERE employee_id = $1`,
      [req.params.id]
    );
    const employeeSkills = skillsResult.rows.map(r => r.skill_id);

    // Find jobs they could apply for
    const jobsResult = await db.query(
      `SELECT jp.*, 
        d.name as department_name,
        l.name as location_name,
        COALESCE(
          ROUND(
            (SELECT COUNT(*) FROM unnest(jp.required_skills) rs WHERE rs = ANY($2))::numeric /
            NULLIF(array_length(jp.required_skills, 1), 0) * 100
          , 0),
          100
        ) as match_percentage
       FROM job_postings jp
       LEFT JOIN departments d ON d.id = jp.department_id
       LEFT JOIN locations l ON l.id = jp.location_id
       WHERE jp.organization_id = $1 
         AND jp.status = 'active'
         AND jp.visibility = 'internal'
       ORDER BY match_percentage DESC`,
      [req.user.organizationId, employeeSkills]
    );

    // Find skills gaps
    const allRequiredSkills = new Set();
    for (const job of jobsResult.rows) {
      (job.required_skills || []).forEach(s => allRequiredSkills.add(s));
    }

    const missingSkillIds = [...allRequiredSkills].filter(s => !employeeSkills.includes(s));
    
    let missingSkills = [];
    if (missingSkillIds.length > 0) {
      const msResult = await db.query(
        `SELECT * FROM skills WHERE id = ANY($1)`,
        [missingSkillIds]
      );
      missingSkills = msResult.rows;
    }

    res.json({ 
      careerPaths: jobsResult.rows,
      skillsGap: missingSkills,
    });
  } catch (error) {
    console.error('Get career paths error:', error);
    res.status(500).json({ error: 'Failed to get career paths' });
  }
});

export default router;
