// ============================================================
// RECOGNITION WALL PAGE
// Peer-to-peer recognition feed, leaderboards, and giving
// recognition. Visible to ALL roles.
// Route: /recognition
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { Heart, Send, Star, Trophy, Zap, Brain, Rocket, Award, ThumbsUp, Filter } from 'lucide-react';

// ============================================================
// DEMO DATA
// ============================================================

const EMPLOYEES = [
  { id: 1, name: 'Sarah Mitchell', role: 'Senior Server', dept: 'Front of House' },
  { id: 2, name: 'James Kimani', role: 'Bartender', dept: 'Bar' },
  { id: 3, name: 'Priya Patel', role: 'Hostess', dept: 'Front of House' },
  { id: 4, name: 'Thomas Cane', role: 'Head Waiter', dept: 'Front of House' },
  { id: 5, name: 'Sophie Bernard', role: 'Sommelier', dept: 'Bar' },
  { id: 6, name: 'Alex Rivera', role: 'Server', dept: 'Front of House' },
  { id: 7, name: 'Chen Wei', role: 'Server', dept: 'Front of House' },
  { id: 8, name: 'Jessica Bano', role: 'Events Coordinator', dept: 'Events' },
];

const CATEGORIES = [
  { emoji: '\u{1F31F}', label: 'Great Work', key: 'greatWork' },
  { emoji: '\u{1F4AA}', label: 'Team Player', key: 'teamPlayer' },
  { emoji: '\u{1F3AF}', label: 'Goal Crusher', key: 'goalCrusher' },
  { emoji: '\u{1F9E0}', label: 'Problem Solver', key: 'problemSolver' },
  { emoji: '\u{2764}\u{FE0F}', label: 'Above & Beyond', key: 'aboveAndBeyond' },
  { emoji: '\u{1F680}', label: 'Innovation', key: 'innovation' },
];

const INITIAL_RECOGNITIONS = [
  { id: 1, from: 'James Williams', to: 'Marc Hunt', emoji: '\u{1F31F}', category: 'Great Work', message: 'Great job covering the Saturday rush! Your energy kept the whole team going.', timestamp: '2 hours ago', likes: 12 },
  { id: 2, from: 'Marc Hunt', to: 'Priya Patel', emoji: '\u{1F4AA}', category: 'Team Player', message: 'Thanks for training the new starter \u2014 you made their first week so much easier.', timestamp: '4 hours ago', likes: 8 },
  { id: 3, from: 'Sarah Chen', to: 'Thomas Cane', emoji: '\u{1F3AF}', category: 'Goal Crusher', message: 'Brilliant Q4 guest satisfaction scores \u2014 highest in the company!', timestamp: '1 day ago', likes: 24 },
  { id: 4, from: 'Sophie Bernard', to: 'James Kimani', emoji: '\u{1F9E0}', category: 'Problem Solver', message: 'Quick thinking fixing the reservation system before the Friday rush.', timestamp: '2 days ago', likes: 15 },
  { id: 5, from: 'Thomas Cane', to: 'Sarah Mitchell', emoji: '\u{2764}\u{FE0F}', category: 'Above & Beyond', message: 'Staying late to help prep for the corporate dinner \u2014 truly above and beyond.', timestamp: '3 days ago', likes: 19 },
  { id: 6, from: 'Marc Hunt', to: 'Chen Wei', emoji: '\u{1F31F}', category: 'Great Work', message: 'Your wine pairing suggestions have been getting amazing feedback from guests!', timestamp: '4 days ago', likes: 7 },
  { id: 7, from: 'Jessica Bano', to: 'Alex Rivera', emoji: '\u{1F680}', category: 'Innovation', message: 'Love the new table layout idea for the Valentine\'s event \u2014 creative thinking!', timestamp: '5 days ago', likes: 11 },
  { id: 8, from: 'Sarah Chen', to: 'Marc Hunt', emoji: '\u{1F4AA}', category: 'Team Player', message: 'Mentoring two new starters this month \u2014 great leadership potential.', timestamp: '1 week ago', likes: 16 },
];

const LEADERBOARD_RECEIVED = [
  { name: 'Marc Hunt', count: 8 },
  { name: 'Thomas Cane', count: 6 },
  { name: 'Sarah Mitchell', count: 5 },
  { name: 'Priya Patel', count: 4 },
  { name: 'James Kimani', count: 3 },
];

const LEADERBOARD_GIVEN = [
  { name: 'Sarah Chen', count: 12 },
  { name: 'James Williams', count: 9 },
  { name: 'Marc Hunt', count: 7 },
  { name: 'Sophie Bernard', count: 5 },
  { name: 'Jessica Bano', count: 4 },
];

