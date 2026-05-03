import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GalaxyLink, GalaxyNode, RepoGalaxyData, TweaksState } from '../types';
import { FILE_TYPES, FOLDER_PALETTE, nodeColor, nodeGlow, planetRadius } from '../utils/fileTypes';
import { NodeTooltip } from './NodeTooltip';

type SimNode = GalaxyNode & d3.SimulationNodeDatum & { r: number; _folderIdx?: number };
type SimLink = Omit<GalaxyLink, 'source' | 'target'> & { source: SimNode; target: SimNode };

interface GalaxyCanvasProps {
  repo: RepoGalaxyData;
  tweaks: TweaksState;
  filterExt: Set<string>;
  selectedNode: GalaxyNode | null;
  onSelectNode: (node: GalaxyNode | null) => void;
  panelOpen: boolean;
}

export function GalaxyCanvas({ repo, tweaks, filterExt, selectedNode, onSelectNode, panelOpen }: GalaxyCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const timeRef = useRef(0);
  const [tooltip, setTooltip] = useState<GalaxyNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const enriched = useMemo(() => {
    let folderIndex = 0;
    const folderMap: Record<string, number> = {};
    return repo.nodes.map((node) => {
      if (node.type === 'folder') {
        folderMap[node.id] = folderMap[node.id] ?? folderIndex++;
        return { ...node, _folderIdx: folderMap[node.id] };
      }
      if (node.parent && folderMap[node.parent] !== undefined) {
        return { ...node, _folderIdx: folderMap[node.parent] };
      }
      return node;
    });
  }, [repo.nodes]);

  const visible = useMemo(() => {
    if (filterExt.size === 0) return enriched;
    return enriched.filter((node) => node.type !== 'file' || filterExt.has(node.ext || ''));
  }, [enriched, filterExt]);

  const visibleIds = useMemo(() => new Set(visible.map((node) => node.id)), [visible]);

  const visibleLinks = useMemo(() => {
    if (!tweaks.showDeps) return [];
    return repo.links.filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target));
  }, [repo.links, tweaks.showDeps, visibleIds]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      timeRef.current += 0.006 * tweaks.orbitSpeed;
      if (svgRef.current) {
        d3.select(svgRef.current)
          .selectAll<SVGLineElement, SimLink>('.dep-particle')
          .attr('stroke-dashoffset', -timeRef.current * 55);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [tweaks.orbitSpeed]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const svg = d3.select(svgElement);
    const width = svgElement.parentElement?.clientWidth || window.innerWidth;
    const height = svgElement.parentElement?.clientHeight || window.innerHeight;
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const mkGlow = (id: string, _color: string, dev: number) => {
      const filter = defs.append('filter').attr('id', id).attr('x', '-120%').attr('y', '-120%').attr('width', '340%').attr('height', '340%');
      filter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', dev).attr('result', 'blur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    };
    const glow = tweaks.glowIntensity;
    mkGlow('g-root', '#fb923c', 9 * glow);
    mkGlow('g-folder', '#7b9fff', 6 * glow);
    mkGlow('g-planet', '#3d94f7', 3.5 * glow);
    mkGlow('g-select', '#ffffff', 10 * glow);
    FOLDER_PALETTE.forEach((palette, index) => mkGlow(`g-f${index}`, `oklch(70% 0.26 ${palette.hue})`, 5 * glow));
    Object.entries(FILE_TYPES).forEach(([ext, info]) => mkGlow(`g-e-${ext}`, info.hex, 2.5 * glow));

    const rootGroup = svg.append('g').attr('class', 'root-g');
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.05, 8]).on('zoom', (event) => {
      rootGroup.attr('transform', event.transform.toString());
    });
    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    const nodes: SimNode[] = visible.map((node) => ({ ...node, r: planetRadius(node) }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const links: SimLink[] = visibleLinks
      .map((link) => {
        const source = nodeById.get(link.source);
        const target = nodeById.get(link.target);
        return source && target ? { ...link, source, target } : null;
      })
      .filter(Boolean) as SimLink[];
    const parentLinks = nodes
      .filter((node) => node.parent && nodeById.has(node.parent))
      .map((node) => ({ source: nodeById.get(node.parent!)!, target: node, hierarchy: true }));

    const linkLayer = rootGroup.append('g').attr('class', 'link-layer');
    const parentLayer = rootGroup.append('g').attr('class', 'parent-layer');
    const nodeLayer = rootGroup.append('g').attr('class', 'node-layer');

    const parentSelection = parentLayer
      .selectAll<SVGLineElement, (typeof parentLinks)[number]>('line')
      .data(parentLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => nodeColor(d.source, 0.1))
      .attr('stroke-width', (d) => (d.source.type === 'root' ? 1.2 : 0.6));

    let depSelection = linkLayer.selectAll<SVGLineElement, SimLink>('line.dep-particle');
    if (tweaks.showDeps && links.length > 0) {
      linkLayer
        .selectAll<SVGLineElement, SimLink>('line.dep-bg')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'dep-bg')
        .attr('stroke', (d) => nodeColor(d.source, 0.06))
        .attr('stroke-width', 2);
      depSelection = linkLayer
        .selectAll<SVGLineElement, SimLink>('line.dep-particle')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'dep-particle')
        .attr('stroke', (d) => nodeColor(d.source, tweaks.depStyle === 'particles' ? 0.55 : 0.25))
        .attr('stroke-width', 0.7)
        .attr('stroke-dasharray', tweaks.depStyle === 'particles' ? '5 9' : 'none');
    }

    const groups = nodeLayer
      .selectAll<SVGGElement, SimNode>('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    drawRoot(groups.filter((node) => node.type === 'root'));
    drawFolders(groups.filter((node) => node.type === 'folder'));
    drawFiles(groups.filter((node) => node.type === 'file'), tweaks.labelMode);

    const selectionRing = nodeLayer
      .append('circle')
      .attr('class', 'sel-ring')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.6)')
      .attr('stroke-width', 1.5)
      .attr('r', 0)
      .attr('filter', 'url(#g-select)')
      .style('pointer-events', 'none');

    const dragBehavior = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, node) => {
        if (!event.active && simRef.current) simRef.current.alphaTarget(0.15).restart();
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on('end', (event, node) => {
        if (!event.active && simRef.current) simRef.current.alphaTarget(0);
        node.fx = null;
        node.fy = null;
      });

    groups
      .on('mouseenter', function handleEnter(event, node) {
        setTooltip(node);
        setTooltipPos({ x: event.clientX, y: event.clientY });
        d3.select(this).raise();
        depSelection.attr('opacity', (link) => (link.source.id === node.id || link.target.id === node.id ? 1 : 0.2));
      })
      .on('mousemove', (event) => setTooltipPos({ x: event.clientX, y: event.clientY }))
      .on('mouseleave', () => {
        setTooltip(null);
        depSelection.attr('opacity', 1);
      })
      .on('click', (event, node) => {
        event.stopPropagation();
        onSelectNode(node);
        selectionRing.attr('cx', node.x || 0).attr('cy', node.y || 0).attr('r', node.r + 5).attr('opacity', 1);
        const scale = node.type === 'root' ? 0.9 : node.type === 'folder' ? 1.5 : 2.4;
        const panelWidth = panelOpen ? 320 : 0;
        svg
          .transition()
          .duration(650)
          .ease(d3.easeCubicInOut)
          .call(
            zoomBehavior.transform,
            d3.zoomIdentity
              .translate((width - panelWidth) / 2, height / 2)
              .scale(scale)
              .translate(-(node.x || 0), -(node.y || 0)),
          );
      })
      .call(dragBehavior);

    svg.on('click', () => {
      onSelectNode(null);
      selectionRing.attr('r', 0);
    });

    const ticked = () => {
      parentSelection
        .attr('x1', (d) => d.source.x || 0)
        .attr('y1', (d) => d.source.y || 0)
        .attr('x2', (d) => d.target.x || 0)
        .attr('y2', (d) => d.target.y || 0);
      linkLayer
        .selectAll<SVGLineElement, SimLink>('line')
        .attr('x1', (d) => d.source.x || 0)
        .attr('y1', (d) => d.source.y || 0)
        .attr('x2', (d) => d.target.x || 0)
        .attr('y2', (d) => d.target.y || 0);
      groups.attr('transform', (node) => `translate(${node.x || 0},${node.y || 0})`);
      if (selectedNode) {
        const selected = nodeById.get(selectedNode.id);
        if (selected) selectionRing.attr('cx', selected.x || 0).attr('cy', selected.y || 0);
      }
    };

    if (tweaks.viewMode === 'force' || tweaks.viewMode === 'constellation') {
      const sim = d3
        .forceSimulation<SimNode>(nodes)
        .force(
          'link',
          d3
            .forceLink<SimNode, SimLink>(links)
            .id((node) => node.id)
            .distance((link) => {
              if (link.source.type === 'root' || link.target.type === 'root') return 200;
              if (link.source.type === 'folder' || link.target.type === 'folder') return 150;
              return 80;
            })
            .strength(0.25),
        )
        .force(
          'charge',
          d3.forceManyBody<SimNode>().strength((node) => {
            if (node.type === 'root') return -2600;
            if (node.type === 'folder') return -800;
            return -180;
          }),
        )
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
        .force('collision', d3.forceCollide<SimNode>().radius((node) => node.r + 12).strength(0.65))
        .alphaDecay(0.014)
        .on('tick', ticked);
      simRef.current = sim as d3.Simulation<SimNode, SimLink>;
    }

    if (tweaks.viewMode === 'orbital') {
      layoutOrbital(nodes, width, height);
      ticked();
    }

    const fitDelay = tweaks.viewMode === 'force' ? 1800 : 300;
    const fit = window.setTimeout(() => {
      svg
        .transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .call(zoomBehavior.transform, d3.zoomIdentity.translate(width * 0.5, height * 0.5).scale(0.82).translate(-width * 0.5, -height * 0.5));
    }, fitDelay);

    return () => {
      window.clearTimeout(fit);
      if (simRef.current) simRef.current.stop();
    };
  }, [visible, visibleLinks, tweaks.viewMode, tweaks.showDeps, tweaks.depStyle, tweaks.glowIntensity, tweaks.labelMode, onSelectNode, panelOpen, selectedNode]);

  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(280).call(zoomRef.current.scaleBy, factor);
  }, []);

  const handleReset = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const width = svgRef.current.parentElement?.clientWidth || window.innerWidth;
    const height = svgRef.current.parentElement?.clientHeight || window.innerHeight;
    d3.select(svgRef.current)
      .transition()
      .duration(700)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(width * 0.5, height * 0.5).scale(0.82).translate(-width * 0.5, -height * 0.5));
  }, []);

  return (
    <>
      <svg ref={svgRef} className="galaxy-svg" />
      <NodeTooltip node={tooltip} x={tooltipPos.x} y={tooltipPos.y} />
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => handleZoom(1.5)} title="Zoom in">
          +
        </button>
        <button className="zoom-btn" onClick={() => handleZoom(0.67)} title="Zoom out">
          −
        </button>
        <button className="zoom-btn" onClick={handleReset} title="Fit view">
          ⌂
        </button>
      </div>
    </>
  );
}

