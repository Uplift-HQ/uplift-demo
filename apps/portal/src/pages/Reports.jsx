// ============================================================
// REPORTS & ANALYTICS PAGE
// Enterprise BI dashboard — 10 pre-built reports
// Grand Metropolitan Hotel Group (5 locations)
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
  Shield, UserCheck, Smile, Star, BookOpen, Zap
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

const LOCATIONS = [
  { id: 'london', name: 'London Mayfair', flag: 'GB' },
  { id: 'paris', name: 'Paris Champs-Elysees', flag: 'FR' },
  { id: 'dubai', name: 'Dubai Marina', flag: 'AE' },
  { id: 'newyork', name: 'New York Central Park', flag: 'US' },
  { id: 'tokyo', name: 'Tokyo Ginza', flag: 'JP' },
];

const DEPARTMENTS = [
  'Front of House', 'Kitchen', 'Housekeeping', 'Bar', 'Concierge',
  'Spa', 'Events', 'Management', 'Security', 'Engineering',
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
  { id: 'recruitment', labelKey: 'reports.recruitment', icon: Briefcase, color: 'cyan' },
  { id: 'compensation', labelKey: 'reports.compensation', icon: DollarSign, color: 'green' },
  { id: 'momentum', labelKey: 'reports.momentumScores', icon: Zap, color: 'violet' },
  { id: 'engagement', labelKey: 'reports.engagement', icon: Smile, color: 'orange' },
];

// ============================================================
// DEMO DATA — ORG-WIDE (Admin view)
// ============================================================

