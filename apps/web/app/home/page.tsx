import { Suspense } from 'react';
import { FeedList } from '@/components/feed/FeedList';
import { EmptyState } from '@/components/feed/EmptyState';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">For you</h1>
        <p className="text-sm text-muted-foreground">
          A personalized stream of breakthroughs, debates, and replication efforts from the people
          and disciplines you follow.
        </p>
      </header>
      <Suspense fallback={<EmptyState loading />}>
        <FeedList />
      </Suspense>
    </div>
  );
}
