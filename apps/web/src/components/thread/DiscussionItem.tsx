'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { Tier } from '@/lib/types';
import type { fetchDiscussions } from '@/lib/api';
import { TierChip } from '@/components/common/TierChip';
import { VoteBar } from './VoteBar';
import { ReplyComposer } from './ReplyComposer';
import { ReplyItem } from './ReplyItem';
import { deleteDiscussion, deleteReply, fetchReplies, hideDiscussion } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { FlagButton } from '@/components/moderation/FlagButton';

dayjs.extend(relativeTime);

type Discussion = Awaited<ReturnType<typeof fetchDiscussions>>[number];

interface DiscussionItemProps {
  discussion: Discussion;
  nodeId: string;
}

export function DiscussionItem({ discussion, nodeId }: DiscussionItemProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const userTier = session?.user?.tier ?? null;
  const canModerate = userTier === 'TIER1' || userTier === 'TIER2';
  const canReply = userTier !== null && userTier !== 'TIER4';

  const repliesQuery = useQuery({
    queryKey: queryKeys.replies(discussion.id),
    queryFn: () => fetchReplies(discussion.id),
    enabled: expanded,
    initialData: discussion.replies,
  });

  const hideMutation = useMutation({
    mutationFn: () => hideDiscussion(discussion.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discussions(nodeId) });
    },
  });

  const deleteDiscussionMutation = useMutation({
    mutationFn: () => deleteDiscussion(discussion.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discussions(nodeId) });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (id: string) => deleteReply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.replies(discussion.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.discussions(nodeId) });
    },
  });

  const replies = repliesQuery.data ?? [];
  const replyCount = replies.length;
  const author = discussion.author;

  const handleHide = async () => {
    if (!canModerate) return;
    const confirmed = window.confirm(
      'Hide this discussion? It will be removed from the public thread.'
    );
    if (!confirmed) return;
    await hideMutation.mutateAsync();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this discussion permanently?');
    if (!confirmed) return;
    await deleteDiscussionMutation.mutateAsync();
  };

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {author?.display?.[0]?.toUpperCase() ?? author?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {author?.display ?? author?.name ?? 'Anonymous'}
              {author?.tier ? <TierChip tier={author.tier as Tier} /> : null}
              {author?.isHistorical ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                  Historical
                </span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {dayjs(discussion.createdAt).fromNow()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FlagButton targetType="DISCUSSION" targetId={discussion.id} className="shrink-0" />
          {canModerate ? (
            <button
              type="button"
              onClick={handleHide}
              className="rounded-md border border-border px-2 py-1 hover:border-foreground"
            >
              {hideMutation.isPending ? 'Hiding…' : 'Hide'}
            </button>
          ) : null}
          {(author?.id && author.id === session?.user?.id) || canModerate ? (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      </header>

      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {discussion.content}
      </div>

      <VoteBar
        discussion={discussion}
        userTier={(session?.user?.tier as Tier | undefined) ?? null}
        userId={session?.user?.id ?? null}
        disabledReason={userTier ? undefined : 'Sign in to participate in consensus.'}
      />

      <footer className="flex flex-col gap-3 text-sm text-muted-foreground">
        <button
          type="button"
          className="text-left font-medium text-foreground hover:underline"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Hide replies' : `View replies (${replyCount})`}
        </button>
        {expanded ? (
          <div className="space-y-3">
            {replies.length === 0 ? (
              <p className="text-xs">No replies yet. Be the first to respond.</p>
            ) : (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    canModerate={canModerate || reply.authorId === session?.user?.id}
                    onDelete={(id) => deleteReplyMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
            <ReplyComposer
              discussionId={discussion.id}
              nodeId={nodeId}
              disabledReason={canReply ? undefined : 'Replies require Tier 3 or above.'}
            />
          </div>
        ) : null}
      </footer>
    </article>
  );
}