const DEMO = {
  // ----- 1. HEADCOUNT -----
  headcount: {
    total: 234,
    byLocation: [
      { name: 'London Mayfair', value: 78 },
      { name: 'Paris Champs-Elysees', value: 52 },
      { name: 'Dubai Marina', value: 38 },
      { name: 'New York Central Park', value: 34 },
      { name: 'Tokyo Ginza', value: 32 },
    ],
    byDepartment: [
      { name: 'Front of House', value: 45 },
      { name: 'Kitchen', value: 38 },
      { name: 'Housekeeping', value: 35 },
      { name: 'Bar', value: 28 },
      { name: 'Concierge', value: 22 },
      { name: 'Events', value: 20 },
      { name: 'Spa', value: 18 },
      { name: 'Management', value: 15 },
      { name: 'Security', value: 8 },
      { name: 'Engineering', value: 5 },
    ],
    byType: [
      { name: 'Full-time', value: 178 },
      { name: 'Part-time', value: 42 },
      { name: 'Contract', value: 14 },
    ],
    trend: [
      { month: 'Mar', value: 218 }, { month: 'Apr', value: 220 },
      { month: 'May', value: 222 }, { month: 'Jun', value: 219 },
      { month: 'Jul', value: 224 }, { month: 'Aug', value: 226 },
      { month: 'Sep', value: 225 }, { month: 'Oct', value: 228 },
      { month: 'Nov', value: 230 }, { month: 'Dec', value: 229 },
      { month: 'Jan', value: 231 }, { month: 'Feb', value: 234 },
    ],
    newHires: 8,
    departures: 3,
    netChange: 5,
  },

  // ----- 2. TURNOVER -----
  turnover: {
    monthlyRate: 2.1,
    annualizedRate: 25.2,
    byDepartment: [
      { name: 'Kitchen', value: 3.5 },
      { name: 'Bar', value: 2.8 },
      { name: 'Front of House', value: 1.8 },
      { name: 'Housekeeping', value: 1.5 },
      { name: 'Concierge', value: 1.2 },
      { name: 'Events', value: 1.0 },
      { name: 'Spa', value: 0.9 },
      { name: 'Security', value: 0.7 },
      { name: 'Engineering', value: 0.6 },
      { name: 'Management', value: 0.5 },
    ],
    voluntaryPct: 78,
    involuntaryPct: 22,
    costPerReplacement: 8500,
    avgTenureAtDeparture: 1.9,
    firstYearTurnover: 35,
    trend: [
      { month: 'Mar', value: 2.4 }, { month: 'Apr', value: 2.6 },
      { month: 'May', value: 2.3 }, { month: 'Jun', value: 2.8 },
      { month: 'Jul', value: 2.5 }, { month: 'Aug', value: 2.2 },
      { month: 'Sep', value: 1.9 }, { month: 'Oct', value: 2.0 },
      { month: 'Nov', value: 1.8 }, { month: 'Dec', value: 2.3 },
      { month: 'Jan', value: 1.7 }, { month: 'Feb', value: 2.1 },
    ],
  },

  // ----- 3. ABSENCE -----
  absence: {
    overallRate: 3.8,
    bradfordTop10: [
      { name: 'James Whitfield', score: 486, pattern: '6 instances / 12 days', dept: 'Kitchen' },
      { name: 'Priya Sharma', score: 324, pattern: '4 instances / 9 days', dept: 'Housekeeping' },
      { name: 'Oliver Bennett', score: 256, pattern: '4 instances / 8 days', dept: 'Bar' },
      { name: 'Sophie Laurent', score: 225, pattern: '3 instances / 9 days', dept: 'Front of House' },
      { name: 'Kaito Yamada', score: 196, pattern: '4 instances / 7 days', dept: 'Kitchen' },
      { name: 'Emily Richards', score: 169, pattern: '3 instances / 7 days', dept: 'Spa' },
      { name: 'Ahmed Al-Rashid', score: 144, pattern: '3 instances / 6 days', dept: 'Concierge' },
      { name: 'Liam O\'Connor', score: 121, pattern: '2 instances / 6 days', dept: 'Bar' },
      { name: 'Maria Garcia', score: 100, pattern: '2 instances / 5 days', dept: 'Events' },
      { name: 'Chen Wei', score: 81, pattern: '3 instances / 3 days', dept: 'Front of House' },
    ],
    byType: [
      { name: 'Sick leave', value: 52 },
      { name: 'Annual leave', value: 35 },
      { name: 'Personal', value: 8 },
      { name: 'Other', value: 5 },
    ],
    mondayFriday: { monday: 18.2, friday: 14.6, other: 67.2 },
    byDepartment: [
      { name: 'Kitchen', value: 5.2 },
      { name: 'Bar', value: 4.8 },
      { name: 'Housekeeping', value: 4.1 },
      { name: 'Front of House', value: 3.5 },
      { name: 'Events', value: 3.2 },
      { name: 'Concierge', value: 3.0 },
      { name: 'Spa', value: 2.8 },
      { name: 'Security', value: 2.5 },
      { name: 'Engineering', value: 2.2 },
      { name: 'Management', value: 1.8 },
    ],
    trend: [
      { month: 'Mar', value: 4.1 }, { month: 'Apr', value: 3.9 },
      { month: 'May', value: 3.5 }, { month: 'Jun', value: 3.3 },
      { month: 'Jul', value: 3.6 }, { month: 'Aug', value: 4.0 },
      { month: 'Sep', value: 3.7 }, { month: 'Oct', value: 3.4 },
      { month: 'Nov', value: 3.9 }, { month: 'Dec', value: 4.5 },
      { month: 'Jan', value: 4.2 }, { month: 'Feb', value: 3.8 },
    ],
  },

  // ----- 4. TRAINING COMPLIANCE -----
  training: {
    overallCompliance: 91,
    byCourse: [
      { name: 'H&S Induction', value: 100 },
      { name: 'Fire Safety', value: 95 },
      { name: 'Allergen Awareness', value: 94 },
      { name: 'Food Hygiene', value: 93 },
      { name: 'GDPR', value: 92 },
      { name: 'COSHH', value: 90 },
      { name: 'Anti-Bribery', value: 89 },
      { name: 'Manual Handling', value: 88 },
      { name: 'EDI', value: 87 },
      { name: 'First Aid', value: 85 },
    ],
    byLocation: [
      { name: 'Tokyo Ginza', value: 94 },
      { name: 'London Mayfair', value: 93 },
      { name: 'New York Central Park', value: 92 },
      { name: 'Paris Champs-Elysees', value: 90 },
      { name: 'Dubai Marina', value: 88 },
    ],
    overdueItems: 18,
    overdueEmployees: 14,
    expiringIn30: 23,
    overdueList: [
      { employee: 'James Whitfield', course: 'First Aid', dueDate: '2026-01-05', dept: 'Kitchen', location: 'London Mayfair' },
      { employee: 'Priya Sharma', course: 'Manual Handling', dueDate: '2026-01-10', dept: 'Housekeeping', location: 'Dubai Marina' },
      { employee: 'Oliver Bennett', course: 'EDI', dueDate: '2026-01-12', dept: 'Bar', location: 'Paris Champs-Elysees' },
      { employee: 'Sophie Laurent', course: 'COSHH', dueDate: '2026-01-15', dept: 'Front of House', location: 'Paris Champs-Elysees' },
      { employee: 'Kaito Yamada', course: 'Anti-Bribery', dueDate: '2026-01-18', dept: 'Kitchen', location: 'Tokyo Ginza' },
      { employee: 'Emily Richards', course: 'First Aid', dueDate: '2026-01-20', dept: 'Spa', location: 'London Mayfair' },
      { employee: 'Ahmed Al-Rashid', course: 'Manual Handling', dueDate: '2026-01-22', dept: 'Concierge', location: 'Dubai Marina' },
      { employee: 'Chen Wei', course: 'EDI', dueDate: '2026-01-25', dept: 'Front of House', location: 'New York Central Park' },
    ],
  },

  // ----- 5. OVERTIME -----
  overtime: {
    totalHours: 487,
    totalCost: 12175,
    overtimePctOfTotal: 8.2,
    topEmployees: [
      { name: 'Marcus Bellini', hours: 38, dept: 'Kitchen', location: 'London Mayfair' },
      { name: 'Sofia Rodriguez', hours: 34, dept: 'Events', location: 'New York Central Park' },
      { name: 'Takeshi Mori', hours: 31, dept: 'Kitchen', location: 'Tokyo Ginza' },
      { name: 'Pierre Dubois', hours: 28, dept: 'Bar', location: 'Paris Champs-Elysees' },
      { name: 'Aisha Malik', hours: 26, dept: 'Front of House', location: 'Dubai Marina' },
      { name: 'David Thompson', hours: 24, dept: 'Events', location: 'London Mayfair' },
      { name: 'Yuki Tanaka', hours: 22, dept: 'Front of House', location: 'Tokyo Ginza' },
      { name: 'Jean-Luc Martin', hours: 21, dept: 'Kitchen', location: 'Paris Champs-Elysees' },
      { name: 'Rachel Kim', hours: 19, dept: 'Housekeeping', location: 'New York Central Park' },
      { name: 'Hassan Al-Farsi', hours: 18, dept: 'Concierge', location: 'Dubai Marina' },
    ],
    byDepartment: [
      { name: 'Kitchen', value: 142 },
      { name: 'Events', value: 98 },
      { name: 'Front of House', value: 82 },
      { name: 'Bar', value: 56 },
      { name: 'Housekeeping', value: 44 },
      { name: 'Concierge', value: 28 },
      { name: 'Spa', value: 18 },
      { name: 'Security', value: 12 },
      { name: 'Management', value: 5 },
      { name: 'Engineering', value: 2 },
    ],
    trend: [
      { month: 'Sep', value: 412 }, { month: 'Oct', value: 445 },
      { month: 'Nov', value: 510 }, { month: 'Dec', value: 580 },
      { month: 'Jan', value: 465 }, { month: 'Feb', value: 487 },
    ],
  },

  // ----- 6. DIVERSITY -----
  diversity: {
    gender: [
      { name: 'Male', value: 52 },
      { name: 'Female', value: 44 },
      { name: 'Non-binary', value: 2 },
      { name: 'Prefer not to say', value: 2 },
    ],
    age: [
      { name: '18-24', value: 22 },
      { name: '25-34', value: 38 },
      { name: '35-44', value: 25 },
      { name: '45-54', value: 12 },
      { name: '55+', value: 3 },
    ],
    tenure: [
      { name: '<1 year', value: 28 },
      { name: '1-3 years', value: 35 },
      { name: '3-5 years', value: 22 },
      { name: '5-10 years', value: 12 },
      { name: '10+ years', value: 3 },
    ],
    genderBySeniority: [
      { level: 'Executive', male: 60, female: 35, other: 5 },
      { level: 'Senior Manager', male: 55, female: 40, other: 5 },
      { level: 'Manager', male: 52, female: 44, other: 4 },
      { level: 'Team Lead', male: 50, female: 46, other: 4 },
      { level: 'Individual Contributor', male: 51, female: 45, other: 4 },
    ],
  },

  // ----- 7. RECRUITMENT -----
  recruitment: {
    openPositions: 12,
    avgTimeToFill: 28,
    costPerHire: 2400,
    bySource: [
      { name: 'Job Boards', value: 40 },
      { name: 'Referrals', value: 25 },
      { name: 'Agency', value: 20 },
      { name: 'Career Site', value: 15 },
    ],
    byStage: [
      { name: 'Sourcing', value: 3, color: '#6366f1' },
      { name: 'Screening', value: 4, color: '#3b82f6' },
      { name: 'Interview', value: 3, color: '#f97316' },
      { name: 'Offer', value: 2, color: '#10b981' },
    ],
    openRoles: [
      { title: 'Senior Chef de Partie', location: 'London Mayfair', dept: 'Kitchen', stage: 'Interview', daysOpen: 18 },
      { title: 'Night Receptionist', location: 'Paris Champs-Elysees', dept: 'Front of House', stage: 'Screening', daysOpen: 12 },
      { title: 'Spa Therapist', location: 'Dubai Marina', dept: 'Spa', stage: 'Sourcing', daysOpen: 5 },
      { title: 'Events Coordinator', location: 'New York Central Park', dept: 'Events', stage: 'Offer', daysOpen: 32 },
      { title: 'Head Bartender', location: 'Tokyo Ginza', dept: 'Bar', stage: 'Interview', daysOpen: 22 },
      { title: 'Housekeeping Supervisor', location: 'London Mayfair', dept: 'Housekeeping', stage: 'Screening', daysOpen: 8 },
      { title: 'Concierge', location: 'Dubai Marina', dept: 'Concierge', stage: 'Screening', daysOpen: 10 },
      { title: 'Commis Chef', location: 'Paris Champs-Elysees', dept: 'Kitchen', stage: 'Sourcing', daysOpen: 3 },
      { title: 'Security Officer', location: 'New York Central Park', dept: 'Security', stage: 'Interview', daysOpen: 25 },
      { title: 'Front Desk Agent', location: 'Tokyo Ginza', dept: 'Front of House', stage: 'Screening', daysOpen: 14 },
      { title: 'Maintenance Technician', location: 'London Mayfair', dept: 'Engineering', stage: 'Sourcing', daysOpen: 2 },
      { title: 'Banquet Server', location: 'New York Central Park', dept: 'Events', stage: 'Offer', daysOpen: 28 },
    ],
  },

  // ----- 8. COMPENSATION -----
  compensation: {
    avgSalary: 32400,
    salaryBands: [
      { level: 'Executive', min: 85000, mid: 110000, max: 140000 },
      { level: 'Senior Manager', min: 55000, mid: 68000, max: 82000 },
      { level: 'Manager', min: 38000, mid: 46000, max: 55000 },
      { level: 'Team Lead', min: 30000, mid: 36000, max: 42000 },
      { level: 'Individual Contributor', min: 22000, mid: 28000, max: 35000 },
    ],
    genderPayGap: -3.2,
    budgetUtilization: 94,
    benefits: [
      { name: 'Health Insurance', value: 92 },
      { name: 'Pension', value: 88 },
      { name: 'Life Insurance', value: 76 },
      { name: 'Dental', value: 68 },
      { name: 'Gym Membership', value: 45 },
    ],
    distribution: [
      { range: '18-22k', count: 28 },
      { range: '22-26k', count: 45 },
      { range: '26-30k', count: 52 },
      { range: '30-35k', count: 41 },
      { range: '35-42k', count: 32 },
      { range: '42-55k', count: 22 },
      { range: '55-70k', count: 10 },
      { range: '70k+', count: 4 },
    ],
  },

  // ----- 9. MOMENTUM SCORES -----
  momentum: {
    avgScore: 78,
    distribution: [
      { name: 'Excellent (90+)', value: 15, color: '#10b981' },
      { name: 'Good (70-89)', value: 52, color: '#3b82f6' },
      { name: 'Fair (50-69)', value: 28, color: '#f97316' },
      { name: 'Needs Improvement (<50)', value: 5, color: '#ef4444' },
    ],
    byLocation: [
      { name: 'Tokyo Ginza', value: 84 },
      { name: 'London Mayfair', value: 81 },
      { name: 'New York Central Park', value: 78 },
      { name: 'Paris Champs-Elysees', value: 76 },
      { name: 'Dubai Marina', value: 73 },
    ],
    byDepartment: [
      { name: 'Management', value: 88 },
      { name: 'Events', value: 82 },
      { name: 'Concierge', value: 81 },
      { name: 'Spa', value: 80 },
      { name: 'Front of House', value: 78 },
      { name: 'Engineering', value: 77 },
      { name: 'Security', value: 76 },
      { name: 'Bar', value: 74 },
      { name: 'Housekeeping', value: 72 },
      { name: 'Kitchen', value: 70 },
    ],
    topPerformers: [
      { name: 'Elena Vasquez', score: 97, dept: 'Concierge', location: 'New York Central Park' },
      { name: 'Hiroshi Nakamura', score: 96, dept: 'Management', location: 'Tokyo Ginza' },
      { name: 'Charlotte Beaumont', score: 95, dept: 'Events', location: 'Paris Champs-Elysees' },
      { name: 'Sarah Mitchell', score: 94, dept: 'Front of House', location: 'London Mayfair' },
      { name: 'Omar Al-Hassan', score: 93, dept: 'Spa', location: 'Dubai Marina' },
      { name: 'Anna Kowalski', score: 93, dept: 'Management', location: 'London Mayfair' },
      { name: 'Ryu Watanabe', score: 92, dept: 'Front of House', location: 'Tokyo Ginza' },
      { name: 'Michael Torres', score: 91, dept: 'Events', location: 'New York Central Park' },
      { name: 'Fatima Noor', score: 91, dept: 'Concierge', location: 'Dubai Marina' },
      { name: 'Lucas Moreau', score: 90, dept: 'Bar', location: 'Paris Champs-Elysees' },
    ],
    trend: [
      { month: 'Sep', value: 74 }, { month: 'Oct', value: 75 },
      { month: 'Nov', value: 76 }, { month: 'Dec', value: 75 },
      { month: 'Jan', value: 77 }, { month: 'Feb', value: 78 },
    ],
    retentionCorrelation: [
      { scoreRange: '90-100', avgTenure: 4.2 },
      { scoreRange: '70-89', avgTenure: 3.1 },
      { scoreRange: '50-69', avgTenure: 1.8 },
      { scoreRange: '<50', avgTenure: 0.7 },
    ],
  },

  // ----- 10. ENGAGEMENT -----
  engagement: {
    enps: 42,
    responseRate: 89,
    drivers: [
      { name: 'Team Collaboration', score: 4.2 },
      { name: 'Manager Support', score: 3.9 },
      { name: 'Work-Life Balance', score: 3.7 },
      { name: 'Career Growth', score: 3.6 },
      { name: 'Compensation & Benefits', score: 3.4 },
    ],
    byLocation: [
      { name: 'Tokyo Ginza', value: 52 },
      { name: 'London Mayfair', value: 48 },
      { name: 'New York Central Park', value: 42 },
      { name: 'Paris Champs-Elysees', value: 38 },
      { name: 'Dubai Marina', value: 32 },
    ],
    trend: [
      { period: 'Q1 2025', value: 35 },
      { period: 'Q2 2025', value: 38 },
      { period: 'Q3 2025', value: 40 },
      { period: 'Q4 2025', value: 42 },
    ],
    actionItems: [
      { action: 'Launch mentorship programme for junior staff', owner: 'HR Team', status: 'In Progress', priority: 'High' },
      { action: 'Review compensation benchmarks vs market', owner: 'Compensation Team', status: 'Planned', priority: 'High' },
      { action: 'Implement flexible scheduling for FOH', owner: 'Operations', status: 'In Progress', priority: 'Medium' },
      { action: 'Create cross-property secondment opportunities', owner: 'L&D Team', status: 'Planned', priority: 'Medium' },
      { action: 'Quarterly town halls with GM at each property', owner: 'Executive Team', status: 'Completed', priority: 'Low' },
    ],
  },
};

