import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

const applyDocumentDirection = (language) => {
  if (typeof document === 'undefined') return;

  const normalized = String(language || 'en').split('-')[0];
  const isRtl = normalized === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  document.documentElement.lang = normalized;
  document.documentElement.dir = dir;
  if (document.body) {
    document.body.dir = dir;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ar'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

applyDocumentDirection(i18n.resolvedLanguage || i18n.language || 'en');
i18n.on('languageChanged', applyDocumentDirection);

export default i18n;
