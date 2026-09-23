# Up to Date Crypto News

## Vercel deployment cleanup

`scripts/cleanup-deployments.mjs`, run by `.github/workflows/cleanup-vercel-deployments.yml`
after every successful production deployment (plus a daily 2:30am UTC
fallback and manual dispatch), deletes old Vercel deployments so the
Hobby plan's Deployment Storage limit doesn't fill up. It never touches
the live site or the GitHub data — it only removes old *build copies*
Vercel keeps around. See the comment block at the top of the script for
the exact safety rules.

### One-time secrets setup (GitHub repo → Settings → Secrets and variables → Actions)

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create. Scope it to this team/project if the token creation UI offers that option — it only needs to read and delete deployments, nothing broader. |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General, or `.vercel/project.json` after running `vercel link` locally. |
| `VERCEL_TEAM_ID` | Same place as the project ID — this project is on a team account, so both are required. |

### Testing it

- Run the workflow manually from the Actions tab with `dry_run: true` first — it only logs what *would* be deleted, nothing is removed.
- Once the dry run's list looks right (current live deployment and the newest few are never in it), run again with `dry_run: false`.
- `KEEP_LATEST` (default 5) controls how many recent ready deployments are always kept as a buffer, on top of whatever's currently live.
