// ============================================================
// i18n HELPER FUNCTIONS
// For translating status values, types, and categories
// ============================================================

/**
 * Translate a status value
 * @param {string} status - The status key (e.g., 'completed', 'in_progress')
 * @param {Function} t - The translation function from useTranslation()
 * @returns {string} - The translated status
 */
export function translateStatus(status, t) {
  if (!status) return '';
  // Convert snake_case to camelCase for lookup
  const key = status.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  return t(\`common.\${key}\`, status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
}

/**
 * Translate a category value
 * @param {string} category - The category key
 * @param {Function} t - The translation function
 * @returns {string} - The translated category
 */
export function translateCategory(category, t) {
  if (!category) return '';
  const key = category.toLowerCase().replace(/[^a-z0-9]/g, '');
  return t(\`common.\${key}\`, category);
}

/**
 * Translate a type value
 * @param {string} type - The type key
 * @param {Function} t - The translation function
 * @returns {string} - The translated type
 */
export function translateType(type, t) {
  if (!type) return '';
  const key = type.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
  return t(\`common.\${key}\`, type.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
}
