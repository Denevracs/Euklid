'use client';

import { useCallback } from 'react';
import { fetchPublicProfile, updateProfile, fetchProfileActivity } from '@/lib/profile-client';

export function useProfileClient() {
  const getProfile = useCallback((handleOrId: string) => fetchPublicProfile(handleOrId), []);
  const saveProfile = useCallback(
    (payload: Parameters<typeof updateProfile>[0]) => updateProfile(payload),
    []
  );
  const getActivity = useCallback((userId: string) => fetchProfileActivity(userId), []);

  return {
    getProfile,
    saveProfile,
    getActivity,
  };
}
