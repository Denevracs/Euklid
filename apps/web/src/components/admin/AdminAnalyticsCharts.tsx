'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import type { AdminAnalytics } from '@/lib/types';

const axisColor = 'hsl(var(--muted-foreground))';

type AdminAnalyticsChartsProps = {
  data: AdminAnalytics;
};

export function AdminAnalyticsCharts({ data }: AdminAnalyticsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Top posters" description="Users ranked by published nodes">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.topPosters}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis
              dataKey={(entry) =>
                entry.displayHandle ?? entry.handle ?? entry.name ?? entry.id.slice(0, 6)
              }
              tick={{ fill: axisColor }}
            />
            <YAxis tick={{ fill: axisColor }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
              contentStyle={{
                backgroundColor: `hsl(var(--background))`,
                border: `1px solid hsl(var(--border))`,
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
            />
            <Bar dataKey="postCount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top discussions" description="Most active participants">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.topDiscussants}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis
              dataKey={(entry) =>
                entry.displayHandle ?? entry.handle ?? entry.name ?? entry.id.slice(0, 6)
              }
              tick={{ fill: axisColor }}
            />
            <YAxis tick={{ fill: axisColor }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
              contentStyle={{
                backgroundColor: `hsl(var(--background))`,
                border: `1px solid hsl(var(--border))`,
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
            />
            <Bar dataKey="discussionCount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top followed" description="Highest follower counts">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.topFollowed}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis
              dataKey={(entry) =>
                entry.displayHandle ?? entry.handle ?? entry.name ?? entry.id.slice(0, 6)
              }
              tick={{ fill: axisColor }}
            />
            <YAxis tick={{ fill: axisColor }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
              contentStyle={{
                backgroundColor: `hsl(var(--background))`,
                border: `1px solid hsl(var(--border))`,
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
            />
            <Bar dataKey="followerCount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Weekly growth" description="New accounts per week">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data.weeklyGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="week" tick={{ fill: axisColor }} />
            <YAxis tick={{ fill: axisColor }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: `hsl(var(--background))`,
                border: `1px solid hsl(var(--border))`,
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