// Manager-scoped data (team of 8 in F&B department)
const MANAGER_DEMO = {
  teamName: 'Food & Beverage',
  teamSize: 8,
  headcount: {
    total: 8,
    byLocation: [{ name: 'London Mayfair', value: 8 }],
    byDepartment: [{ name: 'Food & Beverage', value: 8 }],
    byType: [{ name: 'Full-time', value: 6 }, { name: 'Part-time', value: 2 }],
    trend: [
      { month: 'Mar', value: 7 }, { month: 'Apr', value: 7 },
      { month: 'May', value: 8 }, { month: 'Jun', value: 8 },
      { month: 'Jul', value: 7 }, { month: 'Aug', value: 8 },
      { month: 'Sep', value: 8 }, { month: 'Oct', value: 8 },
      { month: 'Nov', value: 9 }, { month: 'Dec', value: 8 },
      { month: 'Jan', value: 8 }, { month: 'Feb', value: 8 },
    ],
    newHires: 1, departures: 0, netChange: 1,
  },
  turnover: {
    monthlyRate: 1.5, annualizedRate: 18.0,
    byDepartment: [{ name: 'Food & Beverage', value: 1.5 }],
    voluntaryPct: 80, involuntaryPct: 20,
    costPerReplacement: 8500, avgTenureAtDeparture: 2.1, firstYearTurnover: 25,
    trend: [
      { month: 'Mar', value: 1.2 }, { month: 'Apr', value: 0.0 },
      { month: 'May', value: 1.5 }, { month: 'Jun', value: 0.0 },
      { month: 'Jul', value: 1.8 }, { month: 'Aug', value: 0.0 },
      { month: 'Sep', value: 0.0 }, { month: 'Oct', value: 1.5 },
      { month: 'Nov', value: 0.0 }, { month: 'Dec', value: 1.2 },
      { month: 'Jan', value: 0.0 }, { month: 'Feb', value: 1.5 },
    ],
  },
  absence: {
    overallRate: 4.2,
    bradfordTop10: [
      { name: 'James Whitfield', score: 486, pattern: '6 instances / 12 days', dept: 'Kitchen' },
      { name: 'Kaito Yamada', score: 196, pattern: '4 instances / 7 days', dept: 'Kitchen' },
      { name: 'Pierre Dubois', score: 100, pattern: '2 instances / 5 days', dept: 'Bar' },
    ],
    byType: [{ name: 'Sick leave', value: 55 }, { name: 'Annual leave', value: 32 }, { name: 'Personal', value: 8 }, { name: 'Other', value: 5 }],
    mondayFriday: { monday: 20, friday: 15, other: 65 },
    byDepartment: [{ name: 'Food & Beverage', value: 4.2 }],
    trend: [
      { month: 'Mar', value: 4.5 }, { month: 'Apr', value: 4.0 },
      { month: 'May', value: 3.8 }, { month: 'Jun', value: 3.5 },
      { month: 'Jul', value: 4.0 }, { month: 'Aug', value: 4.5 },
      { month: 'Sep', value: 4.1 }, { month: 'Oct', value: 3.8 },
      { month: 'Nov', value: 4.2 }, { month: 'Dec', value: 5.0 },
      { month: 'Jan', value: 4.8 }, { month: 'Feb', value: 4.2 },
    ],
  },
  training: {
    overallCompliance: 88,
    byCourse: [
      { name: 'H&S Induction', value: 100 }, { name: 'Food Hygiene', value: 100 },
      { name: 'Fire Safety', value: 88 }, { name: 'Allergen Awareness', value: 100 },
      { name: 'COSHH', value: 88 }, { name: 'Manual Handling', value: 75 },
      { name: 'First Aid', value: 75 }, { name: 'GDPR', value: 88 },
      { name: 'EDI', value: 75 }, { name: 'Anti-Bribery', value: 88 },
    ],
    byLocation: [{ name: 'London Mayfair', value: 88 }],
    overdueItems: 3, overdueEmployees: 2, expiringIn30: 4,
    overdueList: [
      { employee: 'James Whitfield', course: 'First Aid', dueDate: '2026-01-05', dept: 'Kitchen', location: 'London Mayfair' },
      { employee: 'Pierre Dubois', course: 'Manual Handling', dueDate: '2026-01-15', dept: 'Bar', location: 'London Mayfair' },
      { employee: 'James Whitfield', course: 'EDI', dueDate: '2026-01-20', dept: 'Kitchen', location: 'London Mayfair' },
    ],
  },
  overtime: {
    totalHours: 62, totalCost: 1550, overtimePctOfTotal: 9.8,
    topEmployees: [
      { name: 'Marcus Bellini', hours: 18, dept: 'Kitchen', location: 'London Mayfair' },
      { name: 'Pierre Dubois', hours: 14, dept: 'Bar', location: 'London Mayfair' },
      { name: 'James Whitfield', hours: 12, dept: 'Kitchen', location: 'London Mayfair' },
      { name: 'Liam O\'Connor', hours: 10, dept: 'Bar', location: 'London Mayfair' },
      { name: 'Jean-Luc Martin', hours: 8, dept: 'Kitchen', location: 'London Mayfair' },
    ],
    byDepartment: [{ name: 'Food & Beverage', value: 62 }],
    trend: [
      { month: 'Sep', value: 48 }, { month: 'Oct', value: 52 },
      { month: 'Nov', value: 68 }, { month: 'Dec', value: 78 },
      { month: 'Jan', value: 55 }, { month: 'Feb', value: 62 },
    ],
  },
  diversity: DEMO.diversity,
  recruitment: {
    openPositions: 2, avgTimeToFill: 24, costPerHire: 2200,
    bySource: DEMO.recruitment.bySource,
    byStage: [
      { name: 'Sourcing', value: 0, color: '#6366f1' },
      { name: 'Screening', value: 1, color: '#3b82f6' },
      { name: 'Interview', value: 1, color: '#f97316' },
      { name: 'Offer', value: 0, color: '#10b981' },
    ],
    openRoles: [
      { title: 'Senior Chef de Partie', location: 'London Mayfair', dept: 'Kitchen', stage: 'Interview', daysOpen: 18 },
      { title: 'Commis Chef', location: 'London Mayfair', dept: 'Kitchen', stage: 'Screening', daysOpen: 8 },
    ],
  },
  compensation: {
    avgSalary: 29800,
    salaryBands: [
      { level: 'Head Chef', min: 38000, mid: 45000, max: 52000 },
      { level: 'Sous Chef', min: 30000, mid: 35000, max: 40000 },
      { level: 'Chef de Partie', min: 26000, mid: 30000, max: 34000 },
      { level: 'Bartender', min: 24000, mid: 28000, max: 32000 },
      { level: 'Commis Chef', min: 22000, mid: 25000, max: 28000 },
    ],
    genderPayGap: -1.8, budgetUtilization: 91,
    benefits: DEMO.compensation.benefits,
    distribution: [
      { range: '22-26k', count: 2 }, { range: '26-30k', count: 3 },
      { range: '30-35k', count: 2 }, { range: '35-52k', count: 1 },
    ],
  },
  momentum: {
    avgScore: 74,
    distribution: [
      { name: 'Excellent (90+)', value: 12, color: '#10b981' },
      { name: 'Good (70-89)', value: 50, color: '#3b82f6' },
      { name: 'Fair (50-69)', value: 25, color: '#f97316' },
      { name: 'Needs Improvement (<50)', value: 13, color: '#ef4444' },
    ],
    byLocation: [{ name: 'London Mayfair', value: 74 }],
    byDepartment: [{ name: 'Food & Beverage', value: 74 }],
    topPerformers: [
      { name: 'Marcus Bellini', score: 92, dept: 'Kitchen', location: 'London Mayfair' },
      { name: 'Pierre Dubois', score: 88, dept: 'Bar', location: 'London Mayfair' },
      { name: 'Liam O\'Connor', score: 85, dept: 'Bar', location: 'London Mayfair' },
    ],
    trend: [
      { month: 'Sep', value: 70 }, { month: 'Oct', value: 71 },
      { month: 'Nov', value: 72 }, { month: 'Dec', value: 71 },
      { month: 'Jan', value: 73 }, { month: 'Feb', value: 74 },
    ],
    retentionCorrelation: DEMO.momentum.retentionCorrelation,
  },
  engagement: {
    enps: 36, responseRate: 100,
    drivers: [
      { name: 'Team Collaboration', score: 4.0 },
      { name: 'Manager Support', score: 4.1 },
      { name: 'Work-Life Balance', score: 3.4 },
      { name: 'Career Growth', score: 3.5 },
      { name: 'Compensation & Benefits', score: 3.2 },
    ],
    byLocation: [{ name: 'London Mayfair', value: 36 }],
    trend: [
      { period: 'Q1 2025', value: 28 }, { period: 'Q2 2025', value: 30 },
      { period: 'Q3 2025', value: 34 }, { period: 'Q4 2025', value: 36 },
    ],
    actionItems: [
      { action: 'Review rota fairness for weekend shifts', owner: 'F&B Manager', status: 'In Progress', priority: 'High' },
      { action: 'Implement cross-training for bar and kitchen', owner: 'F&B Manager', status: 'Planned', priority: 'Medium' },
    ],
  },
};

