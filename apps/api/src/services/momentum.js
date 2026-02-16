// ============================================================
// MOMENTUM SCORE ENGINE
// Real workforce engagement algorithm with 6 weighted dimensions
// ============================================================

import { db } from '../lib/database.js';

// Dimension weights (must sum to 1.0)
const WEIGHTS = {
  attendance: 0.20,      // On-time clock-ins
  punctuality: 0.15,     // Average early/late
  shiftCompletion: 0.15, // Completed vs assigned
  skillsGrowth: 0.15,    // New skills/certs
  recognition: 0.15,     // Peer recognition
  engagement: 0.20,      // Surveys + learning
};

// Configuration
const CONFIG = {
  attendancePeriodDays: 30,
  recognitionPeriodDays: 30,
  skillsGrowthPeriodDays: 90,
  punctualityGraceMins: 5,        // Minutes late before penalty
  punctualityMaxPenaltyMins: 30,  // Beyond this = 0 score
  minDataPoints: 3,               // Minimum shifts for reliable score
};

/**
 * Calculate Momentum Score for an employee
 * Returns: { score, breakdown, trend, calculatedAt, periodStart, periodEnd }
 */
export async function calculateMomentumScore(employeeId, organizationId) {
  const now = new Date();
  const periodEnd = now.toISOString().split('T')[0];
  const periodStart = new Date(now.getTime() - CONFIG.attendancePeriodDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  // Calculate each dimension
  const [
    attendance,
    punctuality,
    shiftCompletion,
    skillsGrowth,
    recognition,
    engagement,
  ] = await Promise.all([
    calculateAttendanceScore(employeeId, organizationId, periodStart, periodEnd),
    calculatePunctualityScore(employeeId, organizationId, periodStart, periodEnd),
    calculateShiftCompletionScore(employeeId, organizationId, periodStart, periodEnd),
    calculateSkillsGrowthScore(employeeId, organizationId),
    calculateRecognitionScore(employeeId, organizationId),
    calculateEngagementScore(employeeId, organizationId),
  ]);

  // Calculate weighted total
  const score = Math.round(
    attendance.score * WEIGHTS.attendance +
    punctuality.score * WEIGHTS.punctuality +
    shiftCompletion.score * WEIGHTS.shiftCompletion +
    skillsGrowth.score * WEIGHTS.skillsGrowth +
    recognition.score * WEIGHTS.recognition +
    engagement.score * WEIGHTS.engagement
  );

  // Get previous score for trend
  const trend = await calculateTrend(employeeId, score);

  const result = {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      attendance: { score: attendance.score, weight: WEIGHTS.attendance * 100, details: attendance.details },
      punctuality: { score: punctuality.score, weight: WEIGHTS.punctuality * 100, details: punctuality.details },
      shiftCompletion: { score: shiftCompletion.score, weight: WEIGHTS.shiftCompletion * 100, details: shiftCompletion.details },
      skillsGrowth: { score: skillsGrowth.score, weight: WEIGHTS.skillsGrowth * 100, details: skillsGrowth.details },
      recognition: { score: recognition.score, weight: WEIGHTS.recognition * 100, details: recognition.details },
      engagement: { score: engagement.score, weight: WEIGHTS.engagement * 100, details: engagement.details },
    },
    trend,
    calculatedAt: now.toISOString(),
    periodStart,
    periodEnd,
  };

  // Cache the score
  await cacheScore(employeeId, organizationId, result, periodStart, periodEnd);

  return result;
}

/**
 * 1. ATTENDANCE SCORE (20%)
 * On-time clock-ins / total scheduled shifts
 */
async function calculateAttendanceScore(employeeId, orgId, periodStart, periodEnd) {
  const result = await db.query(`
    SELECT
      COUNT(DISTINCT s.id) as total_shifts,
      COUNT(DISTINCT CASE
        WHEN te.clock_in IS NOT NULL
        AND te.clock_in <= s.start_time + INTERVAL '15 minutes'
        THEN s.id
      END) as on_time_shifts
    FROM shifts s
    LEFT JOIN time_entries te ON te.shift_id = s.id AND te.employee_id = s.employee_id
    WHERE s.employee_id = $1
      AND s.organization_id = $2
      AND s.date >= $3
      AND s.date <= $4
      AND s.status IN ('scheduled', 'completed', 'in_progress')
  `, [employeeId, orgId, periodStart, periodEnd]);

  const { total_shifts, on_time_shifts } = result.rows[0];
  const totalShifts = parseInt(total_shifts) || 0;
  const onTimeShifts = parseInt(on_time_shifts) || 0;

  if (totalShifts < CONFIG.minDataPoints) {
    return { score: 75, details: { totalShifts, onTimeShifts, message: 'Insufficient data, using baseline' } };
  }

  const rate = onTimeShifts / totalShifts;
  const score = Math.round(rate * 100);

  return {
    score,
    details: {
      totalShifts,
      onTimeShifts,
      rate: Math.round(rate * 100),
    },
  };
}

