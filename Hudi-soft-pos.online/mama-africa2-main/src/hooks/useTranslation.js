// src/hooks/useTranslation.js
import { useState, useEffect, useCallback } from 'react';
import en from '../i18n/en.js';
import so from '../i18n/so.js';
import ar from '../i18n/ar.js';

const translations = { en, so, ar };

const STORAGE_KEY = 'qr_menu_lang';

export const useTranslation = () => {
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && translations[stored] ? stored : 'en';
    } catch {
      return 'en';
    }
  });

  const isRTL = lang === 'ar';

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    // Set document direction for Arabic
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const t = useCallback((key) => {
    const dict = translations[lang] || en;
    return dict[key] || en[key] || key;
  }, [lang]);

  const changeLang = useCallback((newLang) => {
    if (translations[newLang]) setLang(newLang);
  }, []);

  return { t, lang, changeLang, isRTL, availableLangs: Object.keys(translations) };
};

export default useTranslation;
