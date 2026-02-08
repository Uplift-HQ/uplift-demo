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

/**
 * GET /api/learning/certifications/:id/pdf
 * Download certification as PDF
 */
router.get('/certifications/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT cert.*,
        u.first_name, u.last_name, u.email,
        c.title as course_title, c.category as course_category
      FROM certifications cert
      JOIN users u ON u.id = cert.user_id
      LEFT JOIN courses c ON c.id = cert.course_id
      WHERE cert.id = $1 AND (cert.user_id = $2 OR cert.organization_id = $3)
    `, [id, userId, req.user.organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    const cert = result.rows[0];

    // Generate PDF (basic implementation - can be enhanced with PDFKit)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.verification_code}.pdf"`);

    // Simple PDF generation using a text-based approach
    // In production, use PDFKit for proper PDF generation
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });

    doc.pipe(res);

    // Certificate design
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke('#c9a227');
    doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80).stroke('#c9a227');

    doc.fontSize(36).font('Helvetica-Bold').fillColor('#1e3a5f')
       .text('CERTIFICATE OF COMPLETION', 0, 100, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').fillColor('#666')
       .text('This is to certify that', { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e3a5f')
       .text(`${cert.first_name} ${cert.last_name}`, { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(14).font('Helvetica').fillColor('#666')
       .text('has successfully completed', { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a5f')
       .text(cert.certification_name || cert.course_title, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').fillColor('#666')
       .text(`Issue Date: ${new Date(cert.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });

    if (cert.expiry_date) {
      doc.text(`Valid Until: ${new Date(cert.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
    }

    doc.moveDown(1);
    doc.fontSize(10).fillColor('#999')
       .text(`Verification Code: ${cert.verification_code}`, { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(12).fillColor('#666')
       .text(cert.issuing_body || 'Uplift Learning', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate certification PDF error:', error);
    res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
});

// ============================================================
// ENROLLMENTS MANAGEMENT (Admin/Manager)
// ============================================================

/**
 * GET /api/learning/enrollments
 * List all enrollments (manager/admin) with filters
 */
router.get('/enrollments', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status, course_id, department } = req.query;
    const orgId = req.user.organizationId;

    let query = `
      SELECT e.*,
        u.first_name || ' ' || u.last_name as employee_name,
        u.email as employee_email,
        emp.department,
        emp.job_title,
        c.title as course_title,
        c.category as course_category,
        c.is_mandatory,
        au.first_name || ' ' || au.last_name as assigned_by_name,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*) FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.enrollment_id = e.id AND lp.status = 'completed') as completed_lessons
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN employees emp ON emp.user_id = u.id
      LEFT JOIN users au ON au.id = e.assigned_by
      WHERE c.organization_id = $1
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (status) {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }
    if (course_id) {
      query += ` AND e.course_id = $${paramIndex++}`;
      params.push(course_id);
    }
    if (department) {
      query += ` AND emp.department = $${paramIndex++}`;
      params.push(department);
    }

    query += ` ORDER BY e.due_date ASC NULLS LAST, e.enrolled_at DESC`;

    const result = await db.query(query, params);
    res.json({ enrollments: result.rows });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

/**
 * POST /api/learning/enrollments/:id/send-reminder
 * Send reminder to employee about their enrollment
 */
router.post('/enrollments/:id/send-reminder', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    // Get enrollment details
    const enrollmentResult = await db.query(`
      SELECT e.*,
        u.first_name, u.last_name, u.email,
        c.title as course_title
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = $1 AND c.organization_id = $2
    `, [id, orgId]);

    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const enrollment = enrollmentResult.rows[0];

    // Queue notification
    await db.query(`
      INSERT INTO notifications (user_id, organization_id, type, title, message, data)
      VALUES ($1, $2, 'course_reminder', $3, $4, $5)
    `, [
      enrollment.user_id,
      orgId,
      `Training Reminder: ${enrollment.course_title}`,
      `Please complete your training "${enrollment.course_title}"${enrollment.due_date ? ` by ${new Date(enrollment.due_date).toLocaleDateString()}` : ''}.`,
      JSON.stringify({ enrollment_id: id, course_id: enrollment.course_id })
    ]);

    // Update last_reminder_sent
    await db.query(`
      UPDATE enrollments SET last_reminder_sent = NOW() WHERE id = $1
    `, [id]);

    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

/**
 * POST /api/learning/enrollments/send-reminders-bulk
 * Send reminders to all overdue enrollments
 */
router.post('/enrollments/send-reminders-bulk', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    // Get overdue enrollments
    const overdueResult = await db.query(`
      SELECT e.id, e.user_id, e.due_date, c.title as course_title, c.id as course_id
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE c.organization_id = $1
        AND e.status NOT IN ('completed', 'failed')
        AND e.due_date < NOW()
        AND (e.last_reminder_sent IS NULL OR e.last_reminder_sent < NOW() - INTERVAL '24 hours')
    `, [orgId]);

    let sentCount = 0;
    for (const enrollment of overdueResult.rows) {
      await db.query(`
        INSERT INTO notifications (user_id, organization_id, type, title, message, data)
        VALUES ($1, $2, 'course_reminder', $3, $4, $5)
      `, [
        enrollment.user_id,
        orgId,
        `Overdue Training: ${enrollment.course_title}`,
        `Your training "${enrollment.course_title}" was due on ${new Date(enrollment.due_date).toLocaleDateString()}. Please complete it as soon as possible.`,
        JSON.stringify({ enrollment_id: enrollment.id, course_id: enrollment.course_id })
      ]);

      await db.query(`UPDATE enrollments SET last_reminder_sent = NOW() WHERE id = $1`, [enrollment.id]);
      sentCount++;
    }

    res.json({ success: true, message: `Sent ${sentCount} reminders`, count: sentCount });
  } catch (error) {
    console.error('Bulk send reminders error:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// ============================================================
// LEARNING PATHS
// ============================================================

/**
 * GET /api/learning/paths
 * List learning paths
 */
router.get('/paths', async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await db.query(`
      SELECT lp.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT json_agg(json_build_object(
          'id', c.id,
          'title', c.title,
          'category', c.category,
          'duration_minutes', c.duration_minutes,
          'is_mandatory', c.is_mandatory,
          'sort_order', lpc.sort_order
        ) ORDER BY lpc.sort_order)
        FROM learning_path_courses lpc
        JOIN courses c ON c.id = lpc.course_id
        WHERE lpc.learning_path_id = lp.id) as courses,
        (SELECT COUNT(*) FROM learning_path_courses WHERE learning_path_id = lp.id) as course_count,
        (SELECT COALESCE(SUM(c.duration_minutes), 0) FROM learning_path_courses lpc2 JOIN courses c ON c.id = lpc2.course_id WHERE lpc2.learning_path_id = lp.id) as total_duration
      FROM learning_paths lp
      LEFT JOIN users u ON u.id = lp.created_by
      WHERE lp.organization_id = $1 AND lp.status = 'active'
      ORDER BY lp.title ASC
    `, [orgId]);

    res.json({ paths: result.rows });
  } catch (error) {
    console.error('Get learning paths error:', error);
    res.status(500).json({ error: 'Failed to get learning paths' });
  }
});

/**
 * POST /api/learning/paths
 * Create a learning path
 */
router.post('/paths', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { title, description, course_ids } = req.body;
    const orgId = req.user.organizationId;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Start transaction
    await db.query('BEGIN');

    const pathResult = await db.query(`
      INSERT INTO learning_paths (organization_id, title, description, status, created_by)
      VALUES ($1, $2, $3, 'active', $4)
      RETURNING *
    `, [orgId, title, description, req.user.userId]);

    const path = pathResult.rows[0];

    // Add courses to path
    if (course_ids && course_ids.length > 0) {
      for (let i = 0; i < course_ids.length; i++) {
        await db.query(`
          INSERT INTO learning_path_courses (learning_path_id, course_id, sort_order)
          VALUES ($1, $2, $3)
        `, [path.id, course_ids[i], i]);
      }
    }

    await db.query('COMMIT');

    res.status(201).json({ path });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Create learning path error:', error);
    res.status(500).json({ error: 'Failed to create learning path' });
  }
});

// ============================================================
// DASHBOARD & STATS
// ============================================================

/**
 * GET /api/learning/dashboard
 * Learning dashboard statistics
 */
router.get('/dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    // Get stats
    const statsResult = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM courses WHERE organization_id = $1 AND status = 'published') as active_courses,
        (SELECT COUNT(*) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.organization_id = $1) as total_enrollments,
        (SELECT COUNT(*) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.organization_id = $1 AND e.status = 'completed') as completed_enrollments,
        (SELECT COUNT(*) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.organization_id = $1 AND e.status NOT IN ('completed', 'failed') AND e.due_date < NOW()) as overdue_count,
        (SELECT COUNT(*) FROM certifications WHERE organization_id = $1) as certificates_issued,
        (SELECT AVG(e.score) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.organization_id = $1 AND e.score IS NOT NULL) as avg_score
    `, [orgId]);

    const stats = statsResult.rows[0];
    const completionRate = stats.total_enrollments > 0
      ? Math.round((stats.completed_enrollments / stats.total_enrollments) * 100)
      : 0;

    // Get department breakdown
    const deptResult = await db.query(`
      SELECT emp.department,
        COUNT(DISTINCT e.id) as total,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      JOIN users u ON u.id = e.user_id
      LEFT JOIN employees emp ON emp.user_id = u.id
      WHERE c.organization_id = $1 AND emp.department IS NOT NULL
      GROUP BY emp.department
      ORDER BY emp.department
    `, [orgId]);

    // Get popular courses
    const popularResult = await db.query(`
      SELECT c.id, c.title, c.category,
        COUNT(DISTINCT e.user_id) as enrolled_count,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.user_id END) as completed_count
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      WHERE c.organization_id = $1 AND c.status = 'published'
      GROUP BY c.id, c.title, c.category
      ORDER BY enrolled_count DESC
      LIMIT 5
    `, [orgId]);

    res.json({
      stats: {
        activeCourses: parseInt(stats.active_courses),
        totalEnrollments: parseInt(stats.total_enrollments),
        completedEnrollments: parseInt(stats.completed_enrollments),
        completionRate,
        overdueCount: parseInt(stats.overdue_count),
        certificatesIssued: parseInt(stats.certificates_issued),
        avgScore: Math.round(parseFloat(stats.avg_score) || 0)
      },
      departmentBreakdown: deptResult.rows.map(d => ({
        department: d.department,
        total: parseInt(d.total),
        completed: parseInt(d.completed),
        rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
      })),
      popularCourses: popularResult.rows.map(c => ({
        ...c,
        enrolled_count: parseInt(c.enrolled_count),
        completed_count: parseInt(c.completed_count),
        completion_rate: c.enrolled_count > 0 ? Math.round((c.completed_count / c.enrolled_count) * 100) : 0
      }))
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

/**
 * GET /api/learning/employees
 * Get employees for enrollment assignment (manager/admin)
 */
router.get('/employees', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await db.query(`
      SELECT e.id, e.employee_number, e.department, e.job_title, e.location,
        u.id as user_id, u.first_name, u.last_name, u.email
      FROM employees e
      JOIN users u ON u.id = e.user_id
      WHERE e.organization_id = $1 AND e.status = 'active'
      ORDER BY u.last_name, u.first_name
    `, [orgId]);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

export default router;
