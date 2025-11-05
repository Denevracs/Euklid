'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchPersonalFeed, fetchGlobalFeed } from '@/lib/feed-client';
import { queryKeys } from '@/lib/queryKeys';
import { FeedCard } from './FeedCard';
import { EmptyState } from './EmptyState';
import { Button } from '@/components/ui/button';

const TABS: Array<{ id: 'personal' | 'global'; label: string }> = [
  { id: 'personal', label: 'For you' },
  { id: 'global', label: 'Global' },
];

type FeedListProps = {
  initialTab?: 'personal' | 'global';
};

export function FeedList({ initialTab = 'personal' }: FeedListProps = {}) {
  const { data: session } = useSession();
  const [tab, setTab] = useState<'personal' | 'global'>(initialTab);

  const personalQuery = useInfiniteQuery({
    queryKey: queryKeys.feed.personal(),
    queryFn: ({ pageParam }) => fetchPersonalFeed({ cursor: pageParam ?? undefined }),
    enabled: Boolean(session?.user),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  });

  const globalQuery = useInfiniteQuery({
    queryKey: queryKeys.feed.global(),
    queryFn: ({ pageParam }) => fetchGlobalFeed({ cursor: pageParam ?? undefined }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  });

  const activeQuery = tab === 'personal' ? personalQuery : globalQuery;
  const pages = activeQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const hasMore = Boolean(activeQuery.hasNextPage);

  if (tab === 'personal' && !session?.user) {
    return (
      <div className="space-y-4">
        <nav className="flex items-center gap-2">{renderTabs(tab, setTab)}</nav>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2">{renderTabs(tab, setTab)}</nav>
      {activeQuery.isLoading ? (
        <EmptyState loading />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <FeedCard key={`${item.kind}-${item.id}-${item.activityId}`} item={item} />
          ))}
          {hasMore ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => activeQuery.fetchNextPage()}
                disabled={activeQuery.isFetchingNextPage}
              >
                {activeQuery.isFetchingNextPage ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading
                  </span>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function renderTabs(tab: 'personal' | 'global', onSelect: (next: 'personal' | 'global') => void) {
  return TABS.map((item) => (
    <button
      key={item.id}
      type="button"
      onClick={() => onSelect(item.id)}
      className={`rounded-full px-3 py-1 text-sm font-semibold ${
        tab === item.id
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {item.label}
    </button>
  ));
}
