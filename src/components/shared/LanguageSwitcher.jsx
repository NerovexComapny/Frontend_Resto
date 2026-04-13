import React from 'react';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
];

const LanguageSwitcher = ({ compact = false }) => {
  const { i18n, t } = useTranslation();
  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  return (
    <div className={compact ? 'inline-flex items-center gap-2' : 'inline-flex items-center gap-3'}>
      {!compact && (
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          {t('language.label')}
        </span>
      )}
      <div className="inline-flex rounded-lg border border-[#1e3a5f] bg-[#132845] p-1">
        {SUPPORTED_LANGUAGES.map((language) => {
          const active = currentLanguage === language.code;
          return (
            <button
              key={language.code}
              type="button"
              onClick={() => i18n.changeLanguage(language.code)}
              aria-label={t(`language.${language.code === 'en' ? 'english' : language.code === 'fr' ? 'french' : 'arabic'}`)}
              className={
                `px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  active
                    ? 'bg-[#7c6af7] text-white'
                    : 'text-slate-300 hover:text-white hover:bg-[#1e3a5f]'
                }`
              }
            >
              {language.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
