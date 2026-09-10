import { useEffect, useRef, useState } from 'react';
import { LANGUAGES } from '../lib/language.js';
import { useLanguage } from '../lib/LanguageContext.jsx';
import { GlobeIcon } from './icons.jsx';

export default function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div className="language-switcher" ref={containerRef}>
      <button
        type="button"
        className="language-switcher-toggle"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <GlobeIcon size={18} />
        <span className="language-switcher-current">{current.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <ul className="language-switcher-dropdown">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                className={`language-switcher-option${lang.code === language ? ' is-selected' : ''}`}
                onClick={() => {
                  setIsOpen(false);
                  if (lang.code !== language) changeLanguage(lang.code);
                }}
              >
                {lang.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
