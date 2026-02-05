// ============================================================
// MOMENTUM SCORE BREAKDOWN PAGE
// Employee self-service view + Admin/Manager org overview
// Route: /momentum
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  ArrowLeft,
  Clock,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Heart,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Info,
  Users,
  Building2,
  BarChart3,
  Award,
  Minus,
} from 'lucide-react';

// ============================================================
// DEMO DATA -- EMPLOYEE VIEW
// ============================================================

const MOMENTUM_SCORE = 82;
const SCORE_TREND = 3;

const MONTHLY_HISTORY = [
  { month: 'Sep', year: 2025, attendance: 78, skills: 66, performance: 78, engagement: 73, total: 74 },
  { month: 'Oct', year: 2025, attendance: 80, skills: 68, performance: 80, engagement: 75, total: 76 },
  { month: 'Nov', year: 2025, attendance: 84, skills: 70, performance: 83, engagement: 78, total: 79 },
  { month: 'Dec', year: 2025, attendance: 82, skills: 72, performance: 82, engagement: 76, total: 78 },
  { month: 'Jan', year: 2026, attendance: 85, skills: 73, performance: 84, engagement: 78, total: 80 },
  { month: 'Feb', year: 2026, attendance: 88, skills: 75, performance: 85, engagement: 80, total: 82 },
];

const COMPONENTS = [
  {
    id: 'attendance',
    nameKey: 'momentum.attendance',
    nameFallback: 'Attendance',
    weight: 30,
    score: 88,
    trend: 'up',
    trendDelta: 3,
    icon: Clock,
    ringColor: '#22c55e',
    bgClass: 'bg-green-50',
    iconClass: 'text-green-600',
    affects: [
      { key: 'momentum.affects.clockInConsistency', fallback: 'Clock-in consistency (on time vs late)' },
      { key: 'momentum.affects.shiftCompletion', fallback: 'Shift completion rate' },
      { key: 'momentum.affects.unplannedAbsences', fallback: 'Unplanned absences' },
    ],
    tips: [
      { key: 'momentum.tips.arriveFiveMin', fallback: 'Arrive 5 minutes before shift start' },
      { key: 'momentum.tips.mobileClockIn', fallback: 'Use the mobile app to clock in on arrival' },
      { key: 'momentum.tips.requestTimeOff', fallback: 'Request time off at least 2 weeks in advance' },
    ],
  },
  {
    id: 'skills',
    nameKey: 'momentum.skills',
    nameFallback: 'Skills',
    weight: 25,
    score: 75,
    trend: 'up',
    trendDelta: 2,
    icon: GraduationCap,
    ringColor: '#3b82f6',
    bgClass: 'bg-blue-50',
    iconClass: 'text-blue-600',
    affects: [
      { key: 'momentum.affects.certsCurrent', fallback: 'Certifications current (Fire Safety, Food Hygiene)' },
      { key: 'momentum.affects.newSkills', fallback: 'New skills acquired' },
      { key: 'momentum.affects.courseCompletion', fallback: 'Learning course completion rate' },
    ],
    tips: [
      { key: 'momentum.tips.fireSafetyRenewal', fallback: 'Complete your overdue Fire Safety Renewal course' },
      { key: 'momentum.tips.guestRelations', fallback: 'Enrol in the Guest Relations Excellence path' },
      { key: 'momentum.tips.allergenCert', fallback: 'Get your Allergen Awareness certification' },
    ],
  },
  {
    id: 'performance',
    nameKey: 'momentum.performance',
    nameFallback: 'Performance',
    weight: 25,
    score: 85,
    trend: 'up',
    trendDelta: 1,
    icon: TrendingUp,
    ringColor: '#f59e0b',
    bgClass: 'bg-amber-50',
    iconClass: 'text-amber-600',
    affects: [
      { key: 'momentum.affects.reviewScores', fallback: 'Latest review scores' },
      { key: 'momentum.affects.goalCompletion', fallback: 'Goal completion rate' },
      { key: 'momentum.affects.managerFeedback', fallback: 'Manager feedback' },
    ],
    tips: [
      { key: 'momentum.tips.updateQ1Goals', fallback: 'Update progress on your Q1 goals' },
      { key: 'momentum.tips.request1on1', fallback: 'Request a 1-on-1 with your manager' },
      { key: 'momentum.tips.selfAssessment', fallback: 'Complete your self-assessment for the mid-year review' },
    ],
  },
  {
    id: 'engagement',
    nameKey: 'momentum.engagement',
    nameFallback: 'Engagement',
    weight: 20,
    score: 80,
    trend: 'up',
    trendDelta: 2,
    icon: Heart,
    ringColor: '#ec4899',
    bgClass: 'bg-pink-50',
    iconClass: 'text-pink-600',
    affects: [
      { key: 'momentum.affects.loginFrequency', fallback: 'Platform login frequency' },
      { key: 'momentum.affects.recognition', fallback: 'Recognition given/received' },
      { key: 'momentum.affects.surveyParticipation', fallback: 'Survey participation' },
      { key: 'momentum.affects.teamEvents', fallback: 'Team event attendance' },
    ],
    tips: [
      { key: 'momentum.tips.recogniseColleague', fallback: 'Recognise a colleague this week' },
      { key: 'momentum.tips.pulseSurvey', fallback: 'Complete the February pulse survey' },
      { key: 'momentum.tips.teamBuilding', fallback: 'Join the upcoming team building event' },
    ],
  },
];

