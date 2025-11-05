'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/useFollow';

type FollowButtonProps = {
  targetId: string;
  kind: 'user' | 'discipline';
  initialFollowing: boolean;
  ownerId?: string;
  size?: 'sm' | 'default';
};

export function FollowButton({
  targetId,
  kind,
  initialFollowing,
  ownerId,
  size = 'sm',
}: FollowButtonProps) {
  const { data: session } = useSession();
  const disabled = !session?.user;

  const follow = useFollow({ kind, targetId, initialFollowing, ownerId });

  const label = useMemo(() => {
    if (disabled) return 'Follow';
    return follow.isFollowing ? 'Following' : 'Follow';
  }, [disabled, follow.isFollowing]);

  return (
    <Button
      type="button"
      variant={follow.isFollowing ? 'secondary' : 'default'}
      size={size}
      disabled={follow.isLoading || disabled}
      onClick={follow.toggle}
    >
      {label}
    </Button>
  );
}
