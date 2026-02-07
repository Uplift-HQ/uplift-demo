// ============================================================
// MOBILE i18n CONFIGURATION
// Internationalization setup with react-i18next
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import locale files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import hu from './locales/hu.json';
import cs from './locales/cs.json';
import sk from './locales/sk.json';
import bg from './locales/bg.json';
import hr from './locales/hr.json';
import sl from './locales/sl.json';
import el from './locales/el.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import he from './locales/he.json';
import fa from './locales/fa.json';
import ur from './locales/ur.json';
import bn from './locales/bn.json';
import pa from './locales/pa.json';
import gu from './locales/gu.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import tl from './locales/tl.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import sv from './locales/sv.json';
import da from './locales/da.json';
import no from './locales/no.json';
import fi from './locales/fi.json';
import lt from './locales/lt.json';
import lv from './locales/lv.json';
import et from './locales/et.json';
import mt from './locales/mt.json';

// Language resources
const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  pl: { translation: pl },
  ro: { translation: ro },
  ar: { translation: ar },
  hi: { translation: hi },
  zh: { translation: zh },
  it: { translation: it },
  nl: { translation: nl },
  hu: { translation: hu },
  cs: { translation: cs },
  sk: { translation: sk },
  bg: { translation: bg },
  hr: { translation: hr },
  sl: { translation: sl },
  el: { translation: el },
  tr: { translation: tr },
  ru: { translation: ru },
  uk: { translation: uk },
  he: { translation: he },
  fa: { translation: fa },
  ur: { translation: ur },
  bn: { translation: bn },
  pa: { translation: pa },
  gu: { translation: gu },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  th: { translation: th },
  vi: { translation: vi },
  id: { translation: id },
  ms: { translation: ms },
  tl: { translation: tl },
  'zh-TW': { translation: zhTW },
  ja: { translation: ja },
  ko: { translation: ko },
  sv: { translation: sv },
  da: { translation: da },
  no: { translation: no },
  fi: { translation: fi },
  lt: { translation: lt },
  lv: { translation: lv },
  et: { translation: et },
  mt: { translation: mt },
};

// Supported languages with metadata
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', rtl: false },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', rtl: false },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', rtl: false },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', rtl: false },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', rtl: false },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', rtl: false },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', rtl: false },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', rtl: false },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', rtl: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', rtl: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', rtl: false },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', rtl: false },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', rtl: false },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', rtl: false },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', rtl: false },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', rtl: false },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', rtl: false },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', rtl: false },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', rtl: false },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', rtl: false },
];

const LANGUAGE_STORAGE_KEY = '@uplift_language';

// Callbacks for language change listeners
type LanguageChangeListener = (language: string) => void;
const languageChangeListeners: Set<LanguageChangeListener> = new Set();

// Subscribe to language changes
export const onLanguageChange = (callback: LanguageChangeListener) => {
  languageChangeListeners.add(callback);
  return () => languageChangeListeners.delete(callback);
};

// Notify all listeners of language change
const notifyLanguageChange = (language: string) => {
  languageChangeListeners.forEach(callback => callback(language));
};

// Initialize i18n synchronously with English, then load saved language
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Start with English
    fallbackLng: 'en',
    defaultNS: 'translation',

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false, // Disable suspense for React Native
      bindI18n: 'languageChanged loaded', // Re-render on language change
      bindI18nStore: 'added removed', // Re-render on store changes
    },

    // Ensure changes are applied immediately
    compatibilityJSON: 'v4',
  });

// Load stored language preference after init
export const initializeLanguage = async (): Promise<string> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && resources[storedLanguage as keyof typeof resources]) {
      await i18n.changeLanguage(storedLanguage);
      return storedLanguage;
    }

    // Fall back to device locale
    const deviceLocale = Localization.locale.split('-')[0];
    if (resources[deviceLocale as keyof typeof resources]) {
      await i18n.changeLanguage(deviceLocale);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, deviceLocale);
      return deviceLocale;
    }

    return 'en';
  } catch (error) {
    return 'en';
  }
};

// Helper to change language - MUST call this to change language
export const changeLanguage = async (languageCode: string): Promise<void> => {
  try {
    // Validate language code
    if (!resources[languageCode as keyof typeof resources]) {
      return;
    }

    // Change i18n language
    await i18n.changeLanguage(languageCode);

    // Persist to storage
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);

    // Notify all listeners to force re-renders
    notifyLanguageChange(languageCode);

  } catch (error) {
  }
};

// Get current language info
export const getCurrentLanguage = () => {
  const code = i18n.language || 'en';
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
};

// Check if current language is RTL
export const isRTL = () => {
  const lang = getCurrentLanguage();
  return lang?.rtl || false;
};

// Get current language code
export const getLanguageCode = () => i18n.language || 'en';

export default i18n;
