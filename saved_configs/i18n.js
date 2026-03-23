import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en/translation.json';
import noTranslations from './locales/no/translation.json';
import ptTranslations from './locales/pt/translation.json';
import frTranslations from './locales/fr/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      no: { translation: noTranslations },
      pt: { translation: ptTranslations },
      fr: { translation: frTranslations },
    },
    lng: 'en', // default; overridden by LanguageRouter from URL
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
