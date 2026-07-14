import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Check local storage for existing language preference, default to 'en'
  const [locale, setLocale] = useState(localStorage.getItem('appLocale') || 'en');
  const t = translations[locale] || translations.en; // Fallback to English

  const changeLanguage = (newLocale) => {
    if (translations[newLocale]) {
      setLocale(newLocale);
      localStorage.setItem('appLocale', newLocale);
      document.documentElement.lang = newLocale; // Update HTML lang attribute
    }
  };

  useEffect(() => {
    // Set initial HTML lang attribute
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook for easier context access
export const useTranslation = () => useContext(LanguageContext);