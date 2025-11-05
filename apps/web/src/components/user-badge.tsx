import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from '@/components/tier-badge';
import { tierSchema } from '@/lib/types';
import type { Tier } from '@/lib/types';

type UserBadgeProps = {
  tier?: Tier | string | null;
  role?: string | null;
  isHistorical?: boolean;
  className?: string;
};

export function UserBadge({ tier, role, isHistorical = false, className }: UserBadgeProps) {
  if (!tier && !role && !isHistorical) {
    return null;
  }

  const tierParse = tier ? tierSchema.safeParse(tier) : null;
  const normalizedTier: Tier | null = tierParse?.success ? tierParse.data : null;

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      {role ? (
        <Badge variant="outline" className="uppercase tracking-wide text-xs">
          {role}
        </Badge>
      ) : null}
      {normalizedTier ? (
        <TierBadge tier={normalizedTier} />
      ) : tier ? (
        <Badge variant="secondary">{tier}</Badge>
      ) : null}
      {isHistorical ? <Badge variant="outline">Historical</Badge> : null}
    </div>
  );
}