function drawRoot(selection: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>) {
  selection.each(function draw(node) {
    const group = d3.select(this);
    [2.8, 2.0].forEach((multiplier) => {
      group.append('circle').attr('r', node.r * multiplier).attr('fill', 'none').attr('stroke', nodeColor(node, 0.08)).attr('stroke-width', 0.8);
    });
    group.append('circle').attr('r', node.r + 6).attr('fill', nodeColor(node, 0.12)).attr('filter', 'url(#g-root)');
    group.append('circle').attr('r', node.r).attr('fill', nodeColor(node, 0.92)).attr('stroke', 'oklch(85% 0.2 52)').attr('stroke-width', 1.5).attr('filter', 'url(#g-root)');
    group.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central').attr('fill', 'rgba(255,255,255,0.9)').attr('font-size', node.r * 0.85).text('✦');
    group.append('text').attr('y', node.r + 16).attr('text-anchor', 'middle').attr('fill', 'oklch(72% 0.16 52)').attr('font-size', 11).attr('font-family', 'JetBrains Mono, monospace').text(node.name);
  });
}

function drawFolders(selection: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>) {
  selection.each(function draw(node) {
    const group = d3.select(this);
    const folderIndex = (node._folderIdx || 0) % FOLDER_PALETTE.length;
    const color = nodeColor(node, 0.88);
    group.append('circle').attr('r', node.r * 2.6).attr('fill', 'none').attr('stroke', nodeColor(node, 0.1)).attr('stroke-width', 0.7).attr('stroke-dasharray', '3 4');
    group.append('circle').attr('r', node.r + 3).attr('fill', nodeColor(node, 0.15)).attr('filter', `url(#g-f${folderIndex})`);
    group.append('circle').attr('r', node.r).attr('fill', color).attr('stroke', nodeGlow(node)).attr('stroke-width', 1.1).attr('filter', `url(#g-f${folderIndex})`);
    group.append('text').attr('y', node.r + 13).attr('text-anchor', 'middle').attr('fill', nodeColor(node, 0.7)).attr('font-size', 9.5).attr('font-family', 'JetBrains Mono, monospace').text(node.name);
  });
}

