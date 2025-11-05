'use client';

import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createVote, tierWeightMap } from '@/lib/api';
import type { fetchDiscussions } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Tier, VoteType } from '@/lib/types';

type Discussion = Awaited<ReturnType<typeof fetchDiscussions>>[number];

interface VoteBarProps {
  discussion: Discussion;
  userTier: Tier | null;
  userId?: string | null;
  disabledReason?: string;
}

const voteOrder: VoteType[] = ['AGREE', 'DISAGREE', 'REPLICATE', 'CHALLENGE'];
const voteLabels: Record<VoteType, string> = {
  AGREE: 'Agree',
  DISAGREE: 'Disagree',
  REPLICATE: 'Replicate',
  CHALLENGE: 'Challenge',
};
const voteColors: Record<VoteType, string> = {
  AGREE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  DISAGREE: 'bg-rose-100 text-rose-700 hover:bg-rose-200',
  REPLICATE: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  CHALLENGE: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
};

export function VoteBar({ discussion, userTier, userId, disabledReason }: VoteBarProps) {
  const queryClient = useQueryClient();
  const [isPosting, setPosting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totals = aggregateVotes(discussion);

  const mutation = useMutation({
    mutationFn: (type: VoteType) => createVote({ discussionId: discussion.id, type }),
    onMutate: async (type) => {
      setMessage(null);
      setPosting(true);
      await queryClient.cancelQueries({ queryKey: queryKeys.discussions(discussion.nodeId) });
      const previous = queryClient.getQueryData<Discussion[]>(
        queryKeys.discussions(discussion.nodeId)
      );
      if (previous) {
        const updated = previous.map((item) =>
          item.id === discussion.id
            ? {
                ...item,
                votes: [
                  ...(item.votes ?? []).filter((vote) => vote.userId !== userId),
                  {
                    id: `optimistic-${Date.now()}`,
                    userId: userId ?? 'anonymous',
                    type,
                    weight: userTier ? tierWeightMap[userTier] : tierWeightMap.TIER4,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : item
        );
        queryClient.setQueryData(queryKeys.discussions(discussion.nodeId), updated);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.discussions(discussion.nodeId), context.previous);
      }
      setMessage({ type: 'error', text: 'Unable to record vote. Please try again.' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussions(discussion.nodeId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.votes(discussion.id) });
      setMessage({ type: 'success', text: 'Vote recorded.' });
    },
    onSettled: () => setPosting(false),
  });

  useEffect(() => {
    if (message) {
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
      }
      clearTimer.current = setTimeout(() => {
        setMessage(null);
        clearTimer.current = null;
      }, 3000);
    }
    return () => {
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
    };
  }, [message]);

  const guestUser = !userTier;
  const tierIsLimited = userTier === 'TIER4';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {voteOrder.map((type) => {
          const disabled = isPosting || guestUser || (tierIsLimited && type !== 'AGREE');
          const title = guestUser
            ? disabledReason
            : tierIsLimited && type !== 'AGREE'
              ? 'Tier 3 or higher required for this action.'
              : undefined;
          return (
            <VoteButton
              key={type}
              label={voteLabels[type]}
              type={type}
              value={totals[type] ?? 0}
              onClick={() => mutation.mutate(type)}
              disabled={disabled}
              title={title}
            />
          );
        })}
      </div>
      {message ? (
        <p
          className={clsx(
            'text-xs',
            message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function VoteButton({
  label,
  value,
  type,
  disabled,
  onClick,
  title,
}: {
  label: string;
  value: number;
  type: VoteType;
  disabled: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      variant="ghost"
      className={clsx(
        'flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs font-semibold shadow-sm transition',
        voteColors[type],
        disabled && 'opacity-60'
      )}
    >
      <span>{label}</span>
      <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-mono">
        {value.toFixed(2)}
      </span>
    </Button>
  );
}

function aggregateVotes(discussion: Discussion): Record<VoteType, number> {
  const base: Record<VoteType, number> = {
    AGREE: 0,
    DISAGREE: 0,
    REPLICATE: 0,
    CHALLENGE: 0,
  };
  for (const vote of discussion.votes ?? []) {
    const type = vote.type as VoteType;
    base[type] += vote.weight ?? 0;
  }
  return base;
}
