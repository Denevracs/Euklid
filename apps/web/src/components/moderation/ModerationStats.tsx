'use client';

import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ModerationStats } from '@/lib/types';

type ModerationStatsProps = {
  stats: ModerationStats;
  periodLabel: string;
};

export function ModerationStats({ stats, periodLabel }: ModerationStatsProps) {
  const data = [
    { label: 'Flags reviewed', value: stats.flagsReviewed },
    { label: 'Active bans', value: stats.activeBans },
    { label: 'Pending flags', value: stats.pendingFlags },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <header className="mb-4 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Moderation pulse</h2>
          <p className="text-xs text-muted-foreground">
            Activity over the last {periodLabel}. Use this to plan moderator coverage.
          </p>
        </div>
      </header>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
              contentStyle={{
                backgroundColor: `hsl(var(--background))`,
                border: `1px solid hsl(var(--border))`,
                borderRadius: '0.5rem',
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
