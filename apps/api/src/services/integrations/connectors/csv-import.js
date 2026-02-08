// ============================================================
// CSV IMPORT CONNECTOR
// Handle CSV file imports for bulk data loading
// ============================================================

import { BaseConnector } from '../index.js';
import { parse } from 'csv-parse/sync';

export class CSVImportConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.delimiter = config.settings?.delimiter || ',';
    this.hasHeader = config.settings?.hasHeader !== false;
    this.encoding = config.settings?.encoding || 'utf-8';
  }

  /**
   * Test connection (always succeeds for CSV)
   */
  async testConnection() {
    return { success: true, message: 'CSV import ready' };
  }

  /**
   * Parse CSV data from string or buffer
   */
  async fetchData(entityType, options = {}) {
    const csvData = options.csvData || this.config.csvData;

    if (!csvData) {
      throw new Error('No CSV data provided');
    }

    const records = parse(csvData, {
      delimiter: this.delimiter,
      columns: this.hasHeader,
      skip_empty_lines: true,
      trim: true,
      encoding: this.encoding,
    });

    // Apply any row filters
    let filtered = records;

    if (options.filter) {
      filtered = records.filter(options.filter);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Export data to CSV format
   */
  async pushData(entityType, data, options = {}) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const rows = [headers.join(this.delimiter)];

    for (const record of data) {
      const values = headers.map(h => {
        const val = record[h];
        // Escape values with commas or quotes
        if (typeof val === 'string' && (val.includes(this.delimiter) || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      });
      rows.push(values.join(this.delimiter));
    }

    return rows.join('\n');
  }

  /**
   * Get expected columns for entity types
   */
  getFieldSchema(entityType) {
    const schemas = {
      employees: {
        required: ['first_name', 'last_name', 'email'],
        optional: ['phone', 'department', 'role', 'hire_date', 'hourly_rate', 'employee_id'],
      },
      locations: {
        required: ['name'],
        optional: ['address', 'city', 'postcode', 'timezone', 'manager_email'],
      },
      shifts: {
        required: ['employee_email', 'date', 'start_time', 'end_time'],
        optional: ['location_name', 'role', 'notes', 'break_minutes'],
      },
      skills: {
        required: ['name'],
        optional: ['category', 'description', 'certification_required'],
      },
    };

    return schemas[entityType] || { required: [], optional: [] };
  }

  /**
   * Validate CSV data against schema
   */
  validateData(entityType, data) {
    const schema = this.getFieldSchema(entityType);
    const errors = [];

    data.forEach((row, index) => {
      for (const field of schema.required) {
        if (!row[field] && row[field] !== 0) {
          errors.push({
            row: index + 1,
            field,
            message: `Required field "${field}" is missing`,
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      totalRows: data.length,
      validRows: data.length - new Set(errors.map(e => e.row)).size,
    };
  }

  getEntityTypes() {
    return ['employees', 'locations', 'shifts', 'skills', 'departments'];
  }
}

export default CSVImportConnector;