// ============================================================
// DEMO DATA -- ADMIN / MANAGER VIEW
// ============================================================

const ORG_AVG_SCORE = 76;

const SCORE_DISTRIBUTION = [
  { bracket: '90-100', count: 28, color: '#22c55e' },
  { bracket: '80-89', count: 64, color: '#84cc16' },
  { bracket: '70-79', count: 98, color: '#f59e0b' },
  { bracket: '60-69', count: 52, color: '#f97316' },
  { bracket: '50-59', count: 18, color: '#ef4444' },
  { bracket: '<50', count: 6, color: '#dc2626' },
];

const TOP_PERFORMERS = [
  { rank: 1, name: 'Sarah Chen', dept: 'Operations', score: 96, trend: 'up' },
  { rank: 2, name: 'Marcus Johnson', dept: 'Front Desk', score: 94, trend: 'up' },
  { rank: 3, name: 'Priya Patel', dept: 'Kitchen', score: 93, trend: 'neutral' },
  { rank: 4, name: 'James Wilson', dept: 'Housekeeping', score: 92, trend: 'up' },
  { rank: 5, name: 'Ana Rodriguez', dept: 'Operations', score: 91, trend: 'down' },
  { rank: 6, name: 'Thomas Brown', dept: 'Maintenance', score: 90, trend: 'up' },
  { rank: 7, name: 'Lisa Zhang', dept: 'Front Desk', score: 89, trend: 'up' },
  { rank: 8, name: 'David Kim', dept: 'Kitchen', score: 88, trend: 'neutral' },
  { rank: 9, name: 'Emma Taylor', dept: 'Housekeeping', score: 87, trend: 'up' },
  { rank: 10, name: 'Carlos Mendez', dept: 'Operations', score: 87, trend: 'neutral' },
];

const DEPARTMENT_SCORES = [
  { name: 'Operations', score: 81, trend: 'up', delta: 2 },
  { name: 'Front Desk', score: 79, trend: 'up', delta: 3 },
  { name: 'Kitchen', score: 74, trend: 'neutral', delta: 0 },
  { name: 'Housekeeping', score: 72, trend: 'up', delta: 1 },
  { name: 'Maintenance', score: 77, trend: 'down', delta: -1 },
  { name: 'Spa & Wellness', score: 80, trend: 'up', delta: 4 },
];

const DEPT_TREND_DATA = [
  { month: 'Sep', Operations: 75, 'Front Desk': 72, Kitchen: 70, Housekeeping: 68, Maintenance: 74, 'Spa & Wellness': 71 },
  { month: 'Oct', Operations: 76, 'Front Desk': 73, Kitchen: 71, Housekeeping: 69, Maintenance: 75, 'Spa & Wellness': 73 },
  { month: 'Nov', Operations: 78, 'Front Desk': 75, Kitchen: 72, Housekeeping: 70, Maintenance: 76, 'Spa & Wellness': 75 },
  { month: 'Dec', Operations: 77, 'Front Desk': 76, Kitchen: 73, Housekeeping: 71, Maintenance: 78, 'Spa & Wellness': 77 },
  { month: 'Jan', Operations: 79, 'Front Desk': 76, Kitchen: 74, Housekeeping: 71, Maintenance: 78, 'Spa & Wellness': 76 },
  { month: 'Feb', Operations: 81, 'Front Desk': 79, Kitchen: 74, Housekeeping: 72, Maintenance: 77, 'Spa & Wellness': 80 },
];

const DEPT_COLORS = {
  Operations: '#3b82f6',
  'Front Desk': '#22c55e',
  Kitchen: '#f59e0b',
  Housekeeping: '#ec4899',
  Maintenance: '#8b5cf6',
  'Spa & Wellness': '#06b6d4',
};

