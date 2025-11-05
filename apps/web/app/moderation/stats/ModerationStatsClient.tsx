'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { ModerationStats as ModerationStatsChart } from '@/components/moderation/ModerationStats';
import { fetchModerationStats } from '@/lib/moderation-client';
import { queryKeys } from '@/lib/queryKeys';

const PERIOD_OPTIONS: Array<{ id: string; label: string }> = [
  { id: '7d', label: '7 days' },
  { id: '14d', label: '14 days' },
  { id: '30d', label: '30 days' },
  { id: '12w', label: '12 weeks' },
];

export function ModerationStatsClient() {
  const [period, setPeriod] = useState<string>('7d');

  const query = useQuery({
    queryKey: queryKeys.moderation.stats(period),
    queryFn: () => fetchModerationStats(period),
    keepPreviousData: true,
  });

  const periodLabel = useMemo(() => {
    const match = PERIOD_OPTIONS.find((option) => option.id === period);
    return match?.label ?? period;
  }, [period]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Moderation stats</h2>
          <p className="text-sm text-muted-foreground">
            Review throughput and active sanctions to keep rotations balanced.
          </p>
        </div>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {query.isLoading && !query.data ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : query.data ? (
        <ModerationStatsChart stats={query.data} periodLabel={periodLabel} />
      ) : (
        <div className="rounded-xl border border-border bg-muted/10 p-6 text-sm text-muted-foreground">
          Unable to load moderation statistics. Try a different window.
        </div>
      )}
    </section>
  );
}
