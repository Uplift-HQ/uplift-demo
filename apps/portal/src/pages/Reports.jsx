// ============================================================
// REPORTS & ANALYTICS PAGE
// Enterprise BI dashboard — 10 pre-built reports
// Grand Metropolitan Hotel Group (9 hotel properties)
// Role-aware: Admin=org-wide, Manager=team-scoped, Worker=restricted
// ============================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useBranding } from '../lib/branding';
import api, { DEMO_MODE } from '../lib/api';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Calendar, Filter,
  Download, FileText, PieChart, Activity, Award, Target,
  DollarSign, Clock, GraduationCap, Heart, Building2, MapPin,
  Briefcase, ChevronDown, ChevronRight, ChevronUp, X, Search,
  ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, CheckCircle,
  Mail, Bell, Eye, EyeOff, SlidersHorizontal, RefreshCw,
  Shield, UserCheck, Smile, Star, BookOpen, Zap, Plus, FileSpreadsheet, Upload, Scale
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, AreaChart, LineChart, BarChart,
  Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine
} from 'recharts';

// ============================================================
// CONSTANTS
// ============================================================

const LOCATIONS = [
  { id: 'londonmayfair', name: 'London Mayfair', flag: 'GB' },
  { id: 'paris', name: 'Paris', flag: 'FR' },
  { id: 'dubai', name: 'Dubai', flag: 'AE' },
  { id: 'tokyo', name: 'Tokyo', flag: 'JP' },
  { id: 'pittsburgh', name: 'Pittsburgh Hotel', flag: 'US' },
  { id: 'lyon', name: 'Lyon Hotel', flag: 'FR' },
  { id: 'newyork', name: 'New York Hotel', flag: 'US' },
  { id: 'madrid', name: 'Madrid Hotel', flag: 'ES' },
  { id: 'milan', name: 'Milan Hotel', flag: 'IT' },
];

const DEPARTMENTS = [
  'Front of House', 'Kitchen', 'Housekeeping', 'Health & Safety',
  'Spa & Wellness', 'Engineering & Maintenance', 'Sales & Commercial',
  'Finance & Administration', 'Human Resources',
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];

const DATE_PRESETS = [
  { id: 'this-month', labelKey: 'reports.thisMonth' },
  { id: 'last-month', labelKey: 'reports.lastMonth' },
  { id: 'this-quarter', labelKey: 'reports.thisQuarter' },
  { id: 'last-quarter', labelKey: 'reports.lastQuarter' },
  { id: 'this-year', labelKey: 'reports.thisYear' },
  { id: 'custom', labelKey: 'reports.custom' },
];

const CHART_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6',
  '#14b8a6', '#f59e0b',
];

// ============================================================
// REPORT DEFINITIONS
// ============================================================

const REPORT_DEFS = [
  { id: 'headcount', labelKey: 'reports.headcount', icon: Users, color: 'indigo' },
  { id: 'turnover', labelKey: 'reports.turnover', icon: TrendingDown, color: 'red' },
  { id: 'absence', labelKey: 'reports.absence', icon: Calendar, color: 'amber' },
  { id: 'training', labelKey: 'reports.trainingCompliance', icon: GraduationCap, color: 'emerald' },
  { id: 'overtime', labelKey: 'reports.overtime', icon: Clock, color: 'blue' },
  { id: 'diversity', labelKey: 'reports.diversity', icon: Heart, color: 'pink' },
  { id: 'genderPayGap', labelKey: 'reports.genderPayGap', label: 'gender pay gap', icon: Scale, color: 'purple' },
  { id: 'recruitment', labelKey: 'reports.recruitment', icon: Briefcase, color: 'cyan' },
  { id: 'compensation', labelKey: 'reports.compensation', icon: DollarSign, color: 'green' },
  { id: 'momentum', labelKey: 'reports.momentumScores', icon: Zap, color: 'violet' },
  { id: 'engagement', labelKey: 'reports.engagement', icon: Smile, color: 'orange' },
  { id: 'custom', labelKey: 'reports.customReports', icon: SlidersHorizontal, color: 'slate', isCustom: true },
];

// ============================================================
// DEMO DATA — ORG-WIDE (Admin view)
// ============================================================

