// ============================================================
// TRANSLATION SERVICE
// Multi-language support with live content translation
// ============================================================

import { db } from '../lib/database.js';

// Supported languages (40+ as claimed)
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { name: 'French', nativeName: 'Français', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false },
  it: { name: 'Italian', nativeName: 'Italiano', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
  nl: { name: 'Dutch', nativeName: 'Nederlands', rtl: false },
  pl: { name: 'Polish', nativeName: 'Polski', rtl: false },
  ro: { name: 'Romanian', nativeName: 'Română', rtl: false },
  hu: { name: 'Hungarian', nativeName: 'Magyar', rtl: false },
  cs: { name: 'Czech', nativeName: 'Čeština', rtl: false },
  sk: { name: 'Slovak', nativeName: 'Slovenčina', rtl: false },
  bg: { name: 'Bulgarian', nativeName: 'Български', rtl: false },
  hr: { name: 'Croatian', nativeName: 'Hrvatski', rtl: false },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina', rtl: false },
  el: { name: 'Greek', nativeName: 'Ελληνικά', rtl: false },
  tr: { name: 'Turkish', nativeName: 'Türkçe', rtl: false },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false },
  uk: { name: 'Ukrainian', nativeName: 'Українська', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true },
  he: { name: 'Hebrew', nativeName: 'עברית', rtl: true },
  fa: { name: 'Persian', nativeName: 'فارسی', rtl: true },
  ur: { name: 'Urdu', nativeName: 'اردو', rtl: true },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  bn: { name: 'Bengali', nativeName: 'বাংলা', rtl: false },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  te: { name: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', rtl: false },
  th: { name: 'Thai', nativeName: 'ไทย', rtl: false },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false },
  tl: { name: 'Filipino', nativeName: 'Filipino', rtl: false },
  zh: { name: 'Chinese (Simplified)', nativeName: '简体中文', rtl: false },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文', rtl: false },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false },
  sv: { name: 'Swedish', nativeName: 'Svenska', rtl: false },
  da: { name: 'Danish', nativeName: 'Dansk', rtl: false },
  no: { name: 'Norwegian', nativeName: 'Norsk', rtl: false },
  fi: { name: 'Finnish', nativeName: 'Suomi', rtl: false },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių', rtl: false },
  lv: { name: 'Latvian', nativeName: 'Latviešu', rtl: false },
  et: { name: 'Estonian', nativeName: 'Eesti', rtl: false },
};

// Translation cache to reduce API calls
const translationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get user's preferred language
 */
export async function getUserLanguage(userId) {
  const result = await db.query(
    'SELECT preferred_language FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.preferred_language || 'en';
}

/**
 * Set user's preferred language
 */
export async function setUserLanguage(userId, languageCode) {
  if (!SUPPORTED_LANGUAGES[languageCode]) {
    throw new Error(`Unsupported language: ${languageCode}`);
  }
  
  await db.query(
    'UPDATE users SET preferred_language = $1 WHERE id = $2',
    [languageCode, userId]
  );
  
  return { success: true, language: languageCode };
}

/**
 * Translate text using translation API
 * Supports Google Translate, DeepL, or LibreTranslate
 */
export async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
  if (!text || text.trim().length === 0) {
    return text;
  }
  
  if (targetLanguage === sourceLanguage || targetLanguage === 'en' && !sourceLanguage) {
    return text;
  }
  
  // Check cache first
  const cacheKey = `${text.substring(0, 100)}_${sourceLanguage}_${targetLanguage}`;
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.translation;
  }
  
  try {
    let translation;
    
    // Try Google Translate API first
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      translation = await translateWithGoogle(text, targetLanguage, sourceLanguage);
    }
    // Fall back to DeepL
    else if (process.env.DEEPL_API_KEY) {
      translation = await translateWithDeepL(text, targetLanguage, sourceLanguage);
    }
    // Fall back to LibreTranslate (self-hosted option)
    else if (process.env.LIBRETRANSLATE_URL) {
      translation = await translateWithLibre(text, targetLanguage, sourceLanguage);
    }
    // No translation service configured
    else {
      console.error('No translation service configured');
      return text;
    }
    
    // Cache the result
    translationCache.set(cacheKey, {
      translation,
      timestamp: Date.now()
    });
    
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original on error
  }
}

/**
 * Google Translate API
 */
async function translateWithGoogle(text, targetLanguage, sourceLanguage) {
  const url = 'https://translation.googleapis.com/language/translate/v2';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      target: targetLanguage,
      source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
      key: process.env.GOOGLE_TRANSLATE_API_KEY,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data.translations[0].translatedText;
}

/**
 * DeepL API
 */
async function translateWithDeepL(text, targetLanguage, sourceLanguage) {
  const url = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';
  
  // DeepL uses uppercase language codes
  const targetLang = targetLanguage.toUpperCase();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
      source_lang: sourceLanguage === 'auto' ? undefined : sourceLanguage.toUpperCase(),
    }),
  });
  
  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.translations[0].text;
}

/**
 * LibreTranslate API (self-hosted option)
 */
async function translateWithLibre(text, targetLanguage, sourceLanguage) {
  const url = `${process.env.LIBRETRANSLATE_URL}/translate`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: sourceLanguage === 'auto' ? 'auto' : sourceLanguage,
      target: targetLanguage,
      api_key: process.env.LIBRETRANSLATE_API_KEY,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`LibreTranslate API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.translatedText;
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(texts, targetLanguage, sourceLanguage = 'auto') {
  const results = await Promise.all(
    texts.map(text => translateText(text, targetLanguage, sourceLanguage))
  );
  return results;
}

/**
 * Translate a feed post with all its content
 */
export async function translateFeedPost(post, targetLanguage) {
  const [translatedContent, translatedComments] = await Promise.all([
    translateText(post.content, targetLanguage),
    post.comments ? Promise.all(
      post.comments.map(async (comment) => ({
        ...comment,
        content: await translateText(comment.content, targetLanguage),
        isTranslated: true,
      }))
    ) : [],
  ]);
  
  return {
    ...post,
    content: translatedContent,
    originalContent: post.content,
    comments: translatedComments,
    isTranslated: true,
    translatedTo: targetLanguage,
  };
}

/**
 * Detect language of text
 */
export async function detectLanguage(text) {
  if (!text || text.trim().length === 0) {
    return 'en';
  }
  
  try {
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      const url = 'https://translation.googleapis.com/language/translate/v2/detect';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          key: process.env.GOOGLE_TRANSLATE_API_KEY,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data.detections[0][0].language;
      }
    }
    
    // Fallback: return 'en' if detection not available
    return 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

/**
 * Get list of supported languages
 */
export function getSupportedLanguages() {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
    code,
    ...info,
  }));
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(code) {
  return !!SUPPORTED_LANGUAGES[code];
}

/**
 * Get language info
 */
export function getLanguageInfo(code) {
  return SUPPORTED_LANGUAGES[code] || null;
}

/**
 * Clear translation cache
 */
export function clearTranslationCache() {
  translationCache.clear();
}

export default {
  SUPPORTED_LANGUAGES,
  getUserLanguage,
  setUserLanguage,
  translateText,
  translateBatch,
  translateFeedPost,
  detectLanguage,
  getSupportedLanguages,
  isLanguageSupported,
  getLanguageInfo,
  clearTranslationCache,
};
