// ============================================================
// UPLIFT AI SCHEDULING SERVICE
// Demand forecasting and intelligent schedule optimization
// ============================================================

import { db } from '../lib/database.js';

// Use db.query for queries and db.getClient() for transactions
const pool = { 
  query: db.query.bind(db), 
  connect: db.getClient.bind(db) 
};

// -------------------- Configuration --------------------

const CONFIG = {
  // Forecasting parameters
  HISTORY_WEEKS: 12,           // Weeks of history to analyze
  FORECAST_HORIZON_DAYS: 28,   // Days to forecast ahead
  MIN_DATA_POINTS: 4,          // Minimum data points for pattern detection

  // Optimization weights
  WEIGHT_COVERAGE: 0.35,       // Importance of shift coverage
  WEIGHT_PREFERENCES: 0.25,    // Importance of employee preferences
  WEIGHT_SKILLS: 0.20,         // Importance of skill matching
  WEIGHT_FAIRNESS: 0.15,       // Importance of fair distribution
  WEIGHT_COST: 0.05,           // Importance of labor cost

  // Thresholds
  HIGH_DEMAND_THRESHOLD: 1.3,  // 30% above average
  LOW_DEMAND_THRESHOLD: 0.7,   // 30% below average

  // Labor law constraints (UK Working Time Regulations)
  MAX_HOURS_PER_WEEK: 48,      // UK WTR limit (unless opted out)
  MIN_REST_BETWEEN_SHIFTS: 11, // Hours between shifts
  MAX_CONSECUTIVE_DAYS: 6,     // Days without rest
  MIN_BREAK_AFTER_HOURS: 6,    // Must have break after 6 hours
  MIN_WEEKLY_REST: 24,         // Hours per week rest minimum

  // Scoring weights for employee selection
  SCORE_SKILL_MATCH: 25,       // Points for matching required skills
  SCORE_PREFERENCE_MATCH: 15,  // Points for preferred shift time
  SCORE_FAIRNESS: 15,          // Points for balancing hours
  SCORE_MOMENTUM: 10,          // Points for high momentum score
  SCORE_COST_EFFICIENCY: 10,   // Points for cost efficiency
  SCORE_AVAILABILITY: 25,      // Points for availability
};

// -------------------- Demand Forecasting --------------------

/**
 * Generate demand forecast for a location
 * @param {string} locationId 
 * @param {number} daysAhead - Number of days to forecast
 * @returns {Promise<Array>} Forecasted demand by day/hour
 */
export async function generateDemandForecast(locationId, daysAhead = 28) {
  const client = await pool.connect();
  
  try {
    // Get historical shift data
    const historyData = await getHistoricalData(client, locationId);
    
    // Analyze patterns
    const patterns = analyzePatterns(historyData);
    
    // Generate forecast
    const forecast = [];
    const today = new Date();
    
    for (let d = 0; d < daysAhead; d++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + d);
      
      const dayOfWeek = forecastDate.getDay();
      const dayForecast = {
        date: forecastDate.toISOString().split('T')[0],
        dayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        hours: [],
        totalDemand: 0,
        confidence: 0,
      };
      
      // Check for special events/holidays
      const specialFactor = await getSpecialEventFactor(client, locationId, forecastDate);
      
      // Generate hourly forecast
      for (let hour = 0; hour < 24; hour++) {
        const baseDemand = patterns.hourlyByDay[dayOfWeek]?.[hour] || patterns.avgHourly[hour] || 0;
        
        // Apply seasonal and trend adjustments
        const seasonalFactor = getSeasonalFactor(forecastDate);
        const trendFactor = patterns.trend || 1.0;
        
        const adjustedDemand = baseDemand * seasonalFactor * trendFactor * specialFactor;
        const confidence = calculateConfidence(patterns, dayOfWeek, hour);
        
        dayForecast.hours.push({
          hour,
          demand: Math.round(adjustedDemand * 10) / 10,
          confidence,
          staffNeeded: Math.ceil(adjustedDemand),
        });
        
        dayForecast.totalDemand += adjustedDemand;
      }
      
      dayForecast.confidence = dayForecast.hours.reduce((sum, h) => sum + h.confidence, 0) / 24;
      dayForecast.peakHours = identifyPeakHours(dayForecast.hours);
      dayForecast.recommendedStaff = calculateRecommendedStaff(dayForecast);
      
      forecast.push(dayForecast);
    }
    
    return {
      locationId,
      generatedAt: new Date().toISOString(),
      forecastDays: daysAhead,
      forecast,
      patterns: {
        weeklyPattern: patterns.weeklyPattern,
        peakDays: patterns.peakDays,
        trend: patterns.trend,
      },
    };
    
  } finally {
    client.release();
  }
}

