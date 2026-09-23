// Deletes old Vercel deployments so the Hobby plan's Deployment Storage
// limit doesn't fill up. Every push to main (article-data commits, code
// changes) triggers a new deployment, and each one bundles the entire
// (ever-growing) /data corpus, so they accumulate fast.
//
// Safety model: only ever deletes a deployment that is (a) not currently
// served by any alias/domain, (b) not mid-build, and (c) not among the
// newest KEEP_LATEST ready deployments. If the currently-live deployment
// can't be determined, the whole run aborts without deleting anything.
//
// Env vars:
//   VERCEL_TOKEN        required
//   VERCEL_PROJECT_ID   required
//   VERCEL_TEAM_ID      required (this is a team account)
//   KEEP_LATEST         optional, default 5
//   DRY_RUN             optional, "true" to only log what would be deleted

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID;
const KEEP_LATEST = Number(process.env.KEEP_LATEST ?? 5);
const DRY_RUN = process.env.DRY_RUN === 'true';

const API_BASE = 'https://api.vercel.com';
const IN_PROGRESS_STATES = new Set(['BUILDING', 'QUEUED', 'INITIALIZING']);
const DELETE_PAUSE_MS = 300;
const MAX_RETRIES = 5;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

requireEnv('VERCEL_TOKEN', VERCEL_TOKEN);
requireEnv('VERCEL_PROJECT_ID', PROJECT_ID);
requireEnv('VERCEL_TEAM_ID', TEAM_ID);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries on 429 (rate limit) using the server's `retry-after` header when
// present, otherwise exponential backoff. Any other status is returned
// as-is for the caller to handle.
async function apiFetch(path, options = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, ...(options.headers ?? {}) },
    });
    if (res.status !== 429) return res;
    if (attempt === MAX_RETRIES) return res;
    const retryAfterHeader = Number(res.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader * 1000
      : 2 ** attempt * 1000;
    console.log(`  Rate limited on ${path}, retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
    await sleep(delayMs);
  }
  throw new Error(`Unreachable`);
}

// The project's own GET endpoint has no single reliable scalar field for
// "the current production deployment" across API versions — the aliases
// list does, directly and unambiguously (deploymentId per live domain).
// Protecting every deployment behind every alias (not just the apex
// production one) errs on the safe side for any custom/preview domains
// pinned on purpose.
async function getLiveDeploymentIds() {
  const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, limit: '100' });
  const res = await apiFetch(`/v4/aliases?${qs}`);
  if (!res.ok) {
    console.error(`Failed to fetch aliases: ${res.status} ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  const ids = new Set((data.aliases ?? []).map((a) => a.deploymentId).filter(Boolean));
  return ids;
}

async function listAllDeployments() {
  const all = [];
  let until;
  for (;;) {
    const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, limit: '100' });
    if (until) qs.set('until', String(until));
    const res = await apiFetch(`/v7/deployments?${qs}`);
    if (!res.ok) throw new Error(`Failed to list deployments: ${res.status} ${await res.text()}`);
    const data = await res.json();
    all.push(...(data.deployments ?? []));
    until = data.pagination?.next;
    if (!until) break;
  }
  return all;
}

async function deleteDeployment(uid) {
  const qs = new URLSearchParams({ teamId: TEAM_ID });
  return apiFetch(`/v13/deployments/${uid}?${qs}`, { method: 'DELETE' });
}

async function main() {
  console.log(`Cleanup run — KEEP_LATEST=${KEEP_LATEST} DRY_RUN=${DRY_RUN}`);

  const liveIds = await getLiveDeploymentIds();
  if (!liveIds || liveIds.size === 0) {
    console.error('Could not determine any currently-live (aliased) deployment — aborting, nothing deleted.');
    process.exit(1);
  }
  console.log(`Live/aliased deployments (protected): ${[...liveIds].join(', ')}`);

  const deployments = await listAllDeployments();
  console.log(`Found ${deployments.length} total deployment(s).`);

  const protectedIds = new Set(liveIds);
  for (const d of deployments) {
    if (IN_PROGRESS_STATES.has(d.readyState)) protectedIds.add(d.uid);
  }

  const readyNewestFirst = deployments
    .filter((d) => d.readyState === 'READY')
    .sort((a, b) => Number(b.created) - Number(a.created));
  for (const d of readyNewestFirst.slice(0, KEEP_LATEST)) protectedIds.add(d.uid);

  const candidates = deployments
    .filter((d) => !protectedIds.has(d.uid) && d.readyState !== 'DELETED')
    .sort((a, b) => Number(a.created) - Number(b.created)); // oldest first

  console.log(`Protected: ${protectedIds.size}. Candidates to delete: ${candidates.length}.`);

  let deletedCount = 0;
  let failedCount = 0;

  for (const d of candidates) {
    const label = `${d.uid} ${d.url ?? '(no url)'} [${d.readyState}] ${new Date(Number(d.created)).toISOString()}`;
    if (DRY_RUN) {
      console.log(`[DRY RUN] would delete ${label}`);
      continue;
    }
    const res = await deleteDeployment(d.uid);
    if (res.ok) {
      console.log(`Deleted ${label}`);
      deletedCount++;
    } else {
      console.error(`Failed to delete ${label}: ${res.status} ${await res.text()}`);
      failedCount++;
    }
    await sleep(DELETE_PAUSE_MS);
  }

  console.log('---');
  console.log(
    `Summary: found=${deployments.length} protected=${protectedIds.size} candidates=${candidates.length} `
    + `deleted=${deletedCount} failed=${failedCount} dryRun=${DRY_RUN}`
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
