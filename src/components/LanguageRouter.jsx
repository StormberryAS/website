import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGS = ['en', 'no', 'pt', 'br', 'fr'];

export default function LanguageRouter({ children }) {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!lang || !SUPPORTED_LANGS.includes(lang)) {
      navigate('/en', { replace: true });
      return;
    }
    // br and pt both use the 'pt' translation
    const i18nLang = lang === 'br' ? 'pt' : lang;
    if (i18n.language !== i18nLang) {
      i18n.changeLanguage(i18nLang);
    }
  }, [lang, i18n, navigate]);

  return children;
}

export { SUPPORTED_LANGS };
