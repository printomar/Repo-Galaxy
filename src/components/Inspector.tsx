import type { GalaxyLink, GalaxyNode } from '../types';
import { calcDepth, FILE_TYPES, guessRole, nodeColor, nodeGlow } from '../utils/fileTypes';

interface InspectorProps {
  node: GalaxyNode;
  allNodes: GalaxyNode[];
  links: GalaxyLink[];
  onClose: () => void;
  onNavigate: (node: GalaxyNode) => void;
}

export function Inspector({ node, allNodes, links, onClose, onNavigate }: InspectorProps) {
  const role = guessRole(node);
  const parent = allNodes.find((candidate) => candidate.id === node.parent);
  const children = allNodes.filter((candidate) => candidate.parent === node.id);
  const imports = links
    .filter((link) => link.source === node.id)
    .map((link) => allNodes.find((candidate) => candidate.id === link.target))
    .filter(Boolean) as GalaxyNode[];
  const usedBy = links
    .filter((link) => link.target === node.id)
    .map((link) => allNodes.find((candidate) => candidate.id === link.source))
    .filter(Boolean) as GalaxyNode[];
  const extInfo = node.ext ? FILE_TYPES[node.ext] : null;
  const size = node.size ? (node.size >= 1024 ? `${(node.size / 1024).toFixed(1)} KB` : `${node.size} B`) : '—';

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div className="inspector-title-row">
          <div
            className="inspector-node-icon"
            style={{
              background: nodeColor(node, 0.16),
              color: nodeGlow(node),
              boxShadow: `0 0 24px ${nodeColor(node, 0.22)}`,
            }}
          >
            {node.type === 'root' ? '✦' : node.type === 'folder' ? '●' : `.${node.ext || 'file'}`}
          </div>
          <div className="inspector-heading">
            <div className="inspector-name">{node.name}</div>
            <div className="inspector-sub">{node.path}</div>
          </div>
          <button className="inspector-close" onClick={onClose} aria-label="Close inspector">
            ×
          </button>
        </div>
        <div className="role-pill" style={{ color: role.color, background: role.bg, borderColor: role.border }}>
          {role.label}
        </div>
      </div>

      <div className="inspector-body">
        <div className="metric-grid">
          <Metric label="type" value={node.type} />
          <Metric label="size" value={size} />
          <Metric label="depth" value={String(calcDepth(node, allNodes))} />
          <Metric label="ext" value={extInfo?.label || '—'} />
        </div>

        {parent && <NodeList title="parent" nodes={[parent]} onNavigate={onNavigate} />}
        {children.length > 0 && <NodeList title={`children ${children.length}`} nodes={children.slice(0, 14)} onNavigate={onNavigate} />}
        {imports.length > 0 && <NodeList title={`imports ${imports.length}`} nodes={imports.slice(0, 14)} onNavigate={onNavigate} />}
        {usedBy.length > 0 && <NodeList title={`used by ${usedBy.length}`} nodes={usedBy.slice(0, 14)} onNavigate={onNavigate} />}

        {children.length === 0 && imports.length === 0 && usedBy.length === 0 && (
          <div className="empty-panel">No linked neighbors in the current map.</div>
        )}
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NodeList({ title, nodes, onNavigate }: { title: string; nodes: GalaxyNode[]; onNavigate: (node: GalaxyNode) => void }) {
  return (
    <section className="neighbor-section">
      <h3>{title}</h3>
      <div className="neighbor-list">
        {nodes.map((node) => (
          <button key={node.id} className="neighbor-row" onClick={() => onNavigate(node)}>
            <span className="neighbor-dot" style={{ background: nodeColor(node), boxShadow: `0 0 8px ${nodeGlow(node)}` }} />
            <span>{node.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