const FILTER_TABS = [
  { id: 'all', labelKey: 'recognition.filters.all', label: 'All' },
  { id: 'received', labelKey: 'recognition.filters.received', label: 'Received' },
  { id: 'sent', labelKey: 'recognition.filters.sent', label: 'Sent' },
  { id: 'myTeam', labelKey: 'recognition.filters.myTeam', label: 'My Team' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Recognition() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [recognitions, setRecognitions] = useState(INITIAL_RECOGNITIONS);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Derive current user display name
  const currentUserName = user?.name || user?.email?.split('@')[0] || 'You';

  // Handle sending recognition
  const handleSend = () => {
    if (!selectedRecipient || !selectedCategory || !message.trim()) return;

    const recipient = EMPLOYEES.find((e) => String(e.id) === selectedRecipient);
    if (!recipient) return;

    const cat = CATEGORIES.find((c) => c.key === selectedCategory);
    if (!cat) return;

    const newRecognition = {
      id: Date.now(),
      from: currentUserName,
      to: recipient.name,
      emoji: cat.emoji,
      category: cat.label,
      message: message.trim(),
      timestamp: 'Just now',
      likes: 0,
    };

    setRecognitions((prev) => [newRecognition, ...prev]);
    setSelectedRecipient('');
    setSelectedCategory(null);
    setMessage('');
    setSuccessMessage(t('recognition.successMessage', 'Recognition sent successfully!'));
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Handle liking a recognition
  const handleLike = (id) => {
    setRecognitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r))
    );
  };

  // Filter recognitions based on active filter
  const filteredRecognitions = recognitions.filter((r) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'received') return r.to === currentUserName;
    if (activeFilter === 'sent') return r.from === currentUserName;
    if (activeFilter === 'myTeam') {
      const teamNames = EMPLOYEES.filter((e) => e.dept === 'Front of House').map((e) => e.name);
      return teamNames.includes(r.to) || teamNames.includes(r.from);
    }
    return true;
  });

  // Medal helpers for leaderboard
  const getMedal = (index) => {
    if (index === 0) return '\u{1F947}';
    if (index === 1) return '\u{1F948}';
    if (index === 2) return '\u{1F949}';
    return `${index + 1}.`;
  };

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

      {/* Give Recognition Card */}
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
          {/* Success banner */}
          {successMessage && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
              <ThumbsUp className="w-4 h-4 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Recipient Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('recognition.recipient', 'Recipient')}
            </label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="">{t('recognition.selectRecipient', 'Select a colleague...')}</option>
              {EMPLOYEES.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role}, {emp.dept}
                </option>
              ))}
            </select>
          </div>

          {/* Category Buttons */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('recognition.category', 'Category')}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.key ? null : cat.key)
                  }
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-momentum-50 border-momentum-500 text-momentum-700 ring-2 ring-momentum-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  {t(`recognition.categories.${cat.key}`, cat.label)}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('recognition.message', 'Message')}
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= 280) setMessage(e.target.value);
              }}
              rows={3}
              placeholder={t('recognition.messagePlaceholder', 'Write a thoughtful message recognising their contribution...')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${message.length >= 260 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                {message.length}/280
              </span>
              {message.length >= 280 && (
                <span className="text-xs text-red-500 font-medium">
                  {t('recognition.charLimit', 'Character limit reached')}
                </span>
              )}
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={!selectedRecipient || !selectedCategory || !message.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedRecipient && selectedCategory && message.trim()
                  ? 'bg-momentum-500 text-white hover:bg-momentum-600'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              {t('recognition.sendRecognition', 'Send Recognition')}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-momentum-500 text-momentum-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.id === 'all' && <Filter className="w-4 h-4" />}
                {t(tab.labelKey, tab.label)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content: Feed + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recognition Feed (left 2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {filteredRecognitions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {t('recognition.noRecognitions', 'No recognitions to show for this filter.')}
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
        <div className="space-y-6">
          {/* Most Recognised */}
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
              {LEADERBOARD_RECEIVED.map((entry, idx) => (
                <div
                  key={entry.name}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg w-8 text-center flex-shrink-0">
                    {getMedal(idx)}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-momentum-100 flex items-center justify-center text-momentum-600 font-medium text-xs flex-shrink-0">
                    {entry.name.split(' ').map((n) => n[0]).join('')}
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

          {/* Most Generous */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-momentum-500" />
                <h3 className="font-semibold text-slate-900">
                  {t('recognition.mostGenerous', 'Most Generous (Given)')}
                </h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {LEADERBOARD_GIVEN.map((entry, idx) => (
                <div
                  key={entry.name}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg w-8 text-center flex-shrink-0">
                    {getMedal(idx)}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium text-xs flex-shrink-0">
                    {entry.name.split(' ').map((n) => n[0]).join('')}
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
      </div>
    </div>
  );
}

// ============================================================
// RECOGNITION CARD COMPONENT
// ============================================================

function RecognitionCard({ recognition, onLike, t }) {
  const { id, from, to, emoji, category, message, timestamp, likes } = recognition;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all">
      <div className="p-5">
        {/* Top row: emoji + from/to + timestamp */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl flex-shrink-0">{emoji}</span>
            <div>
              <p className="text-sm text-slate-900">
                <span className="font-semibold">{from}</span>
                <span className="text-slate-400 mx-1.5">&rarr;</span>
                <span className="font-semibold">{to}</span>
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-momentum-50 text-momentum-700 text-xs font-medium rounded-full">
                {t(`recognition.categories.${category.replace(/\s+/g, '').replace('&', 'And')}`, category)}
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0 pt-0.5">
            {timestamp}
          </span>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-700 leading-relaxed pl-12">
          {message}
        </p>

        {/* Like button */}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => onLike(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors group"
          >
            <Heart className="w-4 h-4 group-hover:fill-red-500 transition-colors" />
            <span className="font-medium">{likes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
