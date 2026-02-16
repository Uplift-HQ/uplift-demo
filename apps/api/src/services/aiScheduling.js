// ============================================================
// UPLIFT AI SCHEDULING SERVICE
// ML-based demand forecasting and genetic algorithm optimization
// ============================================================

import { db } from '../lib/database.js';

// -------------------- Genetic Algorithm Configuration --------------------

const GA_CONFIG = {
  POPULATION_SIZE: 20,           // Number of schedules in population
  GENERATIONS: 100,              // Max generations before stopping
  CONVERGENCE_THRESHOLD: 0.001,  // Stop if fitness improvement < this
  CONVERGENCE_GENERATIONS: 10,   // Check convergence over this many generations
  MUTATION_RATE: 0.15,           // Probability of mutation
  CROSSOVER_RATE: 0.7,           // Probability of crossover
  TOURNAMENT_SIZE: 3,            // Tournament selection size
  ELITE_COUNT: 2,                // Best schedules preserved each generation
};

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

// ================================================================================
// GENETIC ALGORITHM SCHEDULE OPTIMIZER
// Population-based optimization with historical learning
// ================================================================================

/**
 * Generate optimized schedule using genetic algorithm
 * Returns best schedule with quality metrics and alternatives
 */
export async function generateOptimizedSchedule(locationId, weekStartDate, options = {}) {
  const startTime = Date.now();
  const client = await pool.connect();

  try {
    // Phase 1: Gather data
    const [forecast, employees, historicalFeedback] = await Promise.all([
      generateDemandForecast(locationId, 7),
      getAvailableEmployeesWithHistory(client, locationId, weekStartDate),
      getHistoricalFeedback(client, locationId),
    ]);

    // Get required skills per shift type
    const shiftRequirements = await getShiftRequirements(client, locationId);

    // Build employee reliability scores from historical feedback
    const employeeReliability = buildReliabilityScores(employees, historicalFeedback);

    // Phase 2: Generate initial population
    const context = {
      forecast: forecast.forecast,
      employees,
      employeeReliability,
      shiftRequirements,
      avgHourlyRate: employees.reduce((sum, e) => sum + (e.hourly_rate || 12), 0) / Math.max(1, employees.length),
      budget: options.budget || null,
    };

    let population = generateInitialPopulation(context);

    // Evaluate initial fitness
    population = population.map(schedule => ({
      schedule,
      fitness: evaluateFitness(schedule, context),
    }));

    // Phase 3: Evolution
    const fitnessHistory = [];
    let bestFitness = Math.max(...population.map(p => p.fitness.overall));
    let stagnantGenerations = 0;
    let generation = 0;

    while (generation < GA_CONFIG.GENERATIONS) {
      generation++;

      // Selection
      const parents = tournamentSelection(population);

      // Crossover
      const offspring = [];
      for (let i = 0; i < parents.length - 1; i += 2) {
        if (Math.random() < GA_CONFIG.CROSSOVER_RATE) {
          const [child1, child2] = crossover(parents[i].schedule, parents[i + 1].schedule, context);
          offspring.push(child1, child2);
        } else {
          offspring.push([...parents[i].schedule], [...parents[i + 1].schedule]);
        }
      }

      // Mutation
      const mutatedOffspring = offspring.map(schedule =>
        Math.random() < GA_CONFIG.MUTATION_RATE ? mutate(schedule, context) : schedule
      );

      // Evaluate offspring fitness
      const evaluatedOffspring = mutatedOffspring.map(schedule => ({
        schedule,
        fitness: evaluateFitness(schedule, context),
      }));

      // Elitism: keep best from current population
      population.sort((a, b) => b.fitness.overall - a.fitness.overall);
      const elite = population.slice(0, GA_CONFIG.ELITE_COUNT);

      // Create new population
      const combined = [...elite, ...evaluatedOffspring];
      combined.sort((a, b) => b.fitness.overall - a.fitness.overall);
      population = combined.slice(0, GA_CONFIG.POPULATION_SIZE);

      // Track convergence
      const currentBest = population[0].fitness.overall;
      fitnessHistory.push(currentBest);

      if (currentBest - bestFitness < GA_CONFIG.CONVERGENCE_THRESHOLD) {
        stagnantGenerations++;
      } else {
        stagnantGenerations = 0;
        bestFitness = currentBest;
      }

      // Early termination if converged
      if (stagnantGenerations >= GA_CONFIG.CONVERGENCE_GENERATIONS) {
        break;
      }
    }

    // Phase 4: Extract results
    const bestSchedule = population[0];

    // Generate alternatives with different optimization targets
    const alternatives = await generateAlternatives(context, population);

    const elapsedMs = Date.now() - startTime;

    return {
      schedule: bestSchedule.schedule,
      quality: {
        fitness_score: Math.round(bestSchedule.fitness.overall * 100) / 100,
        coverage_pct: bestSchedule.fitness.coverage,
        skill_match_pct: bestSchedule.fitness.skillMatch,
        preference_score: bestSchedule.fitness.preferenceAlignment,
        fairness_index: bestSchedule.fitness.fairness / 100,
        labor_cost: bestSchedule.fitness.laborCost,
        budget_variance_pct: bestSchedule.fitness.budgetVariance,
        constraint_violations: bestSchedule.fitness.violations.length,
        generations_run: generation,
        convergence: stagnantGenerations >= GA_CONFIG.CONVERGENCE_GENERATIONS,
        elapsed_ms: elapsedMs,
      },
      violations: bestSchedule.fitness.violations,
      alternatives,
      metadata: {
        locationId,
        weekStart: weekStartDate,
        generatedAt: new Date().toISOString(),
        employeeCount: employees.length,
        algorithm: 'genetic',
        config: GA_CONFIG,
      },
    };

  } finally {
    client.release();
  }
}

