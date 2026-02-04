// ============================================================
// SHIFT TEMPLATES PAGE
// All data from API — no demo data fallbacks
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { shiftsApi, locationsApi, skillsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/ToastProvider';
import {
  Copy, Plus, Edit, Trash, Calendar, Clock, MapPin, Users,
  Play, X, ChevronRight, CheckCircle, AlertCircle, Award, Target,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function ShiftTemplates() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [templatesResult, locResult] = await Promise.all([
        shiftsApi.getTemplates(),
        locationsApi.list(),
      ]);
      setTemplates(templatesResult.templates || []);
      setLocations(locResult.locations || []);
    } catch (err) {
      setError(err.message || t('shiftTemplates.loadError', 'Failed to load templates'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('shiftTemplates.confirmDelete', 'Delete this template?'))) return;
    try {
      await shiftsApi.deleteTemplate(id);
      loadData();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to delete template:', err);
      toast.error(t('shiftTemplates.failedDelete', 'Failed to delete template'));
    }
  };

  const handleApply = async (templateId, startDate, endDate) => {
    try {
      await shiftsApi.generateFromTemplate(templateId, { startDate, endDate });
      setShowApplyModal(false);
      alert(t('shiftTemplates.shiftsGenerated', 'Shifts generated successfully!'));
    } catch (err) {
      alert(err.message || t('shiftTemplates.generateError', 'Failed to generate shifts'));
    }
  };

  if (!isManager) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900">{t('shiftTemplates.accessRestricted', 'Access Restricted')}</h2>
        <p className="text-slate-500">{t('shiftTemplates.managersOnly', 'Only managers can access shift templates')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium mb-1">{t('shiftTemplates.loadError', 'Failed to load templates')}</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={loadData} className="btn btn-primary">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('shiftTemplates.title', 'Shift Templates')}</h1>
          <p className="text-slate-600">{t('shiftTemplates.subtitle', 'Create reusable shift patterns')}</p>
        </div>
        <button onClick={() => { setEditingTemplate(null); setShowModal(true); }} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t('shiftTemplates.newTemplate', 'New Template')}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-32 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-40" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center">
          <Copy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">{t('shiftTemplates.noTemplates', 'No templates yet')}</h3>
          <p className="text-slate-500 mt-1">{t('shiftTemplates.createHint', 'Create a template to quickly generate recurring shifts')}</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary mt-4">
            <Plus className="w-4 h-4" />
            {t('shiftTemplates.createFirst', 'Create First Template')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="card p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900">{template.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingTemplate(template); setShowModal(true); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-4">
                {template.location_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {template.location_name}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {template.start_time} - {template.end_time}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {template.days_of_week?.map(d => [t('common.sunday', 'Sun'), t('common.monday', 'Mon'), t('schedule.tuesday', 'Tue'), t('schedule.wednesday', 'Wed'), t('schedule.thursday', 'Thu'), t('schedule.friday', 'Fri'), t('schedule.saturday', 'Sat')][d]).join(', ') || t('shiftTemplates.allDays', 'All days')}
                </div>
                {template.headcount > 1 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {template.headcount} {t('shiftTemplates.shiftsPerDay', 'shifts per day')}
                  </div>
                )}
              </div>

              <button
                onClick={() => { setSelectedTemplate(template); setShowApplyModal(true); }}
                className="btn btn-secondary w-full text-sm"
              >
                <Play className="w-4 h-4" />
                {t('shiftTemplates.generateShifts', 'Generate Shifts')}
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          template={editingTemplate}
          locations={locations}
          onClose={() => { setShowModal(false); setEditingTemplate(null); }}
          onSave={loadData}
          t={t}
        />
      )}

      {showApplyModal && selectedTemplate && (
        <ApplyTemplateModal
          template={selectedTemplate}
          onClose={() => { setShowApplyModal(false); setSelectedTemplate(null); }}
          onApply={handleApply}
          t={t}
        />
      )}
    </div>
  );
}

