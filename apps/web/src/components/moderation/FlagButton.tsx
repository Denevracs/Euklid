'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModerationClient } from '@/hooks/useModerationClient';

type FlagButtonProps = {
  targetType: string;
  targetId: string;
  size?: 'icon' | 'sm' | 'default';
  className?: string;
};

export function FlagButton({ targetType, targetId, size = 'icon', className }: FlagButtonProps) {
  const { data: session } = useSession();
  const { submitFlag } = useModerationClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggle = useCallback(() => {
    if (!session?.user) {
      setErrorMessage('You must be signed in to report content.');
      return;
    }
    setOpen((value) => !value);
    setErrorMessage(null);
    if (!open) {
      setStatus('idle');
      setReason('');
    }
  }, [open, session?.user]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!session?.user?.id) {
        setErrorMessage('Sign in to submit a report.');
        return;
      }

      const trimmed = reason.trim();
      if (trimmed.length < 4) {
        setErrorMessage('Please provide a brief reason (4 or more characters).');
        return;
      }

      try {
        setStatus('loading');
        await submitFlag({
          targetType,
          targetId,
          reason: trimmed,
        });
        setStatus('success');
        setErrorMessage(null);
        setTimeout(() => {
          setOpen(false);
          setReason('');
          setStatus('idle');
        }, 1200);
      } catch (error) {
        console.error('Failed to submit flag', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to submit flag');
      }
    },
    [reason, session?.user?.id, submitFlag, targetId, targetType]
  );

  return (
    <div className={className}>
      <Button
        type="button"
        variant="ghost"
        size={size === 'icon' ? 'icon' : size}
        aria-expanded={open}
        aria-label="Flag content for moderation"
        onClick={handleToggle}
        disabled={status === 'loading'}
      >
        <Flag className="h-4 w-4" />
      </Button>
      {!open && errorMessage ? (
        <p className="mt-2 max-w-[220px] text-xs text-destructive">{errorMessage}</p>
      ) : null}
      {open ? (
        <form
          className="mt-3 rounded-md border border-border bg-background p-3 shadow-sm"
          onSubmit={handleSubmit}
        >
          <label className="mb-2 block text-sm font-medium text-foreground">
            Why are you reporting this content?
          </label>
          <textarea
            className="min-h-[100px] w-full rounded-md border border-border bg-muted/20 p-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            placeholder="Provide a short summary for moderators…"
            required
          />
          {errorMessage ? <p className="mt-2 text-xs text-destructive">{errorMessage}</p> : null}
          {status === 'success' ? (
            <p className="mt-2 text-xs text-emerald-500">Report submitted—thank you.</p>
          ) : null}
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setReason('');
                setStatus('idle');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={status === 'loading'}>
              {status === 'loading' ? 'Submitting…' : 'Submit flag'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