/**
 * Get employees with historical performance data
 */
async function getAvailableEmployeesWithHistory(client, locationId, weekStart) {
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
      ms.score as momentum_score,
      COALESCE(
        (SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600)
         FROM shifts
         WHERE employee_id = e.id
           AND date >= $2 AND date < $3
           AND status != 'cancelled'),
        0
      ) as scheduled_hours,
      COALESCE(
        (SELECT json_agg(json_build_object('skill_id', es.skill_id, 'level', es.proficiency_level))
         FROM employee_skills es WHERE es.employee_id = e.id),
        '[]'
      ) as skills,
      COALESCE(
        (SELECT MAX(date) FROM shifts WHERE employee_id = e.id AND date < $2),
        NULL
      ) as last_shift_date,
      (SELECT COUNT(*) FROM shifts
       WHERE employee_id = e.id
         AND date >= $2::date - INTERVAL '6 days' AND date < $2
         AND status != 'cancelled') as consecutive_days_worked
    FROM employees e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN roles r ON r.id = e.primary_role_id
    LEFT JOIN momentum_scores ms ON ms.employee_id = e.id
    WHERE e.primary_location_id = $1
      AND e.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM time_off_requests tor
        WHERE tor.employee_id = e.id
          AND tor.status = 'approved'
          AND tor.start_date <= $3
          AND tor.end_date >= $2
      )
    ORDER BY ms.score DESC NULLS LAST, e.seniority_date
  `, [locationId, weekStart, weekEnd.toISOString().split('T')[0]]);

  return result.rows.map(row => ({
    ...row,
    skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills,
  }));
}

/**
 * Get historical schedule feedback for learning
 */
async function getHistoricalFeedback(client, locationId) {
  const result = await client.query(`
    SELECT
      sf.employee_id,
      sf.predicted_attendance,
      sf.actual_attendance,
      sf.was_swapped,
      sf.overtime_minutes,
      sf.quality_rating,
      s.date,
      EXTRACT(DOW FROM s.date) as day_of_week,
      s.start_time,
      s.end_time
    FROM schedule_feedback sf
    JOIN shifts s ON s.id = sf.shift_id
    WHERE s.location_id = $1
      AND sf.created_at > NOW() - INTERVAL '90 days'
  `, [locationId]);

  return result.rows;
}

/**
 * Build employee reliability scores from historical feedback
 */
function buildReliabilityScores(employees, feedback) {
  const scores = {};

  employees.forEach(emp => {
    const empFeedback = feedback.filter(f => f.employee_id === emp.id);

    if (empFeedback.length === 0) {
      // No history = neutral score
      scores[emp.id] = { reliability: 0.8, preferredDays: [], preferredTimes: [] };
      return;
    }

    // Calculate reliability from attendance
    const attendanceRate = empFeedback.filter(f => f.actual_attendance).length / empFeedback.length;

    // Calculate swap rate (lower is better)
    const swapRate = empFeedback.filter(f => f.was_swapped).length / empFeedback.length;

    // Average quality rating
    const ratings = empFeedback.filter(f => f.quality_rating).map(f => f.quality_rating);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3;

    // Find preferred days and times
    const goodShifts = empFeedback.filter(f => f.actual_attendance && f.quality_rating >= 4);
    const dayFreq = {};
    const timeFreq = {};

    goodShifts.forEach(f => {
      const dow = parseInt(f.day_of_week);
      dayFreq[dow] = (dayFreq[dow] || 0) + 1;

      const startHour = parseInt(f.start_time.split(':')[0]);
      const timeSlot = startHour < 12 ? 'morning' : startHour < 17 ? 'afternoon' : 'evening';
      timeFreq[timeSlot] = (timeFreq[timeSlot] || 0) + 1;
    });

    const preferredDays = Object.entries(dayFreq)
      .filter(([, count]) => count >= 2)
      .map(([day]) => parseInt(day));

    const preferredTimes = Object.entries(timeFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([time]) => time);

    // Combined reliability score
    const reliability = (attendanceRate * 0.5) + ((1 - swapRate) * 0.3) + ((avgRating / 5) * 0.2);

    scores[emp.id] = {
      reliability: Math.round(reliability * 100) / 100,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      swapRate: Math.round(swapRate * 100) / 100,
      avgRating,
      preferredDays,
      preferredTimes,
      dataPoints: empFeedback.length,
    };
  });

  return scores;
}

/**
 * Get shift requirements (skills, min staff per role)
 */
async function getShiftRequirements(client, locationId) {
  const result = await client.query(`
    SELECT
      shift_type,
      required_skills,
      min_staff,
      preferred_staff
    FROM location_shift_requirements
    WHERE location_id = $1
  `, [locationId]);

  const requirements = {};
  result.rows.forEach(row => {
    requirements[row.shift_type] = {
      skills: row.required_skills || [],
      minStaff: row.min_staff || 1,
      preferredStaff: row.preferred_staff || row.min_staff || 1,
    };
  });

  return requirements;
}

/**
 * Generate initial population of random valid schedules
 */
function generateInitialPopulation(context) {
  const population = [];

  for (let i = 0; i < GA_CONFIG.POPULATION_SIZE; i++) {
    const schedule = generateRandomSchedule(context, i === 0 ? 'greedy' : 'random');
    population.push(schedule);
  }

  return population;
}

/**
 * Generate a single random but valid schedule
 */
function generateRandomSchedule(context, strategy = 'random') {
  const { forecast, employees } = context;
  const schedule = [];
  const employeeHours = {};

  employees.forEach(e => { employeeHours[e.id] = 0; });

  const shiftPatterns = [
    { name: 'Morning', start: '06:00', end: '14:00', hours: 8 },
    { name: 'Mid', start: '10:00', end: '18:00', hours: 8 },
    { name: 'Afternoon', start: '14:00', end: '22:00', hours: 8 },
  ];

  forecast.forEach(day => {
    // Determine shifts needed based on demand
    const peakHours = day.hours.filter(h => h.staffNeeded >= 1);
    const avgNeeded = peakHours.length ?
      Math.ceil(peakHours.reduce((s, h) => s + h.staffNeeded, 0) / peakHours.length) : 1;

    // Create shifts for this day
    shiftPatterns.forEach(pattern => {
      const shiftsNeeded = Math.ceil(avgNeeded / shiftPatterns.length);

      for (let s = 0; s < shiftsNeeded; s++) {
        // Find eligible employees
        const eligible = employees.filter(emp => {
          const hoursLeft = (emp.max_hours_per_week || CONFIG.MAX_HOURS_PER_WEEK) - employeeHours[emp.id];
          return hoursLeft >= pattern.hours;
        });

        if (eligible.length === 0) continue;

        // Select employee based on strategy
        let selected;
        if (strategy === 'greedy') {
          // Score and pick best
          const scored = eligible.map(e => ({
            ...e,
            score: scoreEmployeeForShiftSimple(e, pattern, day, context),
          })).sort((a, b) => b.score - a.score);
          selected = scored[0];
        } else {
          // Random selection with slight bias toward those with fewer hours
          const weights = eligible.map(e => {
            const deficit = (e.preferred_hours_per_week || 32) - employeeHours[e.id];
            return Math.max(1, 10 + deficit);
          });
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let rand = Math.random() * totalWeight;
          let idx = 0;
          while (rand > weights[idx] && idx < weights.length - 1) {
            rand -= weights[idx];
            idx++;
          }
          selected = eligible[idx];
        }

        if (selected) {
          schedule.push({
            date: day.date,
            dayOfWeek: day.dayOfWeek,
            startTime: pattern.start,
            endTime: pattern.end,
            hours: pattern.hours,
            employeeId: selected.id,
            employeeName: `${selected.first_name} ${selected.last_name}`,
            hourlyRate: selected.hourly_rate || 12,
            patternName: pattern.name,
          });

          employeeHours[selected.id] += pattern.hours;
        }
      }
    });
  });

  return schedule;
}

/**
 * Simple scoring for initial population generation
 */
function scoreEmployeeForShiftSimple(employee, pattern, day, context) {
  let score = 50; // Base score

  // Prefer employees under their preferred hours
  const currentHours = context.employeeHours?.[employee.id] || 0;
  const deficit = (employee.preferred_hours_per_week || 32) - currentHours;
  score += Math.min(20, deficit);

  // Momentum bonus
  if (employee.momentum_score) {
    score += employee.momentum_score * 0.2;
  }

  // Reliability from history
  const reliability = context.employeeReliability?.[employee.id];
  if (reliability) {
    score += reliability.reliability * 20;

    // Preferred day bonus
    if (reliability.preferredDays.includes(day.dayOfWeek)) {
      score += 10;
    }
  }

  return score;
}

/**
 * Evaluate fitness of a schedule
 */
function evaluateFitness(schedule, context) {
  const { forecast, employees, employeeReliability, budget } = context;

  const fitness = {
    coverage: 0,
    skillMatch: 0,
    preferenceAlignment: 0,
    fairness: 0,
    laborCost: 0,
    budgetVariance: 0,
    reliabilityScore: 0,
    violations: [],
    overall: 0,
  };

  // ==================== COVERAGE (30%) ====================
  let totalSlotsNeeded = 0;
  let slotsFilled = 0;

  forecast.forEach(day => {
    day.hours.forEach(h => {
      if (h.hour >= 6 && h.hour <= 22 && h.staffNeeded > 0) {
        totalSlotsNeeded += h.staffNeeded;

        const shiftsThisHour = schedule.filter(s =>
          s.date === day.date &&
          parseInt(s.startTime.split(':')[0]) <= h.hour &&
          parseInt(s.endTime.split(':')[0]) > h.hour
        ).length;

        slotsFilled += Math.min(shiftsThisHour, h.staffNeeded);
      }
    });
  });

  fitness.coverage = totalSlotsNeeded > 0 ?
    Math.round((slotsFilled / totalSlotsNeeded) * 100) : 100;

  // ==================== SKILL MATCH (20%) ====================
  // Simplified: assume all employees are qualified for now
  fitness.skillMatch = 95;

  // ==================== PREFERENCE ALIGNMENT (15%) ====================
  let preferenceScore = 0;
  let preferenceCount = 0;

  schedule.forEach(shift => {
    const reliability = employeeReliability[shift.employeeId];
    if (reliability) {
      preferenceCount++;
      if (reliability.preferredDays.includes(shift.dayOfWeek)) {
        preferenceScore += 50;
      }

      const startHour = parseInt(shift.startTime.split(':')[0]);
      const timeSlot = startHour < 12 ? 'morning' : startHour < 17 ? 'afternoon' : 'evening';
      if (reliability.preferredTimes.includes(timeSlot)) {
        preferenceScore += 50;
      }
    }
  });

  fitness.preferenceAlignment = preferenceCount > 0 ?
    Math.round(preferenceScore / preferenceCount) : 50;

  // ==================== FAIRNESS (15%) - Gini Coefficient ====================
  const hoursPerEmployee = {};
  schedule.forEach(s => {
    hoursPerEmployee[s.employeeId] = (hoursPerEmployee[s.employeeId] || 0) + s.hours;
  });

  const hoursArray = Object.values(hoursPerEmployee).sort((a, b) => a - b);
  if (hoursArray.length > 1) {
    const mean = hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length;
    const n = hoursArray.length;
    let sumDiff = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumDiff += Math.abs(hoursArray[i] - hoursArray[j]);
      }
    }
    const gini = sumDiff / (2 * n * n * mean);
    fitness.fairness = Math.round((1 - Math.min(gini, 1)) * 100);
  } else {
    fitness.fairness = 100;
  }

  // ==================== LABOR COST (10%) ====================
  fitness.laborCost = schedule.reduce((sum, s) => sum + (s.hourlyRate * s.hours), 0);

  if (budget) {
    fitness.budgetVariance = Math.round(((fitness.laborCost - budget) / budget) * 100 * 10) / 10;
  }

  // ==================== RELIABILITY SCORE (10%) ====================
  let reliabilitySum = 0;
  schedule.forEach(shift => {
    const rel = employeeReliability[shift.employeeId];
    reliabilitySum += rel ? rel.reliability : 0.8;
  });
  fitness.reliabilityScore = schedule.length > 0 ?
    Math.round((reliabilitySum / schedule.length) * 100) : 80;

  // ==================== CONSTRAINT VIOLATIONS ====================
  employees.forEach(emp => {
    const empShifts = schedule.filter(s => s.employeeId === emp.id);
    const totalHours = empShifts.reduce((sum, s) => sum + s.hours, 0);

    // Max hours check
    if (totalHours > (emp.max_hours_per_week || CONFIG.MAX_HOURS_PER_WEEK)) {
      fitness.violations.push({
        type: 'MAX_HOURS',
        employeeId: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        value: totalHours,
        limit: emp.max_hours_per_week || CONFIG.MAX_HOURS_PER_WEEK,
      });
    }

    // Consecutive days check
    const datesWorked = [...new Set(empShifts.map(s => s.date))].sort();
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
      fitness.violations.push({
        type: 'CONSECUTIVE_DAYS',
        employeeId: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        value: maxConsecutive,
        limit: CONFIG.MAX_CONSECUTIVE_DAYS,
      });
    }

    // Rest between shifts check
    const sortedShifts = empShifts.sort((a, b) =>
      new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`)
    );
    for (let i = 1; i < sortedShifts.length; i++) {
      const prevEnd = new Date(`${sortedShifts[i-1].date}T${sortedShifts[i-1].endTime}`);
      const currStart = new Date(`${sortedShifts[i].date}T${sortedShifts[i].startTime}`);
      const restHours = (currStart - prevEnd) / (1000 * 60 * 60);

      if (restHours < CONFIG.MIN_REST_BETWEEN_SHIFTS && restHours > 0) {
        fitness.violations.push({
          type: 'INSUFFICIENT_REST',
          employeeId: emp.id,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          value: Math.round(restHours * 10) / 10,
          limit: CONFIG.MIN_REST_BETWEEN_SHIFTS,
        });
      }
    }
  });

  // Penalty for violations
  const violationPenalty = fitness.violations.length * 5;

  // ==================== OVERALL FITNESS ====================
  fitness.overall = Math.max(0,
    (fitness.coverage * 0.30) +
    (fitness.skillMatch * 0.20) +
    (fitness.preferenceAlignment * 0.15) +
    (fitness.fairness * 0.15) +
    (fitness.reliabilityScore * 0.10) +
    (budget ? Math.max(0, 100 - Math.abs(fitness.budgetVariance)) * 0.10 : 10)
    - violationPenalty
  ) / 100;

  return fitness;
}

