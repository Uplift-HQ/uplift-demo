// ============================================================
// MOMENTUM SCORE BREAKDOWN PAGE
// Employee self-service view of their Momentum Score
// Route: /momentum
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Zap, Clock, BookOpen, Star, Heart, TrendingUp, ArrowLeft, CheckCircle, Target } from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const MOMENTUM_SCORE = 91;
const SCORE_TREND = 3;

const SCORE_COMPONENTS = [
  {
    id: 'attendance',
    labelKey: 'momentum.attendance',
    labelFallback: 'Attendance',
    weight: 30,
    score: 95,
    icon: Clock,
    color: 'green',
    stats: [
      { key: 'momentum.onTimeRate', fallback: 'On-time rate: 97%' },
      { key: 'momentum.shiftCoverage', fallback: 'Shift coverage: 100%' },
      { key: 'momentum.streak', fallback: '10-day streak \u{1F525}' },
    ],
  },
  {
    id: 'skills',
    labelKey: 'momentum.skillsTraining',
    labelFallback: 'Skills & Training',
    weight: 25,
    score: 82,
    icon: BookOpen,
    color: 'blue',
    stats: [
      { key: 'momentum.mandatoryComplete', fallback: '4/5 mandatory complete' },
      { key: 'momentum.totalSkills', fallback: '12 total skills' },
      { key: 'momentum.verified', fallback: '3 verified' },
    ],
  },
  {
    id: 'performance',
    labelKey: 'momentum.performanceFeedback',
    labelFallback: 'Performance & Feedback',
    weight: 25,
    score: 88,
    icon: Star,
    color: 'amber',
    stats: [
      { key: 'momentum.lastReview', fallback: 'Last review: 4.2/5' },
      { key: 'momentum.kudos', fallback: '3 positive kudos this month' },
      { key: 'momentum.goals', fallback: 'Goals: 2/3 on track' },
    ],
  },
  {
    id: 'engagement',
    labelKey: 'momentum.engagement',
    labelFallback: 'Engagement',
    weight: 20,
    score: 90,
    icon: Heart,
    color: 'pink',
    stats: [
      { key: 'momentum.surveyCompleted', fallback: 'Survey completed: Yes' },
      { key: 'momentum.recognitionGiven', fallback: 'Recognition given: 5 this month' },
      { key: 'momentum.tenure', fallback: 'Tenure: 2.3 years' },
    ],
  },
];

const SCORE_HISTORY = {
  months: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
  scores: [85, 87, 89, 88, 91, 91],
};

const IMPROVEMENT_TIPS = [
  {
    id: 1,
    icon: BookOpen,
    descKey: 'momentum.tipFireSafety',
    descFallback: 'Complete Fire Safety training',
    impactKey: 'momentum.tipFireSafetyImpact',
    impactFallback: 'Skills +5',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: 2,
    icon: Heart,
    descKey: 'momentum.tipRecognitions',
    descFallback: 'Give 2 more recognitions',
    impactKey: 'momentum.tipRecognitionsImpact',
    impactFallback: 'Engagement +3',
    badgeColor: 'bg-pink-100 text-pink-700',
  },
  {
    id: 3,
    icon: Clock,
    descKey: 'momentum.tipAttendance',
    descFallback: 'Maintain attendance streak',
    impactKey: 'momentum.tipAttendanceImpact',
    impactFallback: 'Attendance +2',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
];

// ============================================================
// COLOR MAPS
// ============================================================

const ICON_BG = {
  green: 'bg-green-100 text-green-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  pink: 'bg-pink-100 text-pink-600',
};

const PROGRESS_BG = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  pink: 'bg-pink-500',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Momentum() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const employeeName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`
    : t('momentum.employee', 'Employee');

  // SVG ring parameters
  const ringSize = 192; // w-48 h-48
  const strokeWidth = 12;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (MOMENTUM_SCORE / 100) * circumference;

  const maxHistoryScore = Math.max(...SCORE_HISTORY.scores);

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
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
              {t('momentum.pageTitle', 'My Momentum Score')}
            </h1>
            <p className="text-slate-500 mt-1">{employeeName}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-momentum-50 rounded-full">
            <Zap className="w-4 h-4 text-momentum-600" />
            <span className="text-sm font-semibold text-momentum-700">
              {t('momentum.momentum', 'Momentum')}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Large Score Ring ---- */}
      <div className="card">
        <div className="card-body flex flex-col items-center py-10">
          <div className="relative w-48 h-48">
            <svg
              width={ringSize}
              height={ringSize}
              className="transform -rotate-90"
            >
              {/* Background ring */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
              />
              {/* Score ring */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="#22c55e"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            </svg>
            {/* Centered score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-slate-900">{MOMENTUM_SCORE}</span>
              <span className="text-sm text-slate-500 font-medium">/ 100</span>
            </div>
          </div>

          <p className="text-lg font-semibold text-slate-900 mt-4">{employeeName}</p>

          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              {t('momentum.trendUp', '\u21913 from last month')}
            </span>
          </div>

          <p className="text-sm text-slate-400 mt-2 text-center max-w-md">
            {t(
              'momentum.basedOn',
              'Based on attendance, skills, training & feedback'
            )}
          </p>
        </div>
      </div>

      {/* ---- Score Breakdown ---- */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {t('momentum.scoreBreakdown', 'Score Breakdown')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCORE_COMPONENTS.map((comp) => {
            const Icon = comp.icon;
            return (
              <div key={comp.id} className="card">
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${ICON_BG[comp.color]}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {t(comp.labelKey, comp.labelFallback)}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {t('momentum.weight', 'Weight: {{pct}}%', { pct: comp.weight })}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">
                    {comp.score}
                    <span className="text-sm font-medium text-slate-400">/100</span>
                  </span>
                </div>
                <div className="card-body space-y-4">
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${PROGRESS_BG[comp.color]}`}
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>

                  {/* Stats */}
                  <ul className="space-y-1.5">
                    {comp.stats.map((stat) => (
                      <li
                        key={stat.key}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {t(stat.key, stat.fallback)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Score History ---- */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-momentum-500" />
          <h2 className="font-semibold text-slate-900">
            {t('momentum.scoreHistory', 'Score History')}
          </h2>
        </div>
        <div className="card-body">
          <div className="flex items-end justify-around gap-3" style={{ height: 160 }}>
            {SCORE_HISTORY.months.map((month, idx) => {
              const score = SCORE_HISTORY.scores[idx];
              const barHeight = (score / maxHistoryScore) * 140;
              const isLatest = idx === SCORE_HISTORY.months.length - 1;
              return (
                <div key={month} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-xs font-medium text-slate-600">{score}</span>
                  <div
                    className={`w-full max-w-[40px] rounded-t-lg transition-all ${
                      isLatest ? 'bg-momentum-500' : 'bg-momentum-300'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                  <span
                    className={`text-xs ${
                      isLatest ? 'text-momentum-600 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- How to Improve ---- */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {t('momentum.howToImprove', 'How to Improve')}
        </h2>

        <div className="space-y-3">
          {IMPROVEMENT_TIPS.map((tip) => {
            const TipIcon = tip.icon;
            return (
              <div
                key={tip.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="card-body flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <TipIcon className="w-5 h-5 text-slate-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {t(tip.descKey, tip.descFallback)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tip.badgeColor}`}
                  >
                    {t(tip.impactKey, tip.impactFallback)}
                  </span>

                  <Target className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
