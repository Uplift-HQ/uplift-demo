// ============================================================
// NOTIFICATIONS SETTINGS PAGE
// Configure notification preferences
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Bell, BellOff, Mail, Smartphone, MessageSquare, Calendar,
  Clock, Users, Award, Briefcase, AlertCircle, Check, Save,
} from 'lucide-react';

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    // Channels
    email: true,
    push: true,
    sms: false,
    
    // Notification types
    scheduleChanges: true,
    shiftReminders: true,
    shiftSwaps: true,
    openShifts: true,
    timeApprovals: true,
    teamUpdates: true,
    skillUpdates: true,
    jobPostings: true,
    announcements: true,
    
    // Timing
    reminderHoursBefore: 24,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const result = await api.get('/notifications/preferences');
      if (result.preferences) {
        setPreferences(prev => ({ ...prev, ...result.preferences }));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/preferences', preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('notificationSettings.title', 'Notification Preferences')}</h1>
          <p className="text-slate-600">{t('notificationSettings.subtitle', 'Choose how and when you receive notifications')}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('settings.saving', 'Saving...')}
            </span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t('settings.saveChanges', 'Save Changes')}
            </>
          )}
        </button>
      </div>

      {/* Notification Channels */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {t('notificationSettings.channels', 'Notification Channels')}
        </h2>
        <p className="text-slate-600 mb-6">{t('notificationSettings.channelsDesc', 'Choose how you want to receive notifications')}</p>

        <div className="space-y-4">
          <ChannelToggle
            icon={Mail}
            label={t('notificationSettings.email', 'Email')}
            description={t('notificationSettings.emailDesc', 'Receive notifications via email')}
            enabled={preferences.email}
            onChange={() => togglePreference('email')}
          />
          <ChannelToggle
            icon={Smartphone}
            label={t('settings.pushNotifications', 'Push Notifications')}
            description={t('notificationSettings.pushDesc', 'Receive push notifications on your device')}
            enabled={preferences.push}
            onChange={() => togglePreference('push')}
          />
          <ChannelToggle
            icon={MessageSquare}
            label={t('notificationSettings.sms', 'SMS')}
            description={t('notificationSettings.smsDesc', 'Receive text messages for urgent notifications')}
            enabled={preferences.sms}
            onChange={() => togglePreference('sms')}
          />
        </div>
      </div>

      {/* Notification Types */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('notificationSettings.types', 'Notification Types')}</h2>
        <p className="text-slate-600 mb-6">{t('notificationSettings.typesDesc', 'Select which notifications you want to receive')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TypeToggle
            icon={Calendar}
            label={t('notificationSettings.scheduleChanges', 'Schedule Changes')}
            description={t('notificationSettings.scheduleChangesDesc', 'When your shifts are modified')}
            enabled={preferences.scheduleChanges}
            onChange={() => togglePreference('scheduleChanges')}
          />
          <TypeToggle
            icon={Clock}
            label={t('settings.shiftReminders', 'Shift Reminders')}
            description={t('notificationSettings.shiftRemindersDesc', 'Reminders before your shift starts')}
            enabled={preferences.shiftReminders}
            onChange={() => togglePreference('shiftReminders')}
          />
          <TypeToggle
            icon={Users}
            label={t('notificationSettings.shiftSwaps', 'Shift Swaps')}
            description={t('notificationSettings.shiftSwapsDesc', 'Swap requests and approvals')}
            enabled={preferences.shiftSwaps}
            onChange={() => togglePreference('shiftSwaps')}
          />
          <TypeToggle
            icon={Bell}
            label={t('schedule.openShifts', 'Open Shifts')}
            description={t('notificationSettings.openShiftsDesc', 'New open shifts available')}
            enabled={preferences.openShifts}
            onChange={() => togglePreference('openShifts')}
          />
          <TypeToggle
            icon={Check}
            label={t('notificationSettings.timeApprovals', 'Time Approvals')}
            description={t('notificationSettings.timeApprovalsDesc', 'Timesheet approval status')}
            enabled={preferences.timeApprovals}
            onChange={() => togglePreference('timeApprovals')}
          />
          <TypeToggle
            icon={Users}
            label={t('notificationSettings.teamUpdates', 'Team Updates')}
            description={t('notificationSettings.teamUpdatesDesc', 'News from your team')}
            enabled={preferences.teamUpdates}
            onChange={() => togglePreference('teamUpdates')}
          />
          <TypeToggle
            icon={Award}
            label={t('notificationSettings.skillUpdates', 'Skill Updates')}
            description={t('notificationSettings.skillUpdatesDesc', 'Skill verifications and achievements')}
            enabled={preferences.skillUpdates}
            onChange={() => togglePreference('skillUpdates')}
          />
          <TypeToggle
            icon={Briefcase}
            label={t('notificationSettings.jobPostings', 'Job Postings')}
            description={t('notificationSettings.jobPostingsDesc', 'New internal opportunities')}
            enabled={preferences.jobPostings}
            onChange={() => togglePreference('jobPostings')}
          />
        </div>
      </div>

      {/* Timing Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {t('notificationSettings.timing', 'Timing')}
        </h2>

        <div className="space-y-6">
          {/* Shift Reminders */}
          <div>
            <label className="label">{t('notificationSettings.shiftReminderTime', 'Shift Reminder Time')}</label>
            <select
              value={preferences.reminderHoursBefore}
              onChange={(e) => setPreferences({ ...preferences, reminderHoursBefore: parseInt(e.target.value) })}
              className="input w-auto"
            >
              <option value={1}>{t('notificationSettings.1hourBefore', '1 hour before')}</option>
              <option value={2}>{t('notificationSettings.2hoursBefore', '2 hours before')}</option>
              <option value={4}>{t('notificationSettings.4hoursBefore', '4 hours before')}</option>
              <option value={12}>{t('notificationSettings.12hoursBefore', '12 hours before')}</option>
              <option value={24}>{t('notificationSettings.24hoursBefore', '24 hours before')}</option>
              <option value={48}>{t('notificationSettings.48hoursBefore', '48 hours before')}</option>
            </select>
          </div>

          {/* Quiet Hours */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-slate-900">{t('notificationSettings.quietHours', 'Quiet Hours')}</h3>
                <p className="text-sm text-slate-500">{t('notificationSettings.quietHoursDesc', 'Pause non-urgent notifications during specific hours')}</p>
              </div>
              <button
                onClick={() => togglePreference('quietHoursEnabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.quietHoursEnabled ? 'bg-momentum-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.quietHoursEnabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {preferences.quietHoursEnabled && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="label">{t('common.start', 'Start')}</label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => setPreferences({ ...preferences, quietHoursStart: e.target.value })}
                    className="input w-auto"
                  />
                </div>
                <span className="mt-6 text-slate-400">{t('common.to', 'to')}</span>
                <div>
                  <label className="label">{t('common.end', 'End')}</label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => setPreferences({ ...preferences, quietHoursEnd: e.target.value })}
                    className="input w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
          <BellOff className="w-5 h-5" />
          {t('notificationSettings.disableAll', 'Disable All Notifications')}
        </h2>
        <p className="text-slate-600 mb-4">
          {t('notificationSettings.disableAllDesc', 'Turn off all notifications. You can still access updates in the app.')}
        </p>
        <button
          className="btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
          onClick={async () => {
            if (confirm(t('notificationSettings.disableConfirm', 'Are you sure you want to disable all notifications? You can re-enable them anytime.'))) {
              const disabledPrefs = {
                ...preferences,
                email: false,
                push: false,
                sms: false,
                scheduleChanges: false,
                shiftReminders: false,
                shiftSwaps: false,
                openShifts: false,
                timeApprovals: false,
                teamUpdates: false,
                skillUpdates: false,
                jobPostings: false,
                announcements: false,
              };
              try {
                await api.put('/notifications/preferences', disabledPrefs);
                setPreferences(disabledPrefs);
              } catch (error) {
                console.error('Failed to disable notifications:', error);
              }
            }
          }}
        >
          {t('notificationSettings.disableAll', 'Disable All Notifications')}
        </button>
      </div>
    </div>
  );
}

function ChannelToggle({ icon: Icon, label, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-momentum-100 text-momentum-600' : 'bg-slate-200 text-slate-400'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{label}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-momentum-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  );
}

function TypeToggle({ icon: Icon, label, description, enabled, onChange }) {
  return (
    <div 
      onClick={onChange}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
        enabled 
          ? 'border-momentum-500 bg-momentum-50' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded ${enabled ? 'bg-momentum-100 text-momentum-600' : 'bg-slate-100 text-slate-400'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900">{label}</h3>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              enabled ? 'border-momentum-500 bg-momentum-500' : 'border-slate-300'
            }`}>
              {enabled && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}
