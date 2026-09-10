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
// Tamil goes through this too now (not just Tier 2) — it gives Tamil
// readers a fully-translated nav/chrome/event pages, while ArticlePage
// marks its curated `content_ta` paragraph `translate="no"` so the
// widget doesn't re-translate (and potentially mangle) text that's
// already Tamil.
function applyWidgetLanguage(widgetCode, attempt = 0) {
  const select = document.querySelector('.goog-te-combo');
  if (!select) {
    if (attempt > 25) return; // ~5s of retrying — widget script may have failed to load
    setTimeout(() => applyWidgetLanguage(widgetCode, attempt + 1), 200);
    return;
  }

  // If the select is already on this language (e.g. re-applying after a
  // client-side route change to a new page the widget hasn't seen yet),
  // setting the same value and dispatching 'change' is a silent no-op —
  // Google's own listener only reacts to an actual value transition.
  // Bounce through the blank "Select Language" option first to force one.
  if (select.value === widgetCode) {
    select.value = '';
    select.dispatchEvent(new Event('change'));
    setTimeout(() => {
      select.value = widgetCode;
      select.dispatchEvent(new Event('change'));
    }, 50);
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

// Hiding the banner iframe via CSS doesn't stop Google's script from also
// pushing `body` down with an inline `top` offset to make room for it —
// and that inline style can be (re)applied after our stylesheet loads, so
// a CSS override alone isn't reliable against it. Watch for it and reset
// it directly instead of fighting a cascade-order race.
function watchBodyTopOffset() {
  const reset = () => {
    if (document.body.style.top && document.body.style.top !== '0px') {
      document.body.style.top = '0px';
    }
  };
  reset();
  const observer = new MutationObserver(reset);
  observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
  return observer;
}

const AUTO_APPLIED_KEY = 'langAutoApplied';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getSavedLanguage() ?? 'en');
  const [autoDetected, setAutoDetected] = useState(false);
  // The geo-guessed language for this visitor, independent of what they
  // currently have selected — used by the switcher to surface a
  // "suggested for your region" option even after a manual override.
  const [regionLanguage, setRegionLanguage] = useState(null);
  const location = useLocation();

  // React Router swaps in fresh DOM on every client-side navigation, which
  // the widget never sees (it only translates on its own combo-box
  // change event) — left alone, a translated view reverts to English for
  // whatever the new route just rendered while old chrome (header/nav)
  // stays stuck in the previous language. Re-firing the same selection
  // makes the widget re-scan and translate the page's current DOM.
  useEffect(() => {
    if (language !== 'en') applyWidgetLanguage(language);
  }, [location.pathname, language]);

  useEffect(() => {
    const observer = watchBodyTopOffset();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch('/api/geo')
      .then((res) => (res.ok ? res.json() : null))
      .then((geo) => {
        if (!geo) return;
        const guess = detectLanguageFromGeo(geo.country, geo.region);
        setRegionLanguage(guess);

        // Only auto-apply as the active language for a genuinely fresh
        // visitor (no saved choice yet), once per session.
        if (getSavedLanguage() || sessionStorage.getItem(AUTO_APPLIED_KEY) || guess === 'en') return;
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

    if (code === 'en') {
      if (language !== 'en') reloadToEnglish();
      else setLanguageState('en');
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
    () => ({ language, changeLanguage, autoDetected, dismissAutoNote, regionLanguage }),
    [language, autoDetected, regionLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
