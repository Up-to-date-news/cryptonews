const SITE_NAME = 'Up to Date Crypto News';

// Vite serves the SPA and its /data/*.json on one origin in production;
// locally the API shim runs on :3001 while Vite serves everything else
// (including the static /data files these functions read) on :5173.
export function resolveBaseUrl(req) {
  const host = req.headers.host || '';
  if (host.includes('localhost:3001')) return 'http://localhost:5173';
  const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export async function fetchJson(url, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

// Minimal but complete HTML document — enough for a non-JS crawler (most
// AI bots, and some search/social bots) to read the real title, meta
// description, Open Graph/Twitter tags, JSON-LD, and body text without
// executing the React SPA. Regular browsers and JS-capable crawlers never
// reach this — vercel.json only rewrites here for known bot user agents.
export function renderPrerenderPage({ title, description, url, image, type, jsonLd, bodyHtml }) {
  const fullTitle = `${title} — ${SITE_NAME}`;
  const desc = escapeHtml(description || '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${desc}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${escapeHtml(url)}" />
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
<meta property="og:type" content="${escapeHtml(type)}" />
<meta property="og:title" content="${escapeHtml(fullTitle)}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

export function sendPrerenderPage(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Public CDN cache: real content changes at most every ~2.5h (the fetch
  // cycle) or on an admin edit, so a short client cache plus a longer
  // edge cache keeps this cheap without ever serving very stale bot pages.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
}
