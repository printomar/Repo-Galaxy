import type { GalaxyLink, GalaxyNode, RepoGalaxyData } from '../types';

export interface ParsedGitHubRepo {
  owner: string;
  repo: string;
}

interface GitHubRepoResponse {
  name: string;
  owner: { login: string };
  description: string | null;
  stargazers_count: number;
  language: string | null;
  default_branch: string;
}

interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url: string;
}

interface GitTreeResponse {
  tree: GitTreeItem[];
  truncated?: boolean;
}

export const SOURCE_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs']);
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss'];
const MAX_SOURCE_FILES = 120;
const MAX_SOURCE_BYTES = 750_000;

export function parseGitHubUrl(input: string): ParsedGitHubRepo {
  const trimmed = input.trim();
  const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i);
  if (!match) {
    throw new Error('Enter a GitHub repo URL like github.com/owner/repo.');
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

export async function fetchRepoGalaxyData(input: string): Promise<RepoGalaxyData> {
  const { owner, repo } = parseGitHubUrl(input);
  const repoMeta = await fetchJson<GitHubRepoResponse>(`https://api.github.com/repos/${owner}/${repo}`);
  const tree = await fetchJson<GitTreeResponse>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoMeta.default_branch}?recursive=1`,
  );
  const warnings: string[] = [];
  if (tree.truncated) {
    warnings.push('GitHub truncated this repository tree, so some files may be missing.');
  }
  const data = buildRepoFromTree(tree.tree, repoMeta.owner.login, repoMeta.name, {
    description: repoMeta.description || `${repoMeta.owner.login}/${repoMeta.name}`,
    stars: repoMeta.stargazers_count,
    language: repoMeta.language || 'Unknown',
    defaultBranch: repoMeta.default_branch,
  });
  const sourceFiles = data.nodes
    .filter((node) => node.type === 'file' && SOURCE_EXTENSIONS.has(node.ext || '') && node.size < 150_000)
    .sort((a, b) => a.size - b.size)
    .slice(0, MAX_SOURCE_FILES);
  let byteBudget = 0;
  const selectedSources = sourceFiles.filter((node) => {
    byteBudget += node.size || 0;
    return byteBudget <= MAX_SOURCE_BYTES;
  });
  if (sourceFiles.length > selectedSources.length) {
    warnings.push('Dependency scan was capped for speed; the galaxy still includes all fetched files.');
  }
  data.links = await fetchDependencyLinks(owner, repoMeta.name, repoMeta.default_branch, selectedSources, data.nodes);
  return { ...data, warnings };
}

export function buildRepoFromTree(
  tree: GitTreeItem[],
  owner: string,
  repoName: string,
  meta: Pick<RepoGalaxyData, 'description' | 'stars' | 'language' | 'defaultBranch'>,
): RepoGalaxyData {
  const nodes: GalaxyNode[] = [{ id: 'root', name: repoName, type: 'root', path: '/', size: 0, ext: null }];
  const seenIds = new Set(['root']);
  const folderPaths = new Set<string>();
  for (const item of tree) {
    if (item.type !== 'blob') continue;
    const parts = item.path.split('/');
    for (let i = 1; i < parts.length; i += 1) {
      folderPaths.add(parts.slice(0, i).join('/'));
    }
  }
  for (const folderPath of [...folderPaths].sort()) {
    const parts = folderPath.split('/');
    const name = parts.at(-1)!;
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
    const id = pathToId(folderPath);
    if (seenIds.has(id)) continue;
    nodes.push({
      id,
      name,
      type: 'folder',
      path: `/${folderPath}`,
      size: 0,
      parent: parentPath ? pathToId(parentPath) : 'root',
      ext: null,
    });
    seenIds.add(id);
  }
  for (const item of tree.filter((entry) => entry.type === 'blob')) {
    const parts = item.path.split('/');
    const name = parts.at(-1)!;
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
    const id = pathToId(item.path);
    if (seenIds.has(id)) continue;
    nodes.push({
      id,
      name,
      type: 'file',
      path: `/${item.path}`,
      size: item.size || 0,
      parent: parentPath ? pathToId(parentPath) : 'root',
      ext: detectExtension(name),
      lines: null,
      modified: null,
    });
    seenIds.add(id);
  }
  return {
    name: repoName,
    owner,
    description: meta.description,
    stars: meta.stars,
    language: meta.language,
    defaultBranch: meta.defaultBranch,
    nodes,
    links: [],
  };
}

export function detectExtension(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'dockerfile') return 'docker';
  if (lower === '.gitignore') return 'gitignore';
  if (!lower.includes('.')) return 'file';
  return lower.split('.').pop() || 'file';
}

export function extractImportSpecifiers(source: string): Array<{ specifier: string; type: GalaxyLink['type'] }> {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const specs: Array<{ specifier: string; type: GalaxyLink['type'] }> = [];
  const patterns: Array<{ regex: RegExp; type: GalaxyLink['type'] }> = [
    { regex: /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g, type: 'import' },
    { regex: /\bexport\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g, type: 'import' },
    { regex: /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, type: 'dynamic-import' },
    { regex: /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g, type: 'require' },
  ];
  for (const { regex, type } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(withoutComments))) {
      specs.push({ specifier: match[1], type });
    }
  }
  return specs;
}

export function resolveImportPath(fromPath: string, specifier: string, repoPaths: Set<string>): string | null {
  if (!specifier.startsWith('.')) return null;
  const fromParts = fromPath.replace(/^\/+/, '').split('/');
  fromParts.pop();
  const rawParts = [...fromParts, ...specifier.split('/')];
  const normalized: string[] = [];
  for (const part of rawParts) {
    if (!part || part === '.') continue;
    if (part === '..') normalized.pop();
    else normalized.push(part);
  }
  const base = normalized.join('/');
  const candidates = [
    base,
    ...RESOLVE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...RESOLVE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
  ];
  return candidates.find((candidate) => repoPaths.has(candidate)) || null;
}

async function fetchDependencyLinks(
  owner: string,
  repo: string,
  branch: string,
  sourceNodes: GalaxyNode[],
  allNodes: GalaxyNode[],
): Promise<GalaxyLink[]> {
  const pathToNode = new Map(allNodes.filter((node) => node.type === 'file').map((node) => [node.path.slice(1), node]));
  const repoPaths = new Set(pathToNode.keys());
  const links: GalaxyLink[] = [];
  await runLimited(sourceNodes, 6, async (node) => {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${node.path
      .slice(1)
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
    const response = await fetch(rawUrl);
    if (!response.ok) return;
    const source = await response.text();
    for (const { specifier, type } of extractImportSpecifiers(source)) {
      const resolvedPath = resolveImportPath(node.path, specifier, repoPaths);
      const target = resolvedPath ? pathToNode.get(resolvedPath) : undefined;
      if (target && target.id !== node.id) {
        links.push({ source: node.id, target: target.id, type });
      }
    }
  });
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.source}->${link.target}:${link.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (response.status === 403) {
    throw new Error('GitHub rate limit reached. Try again later.');
  }
  if (response.status === 404) {
    throw new Error('Repository not found or not public.');
  }
  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function runLimited<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export function pathToId(path: string): string {
  return path.replace(/[/.\s-]/g, '_');
}
