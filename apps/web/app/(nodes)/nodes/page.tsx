import { listRecentNodes } from '@/lib/nodes';
import { NodeCard } from '@/components/node-card';

export default async function NodesIndexPage() {
  const nodes = await listRecentNodes(32);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Knowledge nodes</h1>
        <p className="text-muted-foreground">
          Browse recent activity across the Euclid Network knowledge graph.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
