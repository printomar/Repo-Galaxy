import { useCallback, useEffect, useMemo, useState } from 'react';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { Inspector } from './components/Inspector';
import { Starfield } from './components/Starfield';
import { Toast } from './components/Toast';
import { DEMO_REPO } from './data/demoRepo';
import { fetchRepoGalaxyData } from './services/github';
import { readUrlState, writeUrlState } from './services/urlState';
import type { GalaxyNode, RepoGalaxyData, TweaksState, ViewMode } from './types';
import { extHex, FILE_TYPES, galaxyPersonality } from './utils/fileTypes';

const DEFAULT_TWEAKS: TweaksState = {
  viewMode: 'force',
  showDeps: true,
  depStyle: 'particles',
  starDensity: 260,
  nebulaVisible: true,
  glowIntensity: 1.1,
  orbitSpeed: 1,
  labelMode: 'hover',
};

export function App() {
  const initialUrlState = useMemo(() => readUrlState(), []);
  const [tweaks, setTweaks] = useState<TweaksState>({ ...DEFAULT_TWEAKS, viewMode: initialUrlState.view || DEFAULT_TWEAKS.viewMode });
  const [repo, setRepo] = useState<RepoGalaxyData>(DEMO_REPO);
  const [selected, setSelected] = useState<GalaxyNode | null>(null);
  const [filterExt, setFilterExt] = useState<Set<string>>(new Set(initialUrlState.filters || []));
  const [urlInput, setUrlInput] = useState(initialUrlState.owner && initialUrlState.repo ? `github.com/${initialUrlState.owner}/${initialUrlState.repo}` : '');
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [booting, setBooting] = useState(true);

  const files = useMemo(() => repo.nodes.filter((node) => node.type === 'file'), [repo.nodes]);
  const folders = useMemo(() => repo.nodes.filter((node) => node.type === 'folder'), [repo.nodes]);
  const personality = useMemo(() => galaxyPersonality(repo.nodes), [repo.nodes]);

  const allExts = useMemo(() => {
    const exts = new Set(files.map((file) => file.ext).filter((ext): ext is string => Boolean(ext && FILE_TYPES[ext])));
    return [...exts].sort();
  }, [files]);

  const extCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((file) => {
      if (file.ext) counts[file.ext] = (counts[file.ext] || 0) + 1;
    });
    return counts;
  }, [files]);

  const topLanguage = useMemo(() => {
    const top = Object.entries(extCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const languageMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      py: 'Python',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
      java: 'Java',
      css: 'CSS',
      html: 'HTML',
    };
    return (top && languageMap[top]) || repo.language || '—';
  }, [extCounts, repo.language]);

  const topLangColor = useMemo(() => {
    const top = Object.entries(extCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return extHex(top || 'ts');
  }, [extCounts]);

  const setTweak = useCallback(<K extends keyof TweaksState>(key: K, value: TweaksState[K]) => {
    setTweaks((current) => ({ ...current, [key]: value }));
  }, []);

  const loadRepo = useCallback(
    async (input: string) => {
      if (!input.trim()) return;
      setLoading(true);
      setError('');
      setSelected(null);
      setLoadMsg('Fetching repository tree…');
      try {
        const data = await fetchRepoGalaxyData(input);
        setLoadMsg('Resolving dependency stars…');
        setRepo(data);
        setFilterExt(new Set());
        setToast(data.warnings?.[0] || `Loaded ${data.owner}/${data.name}`);
        setUrlInput(`github.com/${data.owner}/${data.name}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load repository.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialUrlState.owner && initialUrlState.repo) {
      void loadRepo(`github.com/${initialUrlState.owner}/${initialUrlState.repo}`);
    }
  }, [initialUrlState.owner, initialUrlState.repo, loadRepo]);

  useEffect(() => {
    const filters = filterExt.size === 0 ? [] : [...filterExt].sort();
    writeUrlState({
      owner: repo.owner === DEMO_REPO.owner && repo.name === DEMO_REPO.name ? undefined : repo.owner,
      repo: repo.owner === DEMO_REPO.owner && repo.name === DEMO_REPO.name ? undefined : repo.name,
      view: tweaks.viewMode,
      filters,
    });
  }, [repo.owner, repo.name, tweaks.viewMode, filterExt]);

  const toggleExt = useCallback(
    (ext: string) => {
      setFilterExt((previous) => {
        if (previous.size === 0) {
          const all = new Set(allExts);
          all.delete(ext);
          return all.size === allExts.length ? new Set() : all;
        }
        const next = new Set(previous);
        if (next.has(ext)) next.delete(ext);
        else next.add(ext);
        return next.size === allExts.length ? new Set() : next;
      });
    },
    [allExts],
  );

  const cycleViewMode = useCallback(() => {
    const order: ViewMode[] = ['force', 'orbital', 'constellation'];
    const next = order[(order.indexOf(tweaks.viewMode) + 1) % order.length];
    setTweak('viewMode', next);
  }, [setTweak, tweaks.viewMode]);

  const shareMap = useCallback(async () => {
    const url = writeUrlState({
      owner: repo.owner === DEMO_REPO.owner && repo.name === DEMO_REPO.name ? undefined : repo.owner,
      repo: repo.owner === DEMO_REPO.owner && repo.name === DEMO_REPO.name ? undefined : repo.name,
      view: tweaks.viewMode,
      filters: filterExt.size === 0 ? [] : [...filterExt].sort(),
    });
    await navigator.clipboard?.writeText(url);
    setToast('Share URL copied');
  }, [filterExt, repo.name, repo.owner, tweaks.viewMode]);

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-left">
          <a className="navbar-logo" href="/" aria-label="Repo Galaxy">
            <span className="logo-mark">✦</span>
            <span className="logo-text">Repo Galaxy</span>
            <span className="logo-beta">BETA</span>
          </a>

          <div className="repo-bar">
            <span className="repo-bar-item owner">{repo.owner}</span>
            <span className="repo-bar-item muted">/</span>
            <span className="repo-bar-item name">{repo.name}</span>
            <span className="repo-bar-item muted compact">·</span>
            <input
              className="repo-bar-input"
              placeholder="github.com/owner/repo"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void loadRepo(urlInput);
              }}
            />
            <button className="repo-launch-btn" onClick={() => void loadRepo(urlInput)}>
              LAUNCH ↗
            </button>
          </div>
          {error && <span className="inline-error">⚠ {error}</span>}
        </div>

        <div className="nav-actions">
          <button className="nav-btn ghost" onClick={() => setTweak('showDeps', !tweaks.showDeps)}>
            <DepsIcon active={tweaks.showDeps} />
            {tweaks.showDeps ? 'Deps on' : 'Deps off'}
          </button>
          <button className="nav-btn primary" onClick={cycleViewMode}>
            {tweaks.viewMode === 'force' ? '⬡ Force' : tweaks.viewMode === 'orbital' ? '◎ Orbital' : '✦ Constellation'}
          </button>
          <button className="nav-btn share" onClick={() => void shareMap()}>
            <ShareIcon />
            Share map
          </button>
        </div>
      </nav>

      <div className="meta-strip">
        <div className="meta-items">
          <MetaItem label="files" value={String(files.length)} />
          <MetaItem label="systems" value={String(folders.length)} />
          <MetaItem label="deps" value={String(repo.links.length)} />
          <div className="meta-item">
            <span className="dot" style={{ background: topLangColor, boxShadow: `0 0 5px ${topLangColor}` }} />
            <span className="val">{topLanguage}</span>
          </div>
        </div>
        <div className="personality-card">
          <span className="personality-icon">{personality.icon}</span>
          <span className="personality-text">
            <strong>{personality.label}</strong>
          </span>
        </div>
      </div>

      <main className="canvas-wrap">
        <Starfield count={tweaks.starDensity} nebulaVisible={tweaks.nebulaVisible} />
        {(booting || loading) && (
          <div className="loading-overlay">
            <div className="loading-ring" />
            <div className="loading-text">{loading ? loadMsg : 'charting galaxy…'}</div>
          </div>
        )}

        <GalaxyCanvas repo={repo} tweaks={tweaks} filterExt={filterExt} selectedNode={selected} onSelectNode={setSelected} panelOpen={Boolean(selected)} />

        <div className="view-tabs-wrap">
          <div className="view-tabs">
            {(['force', 'orbital', 'constellation'] as const).map((mode) => (
              <button key={mode} className={`view-tab ${tweaks.viewMode === mode ? 'active' : ''}`} onClick={() => setTweak('viewMode', mode)}>
                {mode === 'force' ? 'Force' : mode === 'orbital' ? 'Orbital' : 'Constellation'}
              </button>
            ))}
          </div>
        </div>

        {selected && <Inspector node={selected} allNodes={repo.nodes} links={repo.links} onClose={() => setSelected(null)} onNavigate={setSelected} />}

        <div className="legend-strip">
          <div className="legend-chips">
            <span className="legend-label">filter</span>
            {allExts.map((ext) => {
              const type = FILE_TYPES[ext];
              const active = filterExt.size === 0 || filterExt.has(ext);
              return (
                <button key={ext} className={`legend-chip ${active ? 'active' : ''}`} onClick={() => toggleExt(ext)} style={{ opacity: active ? 1 : 0.3 }}>
                  <span className="dot" style={{ background: type.hex, boxShadow: active ? `0 0 5px ${type.hex}` : 'none' }} />
                  .{ext}
                </button>
              );
            })}
          </div>
          <span className="hint-text">scroll · drag · click</span>
        </div>
      </main>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-item">
      <span>{label}</span>
      <span className="val">{value}</span>
    </div>
  );
}

function DepsIcon({ active }: { active: boolean }) {
  const color = active ? '#7b9fff' : '#3a4a6a';
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="2" cy="6" r="1.5" fill={color} />
      <circle cx="10" cy="2" r="1.5" fill={color} />
      <circle cx="10" cy="10" r="1.5" fill={color} />
      <line x1="3.5" y1="5.5" x2="8.5" y2="2.5" stroke={color} strokeWidth="0.8" />
      <line x1="3.5" y1="6.5" x2="8.5" y2="9.5" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M8 1L11 4L8 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4H5C3.3 4 1 5.3 1 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
