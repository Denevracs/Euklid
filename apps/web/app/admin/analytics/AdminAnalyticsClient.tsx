'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts';
import { useAdminClient } from '@/hooks/useAdminClient';

const WINDOWS = [7, 14, 30, 60, 90];

export function AdminAnalyticsClient() {
  const { getAnalytics } = useAdminClient();
  const [window, setWindow] = useState(30);

  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics', window],
    queryFn: () => getAnalytics(window),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((value) => (
          <Button
            key={value}
            variant={value === window ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWindow(value)}
          >
            Last {value} days
          </Button>
        ))}
      </div>

      {analyticsQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : analyticsQuery.isError || !analyticsQuery.data ? (
        <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          Unable to load analytics snapshot.
        </div>
      ) : (
        <AdminAnalyticsCharts data={analyticsQuery.data} />
      )}
    </div>
  );
}
