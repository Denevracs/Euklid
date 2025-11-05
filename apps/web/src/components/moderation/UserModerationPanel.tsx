'use client';

import { useState } from 'react';
import { ShieldAlert, UserMinus, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { ModerationEventDTO, ModerationSummary } from '@/lib/types';
import { useModerationClient } from '@/hooks/useModerationClient';

type UserModerationPanelProps = {
  summary: ModerationSummary;
  events: ModerationEventDTO[];
  userDisplayName: string;
  userId: string;
};

export function UserModerationPanel({
  summary,
  events,
  userDisplayName,
  userId,
}: UserModerationPanelProps) {
  const { unbanUser } = useModerationClient();
  const [isUnbanning, setIsUnbanning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const handleUnban = async () => {
    if (!summary.isBanned) return;
    try {
      setIsUnbanning(true);
      await unbanUser(userId);
      setFeedback('User unbanned successfully.');
      router.refresh();
    } catch (error) {
      console.error('Failed to unban user', error);
      setFeedback(error instanceof Error ? error.message : 'Failed to unban user');
    } finally {
      setIsUnbanning(false);
    }
  };

  const bannedUntil = summary.bannedUntil ? new Date(summary.bannedUntil) : null;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <header className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Moderation summary</h2>
          <p className="text-xs text-muted-foreground">
            Snapshot of community safety interventions for {userDisplayName}.
          </p>
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Warnings</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">{summary.warnings}</dd>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Bans</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">{summary.bans}</dd>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Mutes</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">{summary.mutes}</dd>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Active flags</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">{summary.activeFlags}</dd>
        </div>
      </dl>

      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-700">
        {summary.isBanned ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <UserMinus className="h-4 w-4" />
              <span>
                Account is suspended{bannedUntil ? ` until ${bannedUntil.toLocaleString()}` : ''}.
              </span>
            </div>
            <Button size="sm" variant="outline" disabled={isUnbanning} onClick={handleUnban}>
              {isUnbanning ? 'Unbanning…' : 'Lift ban'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span>User is in good standing.</span>
          </div>
        )}
        {feedback ? <p className="mt-2 text-xs text-foreground">{feedback}</p> : null}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Recent events</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {events.length === 0 ? (
            <li className="rounded-md border border-border bg-muted/20 p-3 text-muted-foreground">
              No moderation events recorded.
            </li>
          ) : (
            events.map((event) => (
              <li
                key={event.id}
                className="rounded-md border border-border bg-background/70 p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{event.action}</div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                {event.reason ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold">Reason:</span> {event.reason}
                  </p>
                ) : null}
                {event.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold">Note:</span> {event.note}
                  </p>
                ) : null}
                {event.expiresAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {new Date(event.expiresAt).toLocaleString()}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
