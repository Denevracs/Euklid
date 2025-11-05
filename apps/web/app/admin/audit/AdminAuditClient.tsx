'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { useAdminClient } from '@/hooks/useAdminClient';

export function AdminAuditClient() {
  const { getAuditLogs } = useAdminClient();

  const auditQuery = useInfiniteQuery({
    queryKey: ['admin', 'audit', 'infinite'],
    queryFn: ({ pageParam }) => getAuditLogs({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });

  const logs = auditQuery.data?.pages.flatMap((page) => page.items) ?? [];

  if (auditQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (auditQuery.isError) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load audit logs. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuditLogTable logs={logs} />
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => auditQuery.fetchNextPage()}
          disabled={!auditQuery.hasNextPage || auditQuery.isFetchingNextPage}
        >
          {auditQuery.isFetchingNextPage
            ? 'Loading…'
            : auditQuery.hasNextPage
              ? 'Load more'
              : 'End of history'}
        </Button>
      </div>
    </div>
  );
}
