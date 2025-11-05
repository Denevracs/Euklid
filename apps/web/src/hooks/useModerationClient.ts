'use client';

import { useCallback } from 'react';
import { submitFlag, decideOnFlag, unbanUser as unbanUserRequest } from '@/lib/moderation-client';

export function useModerationClient() {
  const submit = useCallback(
    async (input: { targetType: string; targetId: string; reason: string }) => submitFlag(input),
    []
  );

  const decide = useCallback(
    async (
      flagId: string,
      body: {
        approve: boolean;
        escalate?: boolean;
        note?: string;
        expiresInDays?: number;
        ban?: boolean;
      }
    ) => decideOnFlag(flagId, body),
    []
  );

  const unban = useCallback(async (userId: string) => unbanUserRequest(userId), []);

  return {
    submitFlag: submit,
    decideOnFlag: decide,
    unbanUser: unban,
  };
}
