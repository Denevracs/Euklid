'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo } from 'react';
import type { z } from 'zod';
import { nodeTypeEnum } from '@euclid/validation';

type NodeType = z.infer<typeof nodeTypeEnum>;

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export interface GraphNodeDatum {
  id: string;
  name: string;
  type: NodeType;
}

export interface GraphLinkDatum {
  source: string;
  target: string;
  kind: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNodeDatum[];
  links: GraphLinkDatum[];
}

const typeColors: Record<NodeType, string> = {
  [nodeTypeEnum.enum.AXIOM]: '#2563eb',
  [nodeTypeEnum.enum.THEOREM]: '#16a34a',
  [nodeTypeEnum.enum.DEFINITION]: '#9333ea',
  [nodeTypeEnum.enum.OBSERVATION]: '#0891b2',
  [nodeTypeEnum.enum.COUNTEREXAMPLE]: '#dc2626',
  [nodeTypeEnum.enum.APPLICATION]: '#f97316',
};

type ForceGraphNode = GraphNodeDatum & {
  x?: number;
  y?: number;
};

type ForceGraphLink = GraphLinkDatum & {
  weight?: number;
};

export function GraphViewer({ data }: { data: GraphData }) {
  const memoData = useMemo(() => data, [data]);

  const handleNodeClick = useCallback((node: Pick<ForceGraphNode, 'id'>) => {
    if (node.id) {
      window.location.href = `/nodes/${node.id}`;
    }
  }, []);

  return (
    <div className="h-[600px] w-full rounded-lg border border-border">
      <ForceGraph2D
        graphData={memoData}
        backgroundColor="transparent"
        nodeAutoColorBy={(node: ForceGraphNode) => typeColors[node.type as NodeType] ?? '#64748b'}
        nodeCanvasObject={(
          node: ForceGraphNode,
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          const radius = 6;
          ctx.fillStyle = typeColors[node.type as NodeType] ?? '#64748b';
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#1f2937';
          ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + radius + 2);
        }}
        linkColor={() => '#94a3b8'}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={(link: ForceGraphLink) => (link.weight ?? 1) * 2}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}