/**
 * Get historical shift and demand data
 */
async function getHistoricalData(client, locationId) {
  const weeksAgo = new Date();
  weeksAgo.setDate(weeksAgo.getDate() - (CONFIG.HISTORY_WEEKS * 7));
  
  // Get shift data
  const shiftsResult = await client.query(`
    SELECT 
      date,
      EXTRACT(DOW FROM date) as day_of_week,
      EXTRACT(HOUR FROM start_time) as start_hour,
      EXTRACT(HOUR FROM end_time) as end_hour,
      COUNT(*) as shift_count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
    FROM shifts
    WHERE location_id = $1 
      AND date >= $2
      AND status IN ('scheduled', 'completed', 'in_progress')
    GROUP BY date, EXTRACT(DOW FROM date), EXTRACT(HOUR FROM start_time), EXTRACT(HOUR FROM end_time)
    ORDER BY date
  `, [locationId, weeksAgo]);
  
  // Get time entries for actual staffing levels
  const timeResult = await client.query(`
    SELECT 
      DATE(clock_in) as date,
      EXTRACT(DOW FROM clock_in) as day_of_week,
      EXTRACT(HOUR FROM clock_in) as hour,
      COUNT(DISTINCT employee_id) as staff_count
    FROM time_entries
    WHERE location_id = $1 
      AND clock_in >= $2
    GROUP BY DATE(clock_in), EXTRACT(DOW FROM clock_in), EXTRACT(HOUR FROM clock_in)
  `, [locationId, weeksAgo]);
  
  return {
    shifts: shiftsResult.rows,
    timeEntries: timeResult.rows,
  };
}

/**
 * Analyze historical patterns
 */
function analyzePatterns(data) {
  const patterns = {
    hourlyByDay: {},      // [dayOfWeek][hour] = avg demand
    avgHourly: {},        // [hour] = overall avg
    weeklyPattern: [],    // [dayOfWeek] = relative demand
    peakDays: [],
    trend: 1.0,
  };
  
  // Initialize structures
  for (let d = 0; d < 7; d++) {
    patterns.hourlyByDay[d] = {};
    for (let h = 0; h < 24; h++) {
      patterns.hourlyByDay[d][h] = [];
    }
  }
  for (let h = 0; h < 24; h++) {
    patterns.avgHourly[h] = [];
  }
  
  // Aggregate shift data by day/hour
  data.shifts.forEach(row => {
    const dow = parseInt(row.day_of_week);
    const startHour = parseInt(row.start_hour);
    const endHour = parseInt(row.end_hour) || 24;
    const count = parseInt(row.shift_count);
    
    for (let h = startHour; h < endHour; h++) {
      patterns.hourlyByDay[dow][h].push(count);
      patterns.avgHourly[h].push(count);
    }
  });
  
  // Calculate averages
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const values = patterns.hourlyByDay[d][h];
      patterns.hourlyByDay[d][h] = values.length >= CONFIG.MIN_DATA_POINTS
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;
    }
  }
  
  for (let h = 0; h < 24; h++) {
    const values = patterns.avgHourly[h];
    patterns.avgHourly[h] = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }
  
  // Calculate weekly pattern (relative demand by day)
  const dailyTotals = [];
  for (let d = 0; d < 7; d++) {
    let total = 0;
    for (let h = 0; h < 24; h++) {
      total += patterns.hourlyByDay[d][h];
    }
    dailyTotals.push(total);
  }
  
  const avgDaily = dailyTotals.reduce((a, b) => a + b, 0) / 7;
  patterns.weeklyPattern = dailyTotals.map(t => avgDaily > 0 ? t / avgDaily : 1);
  
  // Identify peak days
  patterns.peakDays = patterns.weeklyPattern
    .map((val, idx) => ({ day: idx, factor: val }))
    .filter(d => d.factor >= CONFIG.HIGH_DEMAND_THRESHOLD)
    .sort((a, b) => b.factor - a.factor)
    .map(d => d.day);
  
  // Calculate trend (simple linear regression on weekly totals)
  patterns.trend = calculateTrend(data.shifts);
  
  return patterns;
}

