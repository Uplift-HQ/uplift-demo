// ============================================================
// LOCATIONS PAGE - REAL API
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { locationsApi } from '../lib/api';
import {
  MapPin,
  Plus,
  MoreVertical,
  Users,
  Clock,
  Phone,
  X,
  Edit,
  AlertCircle,
} from 'lucide-react';

export default function Locations() {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setError(null);
    try {
      const result = await locationsApi.list({ status: 'all' });
      setLocations(result?.locations || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
      setError('Failed to load locations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingLocation) {
        await locationsApi.update(editingLocation.id, data);
      } else {
        await locationsApi.create(data);
      }
      await loadLocations();
      setShowModal(false);
      setEditingLocation(null);
    } catch (err) {
      console.error('Failed to save location:', err);
    }
  };

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('schedule.location', 'Locations')}</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-gray-600">{error}</p>
          <button onClick={loadLocations} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('schedule.location', 'Locations')}</h1>
          <p className="text-slate-600">{locations.length} {t('schedule.location', 'locations')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t('common.add', 'Add')} {t('schedule.location', 'Location')}
        </button>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-momentum-500" />
        </div>
      ) : locations.length === 0 ? (
        <div className="card p-12 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">{t('common.noResults', 'No locations yet')}</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            {t('common.add', 'Add your first location')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <div
              key={location.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedLocation(location)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-momentum-100 text-momentum-600 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{location.name}</h3>
                      {location.code && (
                        <p className="text-sm text-slate-500">{location.code}</p>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${
                    location.status === 'active' ? 'badge-success' : 'badge-neutral'
                  }`}>
                    {location.status === 'active' ? t('common.active', 'active') : t('common.inactive', 'inactive')}
                  </span>
                </div>

                {(location.address_line1 || location.city) && (
                  <p className="text-sm text-slate-600 mb-3">
                    {[location.address_line1, location.city, location.postcode].filter(Boolean).join(', ')}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {location.employees?.length || location.employee_count || 0} {t('manager.totalEmployees', 'employees')}
                  </span>
                  {location.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {location.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">Click to view details</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingLocation(location); setShowModal(true); }}
                  className="btn btn-ghost text-sm"
                >
                  <Edit className="w-4 h-4" />
                  {t('common.edit', 'Edit')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <LocationModal
          location={editingLocation}
          onClose={() => { setShowModal(false); setEditingLocation(null); }}
          onSave={handleSave}
          t={t}
        />
      )}

      {/* Location Detail Modal */}
      {selectedLocation && (
        <LocationDetailModal
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onEdit={() => { setEditingLocation(selectedLocation); setShowModal(true); setSelectedLocation(null); }}
          t={t}
        />
      )}
    </div>
  );
}

function LocationDetailModal({ location, onClose, onEdit, t }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-momentum-100 text-momentum-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{location.name}</h2>
              {location.code && <p className="text-sm text-slate-500">{location.code}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Location Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">{t('profile.address', 'Address')}</p>
              <p className="text-slate-900">
                {location.address_line1 || '-'}<br />
                {location.city}, {location.postcode}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">{t('profile.phone', 'Phone')}</p>
              <p className="text-slate-900">{location.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">{t('common.status', 'Status')}</p>
              <span className={`badge ${location.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                {location.status === 'active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">{t('timeTracking.locationRequired', 'Geofence')}</p>
              <p className="text-slate-900">{location.geofence_radius || 100}m radius</p>
            </div>
          </div>

          {/* Employees Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                {t('manager.totalEmployees', 'Employees')} ({location.employees?.length || location.employee_count || 0})
              </h3>
            </div>

            {location.employees && location.employees.length > 0 ? (
              <div className="space-y-2">
                {location.employees.map((employee) => (
                  <div key={employee.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-momentum-100 text-momentum-600 rounded-full flex items-center justify-center font-medium text-sm">
                      {employee.avatar || employee.name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{employee.name}</p>
                      <p className="text-sm text-slate-500">{employee.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No employees assigned to this location</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            {t('common.close', 'Close')}
          </button>
          <button onClick={onEdit} className="btn btn-primary">
            <Edit className="w-4 h-4" />
            {t('common.edit', 'Edit Location')}
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationModal({ location, onClose, onSave, t }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: location?.name || '',
    code: location?.code || '',
    type: location?.type || 'store',
    addressLine1: location?.address_line1 || '',
    city: location?.city || '',
    postcode: location?.postcode || '',
    country: location?.country || 'GB',
    phone: location?.phone || '',
    timezone: location?.timezone || 'Europe/London',
    geofenceRadius: location?.geofence_radius || 100,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {location ? t('common.edit', 'Edit') : t('common.add', 'Add')} {t('schedule.location', 'Location')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">{t('common.name', 'Name')} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">{t('profile.employeeId', 'Code')}</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="input"
                placeholder="LON-01"
              />
            </div>

            <div>
              <label className="label">{t('common.type', 'Type')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
              >
                <option value="store">{t('common.type', 'Store')}</option>
                <option value="warehouse">{t('common.type', 'Warehouse')}</option>
                <option value="office">{t('common.type', 'Office')}</option>
                <option value="remote">{t('common.type', 'Remote')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">{t('profile.address', 'Address')}</label>
            <input
              type="text"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              className="input"
              placeholder={t('profile.address', 'Street address')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('profile.address', 'City')}</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('profile.address', 'Postcode')}</label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">{t('profile.phone', 'Phone')}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">{t('timeTracking.locationRequired', 'Geofence Radius (meters)')}</label>
            <input
              type="number"
              value={formData.geofenceRadius}
              onChange={(e) => setFormData({ ...formData, geofenceRadius: parseInt(e.target.value) })}
              className="input"
              min="10"
              max="1000"
            />
            <p className="text-xs text-slate-500 mt-1">
              {t('timeTracking.outsideGeofence', 'Employees must be within this distance to clock in')}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? t('common.loading', 'Saving...') : (location ? t('common.update', 'Update') : t('common.create', 'Create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
