// ============================================================
// ONBOARDING WIZARD PAGE
// Multi-step wizard for onboarding new employees
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  employeesApi,
  departmentsApi,
  rolesApi,
  locationsApi,
  skillsApi,
  authApi,
} from '../lib/api';
import {
  User,
  Briefcase,
  Award,
  CalendarClock,
  Send,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Employee Details', icon: User },
  { id: 2, label: 'Role & Department', icon: Briefcase },
  { id: 3, label: 'Skills & Certs', icon: Award },
  { id: 4, label: 'Availability', icon: CalendarClock },
  { id: 5, label: 'Invitation', icon: Send },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFT_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'casual', 'contractor'];

function generateEmployeeId() {
  return 'EMP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================================
// STEP 1: Employee Details
// ============================================================
function StepEmployeeDetails({ data, onChange, errors }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Employee Details</h3>
        <p className="text-sm text-slate-500">Enter the basic information for the new employee.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
          <input
            type="text"
            value={data.firstName || ''}
            onChange={(e) => update('firstName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.firstName ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder="e.g. John"
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
          <input
            type="text"
            value={data.lastName || ''}
            onChange={(e) => update('lastName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.lastName ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder="e.g. Smith"
          />
          {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => update('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
            placeholder="e.g. john.smith@company.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            placeholder="e.g. +44 7700 900000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type *</label>
          <select
            value={data.employmentType || ''}
            onChange={(e) => update('employmentType', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.employmentType ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">Select type...</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
          {errors.employmentType && <p className="mt-1 text-xs text-red-600">{errors.employmentType}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
          <input
            type="date"
            value={data.startDate || ''}
            onChange={(e) => update('startDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.startDate ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          />
          {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
          <input
            type="text"
            value={data.employeeId || ''}
            onChange={(e) => update('employeeId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            placeholder="Auto-generated if left blank"
          />
          <p className="mt-1 text-xs text-slate-400">Leave blank to auto-generate.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2: Role & Department
// ============================================================
function StepRoleDepartment({ data, onChange, errors, departments, roles, locations, employees }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Role & Department</h3>
        <p className="text-sm text-slate-500">Assign the employee to a department, role and location.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
          <select
            value={data.department || ''}
            onChange={(e) => update('department', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.department ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
          <select
            value={data.role || ''}
            onChange={(e) => update('role', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.role ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">Select role...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
          <select
            value={data.location || ''}
            onChange={(e) => update('location', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
              errors.location ? 'border-red-300 bg-red-50' : 'border-slate-300'
            }`}
          >
            <option value="">Select location...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pay Rate *</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.payRate || ''}
                onChange={(e) => update('payRate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500 ${
                  errors.payRate ? 'border-red-300 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="0.00"
              />
            </div>
            <select
              value={data.payType || 'hourly'}
              onChange={(e) => update('payType', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
            >
              <option value="hourly">/ hour</option>
              <option value="salary">/ year</option>
            </select>
          </div>
          {errors.payRate && <p className="mt-1 text-xs text-red-600">{errors.payRate}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Manager</label>
          <select
            value={data.managerId || ''}
            onChange={(e) => update('managerId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          >
            <option value="">Select manager (optional)...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3: Skills & Certifications
// ============================================================
function StepSkillsCertifications({ data, onChange, availableSkills }) {
  const selectedSkills = data.skills || [];
  const certifications = data.certifications || [];

  const toggleSkill = (skill) => {
    const existing = selectedSkills.find((s) => s.id === skill.id);
    if (existing) {
      onChange({ ...data, skills: selectedSkills.filter((s) => s.id !== skill.id) });
    } else {
      onChange({ ...data, skills: [...selectedSkills, { id: skill.id, name: skill.name, proficiency: 'beginner' }] });
    }
  };

  const updateSkillProficiency = (skillId, proficiency) => {
    onChange({
      ...data,
      skills: selectedSkills.map((s) => (s.id === skillId ? { ...s, proficiency } : s)),
    });
  };

  const addCertification = () => {
    onChange({
      ...data,
      certifications: [...certifications, { name: '', expiryDate: '', issuer: '' }],
    });
  };

  const updateCert = (index, field, value) => {
    const updated = [...certifications];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, certifications: updated });
  };

  const removeCert = (index) => {
    onChange({ ...data, certifications: certifications.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Skills & Certifications</h3>
        <p className="text-sm text-slate-500">Select skills and add any certifications the employee holds.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Skills</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {availableSkills.map((skill) => {
            const isSelected = selectedSkills.some((s) => s.id === skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-momentum-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 inline mr-1" />}
                {skill.name}
              </button>
            );
          })}
          {availableSkills.length === 0 && (
            <p className="text-sm text-slate-400 italic">No skills defined yet. Add skills in the Skills page first.</p>
          )}
        </div>

        {selectedSkills.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase">Set Proficiency Levels</p>
            {selectedSkills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">{skill.name}</span>
                <div className="flex gap-1">
                  {PROFICIENCY_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => updateSkillProficiency(skill.id, level)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        skill.proficiency === level
                          ? 'bg-momentum-500 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">Certifications</label>
          <button
            type="button"
            onClick={addCertification}
            className="flex items-center gap-1 text-sm text-momentum-600 hover:text-momentum-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        </div>

        {certifications.length === 0 && (
          <p className="text-sm text-slate-400 italic">No certifications added yet.</p>
        )}

        <div className="space-y-3">
          {certifications.map((cert, index) => (
            <div key={index} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => updateCert(index, 'name', e.target.value)}
                  placeholder="Certification name"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                />
                <input
                  type="text"
                  value={cert.issuer}
                  onChange={(e) => updateCert(index, 'issuer', e.target.value)}
                  placeholder="Issuing body"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                />
                <input
                  type="date"
                  value={cert.expiryDate}
                  onChange={(e) => updateCert(index, 'expiryDate', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCert(index)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: Availability & Preferences
// ============================================================
function StepAvailability({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value });
  const daysAvailable = data.daysAvailable || [];
  const preferredShifts = data.preferredShifts || [];

  const toggleDay = (day) => {
    if (daysAvailable.includes(day)) {
      update('daysAvailable', daysAvailable.filter((d) => d !== day));
    } else {
      update('daysAvailable', [...daysAvailable, day]);
    }
  };

  const toggleShift = (shift) => {
    if (preferredShifts.includes(shift)) {
      update('preferredShifts', preferredShifts.filter((s) => s !== shift));
    } else {
      update('preferredShifts', [...preferredShifts, shift]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Availability & Preferences</h3>
        <p className="text-sm text-slate-500">Set the employee's availability and scheduling preferences.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Days Available</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                daysAvailable.includes(day)
                  ? 'bg-momentum-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Shift Times</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SHIFT_TIMES.map((shift) => (
            <button
              key={shift}
              type="button"
              onClick={() => toggleShift(shift)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                preferredShifts.includes(shift)
                  ? 'bg-momentum-50 border-momentum-500 text-momentum-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {shift}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-slate-700 mb-1">Max Hours Per Week</label>
        <input
          type="number"
          min="0"
          max="168"
          value={data.maxHoursPerWeek || ''}
          onChange={(e) => update('maxHoursPerWeek', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          placeholder="e.g. 40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Restrictions / Notes</label>
        <textarea
          value={data.notes || ''}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
          placeholder="Any scheduling restrictions, preferences or notes..."
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: Invitation
// ============================================================
function StepInvitation({ formData, inviteSettings, onChangeInviteSettings }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Review & Send Invitation</h3>
        <p className="text-sm text-slate-500">Review the details and invite the employee to the Uplift app.</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-slate-500">Name:</span>{' '}
            <span className="font-medium text-slate-900">{formData.firstName} {formData.lastName}</span>
          </div>
          <div>
            <span className="text-slate-500">Email:</span>{' '}
            <span className="font-medium text-slate-900">{formData.email}</span>
          </div>
          {formData.phone && (
            <div>
              <span className="text-slate-500">Phone:</span>{' '}
              <span className="font-medium text-slate-900">{formData.phone}</span>
            </div>
          )}
          <div>
            <span className="text-slate-500">Type:</span>{' '}
            <span className="font-medium text-slate-900 capitalize">{formData.employmentType?.replace('-', ' ')}</span>
          </div>
          <div>
            <span className="text-slate-500">Start Date:</span>{' '}
            <span className="font-medium text-slate-900">{formData.startDate}</span>
          </div>
          <div>
            <span className="text-slate-500">Employee ID:</span>{' '}
            <span className="font-medium text-slate-900">{formData.employeeId || 'Auto-generated'}</span>
          </div>
          {formData.skills?.length > 0 && (
            <div className="md:col-span-2">
              <span className="text-slate-500">Skills:</span>{' '}
              <span className="font-medium text-slate-900">
                {formData.skills.map((s) => `${s.name} (${s.proficiency})`).join(', ')}
              </span>
            </div>
          )}
          {formData.daysAvailable?.length > 0 && (
            <div className="md:col-span-2">
              <span className="text-slate-500">Available:</span>{' '}
              <span className="font-medium text-slate-900">
                {formData.daysAvailable.map((d) => d.slice(0, 3)).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            id="sendInvite"
            type="checkbox"
            checked={inviteSettings.sendEmail}
            onChange={(e) => onChangeInviteSettings({ ...inviteSettings, sendEmail: e.target.checked })}
            className="w-4 h-4 text-momentum-500 border-slate-300 rounded focus:ring-momentum-500"
          />
          <label htmlFor="sendInvite" className="text-sm text-slate-700">
            <span className="font-medium">Send invitation email</span>
            <span className="block text-slate-500">The employee will receive an email to download the Uplift app and set up their account.</span>
          </label>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="setPassword"
            type="checkbox"
            checked={inviteSettings.setPassword}
            onChange={(e) => onChangeInviteSettings({ ...inviteSettings, setPassword: e.target.checked })}
            className="w-4 h-4 text-momentum-500 border-slate-300 rounded focus:ring-momentum-500 mt-0.5"
          />
          <div className="flex-1">
            <label htmlFor="setPassword" className="text-sm text-slate-700">
              <span className="font-medium">Set temporary password</span>
              <span className="block text-slate-500">Set a temporary password the employee can use to log in initially.</span>
            </label>
            {inviteSettings.setPassword && (
              <div className="mt-2 relative max-w-xs">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inviteSettings.temporaryPassword || ''}
                  onChange={(e) => onChangeInviteSettings({ ...inviteSettings, temporaryPassword: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-momentum-500 focus:border-momentum-500"
                  placeholder="Temporary password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUCCESS STATE
// ============================================================
function SuccessState({ formData, onViewEmployee, onOnboardAnother }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Employee Onboarded Successfully!</h2>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        <span className="font-medium text-slate-700">{formData.firstName} {formData.lastName}</span> has been added to the system
        and an invitation has been sent to <span className="font-medium text-slate-700">{formData.email}</span>.
      </p>

      <div className="bg-slate-50 rounded-xl p-6 max-w-sm mx-auto mb-8 text-left space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Employee ID</span>
          <span className="font-medium text-slate-900">{formData.employeeId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Start Date</span>
          <span className="font-medium text-slate-900">{formData.startDate}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onViewEmployee}
          className="px-4 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
        >
          View Employees
        </button>
        <button
          onClick={onOnboardAnother}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Onboard Another
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN ONBOARDING COMPONENT
// ============================================================
export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [refDataLoading, setRefDataLoading] = useState(true);

  const [inviteSettings, setInviteSettings] = useState({
    sendEmail: true,
    setPassword: false,
    temporaryPassword: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      setRefDataLoading(true);
      try {
        const [deptRes, roleRes, locRes, skillRes, empRes] = await Promise.allSettled([
          departmentsApi.list(),
          rolesApi.list(),
          locationsApi.list(),
          skillsApi.list(),
          employeesApi.list(),
        ]);
        if (deptRes.status === 'fulfilled') {
          const d = deptRes.value?.departments || deptRes.value || [];
          if (d.length) setDepartments(d);
        }
        if (roleRes.status === 'fulfilled') {
          const r = roleRes.value?.roles || roleRes.value || [];
          if (r.length) setRoles(r);
        }
        if (locRes.status === 'fulfilled') {
          const l = locRes.value?.locations || locRes.value || [];
          if (l.length) setLocations(l);
        }
        if (skillRes.status === 'fulfilled') {
          const s = skillRes.value?.skills || skillRes.value || [];
          if (s.length) setAvailableSkills(s);
        }
        if (empRes.status === 'fulfilled') {
          const e = empRes.value?.employees || empRes.value?.data || empRes.value || [];
          if (e.length) setEmployees(e);
        }
      } catch {
        // Reference data fetch failed
      } finally {
        setRefDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const validateStep = useCallback((step) => {
    const errs = {};
    if (step === 1) {
      if (!formData.firstName?.trim()) errs.firstName = 'First name is required';
      if (!formData.lastName?.trim()) errs.lastName = 'Last name is required';
      if (!formData.email?.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email address';
      if (!formData.employmentType) errs.employmentType = 'Employment type is required';
      if (!formData.startDate) errs.startDate = 'Start date is required';
    }
    if (step === 2) {
      if (!formData.department) errs.department = 'Department is required';
      if (!formData.role) errs.role = 'Role is required';
      if (!formData.location) errs.location = 'Location is required';
      if (!formData.payRate || parseFloat(formData.payRate) <= 0) errs.payRate = 'Valid pay rate is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 5));
      setGlobalError('');
    }
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    setErrors({});
    setGlobalError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setGlobalError('');
    const employeeId = formData.employeeId || generateEmployeeId();
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone || null,
      employment_type: formData.employmentType,
      start_date: formData.startDate,
      employee_id: employeeId,
      department_id: formData.department,
      primary_role_id: formData.role,
      location_id: formData.location,
      pay_rate: parseFloat(formData.payRate),
      pay_type: formData.payType || 'hourly',
      manager_id: formData.managerId || null,
      skills: (formData.skills || []).map(s => ({ skill_id: s.id, level: s.proficiency === 'advanced' ? 3 : s.proficiency === 'intermediate' ? 2 : 1 })),
      certifications: (formData.certifications || []).filter((c) => c.name),
      availability: {
        days: formData.daysAvailable || [],
        preferred_shifts: formData.preferredShifts || [],
        max_hours_per_week: formData.maxHoursPerWeek ? parseInt(formData.maxHoursPerWeek) : null,
        notes: formData.notes || '',
      },
      status: 'active',
    };

    try {
      await employeesApi.create(payload);
      if (inviteSettings.sendEmail) {
        try {
          await authApi.inviteUser({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: 'worker',
          });
        } catch {
          // Invitation failed but employee was created
        }
      }
      setFormData({ ...formData, employeeId });
      setCompleted(true);
    } catch (err) {
      setGlobalError(err.message || 'Failed to create employee. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setFormData({});
    setErrors({});
    setGlobalError('');
    setCurrentStep(1);
    setCompleted(false);
    setInviteSettings({ sendEmail: true, setPassword: false, temporaryPassword: '' });
  };

  if (completed) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('nav.onboarding', 'Employee Onboarding')}</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <SuccessState
            formData={formData}
            onViewEmployee={() => navigate('/employees')}
            onOnboardAnother={resetWizard}
          />
        </div>
      </div>
    );
  }

  if (refDataLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('nav.onboarding', 'Employee Onboarding')}</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-momentum-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading organisation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.onboarding', 'Employee Onboarding')}</h1>
        <p className="text-slate-500 mt-1">Add a new employee and invite them to the Uplift app.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Progress bar */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isDone
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-momentum-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span
                      className={`hidden md:block text-xs mt-1 font-medium ${
                        isActive ? 'text-momentum-600' : isDone ? 'text-green-600' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-8 lg:w-16 h-0.5 mx-1 lg:mx-2 ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1">
            <div
              className="bg-momentum-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {globalError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {globalError}
          </div>
        )}

        {/* Step content */}
        <div className="p-6">
          {currentStep === 1 && <StepEmployeeDetails data={formData} onChange={setFormData} errors={errors} />}
          {currentStep === 2 && (
            <StepRoleDepartment
              data={formData} onChange={setFormData} errors={errors}
              departments={departments} roles={roles} locations={locations} employees={employees}
            />
          )}
          {currentStep === 3 && <StepSkillsCertifications data={formData} onChange={setFormData} availableSkills={availableSkills} />}
          {currentStep === 4 && <StepAvailability data={formData} onChange={setFormData} />}
          {currentStep === 5 && <StepInvitation formData={formData} inviteSettings={inviteSettings} onChangeInviteSettings={setInviteSettings} />}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <span className="text-sm text-slate-400">Step {currentStep} of {STEPS.length}</span>

          {currentStep < 5 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-momentum-500 text-white rounded-lg text-sm font-medium hover:bg-momentum-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
              ) : (
                <><UserPlus className="w-4 h-4" />Create Employee</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
