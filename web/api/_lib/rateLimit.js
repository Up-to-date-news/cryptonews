// In-memory, per-serverless-instance rate limiting — no external store
// needed (no Redis/KV, no extra cost), which is enough to blunt a single
// attacker hammering one warm instance. It resets on cold start and
// doesn't share state across concurrent instances, so it's a real but
// partial mitigation, not a hard guarantee — proportionate for a
// single-operator site rather than standing up paid infrastructure.
const buckets = new Map();

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function getBucket(bucketKey, windowMs, now) {
  let bucket = buckets.get(bucketKey);
  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(bucketKey, bucket);
  }
  return bucket;
}

function retryAfterSeconds(bucket, windowMs, now) {
  return Math.max(Math.ceil((bucket.windowStart + windowMs - now) / 1000), 1);
}

function cleanupIfLarge(windowMs, now) {
  if (buckets.size <= 5000) return;
  for (const [k, b] of buckets) {
    if (now - b.windowStart > windowMs) buckets.delete(k);
  }
}

// Checks-and-consumes in one step: every call counts, regardless of what
// the caller does with the request afterwards. Use for endpoints where
// every request (success or failure) should count toward the limit, e.g.
// a public form.
export function checkRateLimit(req, { key, max, windowMs }) {
  const now = Date.now();
  const bucket = getBucket(`${key}:${clientIp(req)}`, windowMs, now);
  bucket.count++;
  cleanupIfLarge(windowMs, now);
  if (bucket.count > max) return { limited: true, retryAfterSeconds: retryAfterSeconds(bucket, windowMs, now) };
  return { limited: false };
}

// Peek-only: reports whether the caller is already over the limit
// without consuming an attempt. Pair with recordFailedAttempt so only
// genuine failures (e.g. wrong password) count — a correct login on the
// first try should never be penalized.
export function isRateLimited(req, { key, max, windowMs }) {
  const now = Date.now();
  const bucket = getBucket(`${key}:${clientIp(req)}`, windowMs, now);
  if (bucket.count >= max) return { limited: true, retryAfterSeconds: retryAfterSeconds(bucket, windowMs, now) };
  return { limited: false };
}

export function recordFailedAttempt(req, { key, windowMs }) {
  const now = Date.now();
  const bucket = getBucket(`${key}:${clientIp(req)}`, windowMs, now);
  bucket.count++;
  cleanupIfLarge(windowMs, now);
}
