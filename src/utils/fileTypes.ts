import type { GalaxyNode } from '../types';

export interface FileTypeInfo {
  hue: number;
  label: string;
  name: string;
  hex: string;
}

export const FILE_TYPES: Record<string, FileTypeInfo> = {
  tsx: { hue: 212, label: 'TSX', name: 'React/TS Component', hex: '#3d94f7' },
  ts: { hue: 188, label: 'TS', name: 'TypeScript', hex: '#2ec4b6' },
  js: { hue: 52, label: 'JS', name: 'JavaScript', hex: '#f7d94d' },
  jsx: { hue: 195, label: 'JSX', name: 'React Component', hex: '#61dafb' },
  mjs: { hue: 52, label: 'MJS', name: 'ES Module', hex: '#f7d94d' },
  cjs: { hue: 48, label: 'CJS', name: 'CommonJS', hex: '#eab308' },
  css: { hue: 305, label: 'CSS', name: 'Stylesheet', hex: '#d946ef' },
  scss: { hue: 330, label: 'SCSS', name: 'Sass Stylesheet', hex: '#ec4899' },
  json: { hue: 35, label: 'JSON', name: 'JSON Config', hex: '#fb923c' },
  md: { hue: 266, label: 'MD', name: 'Markdown', hex: '#a78bfa' },
  html: { hue: 20, label: 'HTML', name: 'HTML', hex: '#f97316' },
  svg: { hue: 142, label: 'SVG', name: 'SVG Image', hex: '#4ade80' },
  sh: { hue: 100, label: 'SH', name: 'Shell Script', hex: '#86efac' },
  docker: { hue: 200, label: 'Docker', name: 'Dockerfile', hex: '#38bdf8' },
  gitignore: { hue: 0, label: 'Git', name: 'Git Config', hex: '#fb7185' },
  py: { hue: 225, label: 'PY', name: 'Python', hex: '#60a5fa' },
  go: { hue: 190, label: 'GO', name: 'Go', hex: '#22d3ee' },
  rs: { hue: 28, label: 'RS', name: 'Rust', hex: '#f97316' },
  java: { hue: 12, label: 'Java', name: 'Java', hex: '#f87171' },
  yml: { hue: 45, label: 'YML', name: 'YAML', hex: '#facc15' },
  yaml: { hue: 45, label: 'YAML', name: 'YAML', hex: '#facc15' },
  test: { hue: 350, label: 'TEST', name: 'Test File', hex: '#f43f5e' },
};

export const FOLDER_PALETTE = [
  { hue: 210, hex: '#0ea5e9' },
  { hue: 182, hex: '#14b8a6' },
  { hue: 28, hex: '#f97316' },
  { hue: 323, hex: '#ec4899' },
  { hue: 142, hex: '#22c55e' },
  { hue: 60, hex: '#eab308' },
  { hue: 244, hex: '#6366f1' },
  { hue: 355, hex: '#f43f5e' },
  { hue: 270, hex: '#a855f7' },
  { hue: 154, hex: '#10b981' },
];

export function extColor(ext: string | null | undefined, alpha = 1): string {
  const t = ext ? FILE_TYPES[ext] : undefined;
  return t ? `oklch(68% 0.22 ${t.hue} / ${alpha})` : `oklch(65% 0.12 220 / ${alpha})`;
}

export function extHex(ext: string | null | undefined): string {
  return (ext && FILE_TYPES[ext]?.hex) || '#3d94f7';
}

export function folderColor(index: number, alpha = 1): string {
  const p = FOLDER_PALETTE[index % FOLDER_PALETTE.length];
  return `oklch(68% 0.24 ${p.hue} / ${alpha})`;
}

export function folderGlow(index: number): string {
  const p = FOLDER_PALETTE[index % FOLDER_PALETTE.length];
  return `oklch(78% 0.28 ${p.hue})`;
}

export function nodeColor(node: GalaxyNode & { _folderIdx?: number }, alpha = 1): string {
  if (node.type === 'root') return `oklch(68% 0.24 42 / ${alpha})`;
  if (node.type === 'folder') return folderColor(node._folderIdx || 0, alpha);
  const ext = node.name?.includes('.test.') || node.name?.includes('.spec.') ? 'test' : node.ext;
  return extColor(ext, alpha);
}

