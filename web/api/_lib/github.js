import { Octokit } from '@octokit/rest';

export function getOctokit() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not configured on the server.');
  }
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

export function repoConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!owner || !repo) {
    throw new Error('GITHUB_OWNER and GITHUB_REPO must be configured on the server.');
  }
  return { owner, repo, branch };
}

export async function readJsonFile(octokit, { owner, repo, branch }, path, fallback) {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.status === 404) return fallback;
    throw err;
  }
}

// Commits one or more file changes as a single commit via the Git Data API
// (the simpler Contents API can only write one file per commit).
export async function commitFiles(octokit, cfg, files, message) {
  const { data: refData } = await octokit.rest.git.getRef({
    owner: cfg.owner,
    repo: cfg.repo,
    ref: `heads/${cfg.branch}`,
  });
  const latestCommitSha = refData.object.sha;

  const { data: commitData } = await octokit.rest.git.getCommit({
    owner: cfg.owner,
    repo: cfg.repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;

  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data } = await octokit.rest.git.createBlob({
        owner: cfg.owner,
        repo: cfg.repo,
        content: file.content,
        encoding: file.encoding ?? 'utf-8',
      });
      return { path: file.path, sha: data.sha };
    })
  );

  const { data: treeData } = await octokit.rest.git.createTree({
    owner: cfg.owner,
    repo: cfg.repo,
    base_tree: baseTreeSha,
    tree: blobs.map((blob) => ({ path: blob.path, mode: '100644', type: 'blob', sha: blob.sha })),
  });

  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner: cfg.owner,
    repo: cfg.repo,
    message,
    tree: treeData.sha,
    parents: [latestCommitSha],
  });

  await octokit.rest.git.updateRef({
    owner: cfg.owner,
    repo: cfg.repo,
    ref: `heads/${cfg.branch}`,
    sha: newCommit.sha,
  });

  return newCommit.sha;
}
