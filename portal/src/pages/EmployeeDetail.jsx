// ============================================================
// EMPLOYEE DETAIL PAGE
// All data from API — no demo data fallbacks
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { employeesApi, skillsApi, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/ToastProvider';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, Award, Plus, Star, Check, X, Shield, Trash, TrendingUp, Briefcase, GraduationCap, AlertTriangle, AlertCircle } from 'lucide-react';

export default function EmployeeDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { isAdmin, isManager } = useAuth();
  const toast = useToast();
  const [employee, setEmployee] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [allSkills, setAllSkills] = useState([]);

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    try {
      setError(null);
      const [empResult, skillsResult, allSkillsResult] = await Promise.all([
        employeesApi.get(id),
        api.get(`/employees/${id}/skills`).catch(() => ({ skills: [] })),
        skillsApi.list().catch(() => ({ skills: [] })),
      ]);

      const emp = empResult?.employee || null;
      setEmployee(emp);
      setSkills(skillsResult?.skills || []);
      setAllSkills(allSkillsResult?.skills || []);
    } catch (err) {
      setError(err.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (skillId, level) => {
    try {
      await employeesApi.addSkill(id, { skillId, level });
      loadEmployee();
      setShowAddSkill(false);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to add skill:', err);
      toast.error('Failed to add skill');
    }
  };

  const handleVerifySkill = async (skillId, verified) => {
    try {
      await api.put(`/employees/${id}/skills/${skillId}`, { verified });
      loadEmployee();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to verify skill:', err);
      toast.error('Failed to verify skill');
    }
  };

  const handleUpdateLevel = async (skillId, level) => {
    try {
      await api.put(`/employees/${id}/skills/${skillId}`, { level });
      loadEmployee();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to update skill level:', err);
      toast.error('Failed to update skill level');
    }
  };

  const handleRemoveSkill = async (skillId) => {
    if (!confirm('Remove this skill from the employee?')) return;
    try {
      await api.delete(`/employees/${id}/skills/${skillId}`);
      loadEmployee();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to remove skill:', err);
      toast.error('Failed to remove skill');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-700 font-medium mb-1">Failed to load employee</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <div className="flex justify-center gap-3">
          <Link to="/employees" className="btn btn-secondary">{t('employeeDetail.backToEmployees', 'Back to Employees')}</Link>
          <button onClick={loadEmployee} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('employeeDetail.notFound', 'Employee not found')}</p>
        <Link to="/employees" className="btn btn-primary mt-4">{t('employeeDetail.backToEmployees', 'Back to Employees')}</Link>
      </div>
    );
  }

  const existingSkillIds = skills.map(s => s.skill_id);
  const availableSkills = allSkills.filter(s => !existingSkillIds.includes(s.id));

  return (
    <div className="space-y-6">
      <Link to="/employees" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        {t('employeeDetail.backToEmployees', 'Back to Employees')}
      </Link>

      <div className="card">
        <div className="p-6 flex items-start gap-6">
          <div className="w-20 h-20 bg-momentum-100 text-momentum-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {employee.first_name?.[0]}{employee.last_name?.[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-slate-600">{employee.role_name || employee.employment_type || '-'}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
              {employee.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {employee.email}
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {employee.phone}
                </div>
              )}
              {employee.location_name && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {employee.location_name}
                </div>
              )}
            </div>
          </div>
          <span className={`badge ${
            employee.status === 'active' ? 'badge-success' :
            employee.status === 'on_leave' ? 'badge-warning' :
            'badge-neutral'
          }`}>
            {employee.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">{t('employeeDetail.employmentDetails', 'Employment Details')}</h2>
          </div>
          <div className="card-body space-y-3">
            <DetailRow label={t('employeeDetail.employeeNumber', 'Employee Number')} value={employee.employee_number} />
            <DetailRow label={t('profile.department', 'Department')} value={employee.department_name} />
            <DetailRow label={t('schedule.role', 'Role')} value={employee.role_name} />
            <DetailRow label={t('employeeDetail.employmentType', 'Employment Type')} value={employee.employment_type} />
            <DetailRow label={t('profile.startDate', 'Start Date')} value={employee.start_date} />
            <DetailRow label={t('profile.manager', 'Manager')} value={employee.manager_name} />
            <DetailRow label={t('employeeDetail.hourlyRate', 'Hourly Rate')} value={employee.hourly_rate ? `£${employee.hourly_rate}` : '-'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{t('employeeDetail.skillsCompetencies', 'Skills & Competencies')}</h2>
            {(isAdmin || isManager) && availableSkills.length > 0 && (
              <button
                onClick={() => setShowAddSkill(true)}
                className="btn btn-secondary text-sm py-1"
              >
                <Plus className="w-4 h-4" />
                {t('skills.addSkill', 'Add Skill')}
              </button>
            )}
          </div>
          <div className="card-body">
            {skills.length > 0 ? (
              <div className="space-y-3">
                {skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        skill.verified ? 'bg-green-100' : 'bg-slate-200'
                      }`}>
                        <Award className={`w-5 h-5 ${skill.verified ? 'text-green-600' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{skill.name}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">{skill.category}</span>
                          {skill.verified && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="w-3 h-3" />
                              {t('skills.verified', 'Verified')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Skill Level */}
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(level => (
                          <button
                            key={level}
                            onClick={() => (isAdmin || isManager) && handleUpdateLevel(skill.skill_id, level)}
                            disabled={!(isAdmin || isManager)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${
                                level <= (skill.level || 1)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200 hover:text-amber-200'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {/* Actions */}
                      {(isAdmin || isManager) && (
                        <div className="flex items-center gap-1">
                          {skill.requires_verification && !skill.verified && (
                            <button
                              onClick={() => handleVerifySkill(skill.skill_id, true)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Verify skill"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveSkill(skill.skill_id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove skill"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">{t('skills.noSkills', 'No skills recorded')}</p>
                {(isAdmin || isManager) && availableSkills.length > 0 && (
                  <button
                    onClick={() => setShowAddSkill(true)}
                    className="btn btn-secondary text-sm mt-3"
                  >
                    <Plus className="w-4 h-4" />
                    {t('employeeDetail.addFirstSkill', 'Add First Skill')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Skill Modal */}
      {showAddSkill && (
        <AddSkillModal
          skills={availableSkills}
          onClose={() => setShowAddSkill(false)}
          onAdd={handleAddSkill}
          t={t}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value || '-'}</span>
    </div>
  );
}

function AddSkillModal({ skills, onClose, onAdd, t }) {
  const [selectedSkill, setSelectedSkill] = useState('');
  const [level, setLevel] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSkill) return;
    setSaving(true);
    await onAdd(selectedSkill, level);
    setSaving(false);
  };

  // Group skills by category
  const grouped = skills.reduce((acc, skill) => {
    const cat = skill.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t('skills.addSkill', 'Add Skill')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTE: Consider adding custom validation beyond HTML5 required/type attributes */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('employeeDetail.selectSkill', 'Select Skill')}</label>
            <select
              required
              value={selectedSkill}
              onChange={e => setSelectedSkill(e.target.value)}
              className="input"
            >
              <option value="">{t('employeeDetail.chooseSkill', 'Choose a skill...')}</option>
              {Object.entries(grouped).map(([category, categorySkills]) => (
                <optgroup key={category} label={category}>
                  {categorySkills.map(skill => (
                    <option key={skill.id} value={skill.id}>{skill.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('employeeDetail.proficiencyLevel', 'Proficiency Level')}</label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      l <= level ? 'text-amber-400 fill-amber-400' : 'text-slate-200 hover:text-amber-200'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-slate-500">
                {level === 1 && t('skills.beginner', 'Beginner')}
                {level === 2 && t('employeeDetail.basic', 'Basic')}
                {level === 3 && t('skills.intermediate', 'Intermediate')}
                {level === 4 && t('skills.advanced', 'Advanced')}
                {level === 5 && t('skills.expert', 'Expert')}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={saving || !selectedSkill} className="btn btn-primary">
              {saving ? t('employeeDetail.adding', 'Adding...') : t('skills.addSkill', 'Add Skill')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
