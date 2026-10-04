import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en'

export const LANGUAGES = [
  { code: 'en', label: 'English',    nativeLabel: 'English',    flag: '🇬🇧', dir: 'ltr' },
  { code: 'ur', label: 'Urdu',       nativeLabel: 'اردو',        flag: '🇵🇰', dir: 'rtl' },
  { code: 'zh', label: 'Chinese',    nativeLabel: '中文',         flag: '🇨🇳', dir: 'ltr' },
  { code: 'ru', label: 'Russian',    nativeLabel: 'Русский',     flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar', label: 'Arabic',     nativeLabel: 'العربية',     flag: '🇸🇦', dir: 'rtl' },
  { code: 'tr', label: 'Turkish',    nativeLabel: 'Türkçe',      flag: '🇹🇷', dir: 'ltr' },
  { code: 'fr', label: 'French',     nativeLabel: 'Français',    flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'German',     nativeLabel: 'Deutsch',     flag: '🇩🇪', dir: 'ltr' },
  { code: 'es', label: 'Spanish',    nativeLabel: 'Español',     flag: '🇪🇸', dir: 'ltr' },
  { code: 'it', label: 'Italian',    nativeLabel: 'Italiano',    flag: '🇮🇹', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português',   flag: '🇵🇹', dir: 'ltr' },
]

type LocaleCode = (typeof LANGUAGES)[number]['code']

const localeLoaders: Record<Exclude<LocaleCode, 'en'>, () => Promise<{ default: typeof en }>> = {
  ur: () => import('./locales/ur'),
  zh: () => import('./locales/zh'),
  ru: () => import('./locales/ru'),
  ar: () => import('./locales/ar'),
  tr: () => import('./locales/tr'),
  fr: () => import('./locales/fr'),
  de: () => import('./locales/de'),
  es: () => import('./locales/es'),
  it: () => import('./locales/it'),
  pt: () => import('./locales/pt'),
}

const loadedLocales = new Set<string>(['en'])

/** Ensure a locale's resource bundle is registered before changing language. */
export async function loadLocale(lng: string): Promise<void> {
  const code = lng.split('-')[0] as LocaleCode
  if (loadedLocales.has(code) || code === 'en') return

  const loader = localeLoaders[code as Exclude<LocaleCode, 'en'>]
  if (!loader) return

  const mod = await loader()
  const bundle = mod.default
  for (const ns of Object.keys(bundle)) {
    i18n.addResourceBundle(code, ns, (bundle as Record<string, unknown>)[ns], true, true)
  }
  loadedLocales.add(code)
}

/** Load locale (if needed) then switch language — use this instead of i18n.changeLanguage. */
export async function changeLanguage(lng: string): Promise<void> {
  await loadLocale(lng)
  await i18n.changeLanguage(lng)
}

function detectStoredLanguage(): string {
  try {
    const stored = localStorage.getItem('og-exports-lang')
    if (stored) {
      const code = stored.split('-')[0]
      if (LANGUAGES.some(l => l.code === code)) return code
    }
  } catch {
    // ignore (SSR / private mode)
  }
  return 'en'
}

const initialLng = detectStoredLanguage()

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'og-exports-lang',
    },
  })

// Preload stored/detected non-English locale (missing keys fall back to en until loaded)
if (initialLng !== 'en') {
  void changeLanguage(initialLng)
}

// Sync <html dir> on language change
i18n.on('languageChanged', (lng) => {
  const code = lng.split('-')[0]
  const lang = LANGUAGES.find(l => l.code === code)
  document.documentElement.setAttribute('dir', lang?.dir ?? 'ltr')
  document.documentElement.setAttribute('lang', code)
})

export default i18n
