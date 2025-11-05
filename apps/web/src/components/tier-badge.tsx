import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import type { Tier } from '@/lib/types';

const tierStyles: Record<Tier, string> = {
  TIER1: 'bg-emerald-100 text-emerald-900 border-transparent',
  TIER2: 'bg-sky-100 text-sky-900 border-transparent',
  TIER3: 'bg-amber-100 text-amber-900 border-transparent',
  TIER4: 'bg-slate-100 text-slate-800 border-transparent',
};

const tierLabels: Record<Tier, string> = {
  TIER1: 'Tier 1',
  TIER2: 'Tier 2',
  TIER3: 'Tier 3',
  TIER4: 'Tier 4',
};

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <Badge className={clsx('font-medium uppercase tracking-wide', tierStyles[tier], className)}>
      {tierLabels[tier]}
    </Badge>
  );
}
