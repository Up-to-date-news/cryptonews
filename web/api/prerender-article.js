import { resolveBaseUrl, fetchJson, escapeHtml, renderPrerenderPage, sendPrerenderPage } from './_lib/prerender.js';

const SITE_URL = 'https://cryptonews-peach.vercel.app';

export default async function handler(req, res) {
  const slug = req.query?.slug;
  if (!slug) {
    res.status(400).send('Missing slug');
    return;
  }

  const base = resolveBaseUrl(req);
  const index = await fetchJson(`${base}/data/index.json`, []);
  const entry = index.find((a) => a.slug === slug);
  if (!entry) {
    res.status(404).send('Article not found');
    return;
  }

  const day = (entry.pubDate || '').slice(0, 10);
  const dayArticles = await fetchJson(`${base}/data/articles/${day}.json`, []);
  const article = dayArticles.find((a) => a.id === entry.id) || entry;

  const description = (article.content || article.summary || '').slice(0, 160);
  const url = `${SITE_URL}/article/${slug}`;
  const image = article.imagePath ? `${SITE_URL}/${article.imagePath}` : `${SITE_URL}/logos/favicon.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description,
    image: [image],
    datePublished: article.pubDate,
    dateModified: article.pubDate,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'up to date news' },
    publisher: {
      '@type': 'Organization',
      name: 'up to date news',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/favicon.png` },
    },
  };

  const bodyHtml = `
<article>
  <h1>${escapeHtml(article.title)}</h1>
  ${article.tags?.length ? `<p>${article.tags.map(escapeHtml).join(', ')}</p>` : ''}
  <p>${escapeHtml(article.content || article.summary || 'Content unavailable for this article.')}</p>
  <p>Source: ${escapeHtml(article.source || 'up to date news')} — Published ${escapeHtml(article.pubDate || '')}</p>
  <p><a href="${escapeHtml(url)}">Read on up to date news</a></p>
</article>`;

  const html = renderPrerenderPage({
    title: article.title,
    description,
    url,
    image,
    type: 'article',
    jsonLd,
    bodyHtml,
  });

  sendPrerenderPage(res, html);
}