export function nodeGlow(node: GalaxyNode & { _folderIdx?: number }): string {
  if (node.type === 'root') return 'oklch(82% 0.24 52)';
  if (node.type === 'folder') return folderGlow(node._folderIdx || 0);
  return extHex(node.name?.includes('.test.') || node.name?.includes('.spec.') ? 'test' : node.ext);
}

export function planetRadius(node: GalaxyNode): number {
  if (node.type === 'root') return 32;
  if (node.type === 'folder') return 18;
  const size = node.size || 800;
  return Math.max(4, Math.min(15, 4 + Math.sqrt(size / 900)));
}

export function guessRole(node: GalaxyNode): { label: string; color: string; bg: string; border: string } {
  const name = node.name.toLowerCase();
  const path = node.path.toLowerCase();
  if (node.type === 'root') return role('Repository Root', '#fb923c');
  if (node.type === 'folder') return role('Solar System', '#7b9fff');
  if (name.includes('test') || name.includes('spec')) return role('Test File', '#fb7185');
  if (name.includes('config') || ['json', 'yaml', 'yml', 'docker', 'gitignore'].includes(node.ext || '')) return role('Configuration', '#fbbf24');
  if (path.includes('/hooks/') || name.startsWith('use')) return role('React Hook', '#60a5fa');
  if (path.includes('/components/') || ['tsx', 'jsx'].includes(node.ext || '')) return role('UI Component', '#38bdf8');
  if (path.includes('/api/')) return role('API Layer', '#2dd4bf');
  if (path.includes('/store/')) return role('State Store', '#a78bfa');
  if (path.includes('/utils/') || path.includes('/helpers/')) return role('Utility', '#86efac');
  if (path.includes('/styles/') || ['css', 'scss'].includes(node.ext || '')) return role('Stylesheet', '#e879f9');
  if (path.includes('/scripts/') || node.ext === 'sh') return role('Build Script', '#86efac');
  if (node.ext === 'md') return role('Documentation', '#c4b5fd');
  return role(FILE_TYPES[node.ext || '']?.name || 'Source File', extHex(node.ext));
}

function role(label: string, color: string) {
  return {
    label,
    color,
    bg: `${color}1a`,
    border: `${color}40`,
  };
}

export function galaxyPersonality(nodes: GalaxyNode[]): { label: string; icon: string } {
  const files = nodes.filter((n) => n.type === 'file');
  const total = Math.max(files.length, 1);
  const uiCount = files.filter((f) => ['tsx', 'jsx'].includes(f.ext || '')).length;
  const configCount = files.filter((f) => ['json', 'yaml', 'yml', 'docker', 'gitignore'].includes(f.ext || '')).length;
  const testCount = files.filter((f) => f.name.toLowerCase().includes('test') || f.name.toLowerCase().includes('spec')).length;
  const cssCount = files.filter((f) => ['css', 'scss'].includes(f.ext || '')).length;
  const utilCount = files.filter((f) => f.path.includes('/utils/') || f.path.includes('/helpers/')).length;
  if (total < 12) return { label: 'Tiny but elegant moon system', icon: '◐' };
  if (uiCount / total > 0.45) return { label: 'Frontend-heavy spiral galaxy', icon: '✹' };
  if (configCount / total > 0.25) return { label: 'Config-rich starfield', icon: '✧' };
  if (testCount / total > 0.3) return { label: 'Well-tested dwarf galaxy', icon: '✦' };
  if (cssCount / total > 0.2) return { label: 'Style-rich nebula', icon: '✧' };
  if (utilCount / total > 0.15) return { label: 'Dense utility asteroid field', icon: '✺' };
  if (total > 80) return { label: 'Massive multi-system cluster', icon: '✷' };
  return { label: 'Balanced star system', icon: '★' };
}

export function calcDepth(node: GalaxyNode, nodes: GalaxyNode[]): number {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let depth = 0;
  let current = node.parent ? byId.get(node.parent) : undefined;
  while (current) {
    depth += 1;
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return depth;
}
