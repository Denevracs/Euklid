import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { NodeWithRelations } from '@/lib/nodes';

function statusVariant(status: NodeWithRelations['status']) {
  switch (status) {
    case 'PROVEN':
      return 'default' as const;
    case 'PROBABILISTIC':
      return 'secondary' as const;
    case 'DISPROVEN':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

function statusLabel(status: NodeWithRelations['status'], confidence?: number) {
  if (status === 'PROBABILISTIC' && typeof confidence === 'number') {
    return `${status} (${Math.round(confidence * 100)}% confidence)`;
  }
  return status.replace('_', ' ');
}

export function NodeCard({ node }: { node: NodeWithRelations }) {
  const probabilisticConfidence =
    node.status === 'PROBABILISTIC'
      ? node.evidence.find((item) => typeof item.confidence === 'number')?.confidence
      : undefined;

  return (
    <Card className="transition hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Link href={`/nodes/${node.id}`} className="hover:underline">
              {node.title}
            </Link>
          </CardTitle>
          <Badge variant={statusVariant(node.status)}>
            {statusLabel(node.status, probabilisticConfidence)}
          </Badge>
        </div>
        <CardDescription>{node.type}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">{node.statement}</p>
        {node.metadata && Object.keys(node.metadata as Record<string, unknown>).length > 0 && (
          <div className="rounded-md border border-dashed border-border p-3 text-xs">
            <strong className="mr-2 font-semibold">Metadata:</strong>
            <code className="break-all text-muted-foreground">{JSON.stringify(node.metadata)}</code>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{node.evidence.length} evidence</span>
          <span>{node.outgoingEdges.length} dependencies</span>
          <span>{node.incomingEdges.length} references</span>
        </div>
      </CardContent>
    </Card>
  );
}
