// Tier 1 (Tamil) is curated — the pipeline asks Gemini for a `content_ta`
// field alongside the English content, so no client-side translation is
// needed or used for it. Every other language here is Tier 2: Google's
// free client-side Website Translator widget, driven programmatically.
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'mr', name: 'मराठी' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'اردو' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'th', name: 'ไทย' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'ar', name: 'العربية' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh-CN', name: '中文（简体）' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'tl', name: 'Filipino' },
];

// India state/region → language. IP-to-state accuracy is unreliable (many
// ISPs register whole blocks to one city), so this is a best-effort
// default only — the switcher and a saved manual choice always win.
const REGION_LANGUAGE = {
  'IN-TN': 'ta',
  'IN-KA': 'kn',
  'IN-AP': 'te',
  'IN-TG': 'te',
  'IN-KL': 'ml',
  'IN-WB': 'bn',
  'IN-MH': 'mr',
  'IN-GJ': 'gu',
  'IN-PB': 'pa',
};

const COUNTRY_LANGUAGE = {
  IN: 'hi',
  PK: 'ur',
  GB: 'en',
  US: 'en',
  CA: 'en',
  AU: 'en',
  BR: 'pt',
  PT: 'pt',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  VN: 'vi',
  ID: 'id',
  TH: 'th',
  TR: 'tr',
  RU: 'ru',
  UA: 'uk',
  AE: 'ar',
  SA: 'ar',
  EG: 'ar',
  FR: 'fr',
  DE: 'de',
  NG: 'en',
  CN: 'zh-CN',
  SG: 'zh-CN',
  JP: 'ja',
  KR: 'ko',
  IT: 'it',
  NL: 'nl',
  PL: 'pl',
  PH: 'tl',
};

export function detectLanguageFromGeo(country, region) {
  if (!country) return 'en';
  if (region && REGION_LANGUAGE[`${country}-${region}`]) return REGION_LANGUAGE[`${country}-${region}`];
  return COUNTRY_LANGUAGE[country] ?? 'en';
}

const STORAGE_KEY = 'preferredLanguage';

export function getSavedLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLanguage(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private browsing / storage blocked — language choice just won't
    // persist across visits, which is a harmless degradation.
  }
}