/**
 * Calculate trend factor from historical data
 */
function calculateTrend(shifts) {
  if (shifts.length < 14) return 1.0;
  
  // Group by week
  const weeklyTotals = {};
  shifts.forEach(row => {
    const date = new Date(row.date);
    const weekNum = Math.floor((date.getTime() - new Date(shifts[0].date).getTime()) / (7 * 24 * 60 * 60 * 1000));
    weeklyTotals[weekNum] = (weeklyTotals[weekNum] || 0) + parseInt(row.shift_count);
  });
  
  const weeks = Object.keys(weeklyTotals).map(Number).sort((a, b) => a - b);
  if (weeks.length < 4) return 1.0;
  
  // Simple linear regression
  const n = weeks.length;
  const sumX = weeks.reduce((a, b) => a + b, 0);
  const sumY = weeks.reduce((sum, w) => sum + weeklyTotals[w], 0);
  const sumXY = weeks.reduce((sum, w) => sum + w * weeklyTotals[w], 0);
  const sumX2 = weeks.reduce((sum, w) => sum + w * w, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;
  
  // Convert slope to trend factor (capped between 0.8 and 1.2)
  const trendFactor = avgY > 0 ? 1 + (slope / avgY) * 0.5 : 1.0;
  return Math.max(0.8, Math.min(1.2, trendFactor));
}

/**
 * Get seasonal adjustment factor
 */
function getSeasonalFactor(date) {
  const month = date.getMonth();
  
  // Basic UK retail seasonality
  const seasonalFactors = {
    0: 0.85,   // January - post-holiday slump
    1: 0.90,   // February
    2: 0.95,   // March
    3: 1.00,   // April
    4: 1.00,   // May
    5: 1.05,   // June
    6: 1.00,   // July
    7: 0.95,   // August - summer holidays
    8: 1.05,   // September - back to school
    9: 1.00,   // October
    10: 1.15,  // November - Black Friday
    11: 1.30,  // December - Christmas
  };
  
  return seasonalFactors[month] || 1.0;
}

/**
 * Get special event factor
 */
async function getSpecialEventFactor(client, locationId, date) {
  const dateStr = date.toISOString().split('T')[0];
  
  // Check for configured special events
  const result = await client.query(`
    SELECT demand_factor 
    FROM special_events 
    WHERE (location_id = $1 OR location_id IS NULL)
      AND event_date = $2
  `, [locationId, dateStr]);
  
  if (result.rows[0]) {
    return parseFloat(result.rows[0].demand_factor);
  }
  
  // Check for UK bank holidays
  const bankHolidays = getBankHolidays(date.getFullYear());
  if (bankHolidays.includes(dateStr)) {
    return 0.6; // Reduced demand on bank holidays
  }
  
  return 1.0;
}

/**
 * Get UK bank holidays for a year
 */
function getBankHolidays(year) {
  // Simplified - in production would use gov.uk API
  const holidays = [];
  
  // New Year's Day
  holidays.push(`${year}-01-01`);
  
  // Good Friday / Easter Monday (approximate)
  const easter = calculateEaster(year);
  holidays.push(addDays(easter, -2)); // Good Friday
  holidays.push(addDays(easter, 1));  // Easter Monday
  
  // Early May bank holiday (first Monday of May)
  holidays.push(getFirstMondayOf(year, 4));
  
  // Spring bank holiday (last Monday of May)
  holidays.push(getLastMondayOf(year, 4));
  
  // Summer bank holiday (last Monday of August)
  holidays.push(getLastMondayOf(year, 7));
  
  // Christmas
  holidays.push(`${year}-12-25`);
  holidays.push(`${year}-12-26`);
  
  return holidays;
}

/**
 * Calculate confidence level
 */
function calculateConfidence(patterns, dayOfWeek, hour) {
  // Higher confidence for well-established patterns
  const baseConfidence = 0.5;
  
  // Boost for weekdays (more data typically)
  const dayBoost = dayOfWeek >= 1 && dayOfWeek <= 5 ? 0.1 : 0;
  
  // Boost for business hours
  const hourBoost = hour >= 8 && hour <= 20 ? 0.15 : 0;
  
  // Boost for strong weekly patterns
  const patternStrength = Math.abs(patterns.weeklyPattern[dayOfWeek] - 1);
  const patternBoost = patternStrength > 0.1 ? 0.1 : 0;
  
  return Math.min(0.95, baseConfidence + dayBoost + hourBoost + patternBoost);
}

/**
 * Identify peak hours
 */
function identifyPeakHours(hours) {
  const avgDemand = hours.reduce((sum, h) => sum + h.demand, 0) / hours.length;
  const threshold = avgDemand * CONFIG.HIGH_DEMAND_THRESHOLD;
  
  return hours
    .filter(h => h.demand >= threshold)
    .map(h => h.hour);
}

/**
 * Calculate recommended staff levels
 */
function calculateRecommendedStaff(dayForecast) {
  const recommendations = {
    minimum: 0,
    optimal: 0,
    maximum: 0,
    byPeriod: {},
  };
  
  // Define shift periods
  const periods = [
    { name: 'morning', start: 6, end: 12 },
    { name: 'afternoon', start: 12, end: 18 },
    { name: 'evening', start: 18, end: 23 },
  ];
  
  periods.forEach(period => {
    const periodHours = dayForecast.hours.filter(h => h.hour >= period.start && h.hour < period.end);
    const avgDemand = periodHours.reduce((sum, h) => sum + h.demand, 0) / periodHours.length;
    const peakDemand = Math.max(...periodHours.map(h => h.demand));
    
    recommendations.byPeriod[period.name] = {
      minimum: Math.ceil(avgDemand * 0.8),
      optimal: Math.ceil(avgDemand),
      peak: Math.ceil(peakDemand),
    };
    
    recommendations.minimum = Math.max(recommendations.minimum, Math.ceil(avgDemand * 0.8));
    recommendations.optimal = Math.max(recommendations.optimal, Math.ceil(avgDemand));
    recommendations.maximum = Math.max(recommendations.maximum, Math.ceil(peakDemand));
  });
  
  return recommendations;
}

// -------------------- Schedule Optimization --------------------

/**
 * Generate optimized schedule suggestions
 */
export async function generateScheduleSuggestions(locationId, weekStartDate) {
  const client = await pool.connect();
  
  try {
    // Get demand forecast
    const forecast = await generateDemandForecast(locationId, 7);
    
    // Get available employees
    const employees = await getAvailableEmployees(client, locationId, weekStartDate);
    
    // Get employee preferences and constraints
    const preferences = await getEmployeePreferences(client, employees.map(e => e.id));
    
    // Get existing shifts
    const existingShifts = await getExistingShifts(client, locationId, weekStartDate);
    
    // Generate suggestions
    const suggestions = [];
    
    forecast.forecast.forEach(day => {
      const daySuggestions = optimizeDaySchedule(day, employees, preferences, existingShifts);
      suggestions.push({
        date: day.date,
        dayName: day.dayName,
        shifts: daySuggestions.shifts,
        gaps: daySuggestions.gaps,
        overstaffed: daySuggestions.overstaffed,
        score: daySuggestions.score,
      });
    });
    
    return {
      locationId,
      weekStart: weekStartDate,
      generatedAt: new Date().toISOString(),
      suggestions,
      summary: {
        totalShiftsNeeded: suggestions.reduce((sum, d) => sum + d.shifts.length, 0),
        coverageScore: suggestions.reduce((sum, d) => sum + d.score.coverage, 0) / 7,
        gaps: suggestions.reduce((sum, d) => sum + d.gaps.length, 0),
      },
    };
    
  } finally {
    client.release();
  }
}

/**
 * Get available employees for scheduling
 */
async function getAvailableEmployees(client, locationId, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const result = await client.query(`
    SELECT 
      e.id,
      e.user_id,
      u.first_name,
      u.last_name,
      e.hourly_rate,
      e.max_hours_per_week,
      e.preferred_hours_per_week,
      e.primary_role_id,
      r.name as role_name,
      COALESCE(
        (SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600)
         FROM shifts 
         WHERE employee_id = e.id 
           AND date >= $2 AND date < $3
           AND status != 'cancelled'),
        0
      ) as scheduled_hours
    FROM employees e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN roles r ON r.id = e.primary_role_id
    WHERE e.primary_location_id = $1
      AND e.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM time_off_requests tor
        WHERE tor.employee_id = e.id
          AND tor.status = 'approved'
          AND tor.start_date <= $3
          AND tor.end_date >= $2
      )
    ORDER BY e.seniority_date
  `, [locationId, weekStart, weekEnd.toISOString().split('T')[0]]);
  
  return result.rows;
}

/**
 * Get employee preferences
 */
async function getEmployeePreferences(client, employeeIds) {
  if (!employeeIds.length) return {};
  
  const result = await client.query(`
    SELECT 
      employee_id,
      preferred_days,
      unavailable_days,
      preferred_shift_types,
      max_consecutive_days,
      min_hours_between_shifts
    FROM employee_preferences
    WHERE employee_id = ANY($1)
  `, [employeeIds]);
  
  const prefs = {};
  result.rows.forEach(row => {
    prefs[row.employee_id] = row;
  });
  
  return prefs;
}

/**
 * Get existing shifts for the week
 */
async function getExistingShifts(client, locationId, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const result = await client.query(`
    SELECT 
      id, date, start_time, end_time, employee_id, role_id, status, is_open
    FROM shifts
    WHERE location_id = $1
      AND date >= $2 AND date < $3
      AND status != 'cancelled'
  `, [locationId, weekStart, weekEnd.toISOString().split('T')[0]]);
  
  return result.rows;
}

/**
 * Optimize schedule for a single day
 */
function optimizeDaySchedule(forecast, employees, preferences, existingShifts) {
  const dayShifts = existingShifts.filter(s => s.date === forecast.date);
  const suggestions = [];
  const gaps = [];
  const overstaffed = [];
  
  // Define standard shift patterns
  const shiftPatterns = [
    { name: 'Morning', start: '06:00', end: '14:00', hours: 8 },
    { name: 'Mid', start: '10:00', end: '18:00', hours: 8 },
    { name: 'Afternoon', start: '14:00', end: '22:00', hours: 8 },
    { name: 'Short AM', start: '08:00', end: '12:00', hours: 4 },
    { name: 'Short PM', start: '16:00', end: '20:00', hours: 4 },
  ];
  
  // Calculate coverage needs by hour
  const coverageNeeds = forecast.hours.map(h => ({
    hour: h.hour,
    needed: h.staffNeeded,
    covered: 0,
  }));
  
  // Account for existing shifts
  dayShifts.forEach(shift => {
    if (!shift.is_open) {
      const startHour = parseInt(shift.start_time.split(':')[0]);
      const endHour = parseInt(shift.end_time.split(':')[0]) || 24;
      for (let h = startHour; h < endHour; h++) {
        if (coverageNeeds[h]) {
          coverageNeeds[h].covered++;
        }
      }
    }
  });
  
  // Score and rank employees for each shift pattern
  shiftPatterns.forEach(pattern => {
    const startHour = parseInt(pattern.start.split(':')[0]);
    const endHour = parseInt(pattern.end.split(':')[0]);
    
    // Check if this pattern is needed
    const patternHours = coverageNeeds.slice(startHour, endHour);
    const maxGap = Math.max(...patternHours.map(h => h.needed - h.covered));
    
    if (maxGap > 0) {
      // Rank employees for this shift
      const rankedEmployees = employees
        .map(emp => ({
          ...emp,
          score: scoreEmployeeForShift(emp, pattern, preferences[emp.id], forecast),
        }))
        .filter(emp => emp.score > 0)
        .sort((a, b) => b.score - a.score);
      
      // Suggest top candidates
      const numNeeded = Math.ceil(maxGap);
      for (let i = 0; i < Math.min(numNeeded, rankedEmployees.length); i++) {
        suggestions.push({
          pattern: pattern.name,
          startTime: pattern.start,
          endTime: pattern.end,
          employee: {
            id: rankedEmployees[i].id,
            name: `${rankedEmployees[i].first_name} ${rankedEmployees[i].last_name}`,
          },
          score: rankedEmployees[i].score,
          reason: getAssignmentReason(rankedEmployees[i], pattern),
        });
      }
    }
  });
  
  // Identify remaining gaps
  coverageNeeds.forEach(h => {
    if (h.needed > h.covered && h.hour >= 6 && h.hour <= 22) {
      gaps.push({
        hour: h.hour,
        shortfall: h.needed - h.covered,
      });
    }
    if (h.covered > h.needed * 1.5) {
      overstaffed.push({
        hour: h.hour,
        excess: h.covered - h.needed,
      });
    }
  });
  
  return {
    shifts: suggestions,
    gaps,
    overstaffed,
    score: {
      coverage: 1 - (gaps.length / 16), // Out of 16 operating hours
      efficiency: 1 - (overstaffed.length / 16),
    },
  };
}

/**
 * Score an employee for a specific shift
 * Enhanced with proper skill matching, labor law checks, and quality factors
 */
function scoreEmployeeForShift(employee, shiftPattern, preferences, forecast, context = {}) {
  const reasons = [];
  let score = 0;

  // -------------------- HARD CONSTRAINTS (Eligibility) --------------------

  // 1. Check hours remaining this week
  const remainingHours = (employee.max_hours_per_week || CONFIG.MAX_HOURS_PER_WEEK) - (employee.scheduled_hours || 0);
  if (remainingHours < shiftPattern.hours) {
    return { score: 0, eligible: false, reason: 'Would exceed weekly hours limit' };
  }

  // 2. Check minimum rest between shifts
  if (employee.last_shift_end) {
    const lastEnd = new Date(employee.last_shift_end);
    const thisStart = new Date(`${forecast.date}T${shiftPattern.start}`);
    const restHours = (thisStart - lastEnd) / (1000 * 60 * 60);
    if (restHours < CONFIG.MIN_REST_BETWEEN_SHIFTS) {
      return { score: 0, eligible: false, reason: `Insufficient rest (${Math.round(restHours)}h < ${CONFIG.MIN_REST_BETWEEN_SHIFTS}h required)` };
    }
  }

  // 3. Check consecutive days worked
  const consecutiveDays = employee.consecutive_days_worked || 0;
  if (consecutiveDays >= CONFIG.MAX_CONSECUTIVE_DAYS) {
    return { score: 0, eligible: false, reason: 'Exceeded maximum consecutive days' };
  }

  // 4. Check unavailable days
  if (preferences?.unavailable_days) {
    const dayOfWeek = new Date(forecast.date).getDay();
    if (preferences.unavailable_days.includes(dayOfWeek)) {
      return { score: 0, eligible: false, reason: 'Day marked as unavailable' };
    }
  }

  // 5. Check specific unavailable dates
  if (preferences?.unavailable_dates?.includes(forecast.date)) {
    return { score: 0, eligible: false, reason: 'Date marked as unavailable' };
  }

  // -------------------- SOFT SCORING --------------------

  // 1. SKILL MATCH (25 points)
  if (context.requiredSkills && context.requiredSkills.length > 0) {
    const employeeSkillIds = employee.skills?.map(s => s.skill_id || s.id) || [];
    const matchedSkills = context.requiredSkills.filter(s => employeeSkillIds.includes(s));
    const skillMatchRate = matchedSkills.length / context.requiredSkills.length;
    const skillScore = Math.round(skillMatchRate * CONFIG.SCORE_SKILL_MATCH);
    score += skillScore;
    if (skillMatchRate === 1) reasons.push('Full skill match');
    else if (skillMatchRate > 0.5) reasons.push(`${Math.round(skillMatchRate * 100)}% skill match`);
  } else {
    // No skills required = full points
    score += CONFIG.SCORE_SKILL_MATCH;
  }

  // 2. PREFERENCE MATCH (15 points)
  if (preferences) {
    const dayOfWeek = new Date(forecast.date).getDay();
    const shiftStartHour = parseInt(shiftPattern.start.split(':')[0]);

    // Day preference
    if (preferences.preferred_days?.includes(dayOfWeek)) {
      score += 8;
      reasons.push('Preferred day');
    }

    // Time preference
    const prefTime = preferences.preferred_shift_time;
    if (prefTime === 'morning' && shiftStartHour >= 6 && shiftStartHour < 12) {
      score += 7;
      reasons.push('Preferred morning shift');
    } else if (prefTime === 'afternoon' && shiftStartHour >= 12 && shiftStartHour < 17) {
      score += 7;
      reasons.push('Preferred afternoon shift');
    } else if (prefTime === 'evening' && shiftStartHour >= 17) {
      score += 7;
      reasons.push('Preferred evening shift');
    }
  }

  // 3. FAIRNESS - Balance hours across team (15 points)
  const preferredHours = employee.preferred_hours_per_week || 32;
  const scheduledHours = employee.scheduled_hours || 0;
  const hoursDeficit = preferredHours - scheduledHours;

  if (hoursDeficit > shiftPattern.hours) {
    // Employee is under their preferred hours - prioritize them
    score += CONFIG.SCORE_FAIRNESS;
    reasons.push('Under preferred hours');
  } else if (hoursDeficit > 0) {
    score += Math.round((hoursDeficit / shiftPattern.hours) * CONFIG.SCORE_FAIRNESS);
  }

  // 4. MOMENTUM SCORE (10 points)
  if (employee.momentum_score) {
    const momentumBonus = Math.round((employee.momentum_score / 100) * CONFIG.SCORE_MOMENTUM);
    score += momentumBonus;
    if (employee.momentum_score >= 80) reasons.push('High performer');
  }

  // 5. COST EFFICIENCY (10 points)
  if (context.avgHourlyRate && employee.hourly_rate) {
    if (employee.hourly_rate <= context.avgHourlyRate) {
      const savings = (context.avgHourlyRate - employee.hourly_rate) / context.avgHourlyRate;
      score += Math.round(Math.min(savings * 2, 1) * CONFIG.SCORE_COST_EFFICIENCY);
    }
  }

  // 6. AVAILABILITY (25 points - already confirmed available, award points)
  score += CONFIG.SCORE_AVAILABILITY;

  return {
    score: Math.min(100, Math.max(0, score)),
    eligible: true,
    reasons,
    breakdown: {
      skills: context.requiredSkills ? Math.round((employee.skills?.length || 0) / Math.max(1, context.requiredSkills.length) * 25) : 25,
      preference: preferences ? 15 : 0,
      fairness: hoursDeficit > 0 ? 15 : 0,
      momentum: employee.momentum_score ? Math.round((employee.momentum_score / 100) * 10) : 0,
      availability: 25,
    },
  };
}

/**
 * Calculate quality metrics for a generated schedule
 */
function calculateScheduleQuality(schedule, forecast, employees) {
  const metrics = {
    coverage: 0,
    skillMatch: 0,
    fairness: 0,
    laborCompliance: 100,
    costEfficiency: 0,
    overall: 0,
    violations: [],
  };

  // 1. COVERAGE: slots filled / total slots needed
  let totalSlotsNeeded = 0;
  let slotsFilled = 0;
  forecast.forEach(day => {
    day.hours.forEach(h => {
      if (h.staffNeeded > 0) {
        totalSlotsNeeded += h.staffNeeded;
        // Count shifts covering this hour
        const shiftsThisHour = schedule.filter(s =>
          s.date === day.date &&
          parseInt(s.startTime.split(':')[0]) <= h.hour &&
          parseInt(s.endTime.split(':')[0]) > h.hour
        ).length;
        slotsFilled += Math.min(shiftsThisHour, h.staffNeeded);
      }
    });
  });
  metrics.coverage = totalSlotsNeeded > 0 ? Math.round((slotsFilled / totalSlotsNeeded) * 100) : 100;

  // 2. SKILL MATCH: shifts with fully qualified workers
  const shiftsWithSkills = schedule.filter(s => s.skillMatchRate === 1).length;
  metrics.skillMatch = schedule.length > 0 ? Math.round((shiftsWithSkills / schedule.length) * 100) : 100;

  // 3. FAIRNESS: Gini coefficient of hours distribution
  const hoursPerEmployee = {};
  schedule.forEach(s => {
    if (!hoursPerEmployee[s.employeeId]) hoursPerEmployee[s.employeeId] = 0;
    hoursPerEmployee[s.employeeId] += s.hours || 8;
  });
  const hoursArray = Object.values(hoursPerEmployee).sort((a, b) => a - b);
  if (hoursArray.length > 1) {
    // Simplified Gini: lower is more equal
    const mean = hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length;
    const variance = hoursArray.reduce((sum, h) => sum + Math.abs(h - mean), 0) / hoursArray.length;
    const gini = variance / (2 * mean);
    metrics.fairness = Math.round((1 - Math.min(gini, 1)) * 100);
  } else {
    metrics.fairness = 100;
  }

  // 4. LABOR COMPLIANCE: check for violations
  employees.forEach(emp => {
    const empSchedule = schedule.filter(s => s.employeeId === emp.id);
    let totalHours = empSchedule.reduce((sum, s) => sum + (s.hours || 8), 0);

    if (totalHours > CONFIG.MAX_HOURS_PER_WEEK) {
      metrics.violations.push({
        type: 'MAX_HOURS',
        employeeId: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        value: totalHours,
        limit: CONFIG.MAX_HOURS_PER_WEEK,
      });
      metrics.laborCompliance -= 10;
    }

    // Check consecutive days
    const datesWorked = [...new Set(empSchedule.map(s => s.date))].sort();
    let maxConsecutive = 1;
    let current = 1;
    for (let i = 1; i < datesWorked.length; i++) {
      const diff = (new Date(datesWorked[i]) - new Date(datesWorked[i - 1])) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 1;
      }
    }
    if (maxConsecutive > CONFIG.MAX_CONSECUTIVE_DAYS) {
      metrics.violations.push({
        type: 'CONSECUTIVE_DAYS',
        employeeId: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        value: maxConsecutive,
        limit: CONFIG.MAX_CONSECUTIVE_DAYS,
      });
      metrics.laborCompliance -= 10;
    }
  });
  metrics.laborCompliance = Math.max(0, metrics.laborCompliance);

  // 5. OVERALL SCORE (weighted average)
  metrics.overall = Math.round(
    metrics.coverage * 0.35 +
    metrics.skillMatch * 0.20 +
    metrics.fairness * 0.15 +
    metrics.laborCompliance * 0.20 +
    metrics.costEfficiency * 0.10
  );

  return metrics;
}

