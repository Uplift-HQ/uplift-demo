// ============================================================
// EMAIL TEMPLATES - Multi-language support
// Supports: en, de, fr, es, pt, pl, zh, ar
// ============================================================

import en from './en.js';
import de from './de.js';
import fr from './fr.js';
import es from './es.js';
import pt from './pt.js';
import pl from './pl.js';
import zh from './zh.js';
import ar from './ar.js';

const templates = { en, de, fr, es, pt, pl, zh, ar };

// Get template for a specific language, fallback to English
export function getTemplate(templateName, lang = 'en') {
  const langTemplates = templates[lang] || templates.en;
  return langTemplates[templateName] || templates.en[templateName];
}

// Get all supported languages
export function getSupportedLanguages() {
  return Object.keys(templates);
}

// Check if a language is supported for emails
export function isLanguageSupported(lang) {
  return lang in templates;
}

// RTL languages
export function isRTL(lang) {
  return ['ar', 'he', 'fa', 'ur'].includes(lang);
}

export default templates;