/**
 * 2. PUNCTUALITY SCORE (15%)
 * Average minutes early/late for clock-ins
 */
async function calculatePunctualityScore(employeeId, orgId, periodStart, periodEnd) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_entries,
      AVG(EXTRACT(EPOCH FROM (te.clock_in - s.start_time)) / 60) as avg_variance_mins
    FROM time_entries te
    JOIN shifts s ON s.id = te.shift_id
    WHERE te.employee_id = $1
      AND te.organization_id = $2
      AND s.date >= $3
      AND s.date <= $4
      AND te.clock_in IS NOT NULL
  `, [employeeId, orgId, periodStart, periodEnd]);

  const { total_entries, avg_variance_mins } = result.rows[0];
  const totalEntries = parseInt(total_entries) || 0;
  const avgVariance = parseFloat(avg_variance_mins) || 0;

  if (totalEntries < CONFIG.minDataPoints) {
    return { score: 75, details: { totalEntries, avgVarianceMins: 0, message: 'Insufficient data' } };
  }

  // Score calculation:
  // Early or up to grace period = 100
  // Late by grace to max penalty = linear decline
  // Beyond max penalty = 0
  let score;
  if (avgVariance <= CONFIG.punctualityGraceMins) {
    score = 100;
  } else if (avgVariance >= CONFIG.punctualityMaxPenaltyMins) {
    score = 0;
  } else {
    const penaltyRange = CONFIG.punctualityMaxPenaltyMins - CONFIG.punctualityGraceMins;
    const lateMinutes = avgVariance - CONFIG.punctualityGraceMins;
    score = Math.round(100 - (lateMinutes / penaltyRange) * 100);
  }

  return {
    score: Math.max(0, score),
    details: {
      totalEntries,
      avgVarianceMins: Math.round(avgVariance * 10) / 10,
    },
  };
}

/**
 * 3. SHIFT COMPLETION SCORE (15%)
 * Shifts completed vs shifts assigned (no no-shows, no early leaves)
 */
async function calculateShiftCompletionScore(employeeId, orgId, periodStart, periodEnd) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_shifts,
      COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_shifts,
      COUNT(CASE WHEN s.status = 'no_show' THEN 1 END) as no_shows,
      COUNT(CASE WHEN te.clock_out IS NOT NULL AND te.clock_out >= s.end_time - INTERVAL '15 minutes' THEN 1 END) as full_shifts
    FROM shifts s
    LEFT JOIN time_entries te ON te.shift_id = s.id AND te.employee_id = s.employee_id
    WHERE s.employee_id = $1
      AND s.organization_id = $2
      AND s.date >= $3
      AND s.date <= $4
      AND s.status IN ('scheduled', 'completed', 'in_progress', 'no_show')
  `, [employeeId, orgId, periodStart, periodEnd]);

  const { total_shifts, completed_shifts, no_shows, full_shifts } = result.rows[0];
  const totalShifts = parseInt(total_shifts) || 0;
  const completedShifts = parseInt(completed_shifts) || 0;
  const noShows = parseInt(no_shows) || 0;
  const fullShifts = parseInt(full_shifts) || 0;

  if (totalShifts < CONFIG.minDataPoints) {
    return { score: 75, details: { totalShifts, completedShifts, message: 'Insufficient data' } };
  }

  // Score based on completion rate, penalize no-shows heavily
  const completionRate = completedShifts / totalShifts;
  const noShowPenalty = (noShows / totalShifts) * 50; // Each no-show reduces score significantly
  const score = Math.round(completionRate * 100 - noShowPenalty);

  return {
    score: Math.max(0, score),
    details: {
      totalShifts,
      completedShifts,
      noShows,
      fullShifts,
      completionRate: Math.round(completionRate * 100),
    },
  };
}

/**
 * 4. SKILLS GROWTH SCORE (15%)
 * New skills/certifications earned in last 90 days
 */