const DEMO = {
  // ----- 1. HEADCOUNT -----
  headcount: {
    total: 150,
    byLocation: [
      { name: 'London Mayfair', value: 35 },
      { name: 'Paris', value: 28 },
      { name: 'Dubai', value: 18 },
      { name: 'Tokyo', value: 15 },
      { name: 'Pittsburgh Hotel', value: 12 },
      { name: 'Lyon Hotel', value: 12 },
      { name: 'New York Hotel', value: 10 },
      { name: 'Madrid Hotel', value: 10 },
      { name: 'Milan Hotel', value: 10 },
    ],
    byDepartment: [
      { name: 'Front of House', value: 50 },
      { name: 'Housekeeping', value: 30 },
      { name: 'Kitchen', value: 25 },
      { name: 'Engineering & Maintenance', value: 15 },
      { name: 'Sales & Commercial', value: 10 },
      { name: 'Finance & Administration', value: 10 },
      { name: 'Human Resources', value: 5 },
      { name: 'Health & Safety', value: 3 },
      { name: 'Spa & Wellness', value: 2 },
    ],
    byType: [
      { name: 'Full-time', value: 120 },
      { name: 'Part-time', value: 20 },
      { name: 'Contract', value: 10 },
    ],
    trend: [
      { month: 'Mar', value: 130 }, { month: 'Apr', value: 132 },
      { month: 'May', value: 135 }, { month: 'Jun', value: 138 },
      { month: 'Jul', value: 140 }, { month: 'Aug', value: 142 },
      { month: 'Sep', value: 144 }, { month: 'Oct', value: 145 },
      { month: 'Nov', value: 147 }, { month: 'Dec', value: 148 },
      { month: 'Jan', value: 149 }, { month: 'Feb', value: 150 },
    ],
    newHires: 5,
    departures: 2,
    netChange: 3,
  },

  // ----- 2. TURNOVER -----
  turnover: {
    monthlyRate: 0.5,
    annualizedRate: 6.0,
    byDepartment: [
      { name: 'Front of House', value: 0.8 },
      { name: 'Housekeeping', value: 0.6 },
      { name: 'Sales & Commercial', value: 0.5 },
      { name: 'Kitchen', value: 0.4 },
      { name: 'Engineering & Maintenance', value: 0.3 },
      { name: 'Health & Safety', value: 0.2 },
      { name: 'Human Resources', value: 0.2 },
      { name: 'Finance & Administration', value: 0.2 },
      { name: 'Spa & Wellness', value: 0.1 },
    ],
    voluntaryPct: 72,
    involuntaryPct: 28,
    costPerReplacement: 6500,
    avgTenureAtDeparture: 2.8,
    firstYearTurnover: 18,
    trend: [
      { month: 'Mar', value: 0.8 }, { month: 'Apr', value: 0.7 },
      { month: 'May', value: 0.6 }, { month: 'Jun', value: 0.9 },
      { month: 'Jul', value: 0.7 }, { month: 'Aug', value: 0.6 },
      { month: 'Sep', value: 0.5 }, { month: 'Oct', value: 0.8 },
      { month: 'Nov', value: 0.6 }, { month: 'Dec', value: 0.7 },
      { month: 'Jan', value: 0.5 }, { month: 'Feb', value: 0.7 },
    ],
  },

  // ----- 3. ABSENCE -----
  absence: {
    overallRate: 2.1,
    bradfordTop10: [
      { name: 'Mark Stevens', score: 324, pattern: '4 instances / 9 days', dept: 'Front of House' },
      { name: 'David Clarke', score: 256, pattern: '4 instances / 8 days', dept: 'Housekeeping' },
      { name: 'James Patterson', score: 225, pattern: '3 instances / 9 days', dept: 'Front of House' },
      { name: 'Robert Williams', score: 196, pattern: '4 instances / 7 days', dept: 'Engineering & Maintenance' },
      { name: 'Michael Brown', score: 169, pattern: '3 instances / 7 days', dept: 'Kitchen' },
      { name: 'Thomas Evans', score: 144, pattern: '3 instances / 6 days', dept: 'Front of House' },
      { name: 'Andrew Taylor', score: 121, pattern: '2 instances / 6 days', dept: 'Housekeeping' },
      { name: 'Peter Harris', score: 100, pattern: '2 instances / 5 days', dept: 'Health & Safety' },
      { name: 'John Mitchell', score: 81, pattern: '3 instances / 3 days', dept: 'Front of House' },
      { name: 'Paul Robinson', score: 64, pattern: '2 instances / 4 days', dept: 'Sales & Commercial' },
    ],
    byType: [
      { name: 'Sick leave', value: 48 },
      { name: 'Annual leave', value: 38 },
      { name: 'Personal', value: 9 },
      { name: 'Other', value: 5 },
    ],
    mondayFriday: { monday: 16.5, friday: 12.8, other: 70.7 },
    byDepartment: [
      { name: 'Front of House', value: 3.0 },
      { name: 'Housekeeping', value: 2.8 },
      { name: 'Engineering & Maintenance', value: 2.2 },
      { name: 'Kitchen', value: 2.0 },
      { name: 'Health & Safety', value: 1.6 },
      { name: 'Sales & Commercial', value: 1.4 },
      { name: 'Spa & Wellness', value: 1.2 },
      { name: 'Finance & Administration', value: 1.0 },
      { name: 'Human Resources', value: 0.8 },
    ],
    trend: [
      { month: 'Mar', value: 3.5 }, { month: 'Apr', value: 3.3 },
      { month: 'May', value: 3.0 }, { month: 'Jun', value: 2.8 },
      { month: 'Jul', value: 3.1 }, { month: 'Aug', value: 3.4 },
      { month: 'Sep', value: 3.2 }, { month: 'Oct', value: 2.9 },
      { month: 'Nov', value: 3.3 }, { month: 'Dec', value: 3.8 },
      { month: 'Jan', value: 3.5 }, { month: 'Feb', value: 3.2 },
    ],
  },

  // ----- 4. TRAINING COMPLIANCE -----
  training: {
    overallCompliance: 96,
    byCourse: [
      { name: 'H&S Induction', value: 100 },
      { name: 'Food Safety Level 2', value: 99 },
      { name: 'Fire Safety', value: 98 },
      { name: 'WSET Wine', value: 97 },
      { name: 'First Aid', value: 96 },
      { name: 'Opera PMS', value: 95 },
      { name: 'Bed & Breakfast Standards', value: 94 },
      { name: 'GDPR', value: 93 },
      { name: 'Customer Service Excellence', value: 92 },
      { name: 'Anti-Bribery', value: 90 },
    ],
    byLocation: [
      { name: 'Paris', value: 99 },
      { name: 'London Mayfair', value: 98 },
      { name: 'Dubai', value: 97 },
      { name: 'Pittsburgh Hotel', value: 96 },
      { name: 'Tokyo', value: 95 },
      { name: 'Lyon Hotel', value: 94 },
      { name: 'Madrid Hotel', value: 93 },
      { name: 'Milan Hotel', value: 93 },
      { name: 'New York Hotel', value: 92 },
    ],
    overdueItems: 12,
    overdueEmployees: 10,
    expiringIn30: 18,
    overdueList: [
      { employee: 'Mark Stevens', course: 'First Aid', dueDate: '2026-01-05', dept: 'Front of House', location: 'London Mayfair' },
      { employee: 'Piotr Kowalski', course: 'Food Safety Level 2', dueDate: '2026-01-10', dept: 'Front of House', location: 'Tokyo' },
      { employee: 'David Clarke', course: 'Customer Service Excellence', dueDate: '2026-01-12', dept: 'Housekeeping', location: 'London Mayfair' },
      { employee: 'Hans Mueller', course: 'Opera PMS', dueDate: '2026-01-15', dept: 'Engineering & Maintenance', location: 'Dubai' },
      { employee: 'Robert Williams', course: 'Anti-Bribery', dueDate: '2026-01-18', dept: 'Engineering & Maintenance', location: 'London Mayfair' },
      { employee: 'Emma Roberts', course: 'First Aid', dueDate: '2026-01-20', dept: 'Health & Safety', location: 'London Mayfair' },
      { employee: 'Mike Johnson', course: 'WSET Wine', dueDate: '2026-01-22', dept: 'Housekeeping', location: 'London Mayfair' },
      { employee: 'Claire Bennett', course: 'Food Safety Level 2', dueDate: '2026-01-25', dept: 'Spa & Wellness', location: 'Paris' },
    ],
  },

  // ----- 5. OVERTIME -----
  overtime: {
    totalHours: 420,
    totalCost: 8400,
    overtimePctOfTotal: 4.2,
    topEmployees: [
      { name: 'James Wilson', hours: 24, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'Hans Mueller', hours: 20, dept: 'Engineering & Maintenance', location: 'Dubai' },
      { name: 'Mark Stevens', hours: 18, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'Piotr Kowalski', hours: 16, dept: 'Kitchen', location: 'Tokyo' },
      { name: 'Mike Johnson', hours: 14, dept: 'Housekeeping', location: 'London Mayfair' },
      { name: 'David Clarke', hours: 12, dept: 'Housekeeping', location: 'London Mayfair' },
      { name: 'Robert Williams', hours: 10, dept: 'Engineering & Maintenance', location: 'London Mayfair' },
      { name: 'Thomas Evans', hours: 10, dept: 'Front of House', location: 'Paris' },
      { name: 'Sarah Thompson', hours: 8, dept: 'Kitchen', location: 'Paris' },
      { name: 'Claire Bennett', hours: 8, dept: 'Spa & Wellness', location: 'Paris' },
    ],
    byDepartment: [
      { name: 'Front of House', value: 142 },
      { name: 'Engineering & Maintenance', value: 78 },
      { name: 'Housekeeping', value: 65 },
      { name: 'Kitchen', value: 52 },
      { name: 'Sales & Commercial', value: 25 },
      { name: 'Health & Safety', value: 18 },
      { name: 'Spa & Wellness', value: 12 },
      { name: 'Finance & Administration', value: 8 },
      { name: 'Human Resources', value: 5 },
    ],
    trend: [
      { month: 'Sep', value: 756 }, { month: 'Oct', value: 812 },
      { month: 'Nov', value: 920 }, { month: 'Dec', value: 1050 },
      { month: 'Jan', value: 845 }, { month: 'Feb', value: 892 },
    ],
  },

  // ----- 6. DIVERSITY -----
  diversity: {
    gender: [
      { name: 'Male', value: 52 },
      { name: 'Female', value: 42 },
      { name: 'Non-binary', value: 3 },
      { name: 'Prefer not to say', value: 3 },
    ],
    age: [
      { name: '18-24', value: 18 },
      { name: '25-34', value: 45 },
      { name: '35-44', value: 50 },
      { name: '45-54', value: 25 },
      { name: '55+', value: 12 },
    ],
    tenure: [
      { name: '<1 year', value: 15 },
      { name: '1-3 years', value: 35 },
      { name: '3-5 years', value: 45 },
      { name: '5-10 years', value: 35 },
      { name: '10+ years', value: 20 },
    ],
    genderBySeniority: [
      { level: 'Executive', male: 60, female: 35, other: 5 },
      { level: 'Senior Manager', male: 55, female: 40, other: 5 },
      { level: 'Manager', male: 52, female: 44, other: 4 },
      { level: 'Team Lead', male: 50, female: 46, other: 4 },
      { level: 'Individual Contributor', male: 51, female: 45, other: 4 },
    ],
  },

  // ----- 7. GENDER PAY GAP (UK Legal Requirement) -----
  genderPayGap: {
    // Headline metrics (UK government reporting format)
    meanGap: 9.2,
    medianGap: 6.1,
    meanBonusGap: 12.5,
    medianBonusGap: 8.8,
    maleReceivingBonus: 75,
    femaleReceivingBonus: 72,
    // Pay quartiles
    quartiles: [
      { name: 'Upper', male: 68, female: 32 },
      { name: 'Upper Middle', male: 62, female: 38 },
      { name: 'Lower Middle', male: 58, female: 42 },
      { name: 'Lower', male: 52, female: 48 },
    ],
    // 3-year trend showing improvement
    trend: [
      { year: '2024', mean: 11.8, median: 8.5 },
      { year: '2025', mean: 10.5, median: 7.3 },
      { year: '2026', mean: 9.2, median: 6.1 },
    ],
    // Narrative and action plan
    narrative: `Grand Metropolitan Hotel Group is committed to closing the gender pay gap. Our mean pay gap has reduced from 11.8% to 9.2% over three years. Key initiatives include: structured pay bands for all roles, transparent promotion criteria, women in hospitality leadership mentoring programme, and flexible working arrangements across all hotel properties.`,
    actionPlan: [
      { initiative: 'Structured pay bands', target: 'All roles by Q2 2026', status: 'In Progress' },
      { initiative: 'Blind recruitment', target: 'All vacancies', status: 'Active' },
      { initiative: 'Women in Hospitality mentoring', target: '30 participants', status: 'Active' },
      { initiative: 'Flexible working policy', target: 'All properties', status: 'Complete' },
      { initiative: 'Leadership development — female employees', target: '15 places/year', status: 'Active' },
    ],
  },

  // ----- 8. RECRUITMENT -----
  recruitment: {
    openPositions: 12,
    avgTimeToFill: 24,
    costPerHire: 2400,
    bySource: [
      { name: 'Job Boards', value: 35 },
      { name: 'Referrals', value: 35 },
      { name: 'Agency', value: 20 },
      { name: 'Career Site', value: 10 },
    ],
    byStage: [
      { name: 'Sourcing', value: 3, color: '#6366f1' },
      { name: 'Screening', value: 4, color: '#3b82f6' },
      { name: 'Interview', value: 3, color: '#f97316' },
      { name: 'Offer', value: 2, color: '#10b981' },
    ],
    openRoles: [
      { title: 'Head Concierge', location: 'London Mayfair', dept: 'Front of House', stage: 'Interview', daysOpen: 18 },
      { title: 'Commis Chef', location: 'Dubai', dept: 'Kitchen', stage: 'Screening', daysOpen: 12 },
      { title: 'Guest Services Manager', location: 'Paris', dept: 'Front of House', stage: 'Sourcing', daysOpen: 5 },
      { title: 'Maintenance Manager', location: 'London Mayfair', dept: 'Engineering & Maintenance', stage: 'Offer', daysOpen: 22 },
      { title: 'Housekeeping Lead', location: 'Tokyo', dept: 'Housekeeping', stage: 'Interview', daysOpen: 15 },
      { title: 'Housekeeping Supervisor', location: 'London Mayfair', dept: 'Housekeeping', stage: 'Screening', daysOpen: 8 },
      { title: 'Health & Safety Coordinator', location: 'Dubai', dept: 'Health & Safety', stage: 'Screening', daysOpen: 10 },
      { title: 'Restaurant Manager', location: 'London Mayfair', dept: 'Front of House', stage: 'Sourcing', daysOpen: 3 },
      { title: 'Spa Therapist', location: 'Paris', dept: 'Spa & Wellness', stage: 'Interview', daysOpen: 12 },
      { title: 'Sales Manager', location: 'Pittsburgh Hotel', dept: 'Sales & Commercial', stage: 'Screening', daysOpen: 14 },
      { title: 'Kitchen Porter', location: 'London Mayfair', dept: 'Kitchen', stage: 'Sourcing', daysOpen: 2 },
      { title: 'Finance Analyst', location: 'London Mayfair', dept: 'Finance & Administration', stage: 'Offer', daysOpen: 20 },
    ],
  },

  // ----- 8. COMPENSATION -----
  compensation: {
    avgSalary: 42000,
    salaryBands: [
      { level: 'Executive', min: 95000, mid: 125000, max: 155000 },
      { level: 'Senior Manager', min: 65000, mid: 80000, max: 95000 },
      { level: 'Manager', min: 48000, mid: 58000, max: 68000 },
      { level: 'Team Lead', min: 38000, mid: 45000, max: 52000 },
      { level: 'Individual Contributor', min: 28000, mid: 35000, max: 42000 },
    ],
    genderPayGap: -2.8,
    budgetUtilization: 92,
    benefits: [
      { name: 'Health Insurance', value: 95 },
      { name: 'Pension', value: 92 },
      { name: 'Life Insurance', value: 88 },
      { name: 'Wellness Program', value: 85 },
      { name: 'Staff Accommodation', value: 78 },
    ],
    distribution: [
      { range: '28-32k', count: 22 },
      { range: '32-38k', count: 45 },
      { range: '38-45k', count: 52 },
      { range: '45-52k', count: 18 },
      { range: '52-65k', count: 8 },
      { range: '65-80k', count: 3 },
      { range: '80-95k', count: 1 },
      { range: '95k+', count: 1 },
    ],
    meanSalary: 43500,
    medianSalary: 41200,
  },

  // ----- 9. MOMENTUM SCORES -----
  momentum: {
    avgScore: 82,
    distribution: [
      { name: 'Excellent (90+)', value: 22, color: '#10b981' },
      { name: 'Good (70-89)', value: 95, color: '#3b82f6' },
      { name: 'Fair (50-69)', value: 28, color: '#f97316' },
      { name: 'Needs Improvement (<50)', value: 5, color: '#ef4444' },
    ],
    byLocation: [
      { name: 'Paris', value: 88 },
      { name: 'London Mayfair', value: 86 },
      { name: 'Pittsburgh Hotel', value: 83 },
      { name: 'Dubai', value: 82 },
      { name: 'Tokyo', value: 81 },
      { name: 'Lyon Hotel', value: 79 },
      { name: 'Madrid Hotel', value: 78 },
      { name: 'Milan Hotel', value: 77 },
      { name: 'New York Hotel', value: 76 },
    ],
    byDepartment: [
      { name: 'Spa & Wellness', value: 89 },
      { name: 'Human Resources', value: 86 },
      { name: 'Finance & Administration', value: 84 },
      { name: 'Health & Safety', value: 83 },
      { name: 'Kitchen', value: 82 },
      { name: 'Engineering & Maintenance', value: 81 },
      { name: 'Sales & Commercial', value: 80 },
      { name: 'Front of House', value: 79 },
      { name: 'Housekeeping', value: 78 },
    ],
    topPerformers: [
      { name: 'Claire Bennett', score: 96, dept: 'Spa & Wellness', location: 'Paris' },
      { name: 'James Wilson', score: 94, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'Hans Mueller', score: 91, dept: 'Engineering & Maintenance', location: 'Dubai' },
      { name: 'Sarah Thompson', score: 89, dept: 'Kitchen', location: 'Paris' },
      { name: 'Emma Roberts', score: 88, dept: 'Health & Safety', location: 'London Mayfair' },
      { name: 'Piotr Kowalski', score: 86, dept: 'Front of House', location: 'Tokyo' },
      { name: 'Mike Johnson', score: 84, dept: 'Housekeeping', location: 'London Mayfair' },
      { name: 'Robert Hughes', score: 92, dept: 'Finance & Administration', location: 'London Mayfair' },
      { name: 'David Clarke', score: 82, dept: 'Housekeeping', location: 'London Mayfair' },
      { name: 'Tom Davies', score: 76, dept: 'Front of House', location: 'London Mayfair' },
    ],
    trend: [
      { month: 'Sep', value: 74 }, { month: 'Oct', value: 75 },
      { month: 'Nov', value: 76 }, { month: 'Dec', value: 76 },
      { month: 'Jan', value: 77 }, { month: 'Feb', value: 78 },
    ],
    retentionCorrelation: [
      { scoreRange: '90-100', avgTenure: 5.2 },
      { scoreRange: '70-89', avgTenure: 3.8 },
      { scoreRange: '50-69', avgTenure: 2.1 },
      { scoreRange: '<50', avgTenure: 0.9 },
    ],
  },

  // ----- 10. ENGAGEMENT -----
  engagement: {
    enps: 52,
    responseRate: 91,
    drivers: [
      { name: 'Team Collaboration', score: 4.3 },
      { name: 'Manager Support', score: 4.2 },
      { name: 'Service Culture', score: 4.4 },
      { name: 'Career Growth', score: 4.0 },
      { name: 'Compensation & Benefits', score: 3.9 },
    ],
    byLocation: [
      { name: 'Paris', value: 58 },
      { name: 'London Mayfair', value: 55 },
      { name: 'Pittsburgh Hotel', value: 52 },
      { name: 'Dubai', value: 50 },
      { name: 'Tokyo', value: 48 },
      { name: 'Lyon Hotel', value: 46 },
      { name: 'Madrid Hotel', value: 44 },
      { name: 'Milan Hotel', value: 42 },
      { name: 'New York Hotel', value: 40 },
    ],
    trend: [
      { period: 'Q1 2025', value: 42, responses: 135, responseRate: 85 },
      { period: 'Q2 2025', value: 46, responses: 139, responseRate: 87 },
      { period: 'Q3 2025', value: 50, responses: 142, responseRate: 89 },
      { period: 'Q4 2025', value: 52, responses: 145, responseRate: 91 },
    ],
    actionItems: [
      { action: 'Launch mentorship programme for guest-facing staff', owner: 'HR Team', status: 'In Progress', priority: 'High' },
      { action: 'Review compensation benchmarks vs hospitality sector', owner: 'Compensation Team', status: 'Planned', priority: 'High' },
      { action: 'Implement flexible shift patterns for restaurant floor', owner: 'Operations', status: 'In Progress', priority: 'Medium' },
      { action: 'Create cross-property secondment opportunities', owner: 'L&D Team', status: 'Planned', priority: 'Medium' },
      { action: 'Quarterly town halls at each hotel property', owner: 'Executive Team', status: 'Completed', priority: 'Low' },
    ],
  },
};

