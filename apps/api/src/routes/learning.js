// ============================================================
// LEARNING MODULE API
// Training, courses, certifications, and compliance tracking
// ============================================================

import express from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Apply auth to all routes
router.use(authMiddleware);

// ============================================================
// COURSES
// ============================================================

/**
 * GET /api/learning/courses
 * List available courses (filter by category, mandatory, status)
 */
router.get('/courses', async (req, res) => {
  try {
    const { category, mandatory, status = 'published' } = req.query;
    const orgId = req.user.organizationId;

    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM lessons WHERE course_id = c.id) as total_duration,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM courses c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.organization_id = $1
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (status) {
      query += ` AND c.status = $${paramIndex++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND c.category = $${paramIndex++}`;
      params.push(category);
    }
    if (mandatory !== undefined) {
      query += ` AND c.is_mandatory = $${paramIndex++}`;
      params.push(mandatory === 'true');
    }

    query += ' ORDER BY c.is_mandatory DESC, c.title ASC';

    const result = await db.query(query, params);
    res.json({ courses: result.rows });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

/**
 * GET /api/learning/courses/:id
 * Course detail with lessons
 */
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const courseResult = await db.query(`
      SELECT c.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM courses c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = $1 AND c.organization_id = $2
    `, [id, orgId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const lessonsResult = await db.query(`
      SELECT l.*,
        (SELECT COUNT(*) FROM quiz_questions WHERE lesson_id = l.id) as question_count
      FROM lessons l
      WHERE l.course_id = $1
      ORDER BY l.sort_order ASC
    `, [id]);

    // Get enrollment status if user is enrolled
    const enrollmentResult = await db.query(`
      SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2
    `, [req.user.userId, id]);

    const course = courseResult.rows[0];
    course.lessons = lessonsResult.rows;
    course.enrollment = enrollmentResult.rows[0] || null;

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

/**
 * POST /api/learning/courses
 * Create a new course (admin/manager only)
 */
router.post('/courses', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { title, description, category, difficulty, duration_minutes, passing_score, thumbnail_url, is_mandatory } = req.body;
    const orgId = req.user.organizationId;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const result = await db.query(`
      INSERT INTO courses (organization_id, title, description, category, difficulty, duration_minutes, passing_score, thumbnail_url, is_mandatory, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)
      RETURNING *
    `, [orgId, title, description, category, difficulty || 'beginner', duration_minutes || 30, passing_score || 70, thumbnail_url, is_mandatory || false, req.user.userId]);

    res.status(201).json({ course: result.rows[0] });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

/**
 * PATCH /api/learning/courses/:id
 * Update a course
 */
router.patch('/courses/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;
    const updates = req.body;

    // Verify course belongs to org
    const existing = await db.query('SELECT id FROM courses WHERE id = $1 AND organization_id = $2', [id, orgId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const allowedFields = ['title', 'description', 'category', 'difficulty', 'duration_minutes', 'passing_score', 'thumbnail_url', 'is_mandatory', 'status'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex++}`);
        values.push(updates[field]);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const result = await db.query(`
      UPDATE courses SET ${setClause.join(', ')} WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    res.json({ course: result.rows[0] });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

/**
 * POST /api/learning/courses/:id/lessons
 * Add a lesson to a course
 */
router.post('/courses/:id/lessons', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { title, description, content_type, content_url, content_text, duration_minutes } = req.body;
    const orgId = req.user.organizationId;

    // Verify course belongs to org
    const existing = await db.query('SELECT id FROM courses WHERE id = $1 AND organization_id = $2', [courseId, orgId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get max sort_order
    const orderResult = await db.query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM lessons WHERE course_id = $1', [courseId]);
    const sortOrder = orderResult.rows[0].next_order;

    const result = await db.query(`
      INSERT INTO lessons (course_id, title, description, content_type, content_url, content_text, duration_minutes, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [courseId, title, description, content_type, content_url, content_text, duration_minutes || 10, sortOrder]);

    res.status(201).json({ lesson: result.rows[0] });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// ============================================================
// ENROLLMENTS
// ============================================================

/**
 * GET /api/learning/my-courses
 * Current user's enrollments with progress
 */
router.get('/my-courses', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT e.*, c.title, c.description, c.category, c.difficulty, c.thumbnail_url, c.is_mandatory, c.passing_score,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.enrollment_id = e.id AND lp.status = 'completed') as completed_lessons,
        au.first_name || ' ' || au.last_name as assigned_by_name
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN users au ON au.id = e.assigned_by
      WHERE e.user_id = $1
      ORDER BY
        CASE WHEN e.status = 'in_progress' THEN 0
             WHEN e.status = 'enrolled' THEN 1
             WHEN e.status = 'completed' THEN 2
             ELSE 3 END,
        e.due_date ASC NULLS LAST
    `, [userId]);

    res.json({ enrollments: result.rows });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

/**
 * POST /api/learning/enroll
 * Enroll self or assign employee to a course
 */
router.post('/enroll', async (req, res) => {
  try {
    const { course_id, user_id, due_date } = req.body;
    const requesterId = req.user.userId;
    const orgId = req.user.organizationId;

    // Determine target user (self-enroll or manager assigning)
    const targetUserId = user_id || requesterId;
    const assignedBy = user_id && user_id !== requesterId ? requesterId : null;

    // Verify course exists and is published
    const courseResult = await db.query(`
      SELECT id, status FROM courses WHERE id = $1 AND organization_id = $2
    `, [course_id, orgId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (courseResult.rows[0].status !== 'published') {
      return res.status(400).json({ error: 'Course is not available for enrollment' });
    }

    // Check if already enrolled
    const existingResult = await db.query(`
      SELECT id, status FROM enrollments WHERE user_id = $1 AND course_id = $2
    `, [targetUserId, course_id]);

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      if (existing.status === 'completed') {
        // Allow re-enrollment for completed courses
        await db.query(`
          UPDATE enrollments SET status = 'enrolled', score = NULL, attempts = 0, started_at = NULL, completed_at = NULL, enrolled_at = NOW()
          WHERE id = $1
        `, [existing.id]);
        const updated = await db.query('SELECT * FROM enrollments WHERE id = $1', [existing.id]);
        return res.json({ enrollment: updated.rows[0], message: 'Re-enrolled successfully' });
      }
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    const result = await db.query(`
      INSERT INTO enrollments (user_id, course_id, assigned_by, due_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [targetUserId, course_id, assignedBy, due_date]);

    res.status(201).json({ enrollment: result.rows[0] });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

/**
 * POST /api/learning/courses/:courseId/lessons/:lessonId/complete
 * Mark lesson as complete, submit quiz answers if applicable
 */
router.post('/courses/:courseId/lessons/:lessonId/complete', async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { quiz_answers, time_spent_seconds } = req.body;
    const userId = req.user.userId;

    // Get enrollment
    const enrollmentResult = await db.query(`
      SELECT e.* FROM enrollments e
      WHERE e.user_id = $1 AND e.course_id = $2
    `, [userId, courseId]);

    if (enrollmentResult.rows.length === 0) {
      return res.status(400).json({ error: 'Not enrolled in this course' });
    }

    const enrollment = enrollmentResult.rows[0];

    // Verify lesson belongs to course
    const lessonResult = await db.query(`
      SELECT l.*,
        (SELECT json_agg(qq.*) FROM quiz_questions qq WHERE qq.lesson_id = l.id ORDER BY qq.sort_order) as questions
      FROM lessons l
      WHERE l.id = $1 AND l.course_id = $2
    `, [lessonId, courseId]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonResult.rows[0];
    let score = null;

    // Calculate quiz score if this is a quiz lesson
    if (lesson.content_type === 'quiz' && lesson.questions && quiz_answers) {
      let correctAnswers = 0;
      const totalQuestions = lesson.questions.length;

      for (const question of lesson.questions) {
        const userAnswer = quiz_answers[question.id];
        if (userAnswer && userAnswer.toLowerCase() === question.correct_answer.toLowerCase()) {
          correctAnswers++;
        }
      }

      score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 100;
    }

    // Upsert lesson progress
    await db.query(`
      INSERT INTO lesson_progress (enrollment_id, lesson_id, status, started_at, completed_at, score, time_spent_seconds, quiz_answers)
      VALUES ($1, $2, 'completed', COALESCE($5, NOW()), NOW(), $3, $4, $6)
      ON CONFLICT (enrollment_id, lesson_id)
      DO UPDATE SET status = 'completed', completed_at = NOW(), score = COALESCE($3, lesson_progress.score),
                    time_spent_seconds = lesson_progress.time_spent_seconds + COALESCE($4, 0),
                    quiz_answers = COALESCE($6, lesson_progress.quiz_answers)
    `, [enrollment.id, lessonId, score, time_spent_seconds || 0, enrollment.started_at, quiz_answers ? JSON.stringify(quiz_answers) : null]);

    // Update enrollment status if needed
    if (enrollment.status === 'enrolled') {
      await db.query(`UPDATE enrollments SET status = 'in_progress', started_at = NOW() WHERE id = $1`, [enrollment.id]);
    }

    // Check if all lessons are completed
    const progressResult = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM lessons WHERE course_id = $1) as total,
        (SELECT COUNT(*) FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.enrollment_id = $2 AND lp.status = 'completed' AND l.course_id = $1) as completed
    `, [courseId, enrollment.id]);

    const { total, completed } = progressResult.rows[0];

    if (parseInt(total) === parseInt(completed)) {
      // Calculate overall score
      const scoresResult = await db.query(`
        SELECT AVG(lp.score) as avg_score
        FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.enrollment_id = $1 AND lp.score IS NOT NULL
      `, [enrollment.id]);

      const avgScore = Math.round(scoresResult.rows[0].avg_score || 100);

      // Get passing score
      const courseResult = await db.query('SELECT passing_score, title FROM courses WHERE id = $1', [courseId]);
      const passingScore = courseResult.rows[0]?.passing_score || 70;
      const courseTitle = courseResult.rows[0]?.title;

      const passed = avgScore >= passingScore;
      const finalStatus = passed ? 'completed' : 'failed';

      await db.query(`
        UPDATE enrollments
        SET status = $1, score = $2, completed_at = NOW(), attempts = attempts + 1
        WHERE id = $3
      `, [finalStatus, avgScore, enrollment.id]);

      // Generate certification if passed
      if (passed) {
        const verificationCode = `CERT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
        await db.query(`
          INSERT INTO certifications (user_id, course_id, organization_id, certification_name, issuing_body, issue_date, expiry_date, verification_code)
          VALUES ($1, $2, $3, $4, 'Uplift Learning', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', $5)
        `, [userId, courseId, req.user.organizationId, courseTitle, verificationCode]);
      }

      res.json({
        success: true,
        lessonCompleted: true,
        courseCompleted: true,
        passed,
        score: avgScore,
        message: passed ? 'Congratulations! Course completed and certificate issued.' : 'Course completed but score below passing threshold.'
      });
    } else {
      res.json({
        success: true,
        lessonCompleted: true,
        courseCompleted: false,
        progress: { completed: parseInt(completed), total: parseInt(total) }
      });
    }
  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
});

// ============================================================
// CERTIFICATIONS
// ============================================================

/**
 * GET /api/learning/certifications
 * Current user's certifications
 */
router.get('/certifications', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT cert.*, c.title as course_title, c.category as course_category
      FROM certifications cert
      LEFT JOIN courses c ON c.id = cert.course_id
      WHERE cert.user_id = $1
      ORDER BY cert.issue_date DESC
    `, [userId]);

    res.json({ certifications: result.rows });
  } catch (error) {
    console.error('Get certifications error:', error);
    res.status(500).json({ error: 'Failed to get certifications' });
  }
});

/**
 * GET /api/learning/certifications/expiring
 * Certifications expiring within X days (manager/admin)
 */
router.get('/certifications/expiring', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const orgId = req.user.organizationId;

    const result = await db.query(`
      SELECT cert.*,
        u.first_name || ' ' || u.last_name as employee_name,
        u.email as employee_email,
        e.job_title,
        c.title as course_title
      FROM certifications cert
      JOIN users u ON u.id = cert.user_id
      LEFT JOIN employees e ON e.user_id = u.id
      LEFT JOIN courses c ON c.id = cert.course_id
      WHERE cert.organization_id = $1
        AND cert.status = 'active'
        AND cert.expiry_date IS NOT NULL
        AND cert.expiry_date <= CURRENT_DATE + ($2 || ' days')::interval
        AND cert.expiry_date >= CURRENT_DATE
      ORDER BY cert.expiry_date ASC
    `, [orgId, days]);

    res.json({ certifications: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get expiring certifications error:', error);
    res.status(500).json({ error: 'Failed to get expiring certifications' });
  }
});

/**
 * GET /api/learning/team-compliance
 * Team completion rates (manager/admin)
 */
router.get('/team-compliance', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    // Get mandatory courses and completion stats
    const coursesResult = await db.query(`
      SELECT c.id, c.title, c.category, c.is_mandatory,
        (SELECT COUNT(DISTINCT e.user_id)
         FROM enrollments e
         WHERE e.course_id = c.id AND e.status = 'completed') as completed_count,
        (SELECT COUNT(DISTINCT e.user_id)
         FROM enrollments e
         WHERE e.course_id = c.id AND e.status = 'in_progress') as in_progress_count,
        (SELECT COUNT(DISTINCT e.user_id)
         FROM enrollments e
         WHERE e.course_id = c.id AND e.due_date < NOW() AND e.status NOT IN ('completed')) as overdue_count,
        (SELECT COUNT(*) FROM employees WHERE organization_id = c.organization_id AND status = 'active') as total_employees
      FROM courses c
      WHERE c.organization_id = $1 AND c.status = 'published'
      ORDER BY c.is_mandatory DESC, c.title ASC
    `, [orgId]);

    // Calculate overall compliance rate
    const overallResult = await db.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END)::float /
        NULLIF(COUNT(DISTINCT e.id), 0) * 100 as completion_rate,
        COUNT(DISTINCT CASE WHEN e.due_date < NOW() AND e.status NOT IN ('completed') THEN e.id END) as total_overdue
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE c.organization_id = $1 AND c.is_mandatory = true
    `, [orgId]);

    res.json({
      courses: coursesResult.rows,
      overall: {
        completion_rate: Math.round(overallResult.rows[0]?.completion_rate || 0),
        total_overdue: parseInt(overallResult.rows[0]?.total_overdue || 0)
      }
    });
  } catch (error) {
    console.error('Get team compliance error:', error);
    res.status(500).json({ error: 'Failed to get team compliance' });
  }
});

/**
 * POST /api/learning/certifications
 * Manually add an external certification
 */
router.post('/certifications', async (req, res) => {
  try {
    const { certification_name, issuing_body, issue_date, expiry_date, certificate_url, user_id } = req.body;
    const targetUserId = user_id || req.user.userId;
    const orgId = req.user.organizationId;

    if (!certification_name || !issue_date) {
      return res.status(400).json({ error: 'Certification name and issue date are required' });
    }

    const verificationCode = `EXT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    const result = await db.query(`
      INSERT INTO certifications (user_id, organization_id, certification_name, issuing_body, issue_date, expiry_date, certificate_url, verification_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [targetUserId, orgId, certification_name, issuing_body, issue_date, expiry_date, certificate_url, verificationCode]);

    res.status(201).json({ certification: result.rows[0] });
  } catch (error) {
    console.error('Create certification error:', error);
    res.status(500).json({ error: 'Failed to create certification' });
  }
});

export default router;