// ============================================================
// CHART COMPONENTS (Pure CSS/SVG)
// ============================================================

function BarChartHorizontal({ data, maxValue: maxProp, unit = '', currency = '', color = CHART_COLORS[0], showValues = true }) {
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
                style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
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

function LineChartSVG({ data, height = 180, color = '#6366f1', unit = '', showArea = true }) {
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const padding = 30;
  const w = 100;
  const h = 100;

  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * (w - 2 * padding);
    const y = h - padding - ((v - min) / range) * (h - 2 * padding);
    return { x, y, v };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = points.length > 0
    ? `M${points[0].x},${h - padding} L${polyline} L${points[points.length - 1].x},${h - padding} Z`
    : '';

  return (
    <div style={{ height }} className="w-full relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = h - padding - pct * (h - 2 * padding);
          return (
            <line key={i} x1={padding} y1={y} x2={w - padding} y2={y}
              stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1,1" />
          );
        })}

        {/* Area fill */}
        {showArea && <path d={areaPath} fill={color} opacity="0.08" />}

        {/* Line */}
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="1.5" fill="white" stroke={color} strokeWidth="0.8" />
            <title>{data[i].month || data[i].period || ''}: {p.v}{unit}</title>
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-6">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-slate-400">{d.month || d.period || ''}</span>
        ))}
      </div>

      {/* Y-axis labels */}
      <div className="absolute top-0 left-0 bottom-5 flex flex-col justify-between py-2">
        <span className="text-[10px] text-slate-400">{max}{unit}</span>
        <span className="text-[10px] text-slate-400">{((max + min) / 2).toFixed(1)}{unit}</span>
        <span className="text-[10px] text-slate-400">{min}{unit}</span>
      </div>
    </div>
  );
}