// Manager-scoped data (team of 25 in Front of House department)
const MANAGER_DEMO = {
  teamName: 'Front of House',
  teamSize: 25,
  headcount: {
    total: 25,
    byLocation: [{ name: 'London Mayfair', value: 25 }],
    byDepartment: [{ name: 'Front of House', value: 25 }],
    byType: [{ name: 'Full-time', value: 24 }, { name: 'Part-time', value: 1 }],
    trend: [
      { month: 'Mar', value: 23 }, { month: 'Apr', value: 23 },
      { month: 'May', value: 24 }, { month: 'Jun', value: 24 },
      { month: 'Jul', value: 24 }, { month: 'Aug', value: 25 },
      { month: 'Sep', value: 25 }, { month: 'Oct', value: 25 },
      { month: 'Nov', value: 26 }, { month: 'Dec', value: 25 },
      { month: 'Jan', value: 25 }, { month: 'Feb', value: 25 },
    ],
    newHires: 2, departures: 1, netChange: 1,
  },
  turnover: {
    monthlyRate: 0.8, annualizedRate: 9.6,
    byDepartment: [{ name: 'Production', value: 0.8 }],
    voluntaryPct: 75, involuntaryPct: 25,
    costPerReplacement: 5500, avgTenureAtDeparture: 2.5, firstYearTurnover: 15,
    trend: [
      { month: 'Mar', value: 0.8 }, { month: 'Apr', value: 0.0 },
      { month: 'May', value: 1.0 }, { month: 'Jun', value: 0.0 },
      { month: 'Jul', value: 0.8 }, { month: 'Aug', value: 0.0 },
      { month: 'Sep', value: 0.0 }, { month: 'Oct', value: 0.8 },
      { month: 'Nov', value: 0.0 }, { month: 'Dec', value: 0.4 },
      { month: 'Jan', value: 0.0 }, { month: 'Feb', value: 0.8 },
    ],
  },
  absence: {
    overallRate: 2.8,
    bradfordTop10: [
      { name: 'Mark Stevens', score: 324, pattern: '4 instances / 9 days', dept: 'Front of House' },
      { name: 'James Patterson', score: 196, pattern: '4 instances / 7 days', dept: 'Front of House' },
      { name: 'Thomas Evans', score: 100, pattern: '2 instances / 5 days', dept: 'Front of House' },
    ],
    byType: [{ name: 'Sick leave', value: 50 }, { name: 'Annual leave', value: 35 }, { name: 'Personal', value: 10 }, { name: 'Other', value: 5 }],
    mondayFriday: { monday: 18, friday: 14, other: 68 },
    byDepartment: [{ name: 'Front of House', value: 2.8 }],
    trend: [
      { month: 'Mar', value: 4.0 }, { month: 'Apr', value: 3.6 },
      { month: 'May', value: 3.4 }, { month: 'Jun', value: 3.2 },
      { month: 'Jul', value: 3.6 }, { month: 'Aug', value: 4.0 },
      { month: 'Sep', value: 3.8 }, { month: 'Oct', value: 3.5 },
      { month: 'Nov', value: 3.8 }, { month: 'Dec', value: 4.2 },
      { month: 'Jan', value: 4.0 }, { month: 'Feb', value: 3.8 },
    ],
  },
  training: {
    overallCompliance: 95,
    byCourse: [
      { name: 'H&S Induction', value: 100 }, { name: 'Food Safety Level 2', value: 98 },
      { name: 'Fire Safety', value: 96 }, { name: 'WSET Wine', value: 94 },
      { name: 'Opera PMS', value: 92 }, { name: 'Customer Service Excellence', value: 100 },
      { name: 'First Aid', value: 88 }, { name: 'GDPR', value: 92 },
      { name: 'Bed & Breakfast Standards', value: 90 }, { name: 'Anti-Bribery', value: 92 },
    ],
    byLocation: [{ name: 'London Mayfair', value: 95 }],
    overdueItems: 2, overdueEmployees: 1, expiringIn30: 3,
    overdueList: [
      { employee: 'Mark Stevens', course: 'First Aid', dueDate: '2026-01-05', dept: 'Front of House', location: 'London Mayfair' },
      { employee: 'Thomas Evans', course: 'Food Safety Level 2', dueDate: '2026-01-15', dept: 'Front of House', location: 'London Mayfair' },
      { employee: 'Mark Stevens', course: 'WSET Wine', dueDate: '2026-01-20', dept: 'Front of House', location: 'London Mayfair' },
    ],
  },
  overtime: {
    totalHours: 95, totalCost: 1900, overtimePctOfTotal: 5.2,
    topEmployees: [
      { name: 'James Wilson', hours: 18, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'Mark Stevens', hours: 16, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'James Patterson', hours: 14, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'Thomas Evans', hours: 12, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'John Mitchell', hours: 10, dept: 'Front of House', location: 'London Mayfair' },
    ],
    byDepartment: [{ name: 'Front of House', value: 95 }],
    trend: [
      { month: 'Sep', value: 120 }, { month: 'Oct', value: 135 },
      { month: 'Nov', value: 158 }, { month: 'Dec', value: 175 },
      { month: 'Jan', value: 140 }, { month: 'Feb', value: 145 },
    ],
  },
  diversity: DEMO.diversity,
  recruitment: {
    openPositions: 3, avgTimeToFill: 20, costPerHire: 2000,
    bySource: DEMO.recruitment.bySource,
    byStage: [
      { name: 'Sourcing', value: 1, color: '#6366f1' },
      { name: 'Screening', value: 1, color: '#3b82f6' },
      { name: 'Interview', value: 1, color: '#f97316' },
      { name: 'Offer', value: 0, color: '#10b981' },
    ],
    openRoles: [
      { title: 'Head Concierge', location: 'London Mayfair', dept: 'Front of House', stage: 'Interview', daysOpen: 18 },
      { title: 'Restaurant Manager', location: 'London Mayfair', dept: 'Front of House', stage: 'Screening', daysOpen: 8 },
      { title: 'Guest Services Coordinator', location: 'London Mayfair', dept: 'Front of House', stage: 'Sourcing', daysOpen: 3 },
    ],
  },
  compensation: {
    avgSalary: 36500,
    salaryBands: [
      { level: 'Head Concierge', min: 52000, mid: 58000, max: 65000 },
      { level: 'Restaurant Manager', min: 42000, mid: 48000, max: 55000 },
      { level: 'Senior Guest Services', min: 35000, mid: 39000, max: 44000 },
      { level: 'Guest Services', min: 30000, mid: 34000, max: 38000 },
      { level: 'Guest Services Trainee', min: 27000, mid: 30000, max: 33000 },
    ],
    genderPayGap: -1.2, budgetUtilization: 91,
    benefits: DEMO.compensation.benefits,
    distribution: [
      { range: '27-31k', count: 5 }, { range: '31-36k', count: 10 },
      { range: '36-42k', count: 6 }, { range: '42-65k', count: 4 },
    ],
  },
  momentum: {
    avgScore: 82,
    distribution: [
      { name: 'Excellent (90+)', value: 20, color: '#10b981' },
      { name: 'Good (70-89)', value: 70, color: '#3b82f6' },
      { name: 'Fair (50-69)', value: 8, color: '#f97316' },
      { name: 'Needs Improvement (<50)', value: 2, color: '#ef4444' },
    ],
    byLocation: [{ name: 'London Mayfair', value: 82 }],
    byDepartment: [{ name: 'Front of House', value: 82 }],
    topPerformers: [
      { name: 'James Wilson', score: 94, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'Mark Stevens', score: 90, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'James Patterson', score: 86, dept: 'Front of House', location: 'London Mayfair' },
    ],
    trend: [
      { month: 'Sep', value: 71 }, { month: 'Oct', value: 72 },
      { month: 'Nov', value: 73 }, { month: 'Dec', value: 73 },
      { month: 'Jan', value: 74 }, { month: 'Feb', value: 75 },
    ],
    retentionCorrelation: DEMO.momentum.retentionCorrelation,
  },
  engagement: {
    enps: 48, responseRate: 96,
    drivers: [
      { name: 'Team Collaboration', score: 4.3 },
      { name: 'Manager Support', score: 4.2 },
      { name: 'Service Culture', score: 4.4 },
      { name: 'Career Growth', score: 4.0 },
      { name: 'Compensation & Benefits', score: 3.9 },
    ],
    byLocation: [{ name: 'London Mayfair', value: 48 }],
    trend: [
      { period: 'Q1 2025', value: 40 }, { period: 'Q2 2025', value: 43 },
      { period: 'Q3 2025', value: 46 }, { period: 'Q4 2025', value: 48 },
    ],
    actionItems: [
      { action: 'Review shift pattern fairness for restaurant floor', owner: 'Front of House Manager', status: 'In Progress', priority: 'High' },
      { action: 'Implement cross-training across guest-facing roles', owner: 'Front of House Manager', status: 'Planned', priority: 'Medium' },
    ],
  },
};

// ============================================================
// CHART COMPONENTS (Pure CSS/SVG)
// ============================================================

function BarChartHorizontal({ data, maxValue: maxProp, unit = '', currency = '', color = '#FF6B35', showValues = true }) {
  const max = maxProp || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((item, i) => {
        const pct = Math.max((item.value / max) * 100, 1);
        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-700 truncate max-w-[200px]">{item.name}</span>
              {showValues && (
                <span className="text-sm font-semibold text-slate-900 ml-2 whitespace-nowrap">
                  {currency}{typeof item.value === 'number' && item.value % 1 !== 0 ? item.value.toFixed(1) : item.value.toLocaleString()}{unit}
                </span>
              )}
            </div>
            <div className="h-6 bg-slate-100 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-80"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarChartVertical({ data, unit = '', height = 200 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((item, i) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center group relative min-w-0">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
              {item.value}{unit}
            </div>
            <div className="w-full relative flex justify-center" style={{ height: '100%' }}>
              <div
                className="w-full max-w-[40px] rounded-t transition-all duration-500 group-hover:opacity-80 self-end"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 truncate w-full text-center">{item.month || item.name || item.period}</span>
          </div>
        );
      })}
    </div>
  );
}

// Overtime Trend Chart - Bar (hours) + Line (percentage) using recharts
function OvertimeTrendChart() {
  const data = [
    { month: 'Oct', hours: 1240, pct: 4.1 },
    { month: 'Nov', hours: 1380, pct: 4.6 },
    { month: 'Dec', hours: 1490, pct: 5.0 },
    { month: 'Jan', hours: 1320, pct: 4.4 },
    { month: 'Feb', hours: 1180, pct: 3.9 },
    { month: 'Mar', hours: 980, pct: 3.3 },
  ];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 20, right: 50, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
        <YAxis
          yAxisId="left"
          domain={[0, 1800]}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
          tickFormatter={(v) => `${v}h`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 6]}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          formatter={(value, name) => [name === 'hours' ? `${value}h` : `${value}%`, name === 'hours' ? 'Overtime Hours' : '% of Total']}
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Bar yAxisId="left" dataKey="hours" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Hours" barSize={40} />
        <Line yAxisId="right" type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} name="% of Total" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Absence Rate Trend Chart - Area chart with average line using recharts
