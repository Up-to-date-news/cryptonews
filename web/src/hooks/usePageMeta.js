import { useEffect } from 'react';

const SITE_NAME = 'up to date news';
const SITE_URL = 'https://cryptonews-peach.vercel.app';
const DEFAULT_IMAGE = `${SITE_URL}/logos/favicon.png`;

function upsertMeta(attr, key, content) {
  if (content == null) return null;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
}

function upsertLink(rel, href) {
  if (!href) return null;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function upsertJsonLd(data) {
  let el = document.head.querySelector('script[data-page-jsonld]');
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-page-jsonld', 'true');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// Updates document.title and the head's meta/OG/Twitter/canonical/JSON-LD
// tags for the current route. Runs client-side only — for crawlers that
// don't execute JS (most AI bots), /api/prerender-article and
// /api/prerender-event serve equivalent tags server-side instead (see
// vercel.json's user-agent-conditioned rewrites).
export function usePageMeta({
  title,
  description,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd = null,
} = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Live Crypto, Fintech & Market News`;
    const desc = description || 'Live cryptocurrency and fintech news, updated around the clock — Bitcoin, Ethereum, market moves, blockchain, and financial technology headlines from trusted sources.';
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', url);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', image);

    upsertJsonLd(jsonLd);
    // Intentionally no cleanup: the next page's usePageMeta call
    // overwrites every tag it cares about, and there's always exactly
    // one route mounted at a time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type, noindex, jsonLd]);
}

export { SITE_NAME, SITE_URL };
