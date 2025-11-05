'use client';

import { useCallback, useEffect, useState } from 'react';

export function useRateLimitFeedback() {
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    if (!rateLimited) return;
    const timeout = window.setTimeout(() => setRateLimited(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [rateLimited]);

  const handleApiError = useCallback((error: unknown) => {
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      setRateLimited(true);
      return true;
    }
    return false;
  }, []);

  return {
    rateLimited,
    handleApiError,
  };
}
