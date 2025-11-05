import clsx from 'clsx';
import type { Tier } from '@/lib/types';

const tierStyles: Record<Tier, string> = {
  TIER1: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  TIER2: 'bg-blue-100 text-blue-700 border-blue-300',
  TIER3: 'bg-violet-100 text-violet-700 border-violet-300',
  TIER4: 'bg-slate-100 text-slate-700 border-slate-300',
};

const tierLabels: Record<Tier, string> = {
  TIER1: 'Tier 1',
  TIER2: 'Tier 2',
  TIER3: 'Tier 3',
  TIER4: 'Tier 4',
};

export function TierChip({ tier }: { tier: Tier }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        tierStyles[tier]
      )}
    >
      {tierLabels[tier]}
    </span>
  );
}
