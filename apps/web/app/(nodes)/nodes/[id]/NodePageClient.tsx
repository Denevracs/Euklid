'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { queryKeys } from '@/lib/queryKeys';
import { fetchNode, fetchDiscussions, fetchRelatedNodes } from '@/lib/api';
import { ThreadComposer } from '@/components/thread/ThreadComposer';
import { DiscussionItem } from '@/components/thread/DiscussionItem';
import { ConsensusTab } from '@/components/consensus/ConsensusTab';
import type { NodeDTO } from '@/lib/types';
import { NodeHeader } from '@/components/node/NodeHeader';

interface NodePageClientProps {
  nodeId: string;
  initialNode: NodeDTO;
}

export function NodePageClient({ nodeId, initialNode }: NodePageClientProps) {
  const { data: session } = useSession();
  const [view, setView] = useState<'thread' | 'consensus'>('thread');

  const nodeQuery = useQuery({
    queryKey: queryKeys.node(nodeId),
    queryFn: () => fetchNode(nodeId),
    initialData: initialNode,
  });

  const discussionsQuery = useQuery({
    queryKey: queryKeys.discussions(nodeId),
    queryFn: () => fetchDiscussions(nodeId),
  });

  const relatedQuery = useQuery({
    queryKey: ['related', nodeId],
    queryFn: () => fetchRelatedNodes(nodeId),
  });

  const node = nodeQuery.data;
  const discussions = (discussionsQuery.data ?? []) as Awaited<ReturnType<typeof fetchDiscussions>>;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <NodeHeader node={node} />
        <div className="rounded-2xl border border-border bg-card/70 p-2 shadow-sm">
          <div className="flex items-center gap-2 p-2">
            <button
              type="button"
              onClick={() => setView('thread')}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                view === 'thread'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Thread
            </button>
            <button
              type="button"
              onClick={() => setView('consensus')}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                view === 'consensus'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Consensus
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {view === 'thread' ? (
              <ThreadSection
                nodeId={nodeId}
                discussions={discussions}
                isLoading={discussionsQuery.isLoading}
              />
            ) : (
              <ConsensusTab discussions={discussions} />
            )}
          </div>
        </div>
      </div>
      <aside className="space-y-4">
        <RelatedNodesPanel items={relatedQuery.data ?? []} isLoading={relatedQuery.isLoading} />
        <TierHints tier={session?.user?.tier ?? 'TIER4'} />
      </aside>
    </div>
  );
}

function ThreadSection({
  nodeId,
  discussions,
  isLoading,
}: {
  nodeId: string;
  discussions: Awaited<ReturnType<typeof fetchDiscussions>>;
  isLoading: boolean;
}) {
  const { data: session } = useSession();
  const tier = session?.user?.tier ?? 'TIER4';

  return (
    <div className="space-y-6">
      <ThreadComposer nodeId={nodeId} />
      {isLoading ? (
        <ThreadSkeleton />
      ) : discussions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          No discussions yet. Start the conversation above to invite collaboration.
        </p>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <DiscussionItem key={discussion.id} discussion={discussion} nodeId={nodeId} />
          ))}
        </div>
      )}
      {tier === 'TIER4' ? (
        <div className="rounded-2xl border border-border bg-amber-50 p-4 text-xs text-amber-700">
          <strong>Tier upgrade suggested:</strong> Replies and expanded voting require Tier 3 or
          higher. Request verification to increase your influence.
        </div>
      ) : null}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse space-y-3 rounded-2xl border border-border bg-muted/30 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-3 w-36 rounded bg-muted" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function RelatedNodesPanel({
  items,
  isLoading,
}: {
  items: { id: string; title: string }[];
  isLoading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Related nodes</h3>
      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-3 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">No related nodes discovered yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.slice(0, 8).map((item) => (
            <li key={item.id}>
              <Link href={`/nodes/${item.id}`} className="text-foreground hover:underline">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TierHints({ tier }: { tier: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
      <h3 className="text-sm font-semibold text-foreground">Participation guide</h3>
      <p className="mt-2">
        Your current tier is <strong>{tier}</strong>. Higher tiers unlock moderation powers and
        higher vote weight. Verified .edu and research members can request Tier upgrades.
      </p>
      <button
        type="button"
        className="mt-3 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-foreground"
        onClick={() => alert('Upgrade flow coming soon. Contact admins for early access.')}
      >
        Request upgrade
      </button>
    </div>
  );
}
