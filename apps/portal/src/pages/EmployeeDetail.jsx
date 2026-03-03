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
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, Award, Plus, Star, Check, X, Shield, Trash, TrendingUp, Briefcase, GraduationCap, AlertTriangle, AlertCircle, QrCode, Download, Copy, CreditCard } from 'lucide-react';

export default function EmployeeDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { isManagerOrAbove } = useAuth();
  const toast = useToast();
  const [employee, setEmployee] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [allSkills, setAllSkills] = useState([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState(false);
  const [badgeId, setBadgeId] = useState('');

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
      setError(err.message || t('employeeDetail.loadError', 'Failed to load employee'));
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
      toast.error(t('employees.failedAddSkill', 'Failed to add skill'));
    }
  };

  const handleVerifySkill = async (skillId, verified) => {
    try {
      await api.put(`/employees/${id}/skills/${skillId}`, { verified });
      loadEmployee();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to verify skill:', err);
      toast.error(t('employees.failedVerifySkill', 'Failed to verify skill'));
    }
  };

  const handleUpdateLevel = async (skillId, level) => {
    try {
      await api.put(`/employees/${id}/skills/${skillId}`, { level });
      loadEmployee();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to update skill level:', err);
      toast.error(t('employees.failedUpdateSkillLevel', 'Failed to update skill level'));
    }
  };

  const handleRemoveSkill = async (skillId) => {
    if (!confirm(t('employeeDetail.confirmRemoveSkill', 'Remove this skill from the employee?'))) return;
    try {
      await api.delete(`/employees/${id}/skills/${skillId}`);
      loadEmployee();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to remove skill:', err);
      toast.error(t('employees.failedRemoveSkill', 'Failed to remove skill'));
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
        <p className="text-slate-700 font-medium mb-1">{t('employees.loadEmployeeError', 'Failed to load employee')}</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <div className="flex justify-center gap-3">
          <Link to="/employees" className="btn btn-secondary">{t('employeeDetail.backToEmployees', 'Back to Employees')}</Link>
          <button onClick={loadEmployee} className="btn btn-primary">{t('common.retry', 'Retry')}</button>
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

            {/* Badge ID for kiosk clock-in */}
            <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-2">
              <div>
                <span className="text-slate-500 text-sm">{t('employeeDetail.badgeId', 'Badge ID / PIN')}</span>
                {editingBadge ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      placeholder="e.g. 12345"
                      className="input w-32 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        try {
                          await api.patch(`/employees/${id}`, { badge_id: badgeId });
                          setEmployee({ ...employee, badge_id: badgeId });
                          setEditingBadge(false);
                          toast.success(t('common.saved', 'Saved'));
                        } catch (err) {
                          toast.error('Failed to save badge ID');
                        }
                      }}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingBadge(false); setBadgeId(employee.badge_id || ''); }}
                      className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-mono">{employee.badge_id || '-'}</span>
                    {isManagerOrAbove && (
                      <button
                        onClick={() => { setBadgeId(employee.badge_id || ''); setEditingBadge(true); }}
                        className="text-xs text-momentum-500 hover:underline"
                      >
                        {t('common.edit', 'Edit')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {isManagerOrAbove && (
                <button
                  onClick={() => setShowQrModal(true)}
                  className="btn btn-secondary text-sm py-1"
                >
                  <QrCode className="w-4 h-4" />
                  {t('employeeDetail.generateQR', 'Generate QR')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{t('employeeDetail.skillsCompetencies', 'Skills & Competencies')}</h2>
            {isManagerOrAbove && availableSkills.length > 0 && (
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
                            onClick={() => isManagerOrAbove && handleUpdateLevel(skill.skill_id, level)}
                            disabled={!isManagerOrAbove}
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
                      {isManagerOrAbove && (
                        <div className="flex items-center gap-1">
                          {skill.requires_verification && !skill.verified && (
                            <button
                              onClick={() => handleVerifySkill(skill.skill_id, true)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title={t('employeeDetail.verifySkill', 'Verify skill')}
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveSkill(skill.skill_id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title={t('employeeDetail.removeSkill', 'Remove skill')}
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
                {isManagerOrAbove && availableSkills.length > 0 && (
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

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          employee={employee}
          onClose={() => setShowQrModal(false)}
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

function QRCodeModal({ employee, onClose, t }) {
  const qrData = JSON.stringify({
    employee_id: employee.id,
    employee_number: employee.employee_number,
    name: `${employee.first_name} ${employee.last_name}`,
  });

  // Generate QR code URL using a free API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(employee.badge_id || employee.employee_number || employee.id)}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${employee.first_name}-${employee.last_name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${employee.first_name} ${employee.last_name}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
            img { max-width: 300px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            p { color: #666; margin: 5px 0; }
            .badge-id { font-family: monospace; font-size: 20px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <h1>${employee.first_name} ${employee.last_name}</h1>
          <p>${employee.role_name || employee.department_name || ''}</p>
          <img src="${qrUrl}" alt="QR Code" />
          <p class="badge-id">${employee.badge_id || employee.employee_number || ''}</p>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t('employeeDetail.employeeQR', 'Employee QR Code')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-xl mb-4">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-48 h-48"
            />
          </div>

          <p className="font-medium text-slate-900">{employee.first_name} {employee.last_name}</p>
          <p className="text-slate-500 text-sm">{employee.role_name || employee.department_name}</p>
          {(employee.badge_id || employee.employee_number) && (
            <p className="font-mono text-lg text-slate-700 mt-2">{employee.badge_id || employee.employee_number}</p>
          )}

          <div className="flex gap-3 justify-center mt-6">
            <button onClick={handleDownload} className="btn btn-secondary">
              <Download className="w-4 h-4" />
              {t('common.download', 'Download')}
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              {t('common.print', 'Print')}
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            {t('employeeDetail.qrInfo', 'This QR code can be printed on an employee badge for kiosk clock-in.')}
          </p>
        </div>
      </div>
    </div>
  );
}
