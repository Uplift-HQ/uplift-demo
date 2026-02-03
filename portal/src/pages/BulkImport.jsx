// ============================================================
// BULK IMPORT PAGE - FULLY TRANSLATED
// ============================================================
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, ChevronRight, Users, Calendar, MapPin, Award } from 'lucide-react';

const IMPORT_TYPE_IDS = [
  { id: 'employees', icon: Users, template: 'employees-template.csv' },
  { id: 'shifts', icon: Calendar, template: 'shifts-template.csv' },
  { id: 'locations', icon: MapPin, template: 'locations-template.csv' },
  { id: 'skills', icon: Award, template: 'skills-template.csv' },
];

export default function BulkImport() {
  const { t } = useTranslation();

  // Build IMPORT_TYPES with translated strings
  const IMPORT_TYPES = IMPORT_TYPE_IDS.map(type => ({
    ...type,
    name: t(`bulkImport.types.${type.id}`, type.id.charAt(0).toUpperCase() + type.id.slice(1)),
    description: t(`bulkImport.types.${type.id}Desc`, `Import ${type.id}`),
  }));

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      setErrors([t('bulkImport.invalidFileType', 'Please upload a CSV or Excel file')]);
      return;
    }
    setFile(selectedFile);
    setErrors([]);
    
    // Parse preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').slice(0, 6);
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim().replace(/"/g, '')));
      setPreview({ headers, rows, totalRows: text.split('\n').length - 1 });
    };
    reader.readAsText(selectedFile);
    setStep(3);
  }, [t]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!file || !selectedType) return;
    setImporting(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedType.id);
      
      const response = await api.post('/import', formData);
      setResult({
        success: response.imported || preview.totalRows,
        failed: response.failed || 0,
        total: preview.totalRows
      });
      setStep(4);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Import failed:', error);
      setErrors([error.message || t('bulkImport.importFailed', 'Import failed. Please try again.')]);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (type) => {
    // Generate a sample CSV template
    let csv = '';
    switch (type.id) {
      case 'employees':
        csv = 'first_name,last_name,email,phone,department,role,hire_date\nJohn,Smith,john.smith@example.com,+44 7700 000001,Operations,Team Member,2024-01-15\nJane,Doe,jane.doe@example.com,+44 7700 000002,Kitchen,Supervisor,2024-02-01';
        break;
      case 'shifts':
        csv = 'employee_email,date,start_time,end_time,location,break_minutes\njohn.smith@example.com,2025-01-20,09:00,17:00,London,30\njane.doe@example.com,2025-01-20,14:00,22:00,Edinburgh,30';
        break;
      case 'locations':
        csv = 'name,code,address,city,postcode,phone\nLondon Office,LON-01,123 High Street,London,SW1A 1AA,+44 20 1234 5678\nEdinburgh Store,EDI-01,45 Royal Mile,Edinburgh,EH1 1AA,+44 131 123 4567';
        break;
      case 'skills':
        csv = 'name,category,requires_verification\nFood Safety Level 2,certification,true\nCustomer Service,soft_skill,false\nForklift Operation,technical,true';
        break;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type.template;
    a.click();
  };

  const reset = () => {
    setStep(1);
    setSelectedType(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setErrors([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('bulkImport.title', 'Bulk Import')}</h1>
        <p className="text-gray-600">{t('bulkImport.subtitle', 'Import data from CSV or Excel files')}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: t('bulkImport.selectType', 'Select Type') },
          { num: 2, label: t('bulkImport.uploadFile', 'Upload File') },
          { num: 3, label: t('bulkImport.preview', 'Preview') },
          { num: 4, label: t('bulkImport.complete', 'Complete') }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className={`ml-2 text-sm ${step >= s.num ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{s.label}</span>
            {i < 3 && <ChevronRight className="h-4 w-4 text-gray-400 mx-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {IMPORT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => { setSelectedType(type); setStep(2); }}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors text-left"
            >
              <type.icon className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900">{type.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Upload File */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{t('bulkImport.uploadFor', 'Upload')} {selectedType.name}</h2>
              <p className="text-sm text-gray-500">{t('bulkImport.uploadDesc', 'Drag and drop or click to select a file')}</p>
            </div>
            <button onClick={() => downloadTemplate(selectedType)} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4" />
              {t('bulkImport.downloadTemplate', 'Download Template')}
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input id="file-input" type="file" accept=".csv,.xlsx" onChange={(e) => handleFileSelect(e.target.files[0])} className="hidden" />
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('bulkImport.dragDrop', 'Drag and drop your file here, or click to browse')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('bulkImport.supportedFormats', 'Supported formats: CSV, XLSX')}</p>
          </div>

          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              {errors.map((err, i) => (<p key={i} className="text-red-700 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" />{err}</p>))}
            </div>
          )}

          <button onClick={() => setStep(1)} className="text-gray-600 hover:text-gray-900">{t('common.back', 'Back')}</button>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && preview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{t('bulkImport.previewData', 'Preview Data')}</h2>
              <p className="text-sm text-gray-500">{preview.totalRows} {t('bulkImport.rowsFound', 'rows found in')} {file.name}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.headers?.map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.rows?.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-3 text-sm text-gray-900">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.totalRows > 5 && (
              <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 border-t">
                {t('bulkImport.andMore', 'And')} {preview.totalRows - 5} {t('bulkImport.moreRows', 'more rows...')}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => { setFile(null); setPreview(null); setStep(2); }} className="text-gray-600 hover:text-gray-900">{t('common.back', 'Back')}</button>
            <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {importing ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>{t('bulkImport.importing', 'Importing...')}</>) : (<><Upload className="h-4 w-4" />{t('bulkImport.startImport', 'Start Import')}</>)}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && result && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('bulkImport.importComplete', 'Import Complete')}</h2>
          <p className="text-gray-600 mb-6">{t('bulkImport.successfullyImported', 'Successfully imported')} {result.success} {t('bulkImport.of', 'of')} {result.total} {t('bulkImport.records', 'records')}</p>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-700">{result.success}</p>
              <p className="text-sm text-green-600">{t('bulkImport.successful', 'Successful')}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-red-700">{result.failed}</p>
              <p className="text-sm text-red-600">{t('bulkImport.failed', 'Failed')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-700">{result.total}</p>
              <p className="text-sm text-gray-600">{t('bulkImport.total', 'Total')}</p>
            </div>
          </div>

          <button onClick={reset} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {t('bulkImport.importMore', 'Import More Data')}
          </button>
        </div>
      )}
    </div>
  );
}
