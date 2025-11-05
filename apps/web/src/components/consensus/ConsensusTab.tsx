'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VoteType } from '@/lib/types';
import type { fetchDiscussions } from '@/lib/api';

dayjs.extend(localizedFormat);

type ConsensusPoint = {
  date: string;
  agree: number;
  disagree: number;
  replicate: number;
  challenge: number;
};

const COLORS: Record<VoteType, string> = {
  AGREE: '#10b981',
  DISAGREE: '#f97316',
  REPLICATE: '#3b82f6',
  CHALLENGE: '#f43f5e',
};

type DiscussionList = Awaited<ReturnType<typeof fetchDiscussions>>;

export function ConsensusTab({ discussions }: { discussions: DiscussionList }) {
  const data = useMemo(() => buildTimeline(discussions), [discussions]);
  const current = data[data.length - 1];
  const sentiment = determineSentiment(current);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Current consensus
        </div>
        <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-foreground">
          {sentiment.label}
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
            {sentiment.description}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Weighted votes use tier multipliers: Tier 1 (1.0), Tier 2 (0.5), Tier 3 (0.25), Tier 4
          (0.1).
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vote activity yet. Encourage peers to weigh in.
          </p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} width={60} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${(value * 100).toFixed(1)}%`,
                    name,
                  ]}
                  labelFormatter={(label) => dayjs(label).format('LL')}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="agree"
                  stackId="1"
                  stroke={COLORS.AGREE}
                  fill={COLORS.AGREE}
                />
                <Area
                  type="monotone"
                  dataKey="disagree"
                  stackId="1"
                  stroke={COLORS.DISAGREE}
                  fill={COLORS.DISAGREE}
                />
                <Area
                  type="monotone"
                  dataKey="replicate"
                  stackId="1"
                  stroke={COLORS.REPLICATE}
                  fill={COLORS.REPLICATE}
                />
                <Area
                  type="monotone"
                  dataKey="challenge"
                  stackId="1"
                  stroke={COLORS.CHALLENGE}
                  fill={COLORS.CHALLENGE}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function buildTimeline(discussions: DiscussionList): ConsensusPoint[] {
  const daily = new Map<string, ConsensusPoint>();
  for (const discussion of discussions) {
    const votes = discussion.votes ?? [];
    for (const vote of votes) {
      const day = dayjs(vote.createdAt).startOf('day').format('YYYY-MM-DD');
      if (!daily.has(day)) {
        daily.set(day, { date: day, agree: 0, disagree: 0, replicate: 0, challenge: 0 });
      }
      const entry = daily.get(day)!;
      const weight = vote.weight ?? 0;
      switch (vote.type) {
        case 'AGREE':
          entry.agree += weight;
          break;
        case 'DISAGREE':
          entry.disagree += weight;
          break;
        case 'REPLICATE':
          entry.replicate += weight;
          break;
        case 'CHALLENGE':
          entry.challenge += weight;
          break;
        default:
          break;
      }
    }
  }
  return Array.from(daily.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((point) => {
      const total = point.agree + point.disagree + point.replicate + point.challenge;
      if (total === 0) {
        return { ...point };
      }
      return {
        date: point.date,
        agree: point.agree / total,
        disagree: point.disagree / total,
        replicate: point.replicate / total,
        challenge: point.challenge / total,
      };
    });
}

function determineSentiment(point?: ConsensusPoint) {
  if (!point) {
    return { label: 'No consensus', description: 'Awaiting community input' };
  }
  const agreeScore = point.agree - point.disagree;
  if (agreeScore > 0.4) {
    return { label: 'Leaning Proven', description: 'Agree outweighs disagreement' };
  }
  if (point.challenge > 0.25) {
    return { label: 'Under Challenge', description: 'Challenge signals unresolved debate' };
  }
  if (point.replicate > 0.2) {
    return { label: 'Evidence Gathering', description: 'Replication efforts active' };
  }
  return { label: 'Developing', description: 'Consensus still forming' };
}