// ============================================================
// SVG RING COMPONENT
// ============================================================

function ScoreRing({ score, size = 192, strokeWidth = 12, color = '#FF6B35', className = '' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-slate-900 ${size >= 160 ? 'text-5xl' : size >= 60 ? 'text-lg' : 'text-sm'}`}>
          {score}
        </span>
        {size >= 100 && (
          <span className="text-sm text-slate-500 font-medium">/ 100</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MINI SCORE RING (for component cards)
// ============================================================

function MiniScoreRing({ score, size = 48, strokeWidth = 4, color = '#FF6B35' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-slate-900">{score}</span>
      </div>
    </div>
  );
}

// ============================================================
// TREND ICON HELPER
// ============================================================

function TrendIndicator({ trend, delta, t }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
        <TrendingUp className="w-3.5 h-3.5" />
        +{delta}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
        <TrendingDown className="w-3.5 h-3.5" />
        {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
      <Minus className="w-3.5 h-3.5" />
      {t('momentum.noChange', 'No change')}
    </span>
  );
}

// ============================================================
// 6-MONTH LINE CHART (SVG)
// ============================================================

function LineChart({ data, t }) {
  const width = 640;
  const height = 240;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const scores = data.map((d) => d.total);
  const minScore = Math.min(...scores) - 5;
  const maxScore = Math.max(...scores) + 5;
  const range = maxScore - minScore;

  const xStep = chartW / (data.length - 1);
  const toX = (i) => padLeft + i * xStep;
  const toY = (val) => padTop + chartH - ((val - minScore) / range) * chartH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.total)}`).join(' ');
  const areaPath = `${linePath} L ${toX(data.length - 1)} ${padTop + chartH} L ${toX(0)} ${padTop + chartH} Z`;

  // Grid lines
  const gridSteps = 5;
  const gridLines = [];
  for (let i = 0; i <= gridSteps; i++) {
    const val = Math.round(minScore + (range / gridSteps) * i);
    const y = toY(val);
    gridLines.push({ val, y });
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 400 }}>
        {/* Grid lines */}
        {gridLines.map((g) => (
          <g key={g.val}>
            <line x1={padLeft} y1={g.y} x2={width - padRight} y2={g.y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padLeft - 8} y={g.y + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">
              {g.val}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="#FF6B35" fillOpacity={0.1} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#FF6B35" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points + labels */}
        {data.map((d, i) => (
          <g key={d.month}>
            <circle cx={toX(i)} cy={toY(d.total)} r={4} fill="#fff" stroke="#FF6B35" strokeWidth={2} />
            <text x={toX(i)} y={toY(d.total) - 10} textAnchor="middle" className="text-[11px] font-medium" fill="#334155">
              {d.total}
            </text>
            <text x={toX(i)} y={height - 8} textAnchor="middle" className="text-[11px]" fill="#64748b">
              {d.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ============================================================
// COMPONENT BREAKDOWN CARD
// ============================================================

function ComponentCard({ comp, t }) {
  const [expandedAffects, setExpandedAffects] = useState(false);
  const [expandedTips, setExpandedTips] = useState(false);
  const Icon = comp.icon;

  return (
    <div className="card">
      <div className="card-body space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${comp.bgClass}`}>
              <Icon className={`w-5 h-5 ${comp.iconClass}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {t(comp.nameKey, comp.nameFallback)}
              </h3>
              <p className="text-xs text-slate-500">
                {t('momentum.weightLabel', '{{pct}}% weight', { pct: comp.weight })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MiniScoreRing score={comp.score} color={comp.ringColor} />
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center gap-2">
          <TrendIndicator trend={comp.trend} delta={comp.trendDelta} t={t} />
          <span className="text-xs text-slate-400">
            {t('momentum.vsLastMonth', 'vs last month')}
          </span>
        </div>

        {/* "What affects this" expandable */}
        <div className="border border-slate-200 rounded-lg">
          <button
            type="button"
            onClick={() => setExpandedAffects((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              {t('momentum.whatAffectsThis', 'What affects this')}
            </span>
            {expandedAffects ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {expandedAffects && (
            <ul className="px-3 pb-3 space-y-1.5">
              {comp.affects.map((a) => (
                <li key={a.key} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                  {t(a.key, a.fallback)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* "How to improve" expandable */}
        <div className="border border-slate-200 rounded-lg">
          <button
            type="button"
            onClick={() => setExpandedTips((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              {t('momentum.howToImprove', 'How to improve')}
            </span>
            {expandedTips ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {expandedTips && (
            <ol className="px-3 pb-3 space-y-1.5 list-decimal list-inside">
              {comp.tips.map((tip) => (
                <li key={tip.key} className="text-sm text-slate-600">
                  {t(tip.key, tip.fallback)}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN / MANAGER: DEPARTMENT TREND LINE CHART
// ============================================================

function DeptTrendChart({ data, departments }) {
  const width = 640;
  const height = 260;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allVals = data.flatMap((d) => departments.map((dept) => d[dept]));
  const minVal = Math.min(...allVals) - 3;
  const maxVal = Math.max(...allVals) + 3;
  const range = maxVal - minVal;

  const xStep = chartW / (data.length - 1);
  const toX = (i) => padLeft + i * xStep;
  const toY = (val) => padTop + chartH - ((val - minVal) / range) * chartH;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 400 }}>
        {/* Grid */}
        {[0, 1, 2, 3, 4].map((i) => {
          const val = Math.round(minVal + (range / 4) * i);
          const y = toY(val);
          return (
            <g key={i}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">{val}</text>
            </g>
          );
        })}

        {/* Month labels */}
        {data.map((d, i) => (
          <text key={d.month} x={toX(i)} y={height - 8} textAnchor="middle" className="text-[11px]" fill="#64748b">
            {d.month}
          </text>
        ))}

        {/* Lines per department */}
        {departments.map((dept) => {
          const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d[dept])}`).join(' ');
          return (
            <path key={dept} d={path} fill="none" stroke={DEPT_COLORS[dept]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          );
        })}

        {/* End-point labels */}
        {departments.map((dept) => {
          const lastIdx = data.length - 1;
          const lastVal = data[lastIdx][dept];
          return (
            <text key={`${dept}-label`} x={toX(lastIdx) + 6} y={toY(lastVal) + 4} className="text-[9px] font-medium" fill={DEPT_COLORS[dept]}>
              {lastVal}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 px-1">
        {departments.map((dept) => (
          <span key={dept} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEPT_COLORS[dept] }} />
            {dept}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN / MANAGER VIEW COMPONENT
// ============================================================

function AdminManagerView({ isAdmin, t }) {
  const scopeLabel = isAdmin
    ? t('momentum.organisationOverview', 'Organisation Overview')
    : t('momentum.teamOverview', 'Team Overview');

  const maxDistCount = Math.max(...SCORE_DISTRIBUTION.map((d) => d.count));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-momentum-500 hover:text-momentum-600 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('momentum.backToDashboard', 'Back to Dashboard')}
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t('momentum.momentumScores', 'Momentum Scores')}
            </h1>
            <p className="text-slate-500 mt-1">{scopeLabel}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-momentum-50 rounded-full">
            <BarChart3 className="w-4 h-4 text-momentum-600" />
            <span className="text-sm font-semibold text-momentum-700">
              {isAdmin
                ? t('momentum.adminView', 'Admin View')
                : t('momentum.managerView', 'Manager View')}
            </span>
          </div>
        </div>
      </div>

      {/* Average Momentum Score */}
      <div className="card">
        <div className="card-body flex flex-col sm:flex-row items-center gap-6 py-8">
          <ScoreRing score={ORG_AVG_SCORE} size={160} color="#FF6B35" />
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">
              {isAdmin
                ? t('momentum.orgAverageScore', 'Organisation Average')
                : t('momentum.teamAverageScore', 'Team Average')}
            </h2>
            <p className="text-slate-500 mt-1">
              {t('momentum.across266Employees', 'Across 266 active employees')}
            </p>
            <div className="flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                {t('momentum.orgTrendUp', '+2 from last month')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-momentum-500" />
          <h2 className="font-semibold text-slate-900">
            {t('momentum.scoreDistribution', 'Score Distribution')}
          </h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {SCORE_DISTRIBUTION.map((bucket) => (
              <div key={bucket.bracket} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-12 text-right">{bucket.bracket}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(bucket.count / maxDistCount) * 100}%`,
                      backgroundColor: bucket.color,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 w-10">
                  {bucket.count}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {t('momentum.distributionNote', 'Number of employees in each score bracket')}
          </p>
        </div>
      </div>

      {/* Top 10 Performers */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Award className="w-5 h-5 text-momentum-500" />
          <h2 className="font-semibold text-slate-900">
            {t('momentum.topPerformers', 'Top 10 Performers')}
          </h2>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left font-medium text-slate-500 px-4 py-3 w-12">#</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">
                    {t('momentum.name', 'Name')}
                  </th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">
                    {t('momentum.department', 'Department')}
                  </th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3">
                    {t('momentum.score', 'Score')}
                  </th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3">
                    {t('momentum.trend', 'Trend')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {TOP_PERFORMERS.map((p) => (
                  <tr key={p.rank} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        p.rank <= 3 ? 'bg-momentum-100 text-momentum-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500">{p.dept}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{p.score}</td>
                    <td className="px-4 py-3 text-right">
                      {p.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 inline" />}
                      {p.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 inline" />}
                      {p.trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400 inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Department Comparison */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Building2 className="w-5 h-5 text-momentum-500" />
          <h2 className="font-semibold text-slate-900">
            {t('momentum.departmentComparison', 'Department Comparison')}
          </h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {DEPARTMENT_SCORES.map((dept) => (
              <div key={dept.name} className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700 w-32 truncate">{dept.name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="h-full rounded-full bg-momentum-500 transition-all duration-500"
                    style={{ width: `${dept.score}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 w-8 text-right">{dept.score}</span>
                <div className="w-16 text-right">
                  <TrendIndicator trend={dept.trend} delta={dept.delta} t={t} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Trend by Department */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-momentum-500" />
          <h2 className="font-semibold text-slate-900">
            {t('momentum.scoreTrendByDept', 'Score Trend by Department')}
          </h2>
        </div>
        <div className="card-body">
          <DeptTrendChart
            data={DEPT_TREND_DATA}
            departments={Object.keys(DEPT_COLORS)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYEE VIEW COMPONENT
// ============================================================

function EmployeeView({ t, user }) {
  const employeeName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`
    : t('momentum.employee', 'Employee');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-momentum-500 hover:text-momentum-600 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('momentum.backToDashboard', 'Back to Dashboard')}
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">
          {t('momentum.yourMomentumScore', 'Your Momentum Score')}
        </h1>
        <p className="text-slate-500 mt-1">{employeeName}</p>
      </div>

      {/* Hero: Large Score Ring */}
      <div className="card">
        <div className="card-body flex flex-col items-center py-10">
          <ScoreRing score={MOMENTUM_SCORE} size={192} color="#FF6B35" />

          <div className="flex items-center gap-1.5 mt-6">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              {t('momentum.trendUp', '+{{delta}} from last month', { delta: SCORE_TREND })}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-momentum-50 rounded-full text-xs font-medium text-momentum-700">
              <Users className="w-3.5 h-3.5" />
              {t('momentum.topTeam', 'Top 25% of your team')}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              {t('momentum.topDept', 'Top 15% of Front Desk department')}
            </span>
          </div>
        </div>
      </div>

      {/* 6-Month History Chart */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-momentum-500" />
          <h2 className="font-semibold text-slate-900">
            {t('momentum.sixMonthHistory', '6-Month History')}
          </h2>
        </div>
        <div className="card-body">
          <LineChart data={MONTHLY_HISTORY} t={t} />
        </div>
      </div>

      {/* Component Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {t('momentum.componentBreakdown', 'Component Breakdown')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMPONENTS.map((comp) => (
            <ComponentCard key={comp.id} comp={comp} t={t} />
          ))}
        </div>
      </div>

      {/* Monthly History Table */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-momentum-500" />
          <h2 className="font-semibold text-slate-900">
            {t('momentum.monthlyHistory', 'Monthly History')}
          </h2>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left font-medium text-slate-500 px-4 py-3">
                    {t('momentum.month', 'Month')}
                  </th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3">
                    {t('momentum.attendance', 'Attendance')}
                  </th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3">
                    {t('momentum.skills', 'Skills')}
                  </th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3">
                    {t('momentum.performance', 'Performance')}
                  </th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3">
                    {t('momentum.engagement', 'Engagement')}
                  </th>
                  <th className="text-right font-medium text-slate-500 px-4 py-3">
                    {t('momentum.total', 'Total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...MONTHLY_HISTORY].reverse().map((row) => (
                  <tr key={`${row.month}-${row.year}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.month} {row.year}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.attendance}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.skills}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.performance}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.engagement}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function Momentum() {
  const { t } = useTranslation();
  const { user, isAdmin, isManagerOrAbove } = useAuth();

  // Admins get the org-level overview
  if (isAdmin) {
    return <AdminManagerView isAdmin={true} t={t} />;
  }

  // Managers get the team-scoped overview
  if (isManagerOrAbove) {
    return <AdminManagerView isAdmin={false} t={t} />;
  }

  // Workers / regular employees see their own score breakdown
  return <EmployeeView t={t} user={user} />;
}