function drawFiles(selection: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>, labelMode: 'hover' | 'always') {
  selection.each(function draw(node) {
    const group = d3.select(this);
    const ext = node.name?.includes('.test.') || node.name?.includes('.spec.') ? 'test' : node.ext || 'ts';
    const glowId = FILE_TYPES[ext] ? `url(#g-e-${ext})` : 'url(#g-planet)';
    group.append('circle').attr('r', node.r + 1.5).attr('fill', nodeColor(node, 0.18)).attr('filter', glowId);
    group.append('circle').attr('r', node.r).attr('fill', nodeColor(node, 0.9)).attr('stroke', nodeGlow(node)).attr('stroke-width', 0.6);
    if (labelMode === 'always') {
      group
        .append('text')
        .attr('y', node.r + 10)
        .attr('text-anchor', 'middle')
        .attr('fill', nodeColor(node, 0.65))
        .attr('font-size', 8)
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(node.name.length > 14 ? `${node.name.slice(0, 12)}…` : node.name);
    }
  });
}

function layoutOrbital(nodes: SimNode[], width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const root = nodes.find((node) => node.type === 'root');
  if (root) {
    root.x = cx;
    root.y = cy;
  }
  const topFolders = nodes.filter((node) => node.type === 'folder' && node.parent === 'root');
  topFolders.forEach((folder, index) => {
    const angle = (index / topFolders.length) * Math.PI * 2 - Math.PI / 2;
    folder.x = cx + Math.cos(angle) * 230;
    folder.y = cy + Math.sin(angle) * 230;
    const children = nodes.filter((node) => node.parent === folder.id);
    children.forEach((child, childIndex) => {
      const childAngle = (childIndex / Math.max(children.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const childRadius = 60 + childIndex * 6;
      child.x = (folder.x || cx) + Math.cos(childAngle) * childRadius;
      child.y = (folder.y || cy) + Math.sin(childAngle) * childRadius;
    });
    const subFolders = nodes.filter((node) => node.type === 'folder' && node.parent === folder.id);
    subFolders.forEach((subFolder, subIndex) => {
      const subAngle = (subIndex / Math.max(subFolders.length, 1)) * Math.PI * 2;
      subFolder.x = (folder.x || cx) + Math.cos(subAngle) * 130;
      subFolder.y = (folder.y || cy) + Math.sin(subAngle) * 130;
    });
  });
  const rootFiles = nodes.filter((node) => node.type === 'file' && node.parent === 'root');
  rootFiles.forEach((file, index) => {
    const angle = (index / Math.max(rootFiles.length, 1)) * Math.PI * 2 - Math.PI / 2;
    file.x = cx + Math.cos(angle) * 85;
    file.y = cy + Math.sin(angle) * 85;
  });
}