function AbsenceTrendChart() {
  const data = [
    { month: 'Apr', rate: 3.2 },
    { month: 'May', rate: 2.8 },
    { month: 'Jun', rate: 2.5 },
    { month: 'Jul', rate: 2.9 },
    { month: 'Aug', rate: 3.1 },
    { month: 'Sep', rate: 2.7 },
    { month: 'Oct', rate: 3.4 },
    { month: 'Nov', rate: 3.8 },
    { month: 'Dec', rate: 4.1 },
    { month: 'Jan', rate: 3.6 },
    { month: 'Feb', rate: 3.2 },
    { month: 'Mar', rate: 2.9 },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
        <defs>
          <linearGradient id="absenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
        <YAxis
          domain={[0, 6]}
          ticks={[0, 1, 2, 3, 4, 5, 6]}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          formatter={(value) => [`${value}%`, 'Absence Rate']}
        />
        <ReferenceLine y={3.1} stroke="#9ca3af" strokeDasharray="5 5" label={{ value: 'Avg 3.1%', position: 'right', fill: '#9ca3af', fontSize: 11 }} />
        <Area type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} fill="url(#absenceGradient)" dot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} name="Absence Rate" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// eNPS Timeline Chart - Line chart with industry benchmark
function ENPSTimelineChart({ data, height = 280 }) {
  const chartData = data.map(d => ({
    period: d.period.replace(' 2025', ''),
    value: d.value,
    responses: d.responses || 0,
    responseRate: d.responseRate || 0,
  }));

  // Get latest value for highlight
  const latestScore = chartData[chartData.length - 1]?.value || 0;
  const firstScore = chartData[0]?.value || 0;
  const improvement = latestScore - firstScore;

  return (
    <div style={{ width: '100%' }}>
      {/* Prominent current score display */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold text-orange-600">+{latestScore}</span>
          <div className="flex flex-col">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
              Excellent
            </span>
            <span className="text-xs text-slate-500 mt-0.5">{t('reports.currentEnps', 'Current eNPS')}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-emerald-600">+{improvement} pts</span>
          <p className="text-xs text-slate-500">improvement YTD</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <defs>
            <linearGradient id="enpsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
          <YAxis
            domain={[0, 60]}
            ticks={[0, 10, 20, 30, 40, 50, 60]}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            label={{ value: 'eNPS Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#f97316', fontWeight: 600 } }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            formatter={(value, name) => {
              if (name === 'value') return [`+${value}`, 'eNPS Score'];
              if (name === 'responses') return [value, 'Responses'];
              if (name === 'responseRate') return [`${value}%`, 'Response Rate'];
              return [value, name];
            }}
            labelFormatter={(label) => `${label} 2025`}
          />
          {/* Industry benchmark line at +23 */}
          <ReferenceLine
            y={23}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ value: 'Industry Avg +23', position: 'insideTopRight', fill: '#64748b', fontSize: 11 }}
          />
          <Area type="monotone" dataKey="value" stroke="none" fill="url(#enpsGradient)" />
          <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }} name="eNPS Score" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span> Grand Metropolitan eNPS
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-slate-400" style={{ display: 'inline-block', borderStyle: 'dashed' }}></span> Industry benchmark (+18)
        </span>
      </div>
    </div>
  );
}

