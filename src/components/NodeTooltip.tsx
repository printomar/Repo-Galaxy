import type { GalaxyNode } from '../types';
import { guessRole } from '../utils/fileTypes';

interface NodeTooltipProps {
  node: GalaxyNode | null;
  x: number;
  y: number;
}

export function NodeTooltip({ node, x, y }: NodeTooltipProps) {
  if (!node) return null;
  const role = guessRole(node);
  const size = node.size ? (node.size >= 1024 ? `${(node.size / 1024).toFixed(1)}KB` : `${node.size}B`) : null;
  return (
    <div className="tooltip" style={{ left: x + 12, top: y + 12 }}>
      <div className="tooltip-name">{node.name}</div>
      <div className="tooltip-path">{node.path}</div>
      <div className="tooltip-meta">
        <span style={{ color: role.color }}>{role.label}</span>
        {size && <span>{size}</span>}
      </div>
    </div>
  );
}
