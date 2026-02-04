// ============================================================
// JOBS/OPPORTUNITIES PAGE - REAL API
// ============================================================
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { jobsApi } from '../lib/api';
import { Briefcase, Plus, MapPin, Clock, Users, DollarSign, X, Eye, Edit, Trash, Star, TrendingUp, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

export default function Jobs() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('open');
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicants, setShowApplicants] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    setError(null);
    try {
      const data = await jobsApi.list();
      setJobs(data.jobs || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load jobs:', err);
      setError(t('jobs.loadError', 'Failed to load job postings. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const jobData = {
      title: formData.get('title'),
      department: formData.get('department'),
      location: formData.get('location'),
      type: formData.get('type'),
      salary_range: formData.get('salary_range'),
      description: formData.get('description'),
      status: 'open',
    };

    try {
      await jobsApi.create(jobData);
      showToast(t('jobs.created', 'Job posting created successfully'));
      setShowModal(false);
      loadJobs();
    } catch (err) {
      showToast(t('jobs.createError', 'Failed to create job posting. Please try again.'), 'error');
    }
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setShowModal(true);
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const jobData = {
      title: formData.get('title'),
      department: formData.get('department'),
      location: formData.get('location'),
      type: formData.get('type'),
      salary_range: formData.get('salary_range'),
      description: formData.get('description'),
    };

    try {
      await jobsApi.update(editingJob.id, jobData);
      showToast(t('jobs.updated', 'Job posting updated successfully'));
      setShowModal(false);
      setEditingJob(null);
      loadJobs();
    } catch (err) {
      showToast(t('jobs.updateError', 'Failed to update job posting. Please try again.'), 'error');
    }
  };

  const filteredJobs = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
  const stats = { open: jobs.filter(j => j.status === 'open').length, closed: jobs.filter(j => j.status === 'closed').length, totalApplicants: jobs.reduce((sum, j) => sum + (j.applicants || 0), 0) };

  const getTypeLabel = (type) => {
    const labels = { full_time: t('jobs.fullTime', 'Full Time'), part_time: t('jobs.partTime', 'Part Time'), contract: t('jobs.contract', 'Contract'), temporary: t('jobs.temporary', 'Temporary') };
    return labels[type] || type;
  };

  if (loading) { return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>); }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button onClick={loadJobs} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('career.jobOpenings', 'Job Openings')}</h1><p className="text-gray-600">{t('jobs.subtitle', 'Manage internal career opportunities')}</p></div>
        <button onClick={() => { setEditingJob(null); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" />{t('manager.createPosting', 'Create Job Posting')}</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200"><div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-green-600" /><span className="text-green-800 font-medium">{t('jobs.openPositions', 'Open Positions')}</span></div><p className="text-2xl font-bold text-green-900 mt-1">{stats.open}</p></div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200"><div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-gray-600" /><span className="text-gray-800 font-medium">{t('jobs.closedPositions', 'Closed')}</span></div><p className="text-2xl font-bold text-gray-900 mt-1">{stats.closed}</p></div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" /><span className="text-blue-800 font-medium">{t('jobs.totalApplicants', 'Total Applicants')}</span></div><p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalApplicants}</p></div>
      </div>

      <div className="flex gap-1 border-b">
        {[{ key: 'open', label: t('jobs.open', 'Open') }, { key: 'closed', label: t('jobs.closed', 'Closed') }, { key: 'all', label: t('common.all', 'All') }].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} className={`px-4 py-2 font-medium border-b-2 transition-colors ${filter === tab.key ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{tab.label}</button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border"><Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">{t('jobs.noJobs', 'No job postings found')}</p></div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="bg-white rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div><h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3><p className="text-gray-600">{job.department}</p></div>
                <span className={`px-2 py-1 text-xs rounded-full ${job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{job.status === 'open' ? t('jobs.open', 'Open') : t('jobs.closed', 'Closed')}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{getTypeLabel(job.type)}</span>
                <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{job.salary_range}</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{job.applicants || 0} {t('jobs.applicants', 'applicants')}</span>
              </div>
              {job.description && <p className="mt-2 text-sm text-gray-600">{job.description}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setSelectedJob(job)} className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"><Eye className="h-4 w-4" />{t('common.view', 'View')}</button>
                <button onClick={() => handleEditJob(job)} className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"><Edit className="h-4 w-4" />{t('common.edit', 'Edit')}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-start mb-4"><div><h2 className="text-lg font-semibold">{selectedJob.title}</h2><p className="text-gray-500">{selectedJob.department}</p></div><button onClick={() => setSelectedJob(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5 text-gray-500" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">{t('schedule.location', 'Location')}</p><p className="font-medium">{selectedJob.location}</p></div>
                <div><p className="text-sm text-gray-500">{t('common.type', 'Type')}</p><p className="font-medium">{getTypeLabel(selectedJob.type)}</p></div>
                <div><p className="text-sm text-gray-500">{t('jobs.salary', 'Salary')}</p><p className="font-medium">{selectedJob.salary_range}</p></div>
                <div><p className="text-sm text-gray-500">{t('jobs.applicants', 'Applicants')}</p><p className="font-medium">{selectedJob.applicants || 0}</p></div>
              </div>
              {selectedJob.description && <div><p className="text-sm text-gray-500">{t('common.description', 'Description')}</p><p className="font-medium">{selectedJob.description}</p></div>}
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setSelectedJob(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">{t('common.close', 'Close')}</button><button onClick={() => setShowApplicants(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('jobs.viewApplicants', 'View Applicants')} ({selectedJob.matched_employees?.length || 0})</button></div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">{editingJob ? t('jobs.editPosting', 'Edit Job Posting') : t('manager.createPosting', 'Create Job Posting')}</h2><button onClick={() => { setShowModal(false); setEditingJob(null); }} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5 text-gray-500" /></button></div>
            {/* NOTE: Consider adding custom validation beyond HTML5 required/type attributes */}
            <form onSubmit={editingJob ? handleUpdateJob : handleCreateJob} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('jobs.jobTitle', 'Job Title')} *</label><input name="title" type="text" className="w-full px-3 py-2 border rounded-lg" placeholder={t('jobs.enterTitle', 'Enter job title')} defaultValue={editingJob?.title || ''} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.department', 'Department')}</label><select name="department" className="w-full px-3 py-2 border rounded-lg" defaultValue={editingJob?.department || ''}><option value="">{t('jobs.selectDepartment', 'Select department')}</option><option value="Front of House">{t('jobs.departments.frontOfHouse', 'Front of House')}</option><option value="Kitchen">{t('jobs.departments.kitchen', 'Kitchen')}</option><option value="Management">{t('jobs.departments.management', 'Management')}</option><option value="Reception">{t('jobs.departments.reception', 'Reception')}</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('schedule.location', 'Location')}</label><select name="location" className="w-full px-3 py-2 border rounded-lg" defaultValue={editingJob?.location || ''}><option value="">{t('jobs.selectLocation', 'Select location')}</option><option value="Grand Metro Edinburgh">{t('jobs.locations.edinburgh', 'Grand Metro Edinburgh')}</option><option value="Grand Metro Glasgow">{t('jobs.locations.glasgow', 'Grand Metro Glasgow')}</option><option value="Grand Metro Manchester">{t('jobs.locations.manchester', 'Grand Metro Manchester')}</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('common.type', 'Type')}</label><select name="type" className="w-full px-3 py-2 border rounded-lg" defaultValue={editingJob?.type || 'full_time'}><option value="full_time">{t('jobs.fullTime', 'Full Time')}</option><option value="part_time">{t('jobs.partTime', 'Part Time')}</option><option value="contract">{t('jobs.contract', 'Contract')}</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('jobs.salary', 'Salary Range')}</label><input name="salary_range" type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="£25,000 - £30,000" defaultValue={editingJob?.salary_range || ''} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('common.description', 'Description')}</label><textarea name="description" className="w-full px-3 py-2 border rounded-lg" rows="3" placeholder={t('jobs.enterDescription', 'Enter job description')} defaultValue={editingJob?.description || ''}></textarea></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => { setShowModal(false); setEditingJob(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">{t('common.cancel', 'Cancel')}</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingJob ? t('common.update', 'Update') : t('jobs.postJob', 'Post Job')}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Applicants Modal */}
      {showApplicants && selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">{t('jobs.applicants', 'Applicants')}</h2>
                <p className="text-gray-500">{selectedJob.title}</p>
              </div>
              <button onClick={() => setShowApplicants(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5 text-gray-500" /></button>
            </div>

            {selectedJob.matched_employees && selectedJob.matched_employees.length > 0 ? (
              <div className="space-y-3">
                {selectedJob.matched_employees.map((applicant, idx) => (
                  <Link
                    key={applicant.id || idx}
                    to={`/employees/${applicant.id}`}
                    onClick={() => { setShowApplicants(false); setSelectedJob(null); }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                      {applicant.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{applicant.name}</p>
                      {applicant.gaps && applicant.gaps.length > 0 && (
                        <p className="text-xs text-gray-500">{applicant.gaps.join(', ')}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold text-gray-900">{applicant.match}%</span>
                      </div>
                      <p className="text-xs text-gray-500">{t('jobs.skillMatch', 'skill match')}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">{t('jobs.noApplicants', 'No applicants yet')}</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowApplicants(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">{t('common.close', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