// Preset rotation patterns
const getRotationPatterns = (t) => [
  { id: 'custom', name: t('shiftTemplates.patterns.customDays', 'Custom Days'), description: t('shiftTemplates.patterns.customDaysDesc', 'Select specific days'), icon: Calendar },
  { id: 'mon-fri', name: t('shiftTemplates.patterns.monFri', 'Monday to Friday'), description: t('shiftTemplates.patterns.monFriDesc', 'Standard work week'), days: [1, 2, 3, 4, 5], icon: Calendar },
  { id: 'weekend', name: t('shiftTemplates.patterns.weekend', 'Weekend Only'), description: t('shiftTemplates.patterns.weekendDesc', 'Saturday and Sunday'), days: [0, 6], icon: Calendar },
  { id: '4on4off', name: t('shiftTemplates.patterns.4on4off', '4 On / 4 Off'), description: t('shiftTemplates.patterns.4on4offDesc', 'Continental shift pattern'), rotationDays: 8, workDays: 4, icon: Clock },
  { id: '2week', name: t('shiftTemplates.patterns.2week', '2 Week Rotation'), description: t('shiftTemplates.patterns.2weekDesc', 'Alternating fortnight pattern'), rotationDays: 14, workDays: 10, icon: Clock },
  { id: '3on3off', name: t('shiftTemplates.patterns.3on3off', '3 On / 3 Off'), description: t('shiftTemplates.patterns.3on3offDesc', 'Common retail pattern'), rotationDays: 6, workDays: 3, icon: Clock },
  { id: '5on2off', name: t('shiftTemplates.patterns.5on2off', '5 On / 2 Off'), description: t('shiftTemplates.patterns.5on2offDesc', 'Standard with rotating days off'), rotationDays: 7, workDays: 5, icon: Clock },
];