async function calculateSkillsGrowthScore(employeeId, orgId) {
  const cutoffDate = new Date(Date.now() - CONFIG.skillsGrowthPeriodDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  // Get new skills added
  const skillsResult = await db.query(`
    SELECT COUNT(*) as new_skills
    FROM employee_skills es
    WHERE es.employee_id = $1
      AND es.created_at >= $2
  `, [employeeId, cutoffDate]);

  // Get certifications earned
  const certsResult = await db.query(`
    SELECT COUNT(*) as new_certs
    FROM certifications c
    WHERE c.employee_id = $1
      AND c.issued_date >= $2
  `, [employeeId, cutoffDate]);

  // Get learning courses completed
  const learningResult = await db.query(`
    SELECT COUNT(*) as courses_completed
    FROM enrollments e
    WHERE e.user_id = (SELECT user_id FROM employees WHERE id = $1)
      AND e.status = 'completed'
      AND e.completed_at >= $2
  `, [employeeId, cutoffDate]);

  const newSkills = parseInt(skillsResult.rows[0]?.new_skills) || 0;
  const newCerts = parseInt(certsResult.rows[0]?.new_certs) || 0;
  const coursesCompleted = parseInt(learningResult.rows[0]?.courses_completed) || 0;

  // Score: Each skill = 15 points, each cert = 25 points, each course = 20 points
  // Max 100
  const rawScore = newSkills * 15 + newCerts * 25 + coursesCompleted * 20;
  const score = Math.min(100, rawScore);

  return {
    score,
    details: {
      newSkills,
      newCerts,
      coursesCompleted,
      periodDays: CONFIG.skillsGrowthPeriodDays,
    },
  };
}

/**
 * 5. RECOGNITION SCORE (15%)
 * Peer recognition received (normalized)
 */
async function calculateRecognitionScore(employeeId, orgId) {
  const cutoffDate = new Date(Date.now() - CONFIG.recognitionPeriodDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  // Get recognition count for this employee
  const empResult = await db.query(`
    SELECT COUNT(*) as received_count
    FROM recognitions r
    WHERE r.recipient_id = $1
      AND r.created_at >= $2
  `, [employeeId, cutoffDate]);

  // Get average recognition count across org for normalization
  const orgResult = await db.query(`
    SELECT
      AVG(cnt) as avg_count,
      MAX(cnt) as max_count
    FROM (
      SELECT recipient_id, COUNT(*) as cnt
      FROM recognitions r
      JOIN employees e ON e.id = r.recipient_id
      WHERE e.organization_id = $1
        AND r.created_at >= $2
      GROUP BY recipient_id
    ) sub
  `, [orgId, cutoffDate]);

  const receivedCount = parseInt(empResult.rows[0]?.received_count) || 0;
  const avgCount = parseFloat(orgResult.rows[0]?.avg_count) || 1;
  const maxCount = parseInt(orgResult.rows[0]?.max_count) || 1;

  // Normalize: If you're at average = 50, above average scales to 100
  let score;
  if (maxCount === 0 || avgCount === 0) {
    score = receivedCount > 0 ? 75 : 50; // Baseline if no org data
  } else {
    const relativeToAvg = receivedCount / avgCount;
    score = Math.min(100, Math.round(relativeToAvg * 50)); // 1x avg = 50, 2x avg = 100
  }

  return {
    score,
    details: {
      receivedCount,
      orgAverage: Math.round(avgCount * 10) / 10,
      periodDays: CONFIG.recognitionPeriodDays,
    },
  };
}

/**
 * 6. ENGAGEMENT SCORE (20%)
 * Survey response rate + learning course completion rate
 */
async function calculateEngagementScore(employeeId, orgId) {
  // Get user_id for this employee
  const userResult = await db.query(
    `SELECT user_id FROM employees WHERE id = $1`,
    [employeeId]
  );
  const userId = userResult.rows[0]?.user_id;

  if (!userId) {
    return { score: 50, details: { message: 'No user linked to employee' } };
  }

  // Survey response rate (last 90 days)
  const surveyResult = await db.query(`
    SELECT
      COUNT(*) as invitations,
      COUNT(CASE WHEN sr.id IS NOT NULL THEN 1 END) as responses
    FROM survey_invitations si
    LEFT JOIN survey_responses sr ON sr.survey_id = si.survey_id AND sr.user_id = si.user_id
    WHERE si.user_id = $1
      AND si.created_at >= NOW() - INTERVAL '90 days'
  `, [userId]);

  // Learning completion rate
  const learningResult = await db.query(`
    SELECT
      COUNT(*) as enrollments,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
    FROM enrollments
    WHERE user_id = $1
  `, [userId]);

  const surveyInvitations = parseInt(surveyResult.rows[0]?.invitations) || 0;
  const surveyResponses = parseInt(surveyResult.rows[0]?.responses) || 0;
  const enrollments = parseInt(learningResult.rows[0]?.enrollments) || 0;
  const completed = parseInt(learningResult.rows[0]?.completed) || 0;

  const surveyRate = surveyInvitations > 0 ? surveyResponses / surveyInvitations : 0.5;
  const learningRate = enrollments > 0 ? completed / enrollments : 0.5;

  // Combined score (50% each)
  const score = Math.round((surveyRate * 50 + learningRate * 50));

  return {
    score,
    details: {
      surveyInvitations,
      surveyResponses,
      surveyRate: Math.round(surveyRate * 100),
      enrollments,
      completed,
      learningRate: Math.round(learningRate * 100),
    },
  };
}

/**
 * Calculate trend based on previous score
 */
async function calculateTrend(employeeId, currentScore) {
  const result = await db.query(`
    SELECT score
    FROM momentum_history
    WHERE employee_id = $1
      AND recorded_at < CURRENT_DATE
    ORDER BY recorded_at DESC
    LIMIT 1
  `, [employeeId]);

  const previousScore = result.rows[0]?.score;

  if (!previousScore) {
    return { direction: 'stable', change: 0, previousScore: null };
  }

  const change = currentScore - parseFloat(previousScore);
  let direction;
  if (change >= 5) direction = 'up';
  else if (change <= -5) direction = 'down';
  else direction = 'stable';

  return {
    direction,
    change: Math.round(change),
    previousScore: Math.round(parseFloat(previousScore)),
  };
}

/**
 * Cache the calculated score
 */
async function cacheScore(employeeId, orgId, result, periodStart, periodEnd) {
  const { score, breakdown, trend } = result;

  // Upsert momentum_scores
  await db.query(`
    INSERT INTO momentum_scores (
      employee_id, organization_id, score,
      attendance_score, punctuality_score, shift_completion_score,
      skills_growth_score, recognition_score, engagement_score,
      trend, previous_score, period_start, period_end, calculated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (employee_id, period_start, period_end)
    DO UPDATE SET
      score = $3,
      attendance_score = $4,
      punctuality_score = $5,
      shift_completion_score = $6,
      skills_growth_score = $7,
      recognition_score = $8,
      engagement_score = $9,
      trend = $10,
      previous_score = $11,
      calculated_at = NOW(),
      updated_at = NOW()
  `, [
    employeeId, orgId, score,
    breakdown.attendance.score,
    breakdown.punctuality.score,
    breakdown.shiftCompletion.score,
    breakdown.skillsGrowth.score,
    breakdown.recognition.score,
    breakdown.engagement.score,
    trend.direction,
    trend.previousScore,
    periodStart, periodEnd,
  ]);

  // Record in history for trend tracking
  await db.query(`
    INSERT INTO momentum_history (employee_id, organization_id, score, recorded_at)
    VALUES ($1, $2, $3, CURRENT_DATE)
    ON CONFLICT (employee_id, recorded_at) DO UPDATE SET score = $3
  `, [employeeId, orgId, score]);
}

/**
 * Get cached momentum score (if recent)
 */
export async function getCachedScore(employeeId) {
  const result = await db.query(`
    SELECT * FROM momentum_scores
    WHERE employee_id = $1
      AND calculated_at > NOW() - INTERVAL '1 hour'
    ORDER BY calculated_at DESC
    LIMIT 1
  `, [employeeId]);

  return result.rows[0] || null;
}

/**
 * Get organization-wide momentum dashboard
 */
export async function getOrgMomentumDashboard(organizationId) {
  // Get all current scores
  const scoresResult = await db.query(`
    SELECT
      ms.*,
      e.first_name, e.last_name, e.avatar_url, e.department_id,
      d.name as department_name
    FROM momentum_scores ms
    JOIN employees e ON e.id = ms.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE ms.organization_id = $1
      AND ms.calculated_at > NOW() - INTERVAL '24 hours'
    ORDER BY ms.score DESC
  `, [organizationId]);

  const scores = scoresResult.rows;

  if (scores.length === 0) {
    return {
      orgAverage: 0,
      distribution: { excellent: 0, good: 0, average: 0, needsAttention: 0 },
      departmentAverages: [],
      trendSummary: { up: 0, stable: 0, down: 0 },
      topPerformers: [],
      needsAttention: [],
    };
  }

  // Calculate org average
  const orgAverage = Math.round(scores.reduce((sum, s) => sum + parseFloat(s.score), 0) / scores.length);

  // Distribution buckets
  const distribution = {
    excellent: scores.filter(s => s.score >= 85).length,
    good: scores.filter(s => s.score >= 70 && s.score < 85).length,
    average: scores.filter(s => s.score >= 50 && s.score < 70).length,
    needsAttention: scores.filter(s => s.score < 50).length,
  };

  // Department averages
  const deptMap = new Map();
  scores.forEach(s => {
    const deptId = s.department_id || 'unassigned';
    const deptName = s.department_name || 'Unassigned';
    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, { id: deptId, name: deptName, scores: [], total: 0 });
    }
    deptMap.get(deptId).scores.push(parseFloat(s.score));
  });
  const departmentAverages = Array.from(deptMap.values()).map(d => ({
    departmentId: d.id,
    departmentName: d.name,
    average: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
    employeeCount: d.scores.length,
  })).sort((a, b) => b.average - a.average);

  // Trend summary
  const trendSummary = {
    up: scores.filter(s => s.trend === 'up').length,
    stable: scores.filter(s => s.trend === 'stable').length,
    down: scores.filter(s => s.trend === 'down').length,
  };

  // Top performers
  const topPerformers = scores.slice(0, 5).map(s => ({
    employeeId: s.employee_id,
    name: `${s.first_name} ${s.last_name}`,
    avatarUrl: s.avatar_url,
    score: Math.round(parseFloat(s.score)),
    trend: s.trend,
  }));

  // Needs attention
  const needsAttention = scores
    .filter(s => parseFloat(s.score) < 50)
    .slice(0, 5)
    .map(s => ({
      employeeId: s.employee_id,
      name: `${s.first_name} ${s.last_name}`,
      avatarUrl: s.avatar_url,
      score: Math.round(parseFloat(s.score)),
      trend: s.trend,
    }));

  return {
    orgAverage,
    distribution,
    departmentAverages,
    trendSummary,
    topPerformers,
    needsAttention,
    totalEmployees: scores.length,
  };
}

