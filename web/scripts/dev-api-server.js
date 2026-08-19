// Local-only dev shim: runs the real api/*.js serverless function handlers
// against a plain Node http server, so /admin can be tested end-to-end
// without a Vercel/Netlify account. Not used in production — Vercel/Netlify
// run the files in web/api/ directly once deployed.
import 'dotenv/config';
import http from 'node:http';
import adminLogin from '../api/admin-login.js';
import createNews from '../api/create-news.js';
import addTag from '../api/add-tag.js';
import createEvent from '../api/create-event.js';
import updateNews from '../api/update-news.js';
import deleteNews from '../api/delete-news.js';
import updateEvent from '../api/update-event.js';
import deleteEvent from '../api/delete-event.js';

const PORT = 3001;

const routes = {
  '/api/admin-login': adminLogin,
  '/api/create-news': createNews,
  '/api/add-tag': addTag,
  '/api/create-event': createEvent,
  '/api/update-news': updateNews,
  '/api/delete-news': deleteNews,
  '/api/update-event': updateEvent,
  '/api/delete-event': deleteEvent,
};

function adaptResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return res;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const server = http.createServer(async (req, res) => {
  const handler = routes[req.url];
  adaptResponse(res);

  if (!handler) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  req.body = await readBody(req);

  try {
    await handler(req, res);
  } catch (err) {
    console.error(`[dev-api] Unhandled error in ${req.url}:`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] Local admin API shim listening on http://localhost:${PORT}`);
});
