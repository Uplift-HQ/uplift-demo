// ============================================================
// CAREER GROWTH PAGE - TRANSLATED
// Employee career paths, skill gaps, development tracking
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, skillsApi, employeesApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  TrendingUp, Award, Target, BookOpen, ChevronRight, Star,
  CheckCircle, AlertCircle, Clock, Briefcase, MapPin, Building,
  Plus, Sparkles, Zap, ArrowRight, Trophy, Lightbulb, Users, Calendar
} from 'lucide-react';

export default function Career() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mySkills, setMySkills] = useState([]);
  const [careerPaths, setCareerPaths] = useState([]);
  const [skillsGap, setSkillsGap] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddSkill, setShowAddSkill] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get employee ID from user
      const empResult = await api.get('/employees/me').catch(() => null);
      const employeeId = empResult?.employee?.id;

      const [skillsResult, pathsResult, allSkillsResult] = await Promise.all([
        employeeId ? api.get(`/employees/${employeeId}/skills`).catch(() => ({ skills: [] })) : Promise.resolve({ skills: [] }),
        employeeId ? api.get(`/employees/${employeeId}/career-paths`).catch(() => ({ careerPaths: [], skillsGap: [] })) : Promise.resolve({ careerPaths: [], skillsGap: [] }),
        skillsApi.list().catch(() => ({ skills: [] })),
      ]);

      setMySkills(skillsResult.skills || []);
      setCareerPaths(pathsResult.careerPaths || []);
      setSkillsGap(pathsResult.skillsGap || []);
      setAllSkills(allSkillsResult.skills || allSkillsResult || []);
    } catch (err) {
      console.error('Failed to load career data:', err);
      setError(err.message || 'Failed to load career data');
      setMySkills([]);
      setCareerPaths([]);
      setSkillsGap([]);
      setAllSkills([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const verifiedSkills = mySkills.filter(s => s.verified).length;
  const expiringSkills = mySkills.filter(s => {
    if (!s.expires_at) return false;
    const daysUntil = (new Date(s.expires_at) - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil < 30;
  });
  const expiredSkills = mySkills.filter(s => s.expires_at && new Date(s.expires_at) < new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-momentum-500 to-momentum-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-2 text-momentum-200 mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium">{t('career.yourCareerJourney', 'Your Career Journey')}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('home.welcomeBack', 'Hi')}, {user?.firstName}!</h1>
        <p className="text-momentum-100">
          {t('career.trackSkillsDesc', 'Track your skills, discover opportunities, and plan your next career move.')}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button onClick={loadData} className="ml-auto text-sm text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-momentum-100 rounded-xl">
              <Award className="w-6 h-6 text-momentum-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{mySkills.length}</p>
              <p className="text-sm text-slate-500">{t('career.totalSkills', 'Total Skills')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{verifiedSkills}</p>
              <p className="text-sm text-slate-500">{t('career.verified', 'Verified')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{careerPaths.length}</p>
              <p className="text-sm text-slate-500">{t('career.opportunities', 'Opportunities')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Target className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{skillsGap.length}</p>
              <p className="text-sm text-slate-500">{t('career.skillsToLearn', 'Skills to Learn')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* My Skills */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{t('career.mySkills', 'My Skills')}</h2>
                <p className="text-sm text-slate-500">{t('career.competenciesDesc', 'Your competencies and certifications')}</p>
              </div>
              <button
                onClick={() => setShowAddSkill(true)}
                className="btn btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('career.requestSkill', 'Request Skill')}
              </button>
            </div>

            {mySkills.length === 0 ? (
              <div className="p-8 text-center">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-medium text-slate-900">{t('career.noSkillsRecorded', 'No skills recorded yet')}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {t('career.askManagerSkills', 'Ask your manager to add your skills and certifications')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Expiring Warning */}
                {(expiringSkills.length > 0 || expiredSkills.length > 0) && (
                  <div className="p-4 bg-amber-50 border-b border-amber-100">
                    {expiredSkills.length > 0 && (
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {t('career.skillsExpired', '{{count}} skill(s) have expired', { count: expiredSkills.length })}
                        </span>
                      </div>
                    )}
                    {expiringSkills.length > 0 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {t('career.skillsExpiringSoon', '{{count}} skill(s) expiring soon', { count: expiringSkills.length })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {mySkills.map(skill => (
                  <SkillRow key={skill.id} skill={skill} t={t} />
                ))}
              </div>
            )}
          </div>

          {/* Career Opportunities */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{t('career.careerOpportunities', 'Career Opportunities')}</h2>
              <p className="text-sm text-slate-500">{t('career.rolesMatchSkills', 'Roles that match your skills')}</p>
            </div>

            {careerPaths.length === 0 ? (
              <div className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-medium text-slate-900">{t('career.noOpenPositions', 'No open positions')}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {t('career.checkBackSoonOpportunities', 'Check back soon for new internal opportunities')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {careerPaths.map(job => (
                  <div key={job.id} className="p-4 hover:bg-slate-50 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900 group-hover:text-momentum-600">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          {job.department_name && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5" />
                              {job.department_name}
                            </span>
                          )}
                          {job.location_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.location_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {job.match_percentage != null && (
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              job.match_percentage >= 80 ? 'text-green-600' :
                              job.match_percentage >= 50 ? 'text-amber-600' :
                              'text-slate-400'
                            }`}>
                              {job.match_percentage}%
                            </div>
                            <p className="text-xs text-slate-500">{t('career.match', 'match')}</p>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-momentum-500" />
                      </div>
                    </div>

                    {/* Match Bar */}
                    {job.match_percentage != null && (
                      <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            job.match_percentage >= 80 ? 'bg-green-500' :
                            job.match_percentage >= 50 ? 'bg-amber-500' :
                            'bg-slate-300'
                          }`}
                          style={{ width: `${job.match_percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Skills Gap */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-slate-900">{t('career.skillsToDevelop', 'Skills to Develop')}</h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {t('career.learnUnlockMore', 'Learn these to unlock more opportunities')}
              </p>
            </div>

            {skillsGap.length === 0 ? (
              <div className="p-5 text-center">
                <Trophy className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-slate-600">
                  {t('career.allSkillsForRoles', 'Great job! You have all the skills needed for available roles.')}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {skillsGap.slice(0, 5).map(skill => (
                  <div key={skill.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900">{skill.skill_name || skill.name}</p>
                        <p className="text-xs text-slate-500">{skill.reason || skill.category}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
                {skillsGap.length > 5 && (
                  <p className="text-sm text-slate-500 text-center pt-2">
                    {t('career.moreSkills', '+{{count}} more skills', { count: skillsGap.length - 5 })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">{t('career.careerTips', 'Career Tips')}</h3>
            </div>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                {t('career.tip1', 'Keep your skills up to date')}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                {t('career.tip2', 'Ask your manager to verify certifications')}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                {t('career.tip3', "Apply early for positions you're interested in")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                {t('career.tip4', 'Develop skills that unlock more roles')}
              </li>
            </ul>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">{t('career.achievements', 'Achievements')}</h3>
            <div className="space-y-3">
              {mySkills.length >= 5 && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">{t('career.skillCollector', 'Skill Collector')}</p>
                    <p className="text-xs text-green-600">{t('career.skillCollectorDesc', '5+ skills acquired')}</p>
                  </div>
                </div>
              )}
              {verifiedSkills >= 3 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{t('career.verifiedPro', 'Verified Pro')}</p>
                    <p className="text-xs text-blue-600">{t('career.verifiedProDesc', '3+ verified skills')}</p>
                  </div>
                </div>
              )}
              {mySkills.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  {t('career.buildSkillsAchievements', 'Build your skills to earn achievements!')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Skill Request Modal */}
      {showAddSkill && (
        <AddSkillModal
          skills={allSkills}
          mySkillIds={mySkills.map(s => s.skill_id || s.id)}
          onClose={() => setShowAddSkill(false)}
          onRequest={loadData}
          t={t}
        />
      )}
    </div>
  );
}

// ============================================================
// SKILL ROW COMPONENT
// ============================================================

function SkillRow({ skill, t }) {
  const isExpired = skill.expires_at && new Date(skill.expires_at) < new Date();
  const isExpiring = skill.expires_at && !isExpired &&
    (new Date(skill.expires_at) - new Date()) / (1000 * 60 * 60 * 24) < 30;

  return (
    <div className={`px-6 py-4 flex items-center justify-between ${isExpired ? 'bg-red-50' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isExpired ? 'bg-red-100' :
          skill.verified ? 'bg-green-100' : 'bg-slate-100'
        }`}>
          <Award className={`w-6 h-6 ${
            isExpired ? 'text-red-600' :
            skill.verified ? 'text-green-600' : 'text-slate-500'
          }`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{skill.name}</p>
            {skill.verified && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                <CheckCircle className="w-3 h-3" />
                {t('career.verified', 'Verified')}
              </span>
            )}
            {isExpired && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                <AlertCircle className="w-3 h-3" />
                {t('career.expired', 'Expired')}
              </span>
            )}
            {isExpiring && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                <Clock className="w-3 h-3" />
                {t('career.expiringSoon', 'Expiring Soon')}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{skill.category}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Skill Level */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(level => (
            <Star
              key={level}
              className={`w-4 h-4 ${
                level <= (skill.level || 1)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Expiry */}
        {skill.expires_at && (
          <div className="text-sm text-slate-500">
            {isExpired ? t('career.expired', 'Expired') : t('career.expires', 'Expires {{date}}', { date: new Date(skill.expires_at).toLocaleDateString() })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADD SKILL REQUEST MODAL
// ============================================================

function AddSkillModal({ skills, mySkillIds, onClose, onRequest, t }) {
  const [selectedSkill, setSelectedSkill] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableSkills = skills.filter(s => !mySkillIds.includes(s.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSkill) return;
    setSubmitting(true);
    setError('');
    try {
      // TODO: Replace with dedicated skill request endpoint when available
      await api.post('/skills/request', { skillId: selectedSkill, note });
      onRequest();
      onClose();
    } catch (err) {
      setError(err.message || t('career.skillRequestFailed', 'Failed to submit skill request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-2">{t('career.requestSkillAddition', 'Request Skill Addition')}</h2>
        <p className="text-sm text-slate-500 mb-6">
          {t('career.requestSkillDesc', 'Request your manager to add a skill to your profile')}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('career.selectSkill', 'Select Skill')}
            </label>
            <select
              required
              value={selectedSkill}
              onChange={e => setSelectedSkill(e.target.value)}
              className="input"
            >
              <option value="">{t('career.chooseSkill', 'Choose a skill...')}</option>
              {availableSkills.map(skill => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} {skill.category ? `(${skill.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('career.noteOptional', 'Note (optional)')}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder={t('career.notePlaceholder', 'Add any relevant details (e.g., certification date, training completed)')}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? t('career.submitting', 'Submitting...') : t('career.submitRequest', 'Submit Request')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
