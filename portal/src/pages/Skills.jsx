// ============================================================
// SKILLS MANAGEMENT PAGE - REAL API
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { skillsApi, locationsApi, employeesApi } from '../lib/api';
import { Search, Plus, Award, Users, CheckCircle, X, Filter, Star, ChevronRight, AlertTriangle, MapPin, Clock, AlertCircle } from 'lucide-react';

// Static categories - with translation keys
const getSkillCategories = (t) => [
  { value: 'technical', label: t('skills.technical', 'Technical Skills') },
  { value: 'certification', label: t('skills.certifications', 'Certifications') },
  { value: 'soft_skill', label: t('skills.softSkills', 'Soft Skills') },
  { value: 'safety', label: t('skills.safety', 'Safety & Compliance') },
  { value: 'language', label: t('skills.languages', 'Languages') },
  { value: 'leadership', label: t('skills.leadership', 'Leadership') }
];

export default function Skills() {
  const { t } = useTranslation();
  const SKILL_CATEGORIES = getSkillCategories(t);

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillEmployees, setSkillEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [toast, setToast] = useState(null);

  const [newSkill, setNewSkill] = useState({
    name: '',
    category: '',
    requires_verification: false
  });

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setError(null);
    try {
      const data = await skillsApi.list();
      const skillsData = data.skills || [];
      const enriched = skillsData.map(s => ({
        ...s,
        employee_count: Number(s.employee_count) || 0,
        verified_count: Number(s.verified_count) || 0
      }));
      setSkills(enriched);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load skills:', err);
      setError(t('skills.loadError', 'Failed to load skills. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // NOTE: Requires backend endpoint GET /skills/:id/employees
  const loadSkillEmployees = async (skill) => {
    setSelectedSkill(skill);
    setLoadingEmployees(false);
    setSkillEmployees([]);
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.name || !newSkill.category) {
      setToast({ type: 'error', message: t('common.required', 'Please fill all required fields') });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      await skillsApi.create(newSkill);
      setToast({ type: 'success', message: t('skills.skillAdded', 'Skill added successfully') });
      setShowAddModal(false);
      setNewSkill({ name: '', category: '', requires_verification: false });
      loadSkills();
    } catch (err) {
      setToast({ type: 'error', message: t('skills.addError', 'Failed to add skill. Please try again.') });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    const cat = skill.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const getCategoryLabel = (category) => {
    const found = SKILL_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      technical: 'bg-blue-100 text-blue-800 border-blue-200',
      certification: 'bg-green-100 text-green-800 border-green-200',
      soft_skill: 'bg-purple-100 text-purple-800 border-purple-200',
      safety: 'bg-red-100 text-red-800 border-red-200',
      language: 'bg-amber-100 text-amber-800 border-amber-200',
      leadership: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const stats = {
    totalSkills: skills.length,
    categories: [...new Set(skills.map(s => s.category))].length,
    totalAssignments: skills.reduce((sum, s) => {
      const num = Number(s.employee_count);
      return sum + (isNaN(num) ? 0 : num);
    }, 0),
    verifiedAssignments: skills.reduce((sum, s) => {
      const num = Number(s.verified_count);
      return sum + (isNaN(num) ? 0 : num);
    }, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button onClick={loadSkills} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('skills.title', 'Skills Management')}</h1>
          <p className="text-gray-600">{t('skills.subtitle', 'Manage organization skills and employee competencies')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t('skills.addSkill', 'Add Skill')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border text-left">
          <div className="flex items-center gap-2 text-gray-600">
            <Award className="h-5 w-5" />
            <span>{t('skills.totalSkills', 'Total Skills')}</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.totalSkills}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border text-left">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="h-5 w-5" />
            <span>{t('skills.categories', 'Categories')}</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.categories}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border text-left">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-5 w-5" />
            <span>{t('skills.totalAssignments', 'Total Assignments')}</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.totalAssignments}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border text-left">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>{t('skills.verified', 'Verified')}</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.verifiedAssignments}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('skills.searchSkills', 'Search skills...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">{t('skills.allCategories', 'All Categories')}</option>
          {SKILL_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Skills Grid */}
      <div id="skills-grid">
      {Object.keys(groupedSkills).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('skills.noSkillsFound', 'No skills found')}</p>
        </div>
      ) : (
        Object.entries(groupedSkills).map(([category, categorySkills]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">{getCategoryLabel(category)}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorySkills.map(skill => (
                <div
                  key={skill.id}
                  onClick={() => loadSkillEmployees(skill)}
                  className="bg-white rounded-lg p-4 shadow border hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{skill.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(category)}`}>
                      {getCategoryLabel(category)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {skill.employee_count} {t('skills.employees', 'employees')}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {skill.verified_count} {t('skills.verified', 'verified')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      </div>

      {/* Add Skill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{t('skills.addSkill', 'Add New Skill')}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('skills.skillName', 'Skill Name')} *
                </label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('skills.enterSkillName', 'Enter skill name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('skills.category', 'Category')} *
                </label>
                <select
                  value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('skills.selectCategory', 'Select category')}</option>
                  {SKILL_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_verification"
                  checked={newSkill.requires_verification}
                  onChange={(e) => setNewSkill({ ...newSkill, requires_verification: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="requires_verification" className="text-sm text-gray-700">
                  {t('skills.requiresVerification', 'Requires verification')}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('skills.addSkill', 'Add Skill')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b shrink-0">
              <div>
                <h2 className="text-lg font-semibold">{selectedSkill.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(selectedSkill.category)}`}>
                    {getCategoryLabel(selectedSkill.category)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {selectedSkill.employee_count} {t('skills.employees', 'employees')}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedSkill(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {t('skills.employeesWithSkill', 'Employees with this skill')}
              </h3>
              {loadingEmployees ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : skillEmployees.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Employee listing for this skill is coming soon.</p>
              ) : (
                <div className="space-y-3">
                  {skillEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      {emp.photo ? (
                        <img
                          src={emp.photo}
                          alt={emp.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {emp.name?.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{emp.name}</p>
                        <p className="text-sm text-gray-500 truncate">{emp.role || emp.department}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {emp.verified ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            {t('skills.verified', 'Verified')}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">{t('skills.pending', 'Pending')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t shrink-0 flex justify-end">
              <button
                onClick={() => setSelectedSkill(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
