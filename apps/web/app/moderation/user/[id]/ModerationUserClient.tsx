'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserModerationPanel } from '@/components/moderation/UserModerationPanel';
import { fetchModerationHistory, fetchModerationSummary } from '@/lib/moderation-client';
import { queryKeys } from '@/lib/queryKeys';

type ModerationUserClientProps = {
  userId: string;
  displayName: string;
};

export function ModerationUserClient({ userId, displayName }: ModerationUserClientProps) {
  const summaryQuery = useQuery({
    queryKey: queryKeys.moderation.summary(userId),
    queryFn: () => fetchModerationSummary(userId),
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.moderation.history(userId),
    queryFn: () => fetchModerationHistory(userId),
  });

  const isLoading = summaryQuery.isLoading || historyQuery.isLoading;
  const hasError = summaryQuery.isError || historyQuery.isError;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">User moderation</h2>
          <p className="text-sm text-muted-foreground">Actions taken for {displayName}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            summaryQuery.refetch();
            historyQuery.refetch();
          }}
          disabled={summaryQuery.isFetching || historyQuery.isFetching}
        >
          {summaryQuery.isFetching || historyQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : hasError || !summaryQuery.data ? (
        <div className="rounded-xl border border-border bg-destructive/10 p-6 text-sm text-destructive">
          Unable to load moderation summary for this user.
        </div>
      ) : (
        <UserModerationPanel
          summary={summaryQuery.data}
          events={historyQuery.data ?? summaryQuery.data.recentEvents}
          userDisplayName={displayName}
          userId={userId}
        />
      )}

      {historyQuery.data && historyQuery.data.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Full history</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {historyQuery.data.map((event) => (
                  <tr key={event.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium text-foreground">{event.action}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {event.targetType} · {event.targetId}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {event.reason ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{event.note ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {event.expiresAt ? new Date(event.expiresAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
