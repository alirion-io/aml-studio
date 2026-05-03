/**
 * AML Studio — API Client
 *
 * ALL calls to the backend API are centralised in this file and in the
 * companion provider-specific files (github.api.ts, bitbucket.api.ts).
 * Business logic elsewhere in the app MUST NOT make fetch() calls directly.
 *
 * When config.backendUrl is undefined, any function that requires a backend
 * throws a BackendUnavailableError which the UI catches and surfaces.
 */

import config from '../config/config';

export class BackendUnavailableError extends Error {
  constructor() {
    super('Backend is not configured. Set VITE_BACKEND_URL in your environment to enable this feature.');
    this.name = 'BackendUnavailableError';
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.backendUrl) throw new BackendUnavailableError();

  const url = `${config.backendUrl}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new ApiError(resp.status, body || resp.statusText);
  }

  return resp.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Initiate OAuth flow for a provider. Returns the redirect URL to navigate to. */
export async function startOAuth(provider: 'github' | 'bitbucket'): Promise<{ redirectUrl: string }> {
  return request<{ redirectUrl: string }>(`/auth/${provider}/start`);
}

/** Exchange OAuth callback code for a session. Called after redirect. */
export async function completeOAuth(provider: string, code: string, state: string): Promise<void> {
  return request<void>(`/auth/${provider}/callback`, {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

/** Get the currently authenticated user for a provider session. */
export async function getAuthenticatedUser(provider: string): Promise<{
  login: string;
  name: string;
  avatarUrl: string;
  email: string;
}> {
  return request<{ login: string; name: string; avatarUrl: string; email: string }>(
    `/auth/${provider}/user`
  );
}

/** Revoke the session for a provider. */
export async function revokeProviderSession(provider: string): Promise<void> {
  return request<void>(`/auth/${provider}/revoke`, { method: 'POST' });
}

// ─── Repositories ─────────────────────────────────────────────────────────────

export interface RemoteRepository {
  id: string;
  fullName: string;
  name: string;
  owner: string;
  provider: 'github' | 'bitbucket';
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
}

/** List repositories accessible to the authenticated user for a provider. */
export async function listProviderRepositories(provider: string): Promise<RemoteRepository[]> {
  return request<RemoteRepository[]>(`/repos/${provider}`);
}

/** Connect a repository (index AML files and store connection metadata). */
export async function connectRepository(
  provider: string,
  fullName: string
): Promise<{ repoId: string; artefactCounts: Record<string, number> }> {
  return request<{ repoId: string; artefactCounts: Record<string, number> }>(
    `/repos/connect`,
    {
      method: 'POST',
      body: JSON.stringify({ provider, fullName }),
    }
  );
}

/** Disconnect a repository from the user's Studio view. */
export async function disconnectRepository(repoId: string): Promise<void> {
  return request<void>(`/repos/${repoId}`, { method: 'DELETE' });
}

// ─── Git Operations ───────────────────────────────────────────────────────────

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  authorLogin: string;
  timestamp: string;
  htmlUrl: string;
}

/** Get the latest commit on a repository's default branch. */
export async function getLatestCommit(repoId: string): Promise<CommitInfo> {
  return request<CommitInfo>(`/repos/${repoId}/commits/latest`);
}

/** Pull (fetch latest content from remote) for a connected repository. */
export async function pullRepository(repoId: string): Promise<{ newArtefactsCount: number }> {
  return request<{ newArtefactsCount: number }>(`/repos/${repoId}/pull`, { method: 'POST' });
}

/** Push staged local changes to the repository. */
export async function pushChanges(
  repoId: string,
  files: { path: string; content: string; commitMessage: string }[],
  reviewWorkflow: boolean
): Promise<{ branch: string; prUrl?: string; prNumber?: number }> {
  return request<{ branch: string; prUrl?: string; prNumber?: number }>(
    `/repos/${repoId}/push`,
    {
      method: 'POST',
      body: JSON.stringify({ files, reviewWorkflow }),
    }
  );
}

// ─── Pull Requests ────────────────────────────────────────────────────────────

export interface PullRequest {
  number: number;
  title: string;
  htmlUrl: string;
  author: string;
  authorLogin: string;
  authorAvatarUrl: string;
  branch: string;
  createdAt: string;
  state: 'open' | 'merged' | 'closed';
  mergedAt?: string;
  closedAt?: string;
}

/** List open pull requests for a connected repository. */
export async function listPullRequests(repoId: string): Promise<PullRequest[]> {
  return request<PullRequest[]>(`/repos/${repoId}/pull-requests`);
}

// ─── Public Repository Import ─────────────────────────────────────────────────

/**
 * Fetch AML artefact files from a public repository URL.
 * This call goes to the public Git provider directly (no backend required).
 * For GitHub: uses the GitHub public API (unauthenticated, rate-limited).
 */
export async function fetchPublicRepoContents(repoUrl: string, rootPath?: string): Promise<{
  files: { path: string; content: string }[];
  owner: string;
  repo: string;
  defaultBranch: string;
}> {
  // Parse owner/repo from the URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error('Only GitHub public repositories are supported for URL import at this time.');
  }
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');

  // Normalise rootPath: strip leading/trailing slashes, empty string → undefined
  const normalizedRoot = rootPath?.trim().replace(/^\/+|\/+$/g, '') || undefined;

  // Get default branch
  const repoResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
  if (!repoResp.ok) throw new Error(`GitHub API error: ${repoResp.status} ${repoResp.statusText}`);
  const repoInfo = await repoResp.json();

  const defaultBranch = repoInfo.default_branch ?? 'main';

  // Get the Git tree recursively
  const treeResp = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );
  if (!treeResp.ok) throw new Error(`GitHub API error: ${treeResp.status} ${treeResp.statusText}`);
  const tree = await treeResp.json();

  const amlFiles = (tree.tree ?? []).filter((f: { path: string; type: string }) =>
    f.type === 'blob' &&
    /\.(agent|tool|kb|iam|model|collection|guardrail)\.md$/i.test(f.path) &&
    (normalizedRoot === undefined || f.path.startsWith(normalizedRoot + '/') || f.path === normalizedRoot)
  );

  const files = await Promise.all(
    amlFiles.map(async (f: { path: string }) => {
      const rawResp = await fetch(
        `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${defaultBranch}/${f.path}`
      );
      if (!rawResp.ok) throw new Error(`Failed to fetch file ${f.path}: ${rawResp.status}`);
      const raw = await rawResp.text();
      return { path: f.path, content: raw };
    })
  );

  return { files, owner, repo: cleanRepo, defaultBranch };
}