/**
 * Tournament selection
 */
function tournamentSelection(population) {
  const selected = [];
  const targetSize = Math.floor(population.length / 2) * 2; // Even number

  while (selected.length < targetSize) {
    // Pick tournament participants
    const tournament = [];
    for (let i = 0; i < GA_CONFIG.TOURNAMENT_SIZE; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }

    // Select winner (highest fitness)
    tournament.sort((a, b) => b.fitness.overall - a.fitness.overall);
    selected.push(tournament[0]);
  }

  return selected;
}

/**
 * Crossover: swap day-blocks between two parent schedules
 */
function crossover(parent1, parent2, context) {
  const days = [...new Set(parent1.map(s => s.date))];
  const crossoverPoint = Math.floor(Math.random() * days.length);

  const child1 = [];
  const child2 = [];

  days.forEach((day, idx) => {
    const p1Day = parent1.filter(s => s.date === day);
    const p2Day = parent2.filter(s => s.date === day);

    if (idx < crossoverPoint) {
      child1.push(...p1Day);
      child2.push(...p2Day);
    } else {
      child1.push(...p2Day);
      child2.push(...p1Day);
    }
  });

  // Repair if needed (fix constraint violations)
  return [repairSchedule(child1, context), repairSchedule(child2, context)];
}

/**
 * Mutation: randomly swap employees or adjust shifts
 */
