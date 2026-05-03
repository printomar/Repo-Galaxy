export type NodeType = 'root' | 'folder' | 'file';

export type ViewMode = 'force' | 'orbital' | 'constellation';

export interface GalaxyNode {
  id: string;
  name: string;
  type: NodeType;
  path: string;
  size: number;
  parent?: string;
  ext: string | null;
  lines?: number | null;
  modified?: string | null;
}

export interface GalaxyLink {
  source: string;
  target: string;
  type: 'import' | 'test' | 'require' | 'dynamic-import';
}

export interface RepoGalaxyData {
  name: string;
  owner: string;
  description: string;
  stars: number | null;
  language: string;
  defaultBranch?: string;
  nodes: GalaxyNode[];
  links: GalaxyLink[];
  warnings?: string[];
}

export interface TweaksState {
  viewMode: ViewMode;
  showDeps: boolean;
  depStyle: 'particles' | 'lines';
  starDensity: number;
  nebulaVisible: boolean;
  glowIntensity: number;
  orbitSpeed: number;
  labelMode: 'hover' | 'always';
}
