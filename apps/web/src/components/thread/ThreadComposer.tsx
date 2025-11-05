'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { z } from 'zod';
import { createDiscussion } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { useRateLimitFeedback } from '@/hooks/useRateLimitFeedback';

const composerSchema = z.object({
  content: z.string().min(8, 'Please provide at least 8 characters.'),
});

const helperPrompts = ['Pose a question', 'Offer evidence', 'Summarize divergence'];

export function ThreadComposer({ nodeId }: { nodeId: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { rateLimited, handleApiError } = useRateLimitFeedback();
  const userTier = session?.user?.tier ?? null;
  const isBanned = Boolean(session?.user?.isBanned);
  const canPost = !isBanned && userTier !== null && userTier !== 'TIER4';

  const mutation = useMutation({
    mutationFn: () => createDiscussion({ nodeId, content: content.trim() }),
    onSuccess: async () => {
      setContent('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.discussions(nodeId) });
    },
    onError: (err: unknown) => {
      if (!handleApiError(err)) {
        setError(err instanceof Error ? err.message : 'Unable to create discussion');
      }
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmed = content.trim();
    if (trimmed.length > 5000) {
      setError('Please keep discussions under 5000 characters.');
      return;
    }
    const parse = composerSchema.safeParse({ content: trimmed });
    if (!parse.success) {
      setError(parse.error.issues[0]?.message ?? 'Content is required');
      return;
    }
    if (isBanned) {
      setError('Posting is disabled while your account is suspended.');
      return;
    }
    if (!canPost) {
      setError('Your tier does not allow posting. Please request an upgrade.');
      return;
    }
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            'Before posting, double-check your sources and ensure your argument is clear. Ready to continue?'
          )
        : true;
    if (!confirmed) return;
    await mutation.mutateAsync();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      {isBanned ? (
        <p className="text-xs text-destructive">
          Account suspended. You cannot start new discussions.
        </p>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {helperPrompts.map((prompt) => (
          <button
            type="button"
            key={prompt}
            onClick={() => setContent((prev) => (prev ? prev : `${prompt}: `))}
            className="rounded-full border border-dashed border-border px-2 py-0.5 hover:border-foreground hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={
          isBanned
            ? 'Account suspended—posting disabled.'
            : canPost
              ? 'Start a discussion…'
              : 'Sign in or upgrade your tier to participate.'
        }
        className="min-h-[140px] w-full resize-y rounded-xl border border-border bg-background/80 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={!canPost || mutation.isPending}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {rateLimited ? (
        <p className="text-xs text-amber-600">
          Rate limit exceeded. Please wait a bit before posting again.
        </p>
      ) : null}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{content.length} / 5000</span>
        <Button type="submit" disabled={!canPost || mutation.isPending}>
          Share to thread
        </Button>
      </div>
    </form>
  );
}
