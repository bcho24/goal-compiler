'use client';

import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { Maximize2, Zap, ZapOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Step, StepGroup, StepType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const TYPE_COLORS: Record<StepType, string> = {
  research: '#3b82f6',
  decision: '#f59e0b',
  action: '#22c55e',
  creation: '#a855f7',
};

const TYPE_BG: Record<StepType, string> = {
  research: 'rgba(59,130,246,0.1)',
  decision: 'rgba(245,158,11,0.1)',
  action: 'rgba(34,197,94,0.1)',
  creation: 'rgba(168,85,247,0.1)',
};

function StepNodeComponent({ data }: { data: Record<string, unknown> }) {
  const step = data.step as Step;
  const { t } = useI18n();
  const [showDesc, setShowDesc] = useState(false);
  const color = step.type ? TYPE_COLORS[step.type] : '#6b7280';
  const bg = step.type ? TYPE_BG[step.type] : 'rgba(107,114,128,0.1)';
  const isCompleted = step.status === 'completed';

  return (
    <div
      className="rounded-lg border shadow-sm cursor-pointer select-none"
      style={{ borderLeftWidth: 3, borderLeftColor: color, background: bg, minWidth: 160, maxWidth: 240 }}
      onClick={() => setShowDesc((v) => !v)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
            {step.title}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {step.type && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color, background: `${color}20` }}>
              {t(`stepItem.type${step.type.charAt(0).toUpperCase()}${step.type.slice(1)}` as 'stepItem.typeResearch')}
            </span>
          )}
          {step.executable ? (
            <Zap className="h-3 w-3 text-emerald-500" />
          ) : (
            <ZapOff className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        {showDesc && step.description && (
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{step.description}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

function GroupNodeComponent({ data }: { data: Record<string, unknown> }) {
  const label = data.label as string;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 shadow-sm w-full h-full">
      <Handle type="target" position={Position.Top} className="!bg-border !w-2.5 !h-2.5 !border-2 !border-background" />
      <div className="px-3 py-1.5 border-b border-border/40 bg-muted/30 rounded-t-lg">
        <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">{label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  stepNode: StepNodeComponent,
  groupNode: GroupNodeComponent,
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;
const GROUP_PADDING = 20;
const GROUP_HEADER = 36;

function layoutFlat(nodes: Node[], edges: Edge[], direction: string): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 60 });
  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
  });
}

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  groupDeps: Map<string, string[]>,
  direction = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const stepNodes = nodes.filter((n) => n.type === 'stepNode');
  const groupNodes = nodes.filter((n) => n.type === 'groupNode');

  if (groupNodes.length === 0) {
    return { nodes: layoutFlat(stepNodes, edges, direction), edges };
  }

  // --- Step 1: classify steps by group ---
  const stepsByGroup = new Map<string, Node[]>();
  const ungroupedSteps: Node[] = [];
  const stepIdToGroup = new Map<string, string>();

  for (const node of stepNodes) {
    if (node.parentId) {
      if (!stepsByGroup.has(node.parentId)) stepsByGroup.set(node.parentId, []);
      stepsByGroup.get(node.parentId)!.push(node);
      stepIdToGroup.set(node.id, node.parentId);
    } else {
      ungroupedSteps.push(node);
    }
  }

  // --- Step 2: intra-group dagre layout ---
  const groupLayouts = new Map<
    string,
    { positions: Map<string, { x: number; y: number }>; width: number; height: number }
  >();

  for (const [groupId, members] of stepsByGroup) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 50 });

    for (const node of members) {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const edge of edges) {
      if (stepIdToGroup.get(edge.source) === groupId && stepIdToGroup.get(edge.target) === groupId) {
        g.setEdge(edge.source, edge.target);
      }
    }
    dagre.layout(g);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const rawPositions = new Map<string, { x: number; y: number }>();
    for (const node of members) {
      const pos = g.node(node.id);
      const x = pos.x - NODE_WIDTH / 2;
      const y = pos.y - NODE_HEIGHT / 2;
      rawPositions.set(node.id, { x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_WIDTH);
      maxY = Math.max(maxY, y + NODE_HEIGHT);
    }

    const positions = new Map<string, { x: number; y: number }>();
    for (const [id, pos] of rawPositions) {
      positions.set(id, {
        x: pos.x - minX + GROUP_PADDING,
        y: pos.y - minY + GROUP_PADDING + GROUP_HEADER,
      });
    }

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    groupLayouts.set(groupId, {
      positions,
      width: contentW + GROUP_PADDING * 2,
      height: contentH + GROUP_PADDING * 2 + GROUP_HEADER,
    });
  }

  // --- Step 3: topological layer sort using group.blocked_by ---
  const LAYER_GAP = 60;
  const ITEM_GAP = 48;

  type MetaItem = { id: string; width: number; height: number };
  const metaItems = new Map<string, MetaItem>();

  for (const [groupId, layout] of groupLayouts) {
    metaItems.set(groupId, { id: groupId, width: layout.width, height: layout.height });
  }
  for (const node of ungroupedSteps) {
    metaItems.set(node.id, { id: node.id, width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const metaDepsMap = new Map<string, Set<string>>();
  for (const item of metaItems.values()) metaDepsMap.set(item.id, new Set());

  for (const [groupNodeId, deps] of groupDeps) {
    if (!metaDepsMap.has(groupNodeId)) continue;
    for (const dep of deps) {
      if (metaItems.has(dep)) {
        metaDepsMap.get(groupNodeId)!.add(dep);
      }
    }
  }

  const visited = new Set<string>();
  const layers: MetaItem[][] = [];

  while (visited.size < metaItems.size) {
    const layer: MetaItem[] = [];
    for (const [id, item] of metaItems) {
      if (visited.has(id)) continue;
      const deps = metaDepsMap.get(id) ?? new Set();
      if ([...deps].every((d) => visited.has(d))) layer.push(item);
    }
    if (layer.length === 0) {
      for (const [id, item] of metaItems) {
        if (!visited.has(id)) layer.push(item);
      }
      layers.push(layer);
      break;
    }
    for (const item of layer) visited.add(item.id);
    layers.push(layer);
  }

  const metaPositions = new Map<string, { x: number; y: number }>();
  let currentY = 0;

  for (const layer of layers) {
    const totalWidth = layer.reduce((s, it) => s + it.width, 0) + ITEM_GAP * (layer.length - 1);
    const layerHeight = Math.max(...layer.map((it) => it.height));
    let x = -totalWidth / 2;

    for (const item of layer) {
      // top-align items within the same layer
      metaPositions.set(item.id, { x, y: currentY });
      x += item.width + ITEM_GAP;
    }
    currentY += layerHeight + LAYER_GAP;
  }

  // --- Step 4: compose final coordinates ---
  const finalNodes: Node[] = [];

  for (const gNode of groupNodes) {
    const layout = groupLayouts.get(gNode.id);
    const pos = metaPositions.get(gNode.id);
    if (!layout || !pos) {
      finalNodes.push({
        ...gNode,
        position: { x: 0, y: 0 },
        style: { width: 0, height: 0, display: 'none' as const },
      });
      continue;
    }
    finalNodes.push({
      ...gNode,
      position: pos,
      style: { ...gNode.style, width: layout.width, height: layout.height },
    });
  }

  for (const node of stepNodes) {
    if (node.parentId) {
      const layout = groupLayouts.get(node.parentId);
      if (layout) {
        finalNodes.push({ ...node, position: layout.positions.get(node.id) ?? { x: 0, y: 0 } });
      }
    } else {
      const pos = metaPositions.get(node.id);
      if (pos) {
        finalNodes.push({ ...node, position: pos });
      }
    }
  }

  return { nodes: finalNodes, edges };
}

interface StepGraphViewProps {
  steps: Step[];
  stepGroups: StepGroup[];
}

export function StepGraphView({ steps, stepGroups }: StepGraphViewProps) {
  const hasGroups = stepGroups.length > 0 && steps.some((s) => s.group);

  const { nodes, edges } = useMemo(() => {
    const stepNodes: Node[] = [];
    const groupNodesList: Node[] = [];
    const edgesList: Edge[] = [];

    if (hasGroups) {
      for (const g of stepGroups) {
        groupNodesList.push({
          id: `group-${g.id}`,
          type: 'groupNode',
          position: { x: 0, y: 0 },
          data: { label: g.title },
        });
      }
    }

    const stepIdToGroup = new Map(steps.map((s) => [s.id, s.group]));

    for (const step of steps) {
      const parentId = hasGroups && step.group ? `group-${step.group}` : undefined;
      stepNodes.push({
        id: step.id,
        type: 'stepNode',
        position: { x: 0, y: 0 },
        data: { step },
        zIndex: 1,
        ...(parentId ? { parentId, extent: 'parent' as const } : {}),
      });

      for (const depId of step.blocked_by ?? []) {
        if (hasGroups && step.group && stepIdToGroup.get(depId) !== step.group) continue;
        edgesList.push({
          id: `e-${depId}-${step.id}`,
          source: depId,
          target: step.id,
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: '#94a3b8' },
          style: { stroke: '#94a3b8', strokeWidth: 1 },
        });
      }
    }

    const groupDeps = new Map<string, string[]>();
    if (hasGroups) {
      for (const g of stepGroups) {
        const depGroupIds = (g.blocked_by ?? []).map((dep) => `group-${dep}`);
        groupDeps.set(`group-${g.id}`, depGroupIds);
        for (const depGroupId of depGroupIds) {
          edgesList.push({
            id: `ge-${depGroupId}-group-${g.id}`,
            source: depGroupId,
            target: `group-${g.id}`,
            markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#64748b' },
            style: { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '5 3' },
          });
        }
      }
    }

    const allNodes = [...groupNodesList, ...stepNodes];
    return getLayoutedElements(allNodes, edgesList, groupDeps);
  }, [steps, stepGroups, hasGroups]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useI18n();

  if (steps.length === 0) return null;

  const canvas = (minZoom = 0.3, padding = 0.2) => (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={minZoom}
      maxZoom={2}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );

  return (
    <>
      <div className="relative h-[600px] w-full rounded-lg border bg-background">
        {canvas()}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => setIsFullscreen(true)}
          aria-label={t('stepsPanel.expandGraph')}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent
          className="!max-w-[95vw] !w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{t('stepsPanel.viewGraph')}</DialogTitle>
          <div className="relative w-full h-full">
            {canvas(0.1, 0.1)}
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={() => setIsFullscreen(false)}
              aria-label={t('stepsPanel.collapseGraph')}
            >
              <Maximize2 className="h-4 w-4 rotate-45" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
