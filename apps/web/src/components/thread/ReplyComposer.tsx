'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { createReply } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useRateLimitFeedback } from '@/hooks/useRateLimitFeedback';

const replySchema = z.object({ content: z.string().min(2, 'Reply is too short.') });

interface ReplyComposerProps {
  discussionId: string;
  nodeId: string;
  disabledReason?: string;
}

export function ReplyComposer({ discussionId, nodeId, disabledReason }: ReplyComposerProps) {
  const { data: session } = useSession();
  const isBanned = Boolean(session?.user?.isBanned);
  const canReply = !isBanned && (session?.user?.tier ?? 'TIER4') !== 'TIER4';
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { rateLimited, handleApiError } = useRateLimitFeedback();

  const mutation = useMutation({
    mutationFn: () => createReply({ discussionId, content: content.trim() }),
    onSuccess: async () => {
      setContent('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.replies(discussionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions(nodeId) }),
      ]);
    },
    onError: (err: unknown) => {
      if (!handleApiError(err)) {
        setError(err instanceof Error ? err.message : 'Unable to reply');
      }
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!canReply) {
      if (isBanned) {
        setError('Posting is disabled while your account is suspended.');
        return;
      }
      setError(disabledReason ?? 'Your tier cannot reply yet.');
      return;
    }
    const trimmed = content.trim();
    if (trimmed.length > 2000) {
      setError('Replies must be under 2000 characters.');
      return;
    }
    const parse = replySchema.safeParse({ content: trimmed });
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? 'Reply is required');
      return;
    }
    await mutation.mutateAsync();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-xl border border-border bg-muted/30 p-3"
    >
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={
          isBanned
            ? 'Account suspended—posting disabled.'
            : canReply
              ? 'Add a reply…'
              : 'Replies require Tier 3 or above.'
        }
        className="w-full resize-y rounded-lg border border-border bg-background/70 p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={!canReply || mutation.isPending}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {rateLimited ? (
        <p className="text-xs text-amber-600">Rate limit exceeded. Try again in a bit.</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!canReply || mutation.isPending}>
          Reply
        </Button>
      </div>
    </form>
  );
}
