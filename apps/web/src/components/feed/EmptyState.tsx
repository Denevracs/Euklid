'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type EmptyStateProps = {
  loading?: boolean;
};

export function EmptyState({ loading = false }: EmptyStateProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((key) => (
          <div
            key={key}
            className="animate-pulse space-y-3 rounded-2xl border border-border bg-muted/20 p-4"
          >
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border/70 bg-card/60 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles size={16} /> Your feed is quiet
      </div>
      <p className="text-sm text-muted-foreground">
        Follow Tier 1 researchers, subscribe to disciplines, or browse the global feed to curate
        your personalised stream of breakthroughs.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="default">
          <Link href="/explore">Explore disciplines</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/feed/global">View global feed</Link>
        </Button>
      </div>
    </div>
  );
}
