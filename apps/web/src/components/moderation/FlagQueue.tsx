'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FlagDTO } from '@/lib/types';
import { useModerationClient } from '@/hooks/useModerationClient';

type FlagQueueProps = {
  flags: FlagDTO[];
  onDecision?: (flagId: string, result: { status: string }) => void;
};

type DecisionState = 'idle' | 'submitting';

export function FlagQueue({ flags, onDecision }: FlagQueueProps) {
  const { decideOnFlag } = useModerationClient();
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [ban, setBan] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [decisionState, setDecisionState] = useState<DecisionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const selectedFlag = useMemo(
    () => flags.find((item) => item.id === selectedFlagId) ?? null,
    [flags, selectedFlagId]
  );

  const reset = () => {
    setNote('');
    setBan(false);
    setExpiresInDays(7);
    setDecisionState('idle');
    setError(null);
  };

  const handleSelect = (flagId: string) => {
    setSelectedFlagId((current) => (current === flagId ? null : flagId));
    reset();
  };

  const applyDecision = async (payload: {
    approve: boolean;
    escalate?: boolean;
    note?: string;
    expiresInDays?: number;
    ban?: boolean;
  }) => {
    if (!selectedFlag) return;
    try {
      setDecisionState('submitting');
      const result = await decideOnFlag(selectedFlag.id, payload);
      setDecisionState('idle');
      setSelectedFlagId(null);
      reset();
      onDecision?.(selectedFlag.id, result);
    } catch (err) {
      console.error('Unable to decide on flag', err);
      setError(err instanceof Error ? err.message : 'Failed to process decision');
      setDecisionState('idle');
    }
  };

  if (flags.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No flags in the queue. Keep an eye on the network for new reports.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {flags.map((flag) => {
          const isSelected = flag.id === selectedFlagId;
          const submittedAgo = relativeTime(flag.createdAt);
          return (
            <div
              key={flag.id}
              className="rounded-md border border-border bg-background shadow-sm transition hover:border-primary/40"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
                onClick={() => handleSelect(flag.id)}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {flag.targetType} · <span className="font-mono text-xs">{flag.targetId}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{flag.reason}</p>
                </div>
                <div className="text-xs text-muted-foreground">{submittedAgo}</div>
              </button>
              {isSelected ? (
                <div className="border-t border-border bg-muted/10 p-4 text-sm">
                  <h3 className="text-sm font-semibold text-foreground">Decision</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Review the report and provide optional context for the audit trail.
                  </p>
                  <textarea
                    className="mt-3 w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Decision note (optional)"
                    rows={3}
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={ban}
                        onChange={(event) => setBan(event.target.checked)}
                      />
                      Ban user
                    </label>
                    {ban ? (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Duration (days)</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={expiresInDays}
                          onChange={(event) => setExpiresInDays(Number(event.target.value) || 7)}
                          className="w-20 rounded border border-border bg-background p-1 text-xs"
                        />
                      </label>
                    ) : null}
                  </div>
                  {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={decisionState === 'submitting'}
                      onClick={() =>
                        applyDecision({
                          approve: true,
                          note: note.trim() || undefined,
                          ban,
                          expiresInDays: ban ? Math.max(expiresInDays, 1) : undefined,
                        })
                      }
                    >
                      {decisionState === 'submitting'
                        ? 'Saving…'
                        : ban
                          ? 'Approve & ban'
                          : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={decisionState === 'submitting'}
                      onClick={() =>
                        applyDecision({
                          approve: false,
                          note: note.trim() || undefined,
                        })
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decisionState === 'submitting'}
                      onClick={() =>
                        applyDecision({
                          approve: true,
                          escalate: true,
                          note: note.trim() || undefined,
                        })
                      }
                    >
                      Escalate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={decisionState === 'submitting'}
                      onClick={() => {
                        setSelectedFlagId(null);
                        reset();
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function relativeTime(input: string) {
  const date = new Date(input);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