function TemplateModal({ template, locations, onClose, onSave, t }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: template?.name || '',
    locationId: template?.location_id || '',
    startTime: template?.start_time || '09:00',
    endTime: template?.end_time || '17:00',
    breakMinutes: template?.break_minutes || 30,
    daysOfWeek: template?.days_of_week || [1, 2, 3, 4, 5],
    headcount: template?.headcount || 1,
    isOpen: template?.is_open || false,
    rotationPattern: template?.rotation_pattern || 'mon-fri',
    requiredSkills: template?.required_skills || [],
    developmentShift: template?.development_shift || false,
  });
  const [saving, setSaving] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);

  useEffect(() => {
    skillsApi.list().then(result => {
      setAvailableSkills(result.skills || []);
    }).catch(() => {});
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePatternChange = (patternId) => {
    const rotationPatterns = getRotationPatterns(t);
    const pattern = rotationPatterns.find(p => p.id === patternId);
    if (pattern?.days) {
      setForm(f => ({ ...f, rotationPattern: patternId, daysOfWeek: pattern.days }));
    } else {
      setForm(f => ({ ...f, rotationPattern: patternId }));
    }
  };

  const toggleSkill = (skillId) => {
    setForm(f => ({
      ...f,
      requiredSkills: f.requiredSkills.includes(skillId)
        ? f.requiredSkills.filter(s => s !== skillId)
        : [...f.requiredSkills, skillId]
    }));
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day].sort()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (template) {
        await shiftsApi.updateTemplate(template.id, form);
      } else {
        await shiftsApi.createTemplate(form);
      }
      onSave();
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to save template:', err);
      toast.error(t('shiftTemplates.failedSave', 'Failed to save template'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">{template ? t('shiftTemplates.editTemplate', 'Edit Template') : t('shiftTemplates.newTemplate', 'New Template')}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title={t('common.closeEsc', 'Close (ESC)')}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form id="template-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="label">{t('shiftTemplates.templateName', 'Template Name')}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={t('shiftTemplates.namePlaceholder', 'e.g., Morning Shift, Weekend Coverage')}
              className="input"
            />
          </div>

          <div>
            <label className="label">{t('schedule.location', 'Location')}</label>
            <select
              value={form.locationId}
              onChange={e => setForm({ ...form, locationId: e.target.value })}
              className="input"
            >
              <option value="">{t('reports.allLocations', 'All locations')}</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('schedule.startTime', 'Start Time')}</label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('schedule.endTime', 'End Time')}</label>
              <input
                type="time"
                required
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Rotation Pattern Selection */}
          <div>
            <label className="label">{t('shiftTemplates.rotationPattern', 'Rotation Pattern')}</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {getRotationPatterns(t).slice(0, 4).map((pattern) => (
                <button
                  key={pattern.id}
                  type="button"
                  onClick={() => handlePatternChange(pattern.id)}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    form.rotationPattern === pattern.id
                      ? 'border-momentum-500 bg-momentum-50 text-momentum-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-sm">{pattern.name}</p>
                  <p className="text-xs text-slate-500">{pattern.description}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {getRotationPatterns(t).slice(4).map((pattern) => (
                <button
                  key={pattern.id}
                  type="button"
                  onClick={() => handlePatternChange(pattern.id)}
                  className={`p-2 text-center rounded-lg border transition-colors ${
                    form.rotationPattern === pattern.id
                      ? 'border-momentum-500 bg-momentum-50 text-momentum-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-xs">{pattern.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days */}
          {form.rotationPattern === 'custom' && (
            <div>
              <label className="label">{t('shiftTemplates.selectDays', 'Select Days')}</label>
              <div className="flex gap-1">
                {dayNames.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
                      form.daysOfWeek.includes(i)
                        ? 'bg-momentum-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('shiftTemplates.shiftsPerDayLabel', 'Shifts per Day')}</label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.headcount}
                onChange={e => setForm({ ...form, headcount: parseInt(e.target.value) || 1 })}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('shiftTemplates.breakMin', 'Break (min)')}</label>
              <input
                type="number"
                min="0"
                value={form.breakMinutes}
                onChange={e => setForm({ ...form, breakMinutes: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="label flex items-center justify-between">
              <span>{t('shiftTemplates.requiredSkills', 'Required Skills')}</span>
              <span className="text-xs text-slate-500">{t('shiftTemplates.aiMatchHint', 'AI Fill will match workers with these skills')}</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.requiredSkills.map(skillId => {
                const skill = availableSkills.find(s => s.id === skillId);
                return skill ? (
                  <span
                    key={skillId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-momentum-100 text-momentum-700 rounded-full text-xs"
                  >
                    {skill.name}
                    <button type="button" onClick={() => toggleSkill(skillId)} className="hover:text-momentum-900">
                      &times;
                    </button>
                  </span>
                ) : null;
              })}
              {form.requiredSkills.length === 0 && (
                <span className="text-sm text-slate-400">{t('shiftTemplates.noSkillsRequired', 'No skills required')}</span>
              )}
            </div>
            {availableSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableSkills.filter(s => !form.requiredSkills.includes(s.id)).slice(0, 10).map(skill => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200"
                  >
                    + {skill.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="isOpen"
                checked={form.isOpen}
                onChange={e => setForm({ ...form, isOpen: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="isOpen" className="text-sm">
                <span className="font-medium text-slate-900">{t('shiftTemplates.createAsOpen', 'Create as open shifts')}</span>
                <p className="text-slate-500">{t('shiftTemplates.canClaim', 'Employees can claim these shifts')}</p>
              </label>
            </div>

            <div className="flex items-center gap-2 p-3 bg-momentum-50 rounded-lg border border-momentum-200">
              <input
                type="checkbox"
                id="developmentShift"
                checked={form.developmentShift}
                onChange={e => setForm({ ...form, developmentShift: e.target.checked })}
                className="rounded border-momentum-300 text-momentum-500"
              />
              <label htmlFor="developmentShift" className="text-sm">
                <span className="font-medium text-momentum-900">{t('shiftTemplates.developmentShift', 'Career Development Shift')}</span>
                <p className="text-momentum-700">{t('shiftTemplates.developmentHint', 'AI Fill will prioritize workers building toward promotions')}</p>
              </label>
            </div>
          </div>
        </form>

        {/* Sticky footer buttons */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white rounded-b-xl">
          <button type="button" onClick={onClose} className="btn btn-secondary">{t('common.cancel', 'Cancel')}</button>
          <button type="submit" form="template-form" disabled={saving} className="btn btn-primary">
            {saving ? t('settings.saving', 'Saving...') : template ? t('common.update', 'Update') : t('common.create', 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplyTemplateModal({ template, onClose, onApply, t }) {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 13), 'yyyy-MM-dd'));
  const [applying, setApplying] = useState(false);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApplying(true);
    await onApply(template.id, startDate, endDate);
    setApplying(false);
  };

  // Calculate estimated shifts
  const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
  const matchingDays = Math.floor(daysDiff / 7) * (template.days_of_week?.length || 0);
  const estimatedShifts = matchingDays * (template.headcount || 1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('shiftTemplates.generateShifts', 'Generate Shifts')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-medium text-slate-900">{template.name}</h3>
            <p className="text-sm text-slate-600">
              {template.start_time} - {template.end_time} - {template.days_of_week?.map(d => [t('common.sunday', 'Sun'), t('common.monday', 'Mon'), t('schedule.tuesday', 'Tue'), t('schedule.wednesday', 'Wed'), t('schedule.thursday', 'Thu'), t('schedule.friday', 'Fri'), t('schedule.saturday', 'Sat')][d]).join(', ')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('reports.startDate', 'Start Date')}</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('reports.endDate', 'End Date')}</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                className="input"
              />
            </div>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {t('shiftTemplates.willCreate', 'This will create approximately')} <strong>{estimatedShifts}</strong> {t('shiftTemplates.shiftsLabel', 'shifts')}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">{t('common.cancel', 'Cancel')}</button>
            <button type="submit" disabled={applying} className="btn btn-primary">
              <Play className="w-4 h-4" />
              {applying ? t('shiftTemplates.generating', 'Generating...') : t('shiftTemplates.generateShifts', 'Generate Shifts')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
