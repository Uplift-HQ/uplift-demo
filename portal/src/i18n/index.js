// ============================================================
// i18n CONFIGURATION
// Internationalization with all 48 supported languages
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import ALL locale files
import ar from './locales/ar.json';
import bg from './locales/bg.json';
import bn from './locales/bn.json';
import cs from './locales/cs.json';
import da from './locales/da.json';
import de from './locales/de.json';
import el from './locales/el.json';
import en from './locales/en.json';
import es from './locales/es.json';
import et from './locales/et.json';
import fa from './locales/fa.json';
import fi from './locales/fi.json';
import fr from './locales/fr.json';
import gu from './locales/gu.json';
import he from './locales/he.json';
import hi from './locales/hi.json';
import hr from './locales/hr.json';
import hu from './locales/hu.json';
import id from './locales/id.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import kn from './locales/kn.json';
import ko from './locales/ko.json';
import lt from './locales/lt.json';
import lv from './locales/lv.json';
import ml from './locales/ml.json';
import ms from './locales/ms.json';
import mt from './locales/mt.json';
import nl from './locales/nl.json';
import no from './locales/no.json';
import pa from './locales/pa.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import sk from './locales/sk.json';
import sl from './locales/sl.json';
import sv from './locales/sv.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import th from './locales/th.json';
import tl from './locales/tl.json';
import tr from './locales/tr.json';
import uk from './locales/uk.json';
import ur from './locales/ur.json';
import vi from './locales/vi.json';
import zh from './locales/zh.json';
import zhTW from './locales/zh-TW.json';

const resources = {
  ar: { translation: ar },
  bg: { translation: bg },
  bn: { translation: bn },
  cs: { translation: cs },
  da: { translation: da },
  de: { translation: de },
  el: { translation: el },
  en: { translation: en },
  es: { translation: es },
  et: { translation: et },
  fa: { translation: fa },
  fi: { translation: fi },
  fr: { translation: fr },
  gu: { translation: gu },
  he: { translation: he },
  hi: { translation: hi },
  hr: { translation: hr },
  hu: { translation: hu },
  id: { translation: id },
  it: { translation: it },
  ja: { translation: ja },
  kn: { translation: kn },
  ko: { translation: ko },
  lt: { translation: lt },
  lv: { translation: lv },
  ml: { translation: ml },
  ms: { translation: ms },
  mt: { translation: mt },
  nl: { translation: nl },
  no: { translation: no },
  pa: { translation: pa },
  pl: { translation: pl },
  pt: { translation: pt },
  ro: { translation: ro },
  ru: { translation: ru },
  sk: { translation: sk },
  sl: { translation: sl },
  sv: { translation: sv },
  ta: { translation: ta },
  te: { translation: te },
  th: { translation: th },
  tl: { translation: tl },
  tr: { translation: tr },
  uk: { translation: uk },
  ur: { translation: ur },
  vi: { translation: vi },
  zh: { translation: zh },
  'zh-TW': { translation: zhTW },
};

// Language metadata for the language selector
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', rtl: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'uplift_language',
    },
  });

// Helper to change language
export const changeLanguage = (languageCode) => {
  i18n.changeLanguage(languageCode);
  localStorage.setItem('uplift_language', languageCode);
  
  // Handle RTL languages
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
  if (lang?.rtl) {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
  }
};

// Get current language info
export const getCurrentLanguage = () => {
  const code = i18n.language || 'en';
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
};

export default i18n;
