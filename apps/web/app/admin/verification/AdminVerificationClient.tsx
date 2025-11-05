'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { decideVerificationSubmission, fetchVerificationQueue } from '@/lib/verify-client';
import { AdminVerificationQueue } from '@/components/verification/admin-queue';
import { Button } from '@/components/ui/button';

const statusOptions = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export function AdminVerificationClient() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('PENDING');

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.verification.queue(status),
    queryFn: () => fetchVerificationQueue(status),
  });

  const decisionMutation = useMutation({
    mutationFn: ({
      id,
      approve,
      note,
      addDomain,
      institutionId,
      verifiedDocInc,
    }: {
      id: string;
      approve: boolean;
      note?: string;
      addDomain?: string;
      institutionId?: string;
      verifiedDocInc?: number;
    }) =>
      decideVerificationSubmission(id, { approve, note, addDomain, institutionId, verifiedDocInc }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.verification.queue(status) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.verification.overview() });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="status-filter" className="text-muted-foreground">
            Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof statusOptions)[number])}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.verification.queue(status) })
          }
          disabled={isFetching}
        >
          {isFetching ? 'Refreshing…' : 'Refresh queue'}
        </Button>
      </div>

      <AdminVerificationQueue
        submissions={data?.submissions ?? []}
        onDecision={async (id, input) => {
          await decisionMutation.mutateAsync({ id, ...input });
        }}
        isProcessing={decisionMutation.isPending}
      />
    </div>
  );
}
