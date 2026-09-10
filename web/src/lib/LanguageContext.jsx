import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { detectLanguageFromGeo, getSavedLanguage, saveLanguage } from './language.js';

const LanguageContext = createContext(null);

// The widget's own <select> (injected into #google_translate_element,
// kept hidden) is the only reliable way to drive it — Google's
// autoDisplay/cookie-based auto-translation does not fire when
// autoDisplay is false, so this must be done explicitly. The select
// mounts asynchronously (translate.google.com's script loads and runs
// after our own bundle), so retry briefly instead of assuming it exists.
function applyWidgetLanguage(widgetCode, attempt = 0) {
  const select = document.querySelector('.goog-te-combo');
  if (!select) {
    if (attempt > 25) return; // ~5s of retrying — widget script may have failed to load
    setTimeout(() => applyWidgetLanguage(widgetCode, attempt + 1), 200);
    return;
  }
  select.value = widgetCode;
  select.dispatchEvent(new Event('change'));
}

// Reverting a live translation cleanly through the widget itself is
// unreliable (its own "restore" affordance lives in the banner UI we
// deliberately hide) — a full reload with no language applied is the
// robust way back to the original English DOM. The widget also sets its
// own `googtrans` cookie once active and reads it on the next load, so
// that has to be cleared too or a reload re-applies the old language.
function reloadToEnglish() {
  document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `googtrans=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  window.location.reload();
}

const AUTO_APPLIED_KEY = 'langAutoApplied';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getSavedLanguage() ?? 'en');
  const [autoDetected, setAutoDetected] = useState(false);
  const location = useLocation();

  // React Router swaps in fresh DOM on every client-side navigation, which
  // the widget never sees (it only translates on its own combo-box
  // change event) — left alone, a translated view reverts to English for
  // whatever the new route just rendered while old chrome (header/nav)
  // stays stuck in the previous language. Re-firing the same selection
  // makes the widget re-scan and translate the page's current DOM.
  useEffect(() => {
    if (language !== 'en' && language !== 'ta') applyWidgetLanguage(language);
  }, [location.pathname, language]);

  // A saved Tier-2 language is re-applied to the widget by the effect
  // above (it also runs on mount, since `language` already holds it by
  // then). This effect only handles a genuinely fresh visitor: geo-detect
  // a default once per session so repeated re-renders don't re-fetch.
  useEffect(() => {
    if (getSavedLanguage() || sessionStorage.getItem(AUTO_APPLIED_KEY)) return;

    fetch('/api/geo')
      .then((res) => (res.ok ? res.json() : null))
      .then((geo) => {
        if (!geo) return;
        const guess = detectLanguageFromGeo(geo.country, geo.region);
        if (guess === 'en') return;
        sessionStorage.setItem(AUTO_APPLIED_KEY, '1');
        sessionStorage.setItem('langAutoDetectedNote', '1');
        setLanguageState(guess);
        setAutoDetected(true);
      })
      .catch(() => {
        // Geo lookup failing just means no auto-detected default — the
        // switcher is always available for a manual choice.
      });
  }, []);

  function changeLanguage(code) {
    if (code === language) return;
    saveLanguage(code);
    sessionStorage.removeItem('langAutoDetectedNote');
    setAutoDetected(false);

    const wasWidgetActive = language !== 'en' && language !== 'ta';
    if (code === 'en') {
      if (wasWidgetActive) reloadToEnglish();
      else setLanguageState('en');
      return;
    }
    if (code === 'ta') {
      if (wasWidgetActive) reloadToEnglish(); // then user re-picks ta; simplest clean path
      else setLanguageState('ta');
      return;
    }
    setLanguageState(code);
    applyWidgetLanguage(code);
  }

  function dismissAutoNote() {
    sessionStorage.removeItem('langAutoDetectedNote');
    setAutoDetected(false);
  }

  const value = useMemo(
    () => ({ language, changeLanguage, autoDetected, dismissAutoNote }),
    [language, autoDetected]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
