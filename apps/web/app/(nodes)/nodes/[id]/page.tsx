import { notFound } from 'next/navigation';
import { getNodeDetail } from '@/lib/nodes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { recordActivity } from '@/lib/activity';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

interface NodePageProps {
  params: { id: string };
}

async function mutateActivity(
  action: 'SUPPORT' | 'CHALLENGE' | 'CITE' | 'REPLICATE' | 'FORK',
  nodeId: string
) {
  'use server';
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('You must be signed in to interact with nodes.');
  }
  await recordActivity({ actorId: session.user.id, action, targetNodeId: nodeId });
  revalidatePath(`/nodes/${nodeId}`);
}

export default async function NodePage({ params }: NodePageProps) {
  const node = await getNodeDetail(params.id);

  if (!node) {
    notFound();
  }

  const probabilisticConfidence =
    node.status === 'PROBABILISTIC'
      ? node.evidence.find((item) => typeof item.confidence === 'number')?.confidence
      : undefined;

  const actionButton = (label: string, actionType: Parameters<typeof mutateActivity>[0]) => (
    <form action={mutateActivity.bind(null, actionType, node.id)}>
      <Button type="submit" variant={actionType === 'CHALLENGE' ? 'outline' : 'default'} size="sm">
        {label}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">{node.title}</CardTitle>
              <CardDescription className="mt-1 uppercase tracking-wide text-xs text-muted-foreground">
                {node.type}
              </CardDescription>
            </div>
            <Badge variant={node.status === 'PROVEN' ? 'default' : 'outline'}>
              {node.status === 'PROBABILISTIC' && typeof probabilisticConfidence === 'number'
                ? `${node.status} (${Math.round(probabilisticConfidence * 100)}% confidence)`
                : node.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{node.statement}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {actionButton('Support', 'SUPPORT')}
            {actionButton('Challenge', 'CHALLENGE')}
            {actionButton('Cite', 'CITE')}
            {actionButton('Replicate', 'REPLICATE')}
            {actionButton('Fork', 'FORK')}
          </div>
          {node.metadata && Object.keys(node.metadata as Record<string, unknown>).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Metadata
              </h3>
              <pre className="mt-2 overflow-auto rounded-md border border-border bg-muted p-3 text-xs">
                {JSON.stringify(node.metadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dependencies</CardTitle>
            <CardDescription>Prerequisites this node relies on.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {node.outgoingEdges.length === 0 && (
              <p className="text-sm text-muted-foreground">No dependencies declared.</p>
            )}
            {node.outgoingEdges.map((edge) => (
              <div key={edge.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <Link href={`/nodes/${edge.toId}`} className="font-medium hover:underline">
                    {edge.to.title}
                  </Link>
                  <Badge variant="outline">{edge.kind}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {edge.to.statement}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>References</CardTitle>
            <CardDescription>Other nodes linking to this node.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {node.incomingEdges.length === 0 && (
              <p className="text-sm text-muted-foreground">No references yet.</p>
            )}
            {node.incomingEdges.map((edge) => (
              <div key={edge.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <Link href={`/nodes/${edge.fromId}`} className="font-medium hover:underline">
                    {edge.from.title}
                  </Link>
                  <Badge variant="outline">{edge.kind}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {edge.from.statement}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
            <CardDescription>Proofs, replications, and supporting data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {node.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence submitted yet.</p>
            ) : (
              node.evidence.map((evidence) => (
                <div key={evidence.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Badge variant="outline">{evidence.kind}</Badge>
                    <Link
                      href={evidence.uri}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                    >
                      View source
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{evidence.summary}</p>
                  {typeof evidence.confidence === 'number' && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Confidence: {Math.round(evidence.confidence * 100)}%
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Latest interactions from the community.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {node.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              node.activity.map((activity) => (
                <div key={activity.id} className="text-sm">
                  <span className="font-medium">{activity.actor?.name ?? 'Anonymous'}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    {activity.action.toLowerCase()}ed this node
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