function DonutChart({ data, size = 180, thickness = 35, centerLabel, centerValue }) {
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
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
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
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-sm text-slate-600">{item.name}</span>
            <span className="text-sm font-semibold text-slate-900 ml-auto">{item.value}%</span>
          </div>
        ))}
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

function StackedBar({ segments, height = 32 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div className="flex rounded-full overflow-hidden" style={{ height }}>
      {segments.map((seg, i) => (
        <div
          key={i}
          className="relative group transition-opacity hover:opacity-80"
          style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color || CHART_COLORS[i % CHART_COLORS.length] }}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
            {seg.name}: {seg.value}%
          </div>
        </div>
      ))}
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
        <LineChartSVG data={data.trend} color="#f59e0b" unit="%" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('reports.otByDepartment', 'Overtime by Department (Hours)')}>
          <BarChartHorizontal data={data.byDepartment} unit="h" />
        </SectionCard>
        <SectionCard title={t('reports.otTrend', 'Overtime Trend (6 Months)')}>
          <LineChartSVG data={data.trend} color="#3b82f6" unit="h" />
        </SectionCard>
      </div>

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
            centerValue="234"
            centerLabel={t('reports.employees', 'Employees')}
          />
        </SectionCard>
        <SectionCard title={t('reports.ageDistribution', 'Age Distribution')}>
          <DonutChart
            data={data.age.map((d, i) => ({ ...d, color: CHART_COLORS[i + 4] }))}
            size={160} thickness={30}
          />
        </SectionCard>
        <SectionCard title={t('reports.tenureDistribution', 'Tenure Distribution')}>
          <DonutChart
            data={data.tenure.map((d, i) => ({ ...d, color: CHART_COLORS[i + 2] }))}
            size={160} thickness={30}
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
              ]} height={24} />
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
        <BarChartVertical data={data.distribution.map(d => ({ name: d.range, value: d.count }))} unit=" employees" height={220} />
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
          trend={2} trendLabel="+2 vs last survey" />
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
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    d.score >= 4 ? 'bg-emerald-500' : d.score >= 3.5 ? 'bg-blue-500' : 'bg-amber-500'
                  }`} style={{ width: `${(d.score / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('reports.enpsTimeline', 'eNPS Timeline')}>
          <BarChartVertical data={data.trend.map(d => ({ name: d.period, value: d.value }))} unit="" height={200} />
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
    const d = reportData[activeReport];
    if (!d) return null;
    switch (activeReport) {
      case 'headcount': return <HeadcountReport data={d} t={t} />;
      case 'turnover': return <TurnoverReport data={d} t={t} />;
      case 'absence': return <AbsenceReport data={d} t={t} />;
      case 'training': return <TrainingReport data={d} t={t} />;
      case 'overtime': return <OvertimeReport data={d} t={t} />;
      case 'diversity': return <DiversityReport data={d} t={t} />;
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
                  title={sidebarCollapsed ? t(report.labelKey, report.id) : undefined}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{t(report.labelKey, report.id)}</span>}
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
              {t(report.labelKey, report.id)}
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
                <h1 className="text-xl font-bold text-slate-900">{t(activeReportDef?.labelKey || 'reports.reports', 'Report')}</h1>
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
