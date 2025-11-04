import { listRecentNodes } from '@/lib/nodes';
import { GraphViewer, type GraphData } from '@/components/graph-viewer';

export default async function GraphPage() {
  const nodes = await listRecentNodes(25);

  const graphData: GraphData = {
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.title,
      type: node.type,
    })),
    links: nodes.flatMap((node) =>
      node.outgoingEdges.map((edge) => ({
        source: node.id,
        target: edge.toId,
        kind: edge.kind,
        weight: edge.weight ?? 1,
      }))
    ),
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Knowledge Graph</h1>
        <p className="text-muted-foreground">
          Explore the dependency structure between nodes. Click on a node to open its detail page.
        </p>
      </div>
      <GraphViewer data={graphData} />
    </div>
  );
}