function mutate(schedule, context) {
  const mutated = [...schedule];
  const mutationType = Math.random();

  if (mutationType < 0.5 && mutated.length > 0) {
    // Swap employees between two random shifts
    const idx1 = Math.floor(Math.random() * mutated.length);
    const idx2 = Math.floor(Math.random() * mutated.length);

    if (idx1 !== idx2) {
      const temp = { ...mutated[idx1] };
      mutated[idx1] = {
        ...mutated[idx1],
        employeeId: mutated[idx2].employeeId,
        employeeName: mutated[idx2].employeeName,
        hourlyRate: mutated[idx2].hourlyRate,
      };
      mutated[idx2] = {
        ...mutated[idx2],
        employeeId: temp.employeeId,
        employeeName: temp.employeeName,
        hourlyRate: temp.hourlyRate,
      };
    }
  } else if (mutated.length > 0) {
    // Replace one employee with a random eligible one
    const idx = Math.floor(Math.random() * mutated.length);
    const shift = mutated[idx];

    const eligibleEmployees = context.employees.filter(e => {
      // Check if they could work this shift
      const currentHours = mutated
        .filter(s => s.employeeId === e.id)
        .reduce((sum, s) => sum + s.hours, 0);
      return currentHours + shift.hours <= (e.max_hours_per_week || CONFIG.MAX_HOURS_PER_WEEK);
    });

    if (eligibleEmployees.length > 0) {
      const newEmployee = eligibleEmployees[Math.floor(Math.random() * eligibleEmployees.length)];
      mutated[idx] = {
        ...shift,
        employeeId: newEmployee.id,
        employeeName: `${newEmployee.first_name} ${newEmployee.last_name}`,
        hourlyRate: newEmployee.hourly_rate || 12,
      };
    }
  }

  return repairSchedule(mutated, context);
}