/**
 * Get human-readable reason for assignment
 */
function getAssignmentReason(employee, pattern) {
  // If scoreResult has reasons from enhanced scoring, use those
  if (employee.scoreResult?.reasons?.length > 0) {
    return employee.scoreResult.reasons.join(', ');
  }

  const reasons = [];

  if (employee.scheduled_hours < (employee.preferred_hours_per_week || 32)) {
    reasons.push('Under preferred hours');
  }

  if (employee.score > 80) {
    reasons.push('High match score');
  }

  if (employee.momentum_score >= 80) {
    reasons.push('Top performer');
  }

  return reasons.length ? reasons.join(', ') : 'Available and qualified';
}

// -------------------- Utility Functions --------------------

function calculateEaster(year) {
  // Computus algorithm for Easter Sunday
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getFirstMondayOf(year, month) {
  const date = new Date(year, month, 1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

function getLastMondayOf(year, month) {
  const date = new Date(year, month + 1, 0);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }
  return date.toISOString().split('T')[0];
}

// -------------------- Export --------------------

export {
  generateDemandForecast,
  generateScheduleSuggestions,
  calculateScheduleQuality,
  scoreEmployeeForShift,
  CONFIG as SCHEDULING_CONFIG,
};

export default {
  generateDemandForecast,
  generateScheduleSuggestions,
  calculateScheduleQuality,
};
