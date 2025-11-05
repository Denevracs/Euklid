'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { FlagQueue } from '@/components/moderation/FlagQueue';
import { Button } from '@/components/ui/button';
import { fetchFlagQueue } from '@/lib/moderation-client';
import { queryKeys } from '@/lib/queryKeys';

const STATUS_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'ESCALATED', label: 'Escalated' },
  { id: 'REVIEWED', label: 'Reviewed' },
];

type FlagsData = Awaited<ReturnType<typeof fetchFlagQueue>>;

export function ModerationQueueClient() {
  const [status, setStatus] = useState<string>('PENDING');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.moderation.queue(status),
    queryFn: () => fetchFlagQueue(status),
    staleTime: 5 * 1000,
  });

  const flags = query.data ?? [];
  const isLoading = query.isLoading || query.isRefetching;

  const pendingCount = useMemo(() => {
    if (status === 'PENDING') {
      return flags.length;
    }
    const cached = queryClient.getQueryData<FlagsData>(queryKeys.moderation.queue('PENDING'));
    return cached?.length ?? 0;
  }, [flags.length, queryClient, status]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Flag queue</h2>
          <p className="text-sm text-muted-foreground">
            Review community reports and take action. Pending: {pendingCount}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <FlagQueue
          flags={flags}
          onDecision={async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.moderation.queue(status) });
            await queryClient.invalidateQueries({
              queryKey: queryKeys.moderation.queue('PENDING'),
            });
          }}
        />
      )}
    </section>
  );
}
