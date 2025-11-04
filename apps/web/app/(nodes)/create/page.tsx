import { CreateNodeForm } from '@/components/create-node-form';
import { listAllNodes } from '@/lib/nodes';

export default async function CreateNodePage() {
  const dependencies = await listAllNodes();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create a new node</h1>
        <p className="text-muted-foreground">
          Capture a definition, axiom, theorem, or observation and link it into the Euclid knowledge
          graph.
        </p>
      </div>
      <CreateNodeForm dependencies={dependencies} />
    </div>
  );
}