/**
 * Repair schedule to fix constraint violations
 */
function repairSchedule(schedule, context) {
  const { employees } = context;
  const repaired = [...schedule];
  const employeeHours = {};

  // Calculate current hours
  repaired.forEach(s => {
    employeeHours[s.employeeId] = (employeeHours[s.employeeId] || 0) + s.hours;
  });

  // Fix hour violations by reassigning shifts
  employees.forEach(emp => {
    const maxHours = emp.max_hours_per_week || CONFIG.MAX_HOURS_PER_WEEK;

    while (employeeHours[emp.id] > maxHours) {
      // Find shifts for this employee
      const empShiftIdx = repaired.findIndex(s => s.employeeId === emp.id);
      if (empShiftIdx === -1) break;

      // Find another employee who can take this shift
      const shift = repaired[empShiftIdx];
      const replacement = employees.find(e => {
        if (e.id === emp.id) return false;
        const theirHours = employeeHours[e.id] || 0;
        return theirHours + shift.hours <= (e.max_hours_per_week || CONFIG.MAX_HOURS_PER_WEEK);
      });

      if (replacement) {
        employeeHours[emp.id] -= shift.hours;
        employeeHours[replacement.id] = (employeeHours[replacement.id] || 0) + shift.hours;
        repaired[empShiftIdx] = {
          ...shift,
          employeeId: replacement.id,
          employeeName: `${replacement.first_name} ${replacement.last_name}`,
          hourlyRate: replacement.hourly_rate || 12,
        };
      } else {
        // No replacement available - remove shift
        repaired.splice(empShiftIdx, 1);
        employeeHours[emp.id] -= shift.hours;
      }
    }
  });

  return repaired;
}

