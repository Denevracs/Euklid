'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  followUser,
  unfollowUser,
  followDiscipline,
  unfollowDiscipline,
} from '@/lib/follow-client';
import { queryKeys } from '@/lib/queryKeys';

export function useFollow(options: {
  kind: 'user' | 'discipline';
  targetId: string;
  initialFollowing: boolean;
  ownerId?: string;
}) {
  const { kind, targetId, initialFollowing, ownerId } = options;
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: async () => {
      if (kind === 'user') {
        return followUser(targetId);
      }
      return followDiscipline(targetId);
    },
    onSuccess: () => {
      setIsFollowing(true);
      invalidateLists();
    },
    onError: () => {
      setIsFollowing((state) => state);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (kind === 'user') {
        return unfollowUser(targetId);
      }
      return unfollowDiscipline(targetId);
    },
    onSuccess: () => {
      setIsFollowing(false);
      invalidateLists();
    },
    onError: () => {
      setIsFollowing((state) => state);
    },
  });

  const invalidateLists = useCallback(() => {
    if (kind === 'user') {
      queryClient.invalidateQueries({ queryKey: queryKeys.follow.users(ownerId) });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.follow.disciplines(ownerId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.personal() });
  }, [queryClient, kind, ownerId]);

  const toggle = useCallback(() => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  }, [isFollowing, followMutation, unfollowMutation]);

  return {
    isFollowing,
    follow: () => followMutation.mutate(),
    unfollow: () => unfollowMutation.mutate(),
    toggle,
    isLoading: followMutation.isPending || unfollowMutation.isPending,
  };
}
