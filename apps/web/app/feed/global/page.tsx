import { Suspense } from 'react';
import { FeedList } from '@/components/feed/FeedList';
import { EmptyState } from '@/components/feed/EmptyState';

export const dynamic = 'force-dynamic';

export default function GlobalFeedPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Global feed</h1>
        <p className="text-sm text-muted-foreground">
          Top activity across Euclid Network in the past 48 hours.
        </p>
      </header>
      <Suspense fallback={<EmptyState loading />}>
        <FeedList initialTab="global" />
      </Suspense>
    </div>
  );
}