/**
 * Get momentum leaderboard
 */
export async function getMomentumLeaderboard(organizationId, limit = 20) {
  const result = await db.query(`
    SELECT
      ms.employee_id,
      ms.score,
      ms.trend,
      ms.attendance_score,
      ms.punctuality_score,
      ms.shift_completion_score,
      ms.skills_growth_score,
      ms.recognition_score,
      ms.engagement_score,
      e.first_name, e.last_name, e.avatar_url,
      d.name as department_name,
      l.name as location_name
    FROM momentum_scores ms
    JOIN employees e ON e.id = ms.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN locations l ON l.id = e.primary_location_id
    WHERE ms.organization_id = $1
      AND ms.calculated_at > NOW() - INTERVAL '24 hours'
    ORDER BY ms.score DESC
    LIMIT $2
  `, [organizationId, limit]);

  return result.rows.map((r, i) => ({
    rank: i + 1,
    employeeId: r.employee_id,
    name: `${r.first_name} ${r.last_name}`,
    avatarUrl: r.avatar_url,
    department: r.department_name,
    location: r.location_name,
    score: Math.round(parseFloat(r.score)),
    trend: r.trend,
    breakdown: {
      attendance: Math.round(parseFloat(r.attendance_score)),
      punctuality: Math.round(parseFloat(r.punctuality_score)),
      shiftCompletion: Math.round(parseFloat(r.shift_completion_score)),
      skillsGrowth: Math.round(parseFloat(r.skills_growth_score)),
      recognition: Math.round(parseFloat(r.recognition_score)),
      engagement: Math.round(parseFloat(r.engagement_score)),
    },
  }));
}

/**
 * Batch calculate momentum scores for all employees in an org
 */
export async function calculateOrgMomentumScores(organizationId) {
  const employees = await db.query(
    `SELECT id FROM employees WHERE organization_id = $1 AND status = 'active'`,
    [organizationId]
  );

  const results = [];
  for (const emp of employees.rows) {
    try {
      const score = await calculateMomentumScore(emp.id, organizationId);
      results.push({ employeeId: emp.id, success: true, score: score.score });
    } catch (error) {
      results.push({ employeeId: emp.id, success: false, error: error.message });
    }
  }

  return {
    total: employees.rows.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

export default {
  calculateMomentumScore,
  getCachedScore,
  getOrgMomentumDashboard,
  getMomentumLeaderboard,
  calculateOrgMomentumScores,
};
