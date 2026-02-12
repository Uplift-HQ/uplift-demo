// ============================================================
// RECOGNITION WALL PAGE
// Peer-to-peer recognition feed, leaderboards, giving
// recognition, and role-based analytics.
// Route: /recognition
// ============================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import {
  Star,
  HeartHandshake,
  Target,
  Lightbulb,
  Heart,
  GraduationCap,
  Send,
  Trophy,
  Award,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  X,
  Users,
  TrendingUp,
  BarChart3,
  Settings,
  MapPin,
  Calendar,
  ArrowRight,
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORIES = [
  { key: 'greatWork', labelKey: 'recognition.category.greatWork', labelFallback: 'Great Work', Icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-100' },
  { key: 'teamPlayer', labelKey: 'recognition.category.teamPlayer', labelFallback: 'Team Player', Icon: HeartHandshake, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', activeBg: 'bg-blue-100' },
  { key: 'goalCrusher', labelKey: 'recognition.category.goalCrusher', labelFallback: 'Goal Crusher', Icon: Target, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', activeBg: 'bg-green-100' },
  { key: 'innovation', labelKey: 'recognition.category.innovation', labelFallback: 'Innovation', Icon: Lightbulb, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', activeBg: 'bg-purple-100' },
  { key: 'aboveBeyond', labelKey: 'recognition.category.aboveBeyond', labelFallback: 'Above & Beyond', Icon: Heart, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', activeBg: 'bg-red-100' },
  { key: 'mentor', labelKey: 'recognition.category.mentor', labelFallback: 'Mentor', Icon: GraduationCap, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-200', activeBg: 'bg-teal-100' },
];

const COMPANY_VALUES = [
  { key: 'excellence', labelKey: 'recognition.value.excellence', labelFallback: 'Excellence' },
  { key: 'teamwork', labelKey: 'recognition.value.teamwork', labelFallback: 'Teamwork' },
  { key: 'guestFirst', labelKey: 'recognition.value.guestFirst', labelFallback: 'Guest First' },
  { key: 'innovation', labelKey: 'recognition.value.innovation', labelFallback: 'Innovation' },
  { key: 'integrity', labelKey: 'recognition.value.integrity', labelFallback: 'Integrity' },
];

const DEPARTMENTS = [
  { key: 'frontOffice', labelFallback: 'Front Office' },
  { key: 'housekeeping', labelFallback: 'Housekeeping' },
  { key: 'foodBeverage', labelFallback: 'Food & Beverage' },
  { key: 'kitchen', labelFallback: 'Kitchen' },
  { key: 'spaWellness', labelFallback: 'Spa & Wellness' },
  { key: 'concierge', labelFallback: 'Concierge' },
  { key: 'events', labelFallback: 'Events' },
  { key: 'management', labelFallback: 'Management' },
];

const LOCATIONS = [
  { key: 'london', labelFallback: 'London' },
  { key: 'paris', labelFallback: 'Paris' },
  { key: 'tokyo', labelFallback: 'Tokyo' },
  { key: 'dubai', labelFallback: 'Dubai' },
  { key: 'newYork', labelFallback: 'New York' },
];

// ============================================================
// EMPLOYEES
// ============================================================

const EMPLOYEES = [
  { id: 1, name: 'James Williams', role: 'Front Office Manager', dept: 'Front Office', location: 'London' },
  { id: 2, name: 'Maria Santos', role: 'Guest Relations Lead', dept: 'Front Office', location: 'London' },
  { id: 3, name: 'Pierre Dubois', role: 'F&B Supervisor', dept: 'Food & Beverage', location: 'Paris' },
  { id: 4, name: 'Sophie Anderson', role: 'Senior Concierge', dept: 'Concierge', location: 'London' },
  { id: 5, name: 'Ahmed Hassan', role: 'Night Manager', dept: 'Management', location: 'Dubai' },
  { id: 6, name: 'Yuki Tanaka', role: 'Sous Chef', dept: 'Kitchen', location: 'Tokyo' },
  { id: 7, name: 'Emily Watson', role: 'Spa Director', dept: 'Spa & Wellness', location: 'London' },
  { id: 8, name: 'Raj Patel', role: 'Night Auditor', dept: 'Front Office', location: 'Dubai' },
  { id: 9, name: 'Claire Dubois', role: 'Housekeeping Lead', dept: 'Housekeeping', location: 'Paris' },
  { id: 10, name: 'Wei Zhang', role: 'Head Chef', dept: 'Kitchen', location: 'Tokyo' },
  { id: 11, name: 'Aiko Yamamoto', role: 'Guest Services', dept: 'Concierge', location: 'Tokyo' },
  { id: 12, name: 'Liam O\'Connor', role: 'Events Coordinator', dept: 'Events', location: 'London' },
];

// ============================================================
// DEMO RECOGNITION DATA
// ============================================================

const now = Date.now();
const HOUR = 3600000;
const DAY = 86400000;

const INITIAL_RECOGNITIONS = [
  {
    id: 1,
    fromId: 1,
    toId: 2,
    categoryKey: 'greatWork',
    message: 'Handled the VIP check-in flawlessly. Guest left a 5-star review!',
    value: 'excellence',
    timestamp: now - 2 * HOUR,
    likes: 14,
    likedByMe: false,
  },
  {
    id: 2,
    fromId: 2,
    toId: 3,
    categoryKey: 'teamPlayer',
    message: 'Covered my shift on short notice. True team spirit!',
    value: 'teamwork',
    timestamp: now - 4 * HOUR,
    likes: 9,
    likedByMe: false,
  },
  {
    id: 3,
    fromId: 4,
    toId: 11,
    categoryKey: 'aboveBeyond',
    message: 'Stayed late to help a lost guest find their way back to the hotel',
    value: 'guestFirst',
    timestamp: now - 6 * HOUR,
    likes: 22,
    likedByMe: false,
  },
  {
    id: 4,
    fromId: 5,
    toId: 1,
    categoryKey: 'innovation',
    message: 'Brilliant idea to use QR codes for the breakfast menu',
    value: 'innovation',
    timestamp: now - 1 * DAY,
    likes: 17,
    likedByMe: false,
  },
  {
    id: 5,
    fromId: 6,
    toId: 10,
    categoryKey: 'mentor',
    message: 'Thank you for teaching me the proper knife techniques',
    value: 'excellence',
    timestamp: now - 1.5 * DAY,
    likes: 11,
    likedByMe: false,
  },
  {
    id: 6,
    fromId: 7,
    toId: 9,
    categoryKey: 'goalCrusher',
    message: 'Achieved 100% room turnover rate this month!',
    value: 'excellence',
    timestamp: now - 2 * DAY,
    likes: 26,
    likedByMe: false,
  },
  {
    id: 7,
    fromId: 8,
    toId: 4,
    categoryKey: 'greatWork',
    message: 'Your concierge recommendations got amazing feedback',
    value: 'guestFirst',
    timestamp: now - 2.5 * DAY,
    likes: 8,
    likedByMe: false,
  },
  {
    id: 8,
    fromId: 3,
    toId: 5,
    categoryKey: 'teamPlayer',
    message: 'Always ready to help during rush hour',
    value: 'teamwork',
    timestamp: now - 3 * DAY,
    likes: 13,
    likedByMe: false,
  },
  {
    id: 9,
    fromId: 9,
    toId: 8,
    categoryKey: 'aboveBeyond',
    message: 'Going the extra mile for night shift guests',
    value: 'guestFirst',
    timestamp: now - 4 * DAY,
    likes: 19,
    likedByMe: false,
  },
  {
    id: 10,
    fromId: 1,
    toId: 7,
    categoryKey: 'greatWork',
    message: 'Spa customer satisfaction at all-time high',
    value: 'excellence',
    timestamp: now - 5 * DAY,
    likes: 15,
    likedByMe: false,
  },
  {
    id: 11,
    fromId: 10,
    toId: 6,
    categoryKey: 'innovation',
    message: 'New plating style for the omakase menu is stunning',
    value: 'innovation',
    timestamp: now - 6 * DAY,
    likes: 20,
    likedByMe: false,
  },
  {
    id: 12,
    fromId: 2,
    toId: 1,
    categoryKey: 'mentor',
    message: 'Your guidance during my first month made all the difference',
    value: 'teamwork',
    timestamp: now - 7 * DAY,
    likes: 24,
    likedByMe: false,
  },
];

// ============================================================
// HELPERS
// ============================================================

function getEmployeeById(id) {
  return EMPLOYEES.find((e) => e.id === id);
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getCategoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key);
}

function getValueLabel(key) {
  const v = COMPANY_VALUES.find((cv) => cv.key === key);
  return v ? v.labelFallback : '';
}

function formatRelativeTime(ts, t) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / HOUR);
  const days = Math.floor(diff / DAY);

  if (minutes < 1) return t('recognition.time.justNow', 'Just now');
  if (minutes < 60) return t('recognition.time.minutesAgo', '{{count}} minute(s) ago', { count: minutes });
  if (hours < 24) return t('recognition.time.hoursAgo', '{{count}} hour(s) ago', { count: hours });
  if (days === 1) return t('recognition.time.yesterday', 'Yesterday');
  if (days < 7) return t('recognition.time.daysAgo', '{{count}} days ago', { count: days });
  if (days < 14) return t('recognition.time.oneWeekAgo', '1 week ago');
  return t('recognition.time.weeksAgo', '{{count}} weeks ago', { count: Math.floor(days / 7) });
}

// Build leaderboard data from recognitions
function buildLeaderboards(recognitions) {
  const receivedMap = {};
  const givenMap = {};

  recognitions.forEach((r) => {
    const receiver = getEmployeeById(r.toId);
    const giver = getEmployeeById(r.fromId);

    if (receiver) {
      receivedMap[receiver.name] = (receivedMap[receiver.name] || 0) + 1;
    }
    if (giver) {
      givenMap[giver.name] = (givenMap[giver.name] || 0) + 1;
    }
  });

  const topReceived = Object.entries(receivedMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topGiven = Object.entries(givenMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { topReceived, topGiven };
}

// ============================================================
// SEARCHABLE DROPDOWN COMPONENT
// ============================================================

function SearchableDropdown({ employees, value, onChange, placeholder, t }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.role.toLowerCase().includes(search.toLowerCase()) ||
    emp.dept.toLowerCase().includes(search.toLowerCase())
  );

  const selected = employees.find((e) => e.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 bg-white"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? `${selected.name} -- ${selected.role}, ${selected.dept}` : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('recognition.searchColleague', 'Search by name, role, or department...')}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">
                {t('recognition.noResults', 'No colleagues found')}
              </div>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    onChange(emp.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                    value === emp.id ? 'bg-momentum-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs flex-shrink-0">
                    {getInitials(emp.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-500 truncate">{emp.role} -- {emp.dept}</p>
                  </div>
                  {value === emp.id && (
                    <CheckCircle className="w-4 h-4 text-momentum-500 flex-shrink-0 ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RECOGNITION CARD COMPONENT
// ============================================================

function RecognitionCard({ recognition, onLike, t }) {
  const { fromId, toId, categoryKey, message, value, timestamp, likes, likedByMe } = recognition;
  const from = getEmployeeById(fromId);
  const to = getEmployeeById(toId);
  const category = getCategoryByKey(categoryKey);

  if (!from || !to || !category) return null;

  const CategoryIcon = category.Icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all">
      <div className="p-5">
        {/* Top row: giver -> receiver with avatars */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {/* Giver avatar */}
            <div className="w-9 h-9 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-semibold text-xs flex-shrink-0">
              {getInitials(from.name)}
            </div>
            <span className="text-sm font-semibold text-slate-900">{from.name}</span>
            <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            {/* Receiver avatar */}
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-xs flex-shrink-0">
              {getInitials(to.name)}
            </div>
            <span className="text-sm font-semibold text-slate-900">{to.name}</span>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0 pt-1">
            {formatRelativeTime(timestamp, t)}
          </span>
        </div>

        {/* Category badge with Lucide icon */}
        <div className="flex items-center gap-2 mb-3 ml-11">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${category.bg} ${category.border} border`}>
            <CategoryIcon className={`w-3.5 h-3.5 ${category.color}`} />
            {t(`recognition.categories.${categoryKey}`, category.labelFallback)}
          </span>
          {value && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {t(`recognition.values.${value}`, getValueLabel(value))}
            </span>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-slate-700 leading-relaxed ml-11">
          &ldquo;{message}&rdquo;
        </p>

        {/* Like button */}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => onLike(recognition.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors group ${
              likedByMe
                ? 'text-red-500 bg-red-50'
                : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart className={`w-4 h-4 transition-colors ${likedByMe ? 'fill-red-500 text-red-500' : 'group-hover:fill-red-500'}`} />
            <span className="font-medium">{likes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LEADERBOARD SIDEBAR COMPONENT
// ============================================================

function LeaderboardSidebar({ recognitions, t }) {
  const { topReceived, topGiven } = useMemo(
    () => buildLeaderboards(recognitions),
    [recognitions]
  );

  return (
    <div className="space-y-6">
      {/* Most Recognised This Month */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">
              {t('recognition.mostRecognised', 'Most Recognised This Month')}
            </h3>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {topReceived.map((entry, idx) => (
            <div
              key={entry.name}
              className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                {idx + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs flex-shrink-0">
                {getInitials(entry.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{entry.name}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-slate-700">{entry.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Active Givers */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-momentum-500" />
            <h3 className="font-semibold text-slate-900">
              {t('recognition.mostActiveGivers', 'Most Active Givers')}
            </h3>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {topGiven.map((entry, idx) => (
            <div
              key={entry.name}
              className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                {idx + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium text-xs flex-shrink-0">
                {getInitials(entry.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{entry.name}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-slate-700">{entry.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MANAGER ANALYTICS PANEL
// ============================================================

function ManagerAnalyticsPanel({ recognitions, t }) {
  // Simulate "my team" as Front Office + Concierge for demo
  const teamDepts = ['Front Office', 'Concierge'];
  const teamMembers = EMPLOYEES.filter((e) => teamDepts.includes(e.dept));
  const teamIds = teamMembers.map((e) => e.id);

  const teamReceived = recognitions.filter((r) => teamIds.includes(r.toId)).length;
  const teamGiven = recognitions.filter((r) => teamIds.includes(r.fromId)).length;

  // Most recognised in team
  const receivedCounts = {};
  recognitions.forEach((r) => {
    if (teamIds.includes(r.toId)) {
      const emp = getEmployeeById(r.toId);
      if (emp) receivedCounts[emp.name] = (receivedCounts[emp.name] || 0) + 1;
    }
  });
  const topInTeam = Object.entries(receivedCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-slate-900">
            {t('recognition.teamAnalytics', 'Team Recognition Analytics')}
          </h3>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{teamReceived}</p>
            <p className="text-xs text-green-600 mt-1 font-medium">
              {t('recognition.teamReceived', 'Received by Team')}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{teamGiven}</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              {t('recognition.teamGiven', 'Given by Team')}
            </p>
          </div>
        </div>
        {topInTeam.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              {t('recognition.mostRecognisedInTeam', 'Most Recognised in Team')}
            </p>
            <div className="space-y-2">
              {topInTeam.map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs flex-shrink-0">
                    {getInitials(entry.name)}
                  </div>
                  <span className="text-sm text-slate-900 font-medium flex-1 truncate">{entry.name}</span>
                  <span className="text-sm font-semibold text-slate-600">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN ANALYTICS PANEL
// ============================================================

function AdminAnalyticsPanel({ recognitions, t }) {
  const totalRecognitions = recognitions.length;

  // Per-location counts
  const locationCounts = {};
  LOCATIONS.forEach((loc) => { locationCounts[loc.labelFallback] = { key: loc.key, count: 0 }; });
  recognitions.forEach((r) => {
    const receiver = getEmployeeById(r.toId);
    if (receiver && locationCounts[receiver.location] !== undefined) {
      locationCounts[receiver.location].count += 1;
    }
  });

  // Per-category counts
  const categoryCounts = {};
  CATEGORIES.forEach((c) => { categoryCounts[c.key] = 0; });
  recognitions.forEach((r) => {
    if (categoryCounts[r.categoryKey] !== undefined) {
      categoryCounts[r.categoryKey] += 1;
    }
  });

  // Per-department counts
  const deptCounts = {};
  recognitions.forEach((r) => {
    const receiver = getEmployeeById(r.toId);
    if (receiver) {
      deptCounts[receiver.dept] = (deptCounts[receiver.dept] || 0) + 1;
    }
  });
  const topDepts = Object.entries(deptCounts)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-slate-900">
            {t('recognition.orgAnalytics', 'Organisation-wide Analytics')}
          </h3>
        </div>
      </div>
      <div className="p-5 space-y-5">
        {/* Total */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-purple-700">{totalRecognitions}</p>
          <p className="text-xs text-purple-600 mt-1 font-medium">
            {t('recognition.totalRecognitions', 'Total Recognitions')}
          </p>
        </div>

        {/* By Location */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            {t('recognition.byLocation', 'By Location')}
          </p>
          <div className="space-y-2">
            {Object.entries(locationCounts).map(([loc, { key, count }]) => (
              <div key={loc} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{t(`recognition.locations.${key}`, loc)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${totalRecognitions > 0 ? (count / totalRecognitions) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-5 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            {t('recognition.byCategory', 'By Category')}
          </p>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.Icon;
              return (
                <div key={cat.key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-1.5">
                    <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                    {t(`recognition.categories.${cat.key}`, cat.labelFallback)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">{categoryCounts[cat.key]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Departments */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            {t('recognition.topDepartments', 'Top Departments')}
          </p>
          <div className="space-y-2">
            {topDepts.map(({ dept, count }) => {
              const deptData = DEPARTMENTS.find(d => d.labelFallback === dept);
              return (
                <div key={dept} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    {deptData ? t(`recognition.departments.${deptData.key}`, dept) : dept}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configure Categories (admin-only hint) */}
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
          <Settings className="w-4 h-4" />
          {t('recognition.configureCategories', 'Configure Categories')}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Recognition() {
  const { t } = useTranslation();
  const { user, isAdmin, isManagerOrAbove } = useAuth();

  // State
  const [recognitions, setRecognitions] = useState(INITIAL_RECOGNITIONS);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedValue, setSelectedValue] = useState(null);
  const [messageError, setMessageError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Feed filters
  const [filterDept, setFilterDept] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchName, setSearchName] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const currentUserName = user?.name || user?.email?.split('@')[0] || 'You';

  // ----------------------------------------------------------
  // SUBMIT RECOGNITION
  // ----------------------------------------------------------
  const handleSend = () => {
    // Validate message
    if (!message.trim() || message.trim().length < 10) {
      setMessageError(t('recognition.messageTooShort', 'Message must be at least 10 characters'));
      return;
    }
    if (!selectedRecipient || !selectedCategory) return;

    const recipient = getEmployeeById(selectedRecipient);
    if (!recipient) return;

    const newRecognition = {
      id: Date.now(),
      fromId: 0, // current user placeholder
      toId: selectedRecipient,
      categoryKey: selectedCategory,
      message: message.trim(),
      value: selectedValue,
      timestamp: Date.now(),
      likes: 0,
      likedByMe: false,
      // Store giver name directly for user-submitted items
      _giverName: currentUserName,
    };

    setRecognitions((prev) => [newRecognition, ...prev]);
    setSelectedRecipient(null);
    setSelectedCategory(null);
    setMessage('');
    setSelectedValue(null);
    setMessageError('');
    setSuccessToast(t('recognition.successMessage', 'Recognition sent successfully!'));
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // ----------------------------------------------------------
  // LIKE RECOGNITION
  // ----------------------------------------------------------
  const handleLike = (id) => {
    setRecognitions((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, likes: r.likedByMe ? r.likes - 1 : r.likes + 1, likedByMe: !r.likedByMe }
          : r
      )
    );
  };

  // ----------------------------------------------------------
  // FILTERED RECOGNITIONS
  // ----------------------------------------------------------
  const filteredRecognitions = useMemo(() => {
    return recognitions.filter((r) => {
      const from = getEmployeeById(r.fromId);
      const to = getEmployeeById(r.toId);
      const fromName = from?.name || r._giverName || '';
      const toName = to?.name || '';

      // Department filter
      if (filterDept) {
        const fromDept = from?.dept || '';
        const toDept = to?.dept || '';
        if (fromDept !== filterDept && toDept !== filterDept) return false;
      }

      // Category filter
      if (filterCategory && r.categoryKey !== filterCategory) return false;

      // Date range filter
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom).getTime();
        if (r.timestamp < fromDate) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo).getTime() + DAY;
        if (r.timestamp > toDate) return false;
      }

      // Name search
      if (searchName) {
        const q = searchName.toLowerCase();
        if (!fromName.toLowerCase().includes(q) && !toName.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [recognitions, filterDept, filterCategory, filterDateFrom, filterDateTo, searchName]);

  const hasActiveFilters = filterDept || filterCategory || filterDateFrom || filterDateTo || searchName;

  const clearFilters = () => {
    setFilterDept('');
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchName('');
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('recognition.title', 'Recognition Wall')}
        </h1>
        <p className="text-slate-500 mt-1">
          {t('recognition.subtitle', 'Celebrate your colleagues\' achievements')}
        </p>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {successToast}
          </div>
          <button onClick={() => setSuccessToast('')} className="text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ====================================================== */}
      {/* GIVE RECOGNITION CARD                                   */}
      {/* ====================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-momentum-500" />
            <h2 className="font-semibold text-slate-900">
              {t('recognition.giveRecognition', 'Give Recognition')}
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Recipient (searchable dropdown) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('recognition.recipient', 'Select Colleague')}
            </label>
            <SearchableDropdown
              employees={EMPLOYEES}
              value={selectedRecipient}
              onChange={setSelectedRecipient}
              placeholder={t('recognition.selectRecipient', 'Search for a colleague...')}
              t={t}
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('recognition.category', 'Category')}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const CatIcon = cat.Icon;
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(isActive ? null : cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isActive
                        ? `${cat.activeBg} ${cat.border} ${cat.color} ring-2 ring-opacity-30`
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    style={isActive ? { '--tw-ring-color': 'currentColor' } : {}}
                  >
                    <CatIcon className={`w-4 h-4 ${isActive ? cat.color : 'text-slate-400'}`} />
                    {t(`recognition.categories.${cat.key}`, cat.labelFallback)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('recognition.message', 'Message')}
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (messageError && e.target.value.trim().length >= 10) {
                  setMessageError('');
                }
              }}
              rows={3}
              placeholder={t(
                'recognition.messagePlaceholder',
                'Write a thoughtful message recognising their contribution (min. 10 characters)...'
              )}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 resize-none ${
                messageError ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">
                {message.trim().length} {t('recognition.characters', 'characters')}
                {message.trim().length > 0 && message.trim().length < 10 && (
                  <span className="text-amber-500 ml-1">
                    ({10 - message.trim().length} {t('recognition.more', 'more needed')})
                  </span>
                )}
              </span>
              {messageError && (
                <span className="text-xs text-red-500 font-medium">{messageError}</span>
              )}
            </div>
          </div>

          {/* Company Value (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('recognition.attachValue', 'Attach to Company Value')}
              <span className="text-slate-400 text-xs ml-1">
                ({t('recognition.optional', 'optional')})
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_VALUES.map((val) => {
                const isActive = selectedValue === val.key;
                return (
                  <button
                    key={val.key}
                    type="button"
                    onClick={() => setSelectedValue(isActive ? null : val.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isActive
                        ? 'bg-momentum-50 border-momentum-300 text-momentum-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t(`recognition.values.${val.key}`, val.labelFallback)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSend}
              disabled={!selectedRecipient || !selectedCategory || !message.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedRecipient && selectedCategory && message.trim()
                  ? 'bg-momentum-500 text-white hover:bg-momentum-600 active:bg-momentum-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              {t('recognition.sendRecognition', 'Send Recognition')}
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* FEED FILTERS                                            */}
      {/* ====================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Search by name */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder={t('recognition.searchByName', 'Search by name...')}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-momentum-50 border-momentum-300 text-momentum-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              {t('recognition.filters', 'Filters')}
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-momentum-500" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                {t('recognition.clearFilters', 'Clear all')}
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('recognition.department', 'Department')}
                </label>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-momentum-500 bg-white"
                >
                  <option value="">{t('recognition.allDepartments', 'All Departments')}</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.key} value={d.labelFallback}>{t(`recognition.departments.${d.key}`, d.labelFallback)}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('recognition.categoryFilter', 'Category')}
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-momentum-500 bg-white"
                >
                  <option value="">{t('recognition.allCategories', 'All Categories')}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {t(`recognition.categories.${c.key}`, c.labelFallback)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('recognition.dateFrom', 'From Date')}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-momentum-500 bg-white"
                  />
                </div>
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('recognition.dateTo', 'To Date')}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-momentum-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================== */}
      {/* MAIN CONTENT: FEED + SIDEBAR                            */}
      {/* ====================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recognition Feed (left 2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Manager Analytics (above feed, managers only) */}
          {isManagerOrAbove && !isAdmin && (
            <ManagerAnalyticsPanel recognitions={recognitions} t={t} />
          )}

          {/* Admin Analytics (above feed, admins only) */}
          {isAdmin && (
            <>
              <AdminAnalyticsPanel recognitions={recognitions} t={t} />
              <ManagerAnalyticsPanel recognitions={recognitions} t={t} />
            </>
          )}

          {/* Feed */}
          {filteredRecognitions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">
                {t('recognition.noRecognitions', 'No recognitions to show.')}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {hasActiveFilters
                  ? t('recognition.tryDifferentFilters', 'Try adjusting your filters.')
                  : t('recognition.beFirst', 'Be the first to recognise a colleague!')}
              </p>
            </div>
          ) : (
            filteredRecognitions.map((recognition) => (
              <RecognitionCard
                key={recognition.id}
                recognition={recognition}
                onLike={handleLike}
                t={t}
              />
            ))
          )}
        </div>

        {/* Leaderboard Sidebar (right 1/3) */}
        <div>
          <LeaderboardSidebar recognitions={recognitions} t={t} />
        </div>
      </div>
    </div>
  );
}