function LineChartSVG({ data, color = '#6366f1' }) {
  // Transform data for recharts
  const chartData = data.map(d => ({
    name: d.month || d.period || '',
    value: d.value
  }));

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  // Add padding to domain
  const domainMin = Math.floor(minVal * 0.95);
  const domainMax = Math.ceil(maxVal * 1.02);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
        <defs>
          <linearGradient id="lineChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
        <YAxis
          domain={[domainMin, domainMax]}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          formatter={(value) => [value, 'Headcount']}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#lineChartGradient)" dot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data, size = 180, thickness = 35, centerLabel, centerValue, totalCount, valuesArePercentages = false }) {
  // Calculate total for donut segments (always based on raw values)
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;

  const gradientStops = data.map((item, i) => {
    const start = (cumulative / total) * 100;
    cumulative += item.value;
    const end = (cumulative / total) * 100;
    return `${item.color || CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${end}%`;
  });

  const bg = `conic-gradient(${gradientStops.join(', ')})`;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Donut chart */}
      <div className="relative" style={{ width: '160px', height: '160px' }}>
        <div className="absolute inset-0 rounded-full" style={{ background: bg }} />
        <div
          className="absolute rounded-full bg-white flex items-center justify-center"
          style={{
            top: thickness, left: thickness, right: thickness, bottom: thickness,
          }}
        >
          <div className="text-center">
            {centerValue !== undefined && <p className="text-xl font-bold text-slate-900">{centerValue}</p>}
            {centerLabel && <p className="text-xs text-slate-500">{centerLabel}</p>}
          </div>
        </div>
      </div>
      {/* Legend - stacked below chart */}
      <div className="w-full space-y-2">
        {data.map((item, i) => {
          const color = item.color || CHART_COLORS[i % CHART_COLORS.length];
          // Determine how to display:
          // - If valuesArePercentages=true and totalCount provided: show "count (pct%)"
          // - If valuesArePercentages=true and no totalCount: show "pct%"
          // - If valuesArePercentages=false (raw counts): calculate pct from total, show "count (pct%)"
          let displayText;
          if (valuesArePercentages) {
            if (totalCount) {
              const actualCount = Math.round((item.value / 100) * totalCount);
              displayText = `${actualCount} (${item.value}%)`;
            } else {
              displayText = `${item.value}%`;
            }
          } else {
            // Raw counts - calculate percentage
            const pct = Math.round((item.value / total) * 100);
            displayText = `${item.value} (${pct}%)`;
          }
          return (
            <div key={i} className="flex items-center text-sm">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-700">
                {item.name} — {displayText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ value, max = 100, color = '#10b981', label, showPct = true }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorClass = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-700">{label}</span>
          {showPct && <span className="font-semibold text-slate-900">{value}%</span>}
        </div>
      )}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StackedBar({ segments, height = 32, showLabels = false }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div className="flex rounded-lg overflow-hidden" style={{ height }}>
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100;
        const showText = showLabels && pct >= 10; // Only show label if segment is wide enough
        return (
          <div
            key={i}
            className="relative group transition-opacity hover:opacity-80 flex items-center justify-center"
            style={{ width: `${pct}%`, backgroundColor: seg.color || CHART_COLORS[i % CHART_COLORS.length] }}
          >
            {showText && (
              <span className="text-white text-xs font-medium drop-shadow-sm">
                {seg.value}%
              </span>
            )}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
              {seg.name}: {seg.value}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================

function KPICard({ label, value, trend, trendLabel, icon: Icon, prefix = '', suffix = '', color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600', red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600', pink: 'bg-pink-50 text-pink-600',
    cyan: 'bg-cyan-50 text-cyan-600', green: 'bg-green-50 text-green-600',
    violet: 'bg-violet-50 text-violet-600', orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}</p>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.indigo}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-1.5 mt-2">
          {trend > 0 && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
          {trend < 0 && <ArrowDownRight className="w-4 h-4 text-red-500" />}
          {trend === 0 && <Minus className="w-4 h-4 text-slate-400" />}
          <span className={`text-sm font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {trendLabel || `${trend > 0 ? '+' : ''}${trend}`}
          </span>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            {title && <h3 className="font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function DataTable({ columns, rows, sortable = true }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (colIdx) => {
    if (!sortable) return;
    if (sortCol === colIdx) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colIdx);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (sortCol === null) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av || '');
      const sb = String(bv || '');
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [rows, sortCol, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap ${sortable ? 'cursor-pointer hover:text-slate-900 select-none' : ''} ${col.align === 'right' ? 'text-right' : ''}`}
                onClick={() => handleSort(i)}
              >
                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                  {col.label}
                  {sortable && sortCol === i && (
                    sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row, ri) => (
            <tr key={ri} className="hover:bg-slate-50 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-3 ${columns[ci]?.align === 'right' ? 'text-right' : ''} ${columns[ci]?.mono ? 'font-mono' : ''} ${columns[ci]?.bold ? 'font-semibold' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-7 w-16 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-6 bg-slate-100 rounded-full" style={{ width: `${80 - j * 10}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleModal({ onClose, t }) {
  const [freq, setFreq] = useState('weekly');
  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{t('reports.scheduleReport', 'Schedule Report')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {confirmed ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-900 mb-1">{t('reports.scheduleConfirmed', 'Schedule Confirmed')}</p>
              <p className="text-sm text-slate-500">{t('reports.scheduleConfirmedDesc', 'You will receive this report via email.')}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('reports.frequency', 'Frequency')}</label>
                <div className="flex gap-2">
                  {['weekly', 'monthly'].map(f => (
                    <button key={f} onClick={() => setFreq(f)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${freq === f ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {f === 'weekly' ? t('reports.weekly', 'Weekly') : t('reports.monthly', 'Monthly')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('reports.recipientEmail', 'Recipient Email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@grandmetropolitan.com" />
              </div>
              <button onClick={() => setConfirmed(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
                <Mail className="w-4 h-4 inline mr-2" />{t('reports.scheduleNow', 'Schedule Report')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportDropdown({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
        <Download className="w-4 h-4" />
        {t('reports.export', 'Export')}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
            <button onClick={() => setOpen(false)} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
            </button>
            <button onClick={() => setOpen(false)} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-green-500" /> CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// INDIVIDUAL REPORT VIEWS
// ============================================================

function HeadcountReport({ data, t }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.totalHeadcount', 'Total Headcount')} value={data.total} icon={Users} color="indigo"
          trend={data.netChange} trendLabel={`+${data.netChange} ${t('reports.thisMonth', 'this month')}`} />
        <KPICard label={t('reports.newHires', 'New Hires')} value={data.newHires} icon={UserCheck} color="emerald"
          trend={data.newHires} trendLabel={t('reports.thisMonth', 'This month')} />
        <KPICard label={t('reports.departures', 'Departures')} value={data.departures} icon={TrendingDown} color="red"
          trend={-data.departures} trendLabel={t('reports.thisMonth', 'This month')} />
        <KPICard label={t('reports.netChange', 'Net Change')} value={`+${data.netChange}`} icon={TrendingUp} color="blue"
          trend={data.netChange} trendLabel={t('reports.positive', 'Positive growth')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.headcountByLocation', 'Headcount by Location')}>
          <BarChartHorizontal data={data.byLocation} />
        </SectionCard>
        <SectionCard title={t('reports.headcountByDepartment', 'Headcount by Department')}>
          <BarChartHorizontal data={data.byDepartment} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.employmentType', 'Employment Type')}>
          <DonutChart
            data={data.byType.map((d, i) => ({ ...d, color: CHART_COLORS[i] }))}
            centerValue={data.total}
            centerLabel={t('reports.total', 'Total')}
          />
        </SectionCard>
        <SectionCard title={t('reports.headcountTrend', 'Headcount Trend (12 Months)')}>
          <LineChartSVG data={data.trend} color="#6366f1" />
        </SectionCard>
      </div>

      {/* Data table */}
      <SectionCard title={t('reports.headcountBreakdown', 'Headcount Breakdown')}>
        <DataTable
          columns={[
            { label: t('reports.location', 'Location') },
            { label: t('reports.employees', 'Employees'), align: 'right', mono: true },
            { label: t('reports.pctOfTotal', '% of Total'), align: 'right', mono: true },
          ]}
          rows={data.byLocation.map(d => [d.name, d.value, `${((d.value / data.total) * 100).toFixed(1)}%`])}
        />
      </SectionCard>
    </div>
  );
}

function TurnoverReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.monthlyTurnover', 'Monthly Turnover')} value={data.monthlyRate} suffix="%" icon={TrendingDown} color="red" trend={-0.2} trendLabel="-0.2pp vs last month" />
        <KPICard label={t('reports.annualizedRate', 'Annualized Rate')} value={data.annualizedRate} suffix="%" icon={Activity} color="amber" trend={0} trendLabel={t('reports.industryAvg', 'Industry avg: 30%')} />
        <KPICard label={t('reports.costPerReplacement', 'Cost per Replacement')} value={data.costPerReplacement.toLocaleString()} prefix="£" icon={DollarSign} color="blue" />
        <KPICard label={t('reports.avgTenure', 'Avg Tenure at Departure')} value={data.avgTenureAtDeparture} suffix=" yrs" icon={Clock} color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.turnoverByDept', 'Turnover by Department (Monthly %)')}>
          <BarChartHorizontal data={data.byDepartment} unit="%" />
        </SectionCard>
        <SectionCard title={t('reports.voluntaryVsInvoluntary', 'Voluntary vs Involuntary')}>
          <div className="space-y-4">
            <StackedBar segments={[
              { name: t('reports.voluntary', 'Voluntary'), value: data.voluntaryPct, color: '#f97316' },
              { name: t('reports.involuntary', 'Involuntary'), value: data.involuntaryPct, color: '#6366f1' },
            ]} height={40} />
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-slate-600">{t('reports.voluntary', 'Voluntary')}: {data.voluntaryPct}%</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-slate-600">{t('reports.involuntary', 'Involuntary')}: {data.involuntaryPct}%</span></div>
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800">{t('reports.firstYearTurnover', 'First-Year Turnover')}: {data.firstYearTurnover}%</p>
              <p className="text-xs text-amber-600 mt-1">{t('reports.firstYearDesc', 'Of all leavers, this percentage depart within their first year of employment.')}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t('reports.turnoverTrend', 'Turnover Rate Trend (12 Months)')}>
        <LineChartSVG data={data.trend} color="#ef4444" unit="%" />
      </SectionCard>
    </div>
  );
}

function AbsenceReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.overallAbsenceRate', 'Overall Absence Rate')} value={data.overallRate} suffix="%" icon={Calendar} color="amber" trend={-0.4} trendLabel="-0.4pp vs last month" />
        <KPICard label={t('reports.sickLeave', 'Sick Leave Share')} value={data.byType[0].value} suffix="%" icon={Heart} color="red" />
        <KPICard label={t('reports.mondayAbsences', 'Monday Absences')} value={data.mondayFriday.monday} suffix="%" icon={AlertTriangle} color="orange"
          trendLabel={t('reports.flagged', 'Pattern flagged')} trend={-1} />
        <KPICard label={t('reports.fridayAbsences', 'Friday Absences')} value={data.mondayFriday.friday} suffix="%" icon={AlertTriangle} color="orange"
          trendLabel={t('reports.flagged', 'Pattern flagged')} trend={-1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.absenceByType', 'Absence by Type')}>
          <DonutChart
            data={data.byType.map((d, i) => ({ ...d, color: CHART_COLORS[i] }))}
            centerValue={`${data.overallRate}%`}
            centerLabel={t('reports.absenceRate', 'Rate')}
          />
        </SectionCard>
        <SectionCard title={t('reports.absenceByDept', 'Absence by Department')}>
          <BarChartHorizontal data={data.byDepartment} unit="%" />
        </SectionCard>
      </div>

      <SectionCard title={t('reports.bradfordFactor', 'Bradford Factor — Top 10')}
        subtitle={t('reports.bradfordDesc', 'Score = S x S x D, where S = number of spells, D = total days absent')}>
        <DataTable
          columns={[
            { label: t('reports.employee', 'Employee'), bold: true },
            { label: t('reports.department', 'Department') },
            { label: t('reports.score', 'Score'), align: 'right', mono: true },
            { label: t('reports.pattern', 'Pattern') },
          ]}
          rows={data.bradfordTop10.map(e => [
            e.name,
            e.dept,
            <span key="s" className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${e.score >= 400 ? 'bg-red-100 text-red-700' : e.score >= 200 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{e.score}</span>,
            e.pattern,
          ])}
        />
      </SectionCard>

      <SectionCard title={t('reports.absenceTrend', 'Absence Rate Trend (12 Months)')}>
        <AbsenceTrendChart />
      </SectionCard>
    </div>
  );
}

function TrainingReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.overallCompliance', 'Overall Compliance')} value={data.overallCompliance} suffix="%" icon={GraduationCap} color="emerald"
          trend={2} trendLabel="+2pp vs last month" />
        <KPICard label={t('reports.overdueItems', 'Overdue Items')} value={data.overdueItems} icon={AlertTriangle} color="red"
          trendLabel={`${data.overdueEmployees} ${t('reports.employeesAffected', 'employees affected')}`} trend={-1} />
        <KPICard label={t('reports.expiringIn30', 'Expiring in 30 Days')} value={data.expiringIn30} icon={Clock} color="amber" />
        <KPICard label={t('reports.coursesTracked', 'Courses Tracked')} value={data.byCourse.length} icon={BookOpen} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.complianceByCourse', 'Compliance by Course')}>
          <div className="space-y-3">
            {data.byCourse.map((c, i) => (
              <ProgressBar key={i} label={c.name} value={c.value} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title={t('reports.complianceByLocation', 'Compliance by Location')}>
          <div className="space-y-3 mb-6">
            {data.byLocation.map((l, i) => (
              <ProgressBar key={i} label={l.name} value={l.value} />
            ))}
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-700 mb-2">{t('reports.complianceTarget', 'Compliance Target')}: 95%</p>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${data.overallCompliance}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>{t('reports.current', 'Current')}: {data.overallCompliance}%</span>
              <span>{t('reports.target', 'Target')}: 95%</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t('reports.overdueTraining', 'Overdue Training Items')}
        subtitle={t('reports.overdueDesc', 'These employees have mandatory training past their due date')}>
        <DataTable
          columns={[
            { label: t('reports.employee', 'Employee'), bold: true },
            { label: t('reports.course', 'Course') },
            { label: t('reports.department', 'Department') },
            { label: t('reports.location', 'Location') },
            { label: t('reports.dueDate', 'Due Date'), align: 'right' },
          ]}
          rows={data.overdueList.map(e => [e.employee, e.course, e.dept, e.location,
            <span key="d" className="text-red-600 font-medium">{e.dueDate}</span>
          ])}
        />
      </SectionCard>
    </div>
  );
}

function OvertimeReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.totalOTHours', 'Total OT Hours')} value={data.totalHours} suffix="h" icon={Clock} color="blue"
          trend={22} trendLabel="+22h vs last month" />
        <KPICard label={t('reports.overtimeCost', 'Overtime Cost')} value={data.totalCost.toLocaleString()} prefix="£" icon={DollarSign} color="amber" />
        <KPICard label={t('reports.otPctOfTotal', 'OT % of Total Hours')} value={data.overtimePctOfTotal} suffix="%" icon={PieChart} color="violet" />
        <KPICard label={t('reports.topOTEmployee', 'Top OT Employee')} value={`${data.topEmployees[0].hours}h`} icon={Users} color="red"
          trendLabel={data.topEmployees[0].name} trend={0} />
      </div>

      <SectionCard title={t('reports.otByDepartment', 'Overtime by Department (Hours)')}>
        <BarChartHorizontal data={data.byDepartment} unit="h" />
      </SectionCard>

      <SectionCard title={t('reports.otTrend', 'Overtime Trend (6 Months)')}>
        <OvertimeTrendChart />
      </SectionCard>

      <SectionCard title={t('reports.topOTEmployees', 'Top Overtime Employees')}>
        <DataTable
          columns={[
            { label: t('reports.employee', 'Employee'), bold: true },
            { label: t('reports.department', 'Department') },
            { label: t('reports.location', 'Location') },
            { label: t('reports.hours', 'Hours'), align: 'right', mono: true },
          ]}
          rows={data.topEmployees.map(e => [e.name, e.dept, e.location, `${e.hours}h`])}
        />
      </SectionCard>
    </div>
  );
}

function DiversityReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
        <Shield className="w-4 h-4 flex-shrink-0" />
        {t('reports.anonymityNote', 'Data shown with anonymity thresholds — groups with fewer than 5 employees are hidden to protect individual identities.')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title={t('reports.genderDistribution', 'Gender Distribution')}>
          <DonutChart
            data={data.gender.map((d, i) => ({ ...d, color: CHART_COLORS[i] }))}
            size={160} thickness={30}
            centerValue="150"
            centerLabel={t('reports.employees', 'Employees')}
            totalCount={150}
            valuesArePercentages={true}
          />
        </SectionCard>
        <SectionCard title={t('reports.ageDistribution', 'Age Distribution')}>
          <DonutChart
            data={data.age.map((d, i) => ({ ...d, color: CHART_COLORS[i + 4] }))}
            size={160} thickness={30}
            totalCount={150}
            valuesArePercentages={true}
          />
        </SectionCard>
        <SectionCard title={t('reports.tenureDistribution', 'Tenure Distribution')}>
          <DonutChart
            data={data.tenure.map((d, i) => ({ ...d, color: CHART_COLORS[i + 2] }))}
            size={160} thickness={30}
            totalCount={150}
            valuesArePercentages={true}
          />
        </SectionCard>
      </div>

      <SectionCard title={t('reports.genderBySeniority', 'Gender by Seniority Level')}>
        <div className="space-y-4">
          {data.genderBySeniority.map((row, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-slate-700 mb-1.5">{row.level}</p>
              <StackedBar segments={[
                { name: t('reports.male', 'Male'), value: row.male, color: '#3b82f6' },
                { name: t('reports.female', 'Female'), value: row.female, color: '#ec4899' },
                { name: t('reports.other', 'Other'), value: row.other, color: '#8b5cf6' },
              ]} height={28} showLabels={true} />
            </div>
          ))}
          <div className="flex gap-6 mt-3 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" />{t('reports.male', 'Male')}</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500" />{t('reports.female', 'Female')}</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-500" />{t('reports.other', 'Other / Prefer not to say')}</div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function GenderPayGapReport({ data, t }) {
  return (
    <div className="space-y-6">
      {/* UK Legal Requirement Notice */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-3">
        <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-purple-800">{t('reports.ukGenderPayGapReporting', 'UK Gender Pay Gap Reporting')}</p>
          <p className="text-sm text-purple-700 mt-1">
            Grand Metropolitan Hotel Group (150 employees) is committed to transparent pay practices. This report demonstrates our commitment to equality and fair compensation across all 9 hotel properties.
          </p>
        </div>
      </div>

      {/* Headline Metrics - 6 KPIs matching UK government format */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label={t('reports.meanGenderPayGap', 'Mean Gender Pay Gap')} value={data.meanGap} suffix="%" icon={TrendingDown} color="purple"
          trend={-1.7} trendLabel={t('reports.improvedFrom', 'Improved from {{value}}', { value: '14.1%' })} />
        <KPICard label={t('reports.medianGenderPayGap', 'Median Gender Pay Gap')} value={data.medianGap} suffix="%" icon={TrendingDown} color="indigo"
          trend={-1.5} trendLabel={t('reports.improvedFrom', 'Improved from {{value}}', { value: '10.2%' })} />
        <KPICard label={t('reports.meanBonusGap', 'Mean Bonus Pay Gap')} value={data.meanBonusGap} suffix="%" icon={DollarSign} color="amber" />
        <KPICard label={t('reports.medianBonusGap', 'Median Bonus Pay Gap')} value={data.medianBonusGap} suffix="%" icon={DollarSign} color="orange" />
        <KPICard label={t('reports.maleReceivingBonus', 'Males Receiving Bonus')} value={data.maleReceivingBonus} suffix="%" icon={Award} color="blue" />
        <KPICard label={t('reports.femaleReceivingBonus', 'Females Receiving Bonus')} value={data.femaleReceivingBonus} suffix="%" icon={Award} color="pink" />
      </div>

      {/* Pay Quartiles */}
      <SectionCard title={t('reports.payQuartiles', 'Pay Quartiles')} subtitle={t('reports.payQuartilesSubtitle', 'Proportion of males and females in each pay quartile')}>
        <div className="space-y-4">
          {data.quartiles.map((q, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-slate-700 mb-1.5">{t('reports.quartile', '{{name}} Quartile', { name: q.name })}</p>
              <StackedBar segments={[
                { name: t('reports.male', 'Male'), value: q.male, color: '#3b82f6' },
                { name: t('reports.female', 'Female'), value: q.female, color: '#ec4899' },
              ]} height={28} showLabels={true} />
            </div>
          ))}
          <div className="flex gap-6 mt-3 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" />{t('reports.male', 'Male')}</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500" />{t('reports.female', 'Female')}</div>
          </div>
        </div>
      </SectionCard>

      {/* 3-Year Trend */}
      <SectionCard title={t('reports.threeYearTrend', 'Three-Year Trend')} subtitle={t('reports.threeYearTrendSubtitle', 'Year-on-year improvement in gender pay gap')}>
        <div className="grid grid-cols-3 gap-4">
          {data.trend.map((year, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-slate-900">{year.year}</p>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{t('reports.meanGap', 'Mean Gap')}</p>
                  <p className={`text-2xl font-bold ${i === data.trend.length - 1 ? 'text-green-600' : 'text-slate-700'}`}>{year.mean}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{t('reports.medianGap', 'Median Gap')}</p>
                  <p className={`text-xl font-semibold ${i === data.trend.length - 1 ? 'text-green-600' : 'text-slate-600'}`}>{year.median}%</p>
                </div>
              </div>
              {i < data.trend.length - 1 && (
                <div className="mt-2 text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {(data.trend[i].mean - data.trend[i + 1].mean).toFixed(1)}pp
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Narrative Section */}
      <SectionCard title={t('reports.narrative', 'Our Commitment')} subtitle={t('reports.narrativeSubtitle', 'Statement from the CEO')}>
        <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-purple-500">
          <p className="text-slate-700 leading-relaxed italic">"{data.narrative}"</p>
          <p className="mt-3 text-sm font-medium text-slate-600">— Robert Hughes, CEO</p>
        </div>
      </SectionCard>

      {/* Action Plan Table */}
      <SectionCard title={t('reports.actionPlan', 'Action Plan')} subtitle={t('reports.actionPlanSubtitle', 'Initiatives to close the gender pay gap')}>
        <DataTable
          columns={[
            { label: t('reports.initiative', 'Initiative'), bold: true },
            { label: t('reports.target', 'Target') },
            { label: t('reports.status', 'Status') },
          ]}
          rows={data.actionPlan.map(a => [
            a.initiative,
            a.target,
            <span key="s" className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              a.status === 'Complete' ? 'bg-green-100 text-green-700' :
              a.status === 'Active' ? 'bg-blue-100 text-blue-700' :
              'bg-amber-100 text-amber-700'
            }`}>{a.status}</span>,
          ])}
        />
      </SectionCard>
    </div>
  );
}

function RecruitmentReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.openPositions', 'Open Positions')} value={data.openPositions} icon={Briefcase} color="cyan" />
        <KPICard label={t('reports.avgTimeToFill', 'Avg Time to Fill')} value={data.avgTimeToFill} suffix=" days" icon={Clock} color="blue"
          trend={-3} trendLabel="-3 days vs avg" />
        <KPICard label={t('reports.costPerHire', 'Cost per Hire')} value={data.costPerHire.toLocaleString()} prefix="£" icon={DollarSign} color="green" />
        <KPICard label={t('reports.inPipeline', 'In Pipeline')} value={data.openPositions} icon={Users} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.bySource', 'Hires by Source')}>
          <DonutChart
            data={data.bySource.map((d, i) => ({ ...d, color: CHART_COLORS[i] }))}
            size={160} thickness={30}
            centerValue={data.openPositions}
            centerLabel={t('reports.open', 'Open')}
          />
        </SectionCard>
        <SectionCard title={t('reports.pipelineStages', 'Pipeline by Stage')}>
          <div className="space-y-4">
            {data.byStage.map((stage, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                <span className="text-sm text-slate-700 w-24">{stage.name}</span>
                <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(stage.value / Math.max(...data.byStage.map(s => s.value), 1)) * 100}%`, backgroundColor: stage.color }} />
                </div>
                <span className="text-sm font-semibold text-slate-900 w-8 text-right">{stage.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t('reports.openRoles', 'Open Roles')}>
        <DataTable
          columns={[
            { label: t('reports.role', 'Role'), bold: true },
            { label: t('reports.location', 'Location') },
            { label: t('reports.department', 'Department') },
            { label: t('reports.stage', 'Stage') },
            { label: t('reports.daysOpen', 'Days Open'), align: 'right', mono: true },
          ]}
          rows={data.openRoles.map(r => [
            r.title,
            r.location,
            r.dept,
            <span key="s" className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              r.stage === 'Offer' ? 'bg-emerald-100 text-emerald-700' :
              r.stage === 'Interview' ? 'bg-amber-100 text-amber-700' :
              r.stage === 'Screening' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            }`}>{r.stage}</span>,
            r.daysOpen,
          ])}
        />
      </SectionCard>
    </div>
  );
}

function CompensationReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.avgSalary', 'Average Salary')} value={`£${data.avgSalary.toLocaleString()}`} icon={DollarSign} color="green" trend={3.2} trendLabel="+3.2% YoY" />
        <KPICard label={t('reports.genderPayGap', 'Gender Pay Gap')} value={`${data.genderPayGap}%`} icon={Heart} color="pink"
          trendLabel={t('reports.womenEarnLess', 'Women earn 3.2% less on avg')} trend={-1} />
        <KPICard label={t('reports.budgetUtil', 'Budget Utilisation')} value={data.budgetUtilization} suffix="%" icon={Target} color="blue" />
        <KPICard label={t('reports.healthEnrollment', 'Health Enrollment')} value={data.benefits[0].value} suffix="%" icon={Shield} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.salaryBands', 'Salary Bands by Level')}>
          <div className="space-y-4">
            {data.salaryBands.map((band, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-slate-700 mb-1">{band.level}</p>
                <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div className="absolute h-full rounded-full opacity-30" style={{
                    left: `${(band.min / 150000) * 100}%`,
                    width: `${((band.max - band.min) / 150000) * 100}%`,
                    backgroundColor: CHART_COLORS[i],
                  }} />
                  <div className="absolute h-full w-1 rounded-full" style={{
                    left: `${(band.mid / 150000) * 100}%`,
                    backgroundColor: CHART_COLORS[i],
                  }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                  <span>£{(band.min / 1000).toFixed(0)}k</span>
                  <span className="font-medium text-slate-700">£{(band.mid / 1000).toFixed(0)}k</span>
                  <span>£{(band.max / 1000).toFixed(0)}k</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('reports.benefitsEnrollment', 'Benefits Enrollment')}>
          <div className="space-y-3">
            {data.benefits.map((b, i) => (
              <ProgressBar key={i} label={b.name} value={b.value} />
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t('reports.salaryDistribution', 'Salary Distribution')}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.distribution.map(d => ({ name: d.range, value: d.count }))} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              formatter={(value) => [`${value} employees`, 'Count']}
            />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-4">
          <div className="text-center px-4 py-2 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t('reports.mean', 'Mean')}</p>
            <p className="text-lg font-bold text-slate-900">£{(data.meanSalary || 34200).toLocaleString()}</p>
          </div>
          <div className="text-center px-4 py-2 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t('reports.median', 'Median')}</p>
            <p className="text-lg font-bold text-slate-900">£{(data.medianSalary || 31500).toLocaleString()}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function MomentumReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.avgMomentumScore', 'Avg Momentum Score')} value={data.avgScore} suffix="/100" icon={Zap} color="violet"
          trend={1} trendLabel="+1pt vs last month" />
        <KPICard label={t('reports.excellentPct', 'Excellent (90+)')} value={data.distribution[0].value} suffix="%" icon={Star} color="emerald" />
        <KPICard label={t('reports.needsImprovement', 'Needs Improvement')} value={data.distribution[3].value} suffix="%" icon={AlertTriangle} color="red" />
        <KPICard label={t('reports.topScore', 'Top Score')} value={data.topPerformers[0]?.score || 0} suffix="/100" icon={Award} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.scoreDistribution', 'Score Distribution')}>
          <DonutChart
            data={data.distribution}
            size={170} thickness={32}
            centerValue={data.avgScore}
            centerLabel={t('reports.average', 'Average')}
          />
        </SectionCard>
        <SectionCard title={t('reports.scoreTrend', 'Score Trend (6 Months)')}>
          <LineChartSVG data={data.trend} color="#8b5cf6" unit="" />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.scoreByLocation', 'Score by Location')}>
          <BarChartHorizontal data={data.byLocation} unit="/100" />
        </SectionCard>
        <SectionCard title={t('reports.scoreByDepartment', 'Score by Department')}>
          <BarChartHorizontal data={data.byDepartment} unit="/100" />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.topPerformers', 'Top 10 Performers')}>
          <DataTable
            columns={[
              { label: '#', mono: true },
              { label: t('reports.employee', 'Employee'), bold: true },
              { label: t('reports.department', 'Department') },
              { label: t('reports.location', 'Location') },
              { label: t('reports.score', 'Score'), align: 'right', mono: true },
            ]}
            rows={data.topPerformers.map((p, i) => [
              i + 1, p.name, p.dept, p.location,
              <span key="s" className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{p.score}</span>,
            ])}
          />
        </SectionCard>

        <SectionCard title={t('reports.scoreVsRetention', 'Momentum Score vs Retention')}
          subtitle={t('reports.scoreVsRetentionDesc', 'Higher scores correlate with longer average tenure')}>
          <div className="space-y-4">
            {data.retentionCorrelation.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-20">{r.scoreRange}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(r.avgTenure / 5) * 100}%`, backgroundColor: CHART_COLORS[i] }} />
                </div>
                <span className="text-sm font-semibold text-slate-900 w-16 text-right">{r.avgTenure} yrs</span>
              </div>
            ))}
            <p className="text-xs text-slate-500 mt-2 italic">{t('reports.correlationNote', 'Employees scoring 90+ stay 6x longer than those below 50.')}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function EngagementReport({ data, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('reports.eNPS', 'eNPS')} value={`+${data.enps}`} icon={Smile} color="orange"
          trend={3} trendLabel="+3 vs last survey" />
        <KPICard label={t('reports.responseRate', 'Response Rate')} value={data.responseRate} suffix="%" icon={Users} color="emerald" />
        <KPICard label={t('reports.topDriver', 'Top Driver')} value={data.drivers[0].score} suffix="/5" icon={Star} color="blue"
          trendLabel={data.drivers[0].name} trend={0} />
        <KPICard label={t('reports.lowestDriver', 'Lowest Driver')} value={data.drivers[data.drivers.length - 1].score} suffix="/5" icon={AlertTriangle} color="red"
          trendLabel={data.drivers[data.drivers.length - 1].name} trend={-1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.keyDrivers', 'Key Engagement Drivers')}>
          <div className="space-y-4">
            {data.drivers.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{d.name}</span>
                  <span className="font-semibold text-slate-900">{d.score}/5</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(d.score / 5) * 100}%`, backgroundColor: '#FF6B35' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('reports.enpsTimeline', 'eNPS Timeline')}>
          <ENPSTimelineChart data={data.trend} />
        </SectionCard>
      </div>

      <SectionCard title={t('reports.engagementByLocation', 'Engagement by Location (eNPS)')}>
        <BarChartHorizontal data={data.byLocation} />
      </SectionCard>

      <SectionCard title={t('reports.actionItems', 'Action Items from Latest Survey')}>
        <DataTable
          columns={[
            { label: t('reports.action', 'Action'), bold: true },
            { label: t('reports.owner', 'Owner') },
            { label: t('reports.priority', 'Priority') },
            { label: t('reports.status', 'Status') },
          ]}
          rows={data.actionItems.map(a => [
            a.action,
            a.owner,
            <span key="p" className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              a.priority === 'High' ? 'bg-red-100 text-red-700' :
              a.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>{a.priority}</span>,
            <span key="s" className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              a.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
              a.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            }`}>{a.status}</span>,
          ])}
        />
      </SectionCard>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Reports() {
  const { t } = useTranslation();
  const { user, isAdmin, isManagerOrAbove, isWorker } = useAuth();
  const { branding } = useBranding();

  const [activeReport, setActiveReport] = useState('headcount');
  const [datePreset, setDatePreset] = useState('this-month');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasEmployees, setHasEmployees] = useState(true);
  const [fetchedReportData, setFetchedReportData] = useState({});

  // Determine data scope
  const isTeamScoped = isManagerOrAbove && !isAdmin;
  const demoData = isTeamScoped ? MANAGER_DEMO : DEMO;

  // Fetch report data from API
  const fetchReportData = useCallback(async (reportId) => {
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get(`/reports/${reportId}`, {
        params: {
          datePreset,
          locationId: filterLocation !== 'all' ? filterLocation : undefined,
          departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
        },
      });
      setFetchedReportData(prev => ({
        ...prev,
        [reportId]: response.data,
      }));
    } catch (err) {
      if (import.meta.env.DEV) console.error(`Failed to fetch ${reportId} report:`, err);
      // Fallback to demo data on error
    } finally {
      setLoading(false);
    }
  }, [datePreset, filterLocation, filterDepartment]);

  useEffect(() => {
    fetchReportData(activeReport);
  }, [activeReport, fetchReportData]);

  // Use fetched data if available, otherwise demo data
  const reportData = useMemo(() => {
    if (DEMO_MODE) return demoData;
    return Object.keys(fetchedReportData).length > 0
      ? { ...demoData, ...fetchedReportData }
      : demoData;
  }, [demoData, fetchedReportData]);

  // Worker restriction
  if (isWorker) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('reports.restricted', 'Access Restricted')}</h2>
          <p className="text-slate-500">{t('reports.restrictedDesc', 'Reports and analytics are available to managers and administrators. Contact your manager for specific data requests.')}</p>
        </div>
      </div>
    );
  }

  // Empty state for organizations with no employee data yet
  // Note: In production, hasEmployees would be fetched from API
  if (!hasEmployees) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('reports.title', 'Reports & Analytics')}</h1>
          <p className="text-slate-600">{t('reports.subtitle', 'Workforce insights and analytics dashboard')}</p>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('reports.noDataYet', 'No report data yet')}</h2>
            <p className="text-slate-500 mb-6">{t('reports.noDataDesc', 'Reports will be available once you have employee data in your organization. Start by adding your first employees.')}</p>
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <UserCheck className="h-5 w-5" />
              {t('reports.addEmployeesFirst', 'Add Employees First')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const activeReportDef = REPORT_DEFS.find(r => r.id === activeReport);
  const ActiveIcon = activeReportDef?.icon || BarChart3;

  const renderReport = () => {
    // Custom reports get a special builder UI
    if (activeReport === 'custom') {
      return <CustomReportsBuilder t={t} />;
    }

    const d = reportData[activeReport];
    if (!d) return null;
    switch (activeReport) {
      case 'headcount': return <HeadcountReport data={d} t={t} />;
      case 'turnover': return <TurnoverReport data={d} t={t} />;
      case 'absence': return <AbsenceReport data={d} t={t} />;
      case 'training': return <TrainingReport data={d} t={t} />;
      case 'overtime': return <OvertimeReport data={d} t={t} />;
      case 'diversity': return <DiversityReport data={d} t={t} />;
      case 'genderPayGap': return <GenderPayGapReport data={d} t={t} />;
      case 'recruitment': return <RecruitmentReport data={d} t={t} />;
      case 'compensation': return <CompensationReport data={d} t={t} />;
      case 'momentum': return <MomentumReport data={d} t={t} />;
      case 'engagement': return <EngagementReport data={d} t={t} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-0 flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-120px)]">
      {/* LEFT SIDEBAR — Report Navigation */}
      <div className={`flex-shrink-0 bg-white border-r border-slate-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} hidden lg:block`}>
        <div className="sticky top-0 p-3">
          <div className="flex items-center justify-between mb-3">
            {!sidebarCollapsed && (
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('reports.reports', 'Reports')}</h2>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-90" />}
            </button>
          </div>

          <nav className="space-y-1">
            {REPORT_DEFS.map(report => {
              const Icon = report.icon;
              const isActive = activeReport === report.id;
              const colorActive = {
                indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                red: 'bg-red-50 text-red-700 border-red-200',
                amber: 'bg-amber-50 text-amber-700 border-amber-200',
                emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                blue: 'bg-blue-50 text-blue-700 border-blue-200',
                pink: 'bg-pink-50 text-pink-700 border-pink-200',
                purple: 'bg-purple-50 text-purple-700 border-purple-200',
                cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                green: 'bg-green-50 text-green-700 border-green-200',
                violet: 'bg-violet-50 text-violet-700 border-violet-200',
                orange: 'bg-orange-50 text-orange-700 border-orange-200',
              };
              return (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    isActive
                      ? colorActive[report.color] || colorActive.indigo
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={sidebarCollapsed ? t(report.labelKey, report.label || report.id) : undefined}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{t(report.labelKey, report.label || report.id)}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* MOBILE TABS */}
      <div className="lg:hidden overflow-x-auto bg-white border-b border-slate-200 px-4 py-2 flex gap-1.5 -mx-4 -mt-4 mb-4">
        {REPORT_DEFS.map(report => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(report.labelKey, report.label || report.id)}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 min-w-0 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            {isTeamScoped && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700 mb-2">
                <Eye className="w-3 h-3" />
                {t('reports.teamReport', 'Team Report')} — {MANAGER_DEMO.teamName} {t('reports.department', 'Department')}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${activeReportDef?.color || 'indigo'}-100`}>
                <ActiveIcon className={`w-5 h-5 text-${activeReportDef?.color || 'indigo'}-600`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t(activeReportDef?.labelKey || 'reports.reports', activeReportDef?.label || 'Report')}</h1>
                <p className="text-sm text-slate-500">
                  {isTeamScoped
                    ? t('reports.teamScopeDesc', 'Showing data for your team only')
                    : t('reports.orgWideDesc', `${branding.brand_name || 'Organization'} — All locations`)
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}>
              <SlidersHorizontal className="w-4 h-4" />
              {t('reports.filters', 'Filters')}
            </button>
            <button onClick={() => setShowSchedule(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Mail className="w-4 h-4" />
              {t('reports.schedule', 'Schedule')}
            </button>
            <ExportDropdown t={t} />
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Date Preset */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">{t('reports.dateRange', 'Date Range')}</label>
                <select value={datePreset} onChange={e => setDatePreset(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {DATE_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{t(p.labelKey, p.id)}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">{t('reports.location', 'Location')}</label>
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                  disabled={isTeamScoped}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400">
                  <option value="all">{t('reports.allLocations', 'All Locations')}</option>
                  {LOCATIONS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">{t('reports.department', 'Department')}</label>
                <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}
                  disabled={isTeamScoped}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400">
                  <option value="all">{t('reports.allDepartments', 'All Departments')}</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">{t('reports.employmentType', 'Employment Type')}</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="all">{t('reports.allTypes', 'All Types')}</option>
                  {EMPLOYMENT_TYPES.map(ty => (
                    <option key={ty} value={ty}>{ty}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date preset chips */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
              {DATE_PRESETS.filter(p => p.id !== 'custom').map(p => (
                <button key={p.id} onClick={() => setDatePreset(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    datePreset === p.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {t(p.labelKey, p.id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Report Content */}
        {loading ? <LoadingSkeleton /> : renderReport()}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>{t('reports.generatedAt', 'Report generated')}: {new Date().toLocaleString()}</span>
          <span>{t('reports.dataNote', 'Data refreshed every 15 minutes')}</span>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} t={t} />}
    </div>
  );
}

// ============================================================
// CUSTOM REPORTS BUILDER
// ============================================================

const DATA_SOURCES = [
  { id: 'employees', label: 'Employees', columns: ['name', 'department', 'location', 'role', 'employment_type', 'start_date', 'tenure_months', 'salary', 'status', 'country', 'manager'] },
  { id: 'time_entries', label: 'Time Entries', columns: ['employee_name', 'date', 'clock_in', 'clock_out', 'total_hours', 'overtime_hours', 'location', 'method', 'status'] },
  { id: 'expenses', label: 'Expenses', columns: ['employee_name', 'date', 'description', 'category', 'amount', 'status', 'approved_by', 'receipt_attached'] },
  { id: 'payroll', label: 'Payroll', columns: ['employee_name', 'period', 'gross_pay', 'tax', 'ni', 'pension', 'net_pay', 'employer_ni', 'employer_pension', 'total_cost'] },
  { id: 'skills', label: 'Skills', columns: ['employee_name', 'skill_name', 'level', 'verified', 'verified_by', 'expiry_date', 'status'] },
  { id: 'performance', label: 'Performance', columns: ['employee_name', 'review_cycle', 'score', 'reviewer', 'goals_completed', 'goals_total'] },
  { id: 'time_off', label: 'Time Off', columns: ['employee_name', 'type', 'start_date', 'end_date', 'days', 'status', 'approved_by'] },
  { id: 'training', label: 'Training', columns: ['employee_name', 'course_name', 'status', 'completion_date', 'score', 'mandatory'] },
  { id: 'shifts', label: 'Shifts', columns: ['employee_name', 'date', 'start_time', 'end_time', 'location', 'role', 'status', 'actual_start', 'actual_end'] },
  { id: 'csv_upload', label: 'CSV/Excel Upload', columns: [], isUpload: true },
  { id: 'api', label: 'Connect API', columns: [], isApi: true },
];

const GROUP_BY_OPTIONS = [
  { id: 'none', label: 'None (flat table)' },
  { id: 'department', label: 'Department' },
  { id: 'location', label: 'Location' },
  { id: 'role', label: 'Role' },
  { id: 'country', label: 'Country' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

const VIZ_OPTIONS = [
  { id: 'table', label: 'Table', icon: '📊' },
  { id: 'bar', label: 'Bar Chart', icon: '📶' },
  { id: 'line', label: 'Line Chart', icon: '📈' },
  { id: 'pie', label: 'Pie / Donut', icon: '🥧' },
];

function CustomReportsBuilder({ t }) {
  const [savedReports, setSavedReports] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Builder state
  const [dataSource, setDataSource] = useState('');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [groupBy, setGroupBy] = useState('none');
  const [visualization, setVisualization] = useState('table');
  const [reportName, setReportName] = useState('');

  // CSV/Excel upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedColumns, setUploadedColumns] = useState([]);
  const [uploadedData, setUploadedData] = useState([]);

  // API data source state
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiHeaders, setApiHeaders] = useState([{ key: 'Authorization', value: 'Bearer token' }]);
  const [apiAuth, setApiAuth] = useState('none');
  const [apiResponseFormat, setApiResponseFormat] = useState('JSON');
  const [apiJsonPath, setApiJsonPath] = useState('');
  const [apiTestStatus, setApiTestStatus] = useState(null); // 'testing' | 'success' | 'error'
  const [apiPreviewData, setApiPreviewData] = useState(null);
  const [apiColumns, setApiColumns] = useState([]);

  // Results
  const [results, setResults] = useState(null);

  // Edit mode
  const [editingReport, setEditingReport] = useState(null);

  // Handle CSV/Excel file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;
      // Parse CSV (simple parser for comma-separated values)
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) return;

      // First line is headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setUploadedColumns(headers);

      // Parse data rows
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });
      setUploadedData(data);
      setSelectedColumns([]);
    };

    reader.readAsText(file);
  };

  // API data source handlers
  const handleAddApiHeader = () => {
    setApiHeaders([...apiHeaders, { key: '', value: '' }]);
  };

  const handleRemoveApiHeader = (index) => {
    setApiHeaders(apiHeaders.filter((_, i) => i !== index));
  };

  const handleApiHeaderChange = (index, field, value) => {
    const updated = [...apiHeaders];
    updated[index][field] = value;
    setApiHeaders(updated);
  };

  const handleTestConnection = async () => {
    setApiTestStatus('testing');
    if (DEMO_MODE) {
      // Simulate API test in demo mode
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiTestStatus('success');
      return;
    }
    try {
      // In real mode, would actually test the connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiTestStatus('success');
    } catch (err) {
      setApiTestStatus('error');
    }
  };

  const handlePreviewApiData = async () => {
    setApiTestStatus('testing');
    if (DEMO_MODE) {
      // Simulate API preview with sample data
      await new Promise(resolve => setTimeout(resolve, 1200));
      const sampleData = [
        { id: 1, name: 'John Smith', department: 'Production', salary: 32000, status: 'Active' },
        { id: 2, name: 'Sarah Johnson', department: 'Quality Control', salary: 34500, status: 'Active' },
        { id: 3, name: 'Mike Williams', department: 'Engineering', salary: 42000, status: 'Active' },
        { id: 4, name: 'Emma Davis', department: 'HR', salary: 38000, status: 'Active' },
        { id: 5, name: 'Robert Brown', department: 'Sales', salary: 36000, status: 'On Leave' },
      ];
      setApiPreviewData(sampleData);
      setApiColumns(Object.keys(sampleData[0]));
      setApiTestStatus('success');
      return;
    }
    try {
      // In real mode, would fetch from the actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiTestStatus('success');
    } catch (err) {
      setApiTestStatus('error');
    }
  };

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    try {
      const result = await api.get('/reports/custom');
      setSavedReports(result.reports || []);
    } catch (err) {
      // No saved reports yet
    } finally {
      setLoading(false);
    }
  };

  const availableColumns = dataSource === 'csv_upload'
    ? uploadedColumns
    : dataSource === 'api'
      ? apiColumns
      : DATA_SOURCES.find(ds => ds.id === dataSource)?.columns || [];

  const toggleColumn = (col) => {
    setSelectedColumns(prev =>
      prev.includes(col)
        ? prev.filter(c => c !== col)
        : [...prev, col]
    );
  };

  const handleRun = async () => {
    if (!dataSource || selectedColumns.length === 0) return;
    setRunning(true);
    try {
      // Handle API data locally
      if (dataSource === 'api' && apiPreviewData && apiPreviewData.length > 0) {
        const filteredData = apiPreviewData.map(row => {
          const filteredRow = {};
          selectedColumns.forEach(col => {
            filteredRow[col] = row[col];
          });
          return filteredRow;
        });
        setResults({
          columns: selectedColumns,
          rows: filteredData,
          data: filteredData,
          row_count: filteredData.length,
          total: filteredData.length,
        });
        setRunning(false);
        return;
      }

      // Handle uploaded CSV data locally
      if (dataSource === 'csv_upload' && uploadedData.length > 0) {
        const filteredData = uploadedData.map(row => {
          const filteredRow = {};
          selectedColumns.forEach(col => {
            filteredRow[col] = row[col];
          });
          return filteredRow;
        });
        setResults({
          columns: selectedColumns,
          rows: filteredData,
          total: filteredData.length,
        });
        setRunning(false);
        return;
      }

      const result = await api.post('/reports/custom/run', {
        data_source: dataSource,
        columns: selectedColumns,
        filters: {
          date_start: dateStart || undefined,
          date_end: dateEnd || undefined,
        },
        group_by: groupBy !== 'none' ? groupBy : undefined,
        visualization,
      });
      setResults(result);
    } catch (err) {
      console.error('Failed to run report:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async () => {
    if (!reportName.trim() || !dataSource) return;
    setSaving(true);
    try {
      const config = {
        data_source: dataSource,
        columns: selectedColumns,
        filters: { date_start: dateStart, date_end: dateEnd },
        group_by: groupBy !== 'none' ? groupBy : undefined,
        visualization,
      };

      if (editingReport) {
        await api.put(`/reports/custom/${editingReport.id}`, { name: reportName, config });
      } else {
        await api.post('/reports/custom/save', { name: reportName, config });
      }
      await loadSavedReports();
      resetBuilder();
    } catch (err) {
      console.error('Failed to save report:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('reports.custom.confirmDelete', 'Delete this report?'))) return;
    try {
      await api.delete(`/reports/custom/${id}`);
      await loadSavedReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  const handleLoadReport = (report) => {
    setEditingReport(report);
    setDataSource(report.config.data_source);
    setSelectedColumns(report.config.columns || []);
    setDateStart(report.config.filters?.date_start || '');
    setDateEnd(report.config.filters?.date_end || '');
    setGroupBy(report.config.group_by || 'none');
    setVisualization(report.config.visualization || 'table');
    setReportName(report.name);
    setShowBuilder(true);
    setResults(null);
  };

  const handleExportCSV = () => {
    if (!results?.data) return;
    const headers = results.columns.join(',');
    const rows = results.data.map(row =>
      results.columns.map(col => {
        const val = row[col];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName || 'report'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!results?.data) return;
    // Create HTML table for Excel-compatible download
    const table = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body><table border="1">
        <tr>${results.columns.map(col => `<th style="background:#f1f5f9;font-weight:bold">${col.replace(/_/g, ' ')}</th>`).join('')}</tr>
        ${results.data.map(row => `<tr>${results.columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`).join('')}
      </table></body></html>
    `;
    const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName || 'report'}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetBuilder = () => {
    setShowBuilder(false);
    setEditingReport(null);
    setDataSource('');
    setSelectedColumns([]);
    setDateStart('');
    setDateEnd('');
    setGroupBy('none');
    setVisualization('table');
    setReportName('');
    setResults(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {editingReport ? t('reports.custom.editReport', 'Edit Report') : t('reports.custom.createReport', 'Create Report')}
            </h2>
            <p className="text-sm text-slate-500">{t('reports.custom.builderDesc', 'Build a custom report by selecting data source, columns, and filters')}</p>
          </div>
          <button onClick={resetBuilder} className="btn btn-ghost">
            <X className="w-4 h-4" /> {t('common.cancel', 'Cancel')}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Data Source */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="font-medium text-slate-800 mb-3">{t('reports.custom.step1', '1. Data Source')}</h3>
              <select value={dataSource} onChange={(e) => { setDataSource(e.target.value); setSelectedColumns([]); setUploadedFile(null); setUploadedColumns([]); setUploadedData([]); setApiPreviewData(null); setApiColumns([]); setApiTestStatus(null); }} className="input w-full">
                <option value="">{t('reports.custom.selectSource', 'Select a data source...')}</option>
                {DATA_SOURCES.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.label}</option>
                ))}
              </select>

              {/* File upload section for CSV/Excel */}
              {dataSource === 'csv_upload' && (
                <div className="mt-4 p-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <label className="cursor-pointer">
                      <span className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        {uploadedFile ? uploadedFile.name : t('reports.custom.uploadFile', 'Upload CSV or Excel file')}
                      </span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-1">{t('reports.custom.fileTypes', 'Supports .csv, .xlsx, .xls files')}</p>
                    {uploadedFile && uploadedColumns.length > 0 && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          {t('reports.custom.fileLoaded', '{{rows}} rows, {{cols}} columns detected', { rows: uploadedData.length, cols: uploadedColumns.length })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* API configuration section */}
              {dataSource === 'api' && (
                <div className="mt-4 space-y-4">
                  {/* API Endpoint URL */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.apiEndpoint', 'API Endpoint URL')}</label>
                    <input
                      type="url"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://api.example.com/data"
                      className="input w-full"
                    />
                  </div>

                  {/* Method */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.apiMethod', 'Method')}</label>
                      <select value={apiMethod} onChange={(e) => setApiMethod(e.target.value)} className="input w-full">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.apiAuth', 'Authentication')}</label>
                      <select value={apiAuth} onChange={(e) => setApiAuth(e.target.value)} className="input w-full">
                        <option value="none">{t('reports.custom.authNone', 'None')}</option>
                        <option value="bearer">{t('reports.custom.authBearer', 'Bearer Token')}</option>
                        <option value="apikey">{t('reports.custom.authApiKey', 'API Key')}</option>
                        <option value="basic">{t('reports.custom.authBasic', 'Basic Auth')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Headers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">{t('reports.custom.apiHeaders', 'Headers')}</label>
                      <button onClick={handleAddApiHeader} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                        + {t('reports.custom.addHeader', 'Add Header')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {apiHeaders.map((header, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={header.key}
                            onChange={(e) => handleApiHeaderChange(index, 'key', e.target.value)}
                            placeholder={t('reports.headerName', 'Header name')}
                            className="input flex-1"
                          />
                          <input
                            type="text"
                            value={header.value}
                            onChange={(e) => handleApiHeaderChange(index, 'value', e.target.value)}
                            placeholder={t('common.value', 'Value')}
                            className="input flex-1"
                          />
                          {apiHeaders.length > 1 && (
                            <button onClick={() => handleRemoveApiHeader(index)} className="btn btn-ghost px-2">
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Response format and JSON path */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.responseFormat', 'Response Format')}</label>
                      <select value={apiResponseFormat} onChange={(e) => setApiResponseFormat(e.target.value)} className="input w-full">
                        <option value="JSON">JSON</option>
                        <option value="CSV">CSV</option>
                      </select>
                    </div>
                    {apiResponseFormat === 'JSON' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.jsonPath', 'JSON Path to Data')}</label>
                        <input
                          type="text"
                          value={apiJsonPath}
                          onChange={(e) => setApiJsonPath(e.target.value)}
                          placeholder="$.data or $.results"
                          className="input w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Test & Preview buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={!apiEndpoint || apiTestStatus === 'testing'}
                      className="btn btn-secondary flex-1"
                    >
                      {apiTestStatus === 'testing' ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> {t('reports.custom.testing', 'Testing...')}</>
                      ) : (
                        <><Zap className="w-4 h-4" /> {t('reports.custom.testConnection', 'Test Connection')}</>
                      )}
                    </button>
                    <button
                      onClick={handlePreviewApiData}
                      disabled={!apiEndpoint || apiTestStatus === 'testing'}
                      className="btn btn-secondary flex-1"
                    >
                      <Eye className="w-4 h-4" /> {t('reports.custom.previewData', 'Preview Data')}
                    </button>
                  </div>

                  {/* Status messages */}
                  {apiTestStatus === 'success' && !apiPreviewData && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {t('reports.custom.connectionSuccess', 'Connection successful!')}
                      </p>
                    </div>
                  )}
                  {apiTestStatus === 'error' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {t('reports.custom.connectionError', 'Connection failed. Please check your settings.')}
                      </p>
                    </div>
                  )}

                  {/* Preview data table */}
                  {apiPreviewData && apiPreviewData.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                        <p className="text-sm font-medium text-slate-700">
                          {t('reports.custom.previewRows', 'Preview (first 5 rows)')}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              {apiColumns.map(col => (
                                <th key={col} className="text-left py-2 px-3 font-medium text-slate-600">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {apiPreviewData.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                {apiColumns.map(col => (
                                  <td key={col} className="py-2 px-3 text-slate-600">{row[col] ?? '-'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Columns */}
            {dataSource && (dataSource !== 'csv_upload' || uploadedColumns.length > 0) && (dataSource !== 'api' || apiColumns.length > 0) && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-800 mb-3">{t('reports.custom.step2', '2. Columns')}</h3>
                <div className="flex flex-wrap gap-2">
                  {availableColumns.map(col => (
                    <button key={col} onClick={() => toggleColumn(col)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedColumns.includes(col) ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                      }`}>
                      {col.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Filters */}
            {dataSource && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-800 mb-3">{t('reports.custom.step3', '3. Filters')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.dateFrom', 'Date From')}</label>
                    <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.dateTo', 'Date To')}</label>
                    <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="input w-full" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Group By */}
            {dataSource && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-800 mb-3">{t('reports.custom.step4', '4. Group By')}</h3>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input w-full">
                  {GROUP_BY_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 5: Visualization */}
            {dataSource && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-800 mb-3">{t('reports.custom.step5', '5. Visualization')}</h3>
                <div className="flex gap-2">
                  {VIZ_OPTIONS.map(viz => (
                    <button key={viz.id} onClick={() => setVisualization(viz.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        visualization === viz.id ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                      }`}>
                      <span>{viz.icon}</span> {viz.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="font-medium text-slate-800 mb-3">{t('reports.custom.actions', 'Actions')}</h3>
              <div className="space-y-3">
                <button onClick={handleRun} disabled={running || !dataSource || selectedColumns.length === 0} className="btn btn-primary w-full">
                  {running ? t('reports.custom.running', 'Running...') : t('reports.custom.runReport', 'Run Report')}
                </button>
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.custom.reportName', 'Report Name')}</label>
                  <input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="e.g. Monthly Headcount" className="input w-full mb-2" />
                  <button onClick={handleSave} disabled={saving || !reportName.trim() || !dataSource} className="btn btn-secondary w-full">
                    {saving ? t('common.saving', 'Saving...') : t('reports.custom.saveReport', 'Save Report')}
                  </button>
                </div>
                {results && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">{t('reports.custom.export', 'Export')}</p>
                    <button onClick={handleExportCSV} className="btn btn-ghost w-full justify-start">
                      <Download className="w-4 h-4" /> {t('reports.custom.exportCSV', 'Export CSV')}
                    </button>
                    <button onClick={handleExportExcel} className="btn btn-ghost w-full justify-start">
                      <FileSpreadsheet className="w-4 h-4" /> {t('reports.custom.exportExcel', 'Export Excel')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-800">{t('reports.custom.results', 'Results')}</h3>
              <span className="text-sm text-slate-500">{results.row_count} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {results.columns.map(col => (
                      <th key={col} className="text-left py-2 px-3 font-medium text-slate-700 bg-slate-50">{col.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      {results.columns.map(col => (
                        <td key={col} className="py-2 px-3 text-slate-600">{row[col] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.data.length > 50 && (
                <p className="text-sm text-slate-500 mt-2 text-center">Showing first 50 of {results.data.length} rows</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Saved reports list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('reports.custom.title', 'Custom Reports')}</h2>
          <p className="text-sm text-slate-500">{t('reports.custom.desc', 'Build and save custom reports with flexible data selection')}</p>
        </div>
        <button onClick={() => setShowBuilder(true)} className="btn btn-primary">
          <BarChart3 className="w-4 h-4" /> {t('reports.custom.createReport', 'Create Report')}
        </button>
      </div>

      {savedReports.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">{t('reports.custom.noReports', 'No custom reports yet')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {savedReports.map(report => (
            <div key={report.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{report.name}</h3>
                  <p className="text-sm text-slate-500">
                    {DATA_SOURCES.find(ds => ds.id === report.config.data_source)?.label || report.config.data_source}
                    {report.config.columns?.length > 0 && ` • ${report.config.columns.length} columns`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleLoadReport(report)} className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  {t('common.open', 'Open')}
                </button>
                <button onClick={() => handleDelete(report.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowBuilder(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center z-40 group"
        title={t('reports.custom.createReport', 'Create Report')}
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
}