/**
 * Generate alternative schedules with different optimization focuses
 */
async function generateAlternatives(context, population) {
  const alternatives = [];

  // Cost Optimized: find schedule with lowest labor cost among top 25%
  const topQuarter = population.slice(0, Math.ceil(population.length / 4));
  const costOptimized = topQuarter.reduce((best, curr) =>
    curr.fitness.laborCost < best.fitness.laborCost ? curr : best
  );

  alternatives.push({
    name: 'Cost Optimized',
    description: 'Minimizes labor cost while maintaining coverage',
    schedule: costOptimized.schedule,
    quality: {
      fitness_score: Math.round(costOptimized.fitness.overall * 100) / 100,
      coverage_pct: costOptimized.fitness.coverage,
      labor_cost: costOptimized.fitness.laborCost,
      preference_score: costOptimized.fitness.preferenceAlignment,
    },
  });

  // Employee Preferred: find schedule with highest preference alignment
  const preferenceOptimized = population.reduce((best, curr) =>
    curr.fitness.preferenceAlignment > best.fitness.preferenceAlignment ? curr : best
  );

  alternatives.push({
    name: 'Employee Preferred',
    description: 'Maximizes employee shift preferences',
    schedule: preferenceOptimized.schedule,
    quality: {
      fitness_score: Math.round(preferenceOptimized.fitness.overall * 100) / 100,
      coverage_pct: preferenceOptimized.fitness.coverage,
      labor_cost: preferenceOptimized.fitness.laborCost,
      preference_score: preferenceOptimized.fitness.preferenceAlignment,
    },
  });

  // Fair Distribution: find schedule with best fairness score
  const fairnessOptimized = population.reduce((best, curr) =>
    curr.fitness.fairness > best.fitness.fairness ? curr : best
  );

  alternatives.push({
    name: 'Fair Distribution',
    description: 'Balances hours evenly across employees',
    schedule: fairnessOptimized.schedule,
    quality: {
      fitness_score: Math.round(fairnessOptimized.fitness.overall * 100) / 100,
      coverage_pct: fairnessOptimized.fitness.coverage,
      labor_cost: fairnessOptimized.fitness.laborCost,
      fairness_index: fairnessOptimized.fitness.fairness / 100,
    },
  });

  return alternatives;
}

/**
 * Store schedule feedback for learning
 */
export async function recordScheduleFeedback(shiftId, feedback) {
  return db.query(`
    INSERT INTO schedule_feedback (
      organization_id, schedule_period_id, employee_id, shift_id,
      predicted_attendance, actual_attendance, was_swapped,
      overtime_minutes, quality_rating
    )
    SELECT
      s.organization_id, NULL, s.employee_id, s.id,
      $2, $3, $4, $5, $6
    FROM shifts s WHERE s.id = $1
    RETURNING *
  `, [shiftId, feedback.predictedAttendance, feedback.actualAttendance,
      feedback.wasSwapped, feedback.overtimeMinutes, feedback.qualityRating]);
}

// -------------------- Export --------------------

export {
  generateDemandForecast,
  generateScheduleSuggestions,
  generateOptimizedSchedule,
  calculateScheduleQuality,
  scoreEmployeeForShift,
  recordScheduleFeedback,
  CONFIG as SCHEDULING_CONFIG,
  GA_CONFIG,
};

export default {
  generateDemandForecast,
  generateScheduleSuggestions,
  generateOptimizedSchedule,
  calculateScheduleQuality,
  recordScheduleFeedback,
};
