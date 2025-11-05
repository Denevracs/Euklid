'use client';

import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/tier-badge';
import { UserBadge } from '@/components/user-badge';
import type { VerificationSubmissionWithUser, VerificationType } from '@/lib/types';

type DraftState = {
  note: string;
  addDomain: string;
  institutionId: string;
  verifiedDocInc: string;
};

const defaultDraft: DraftState = {
  note: '',
  addDomain: '',
  institutionId: '',
  verifiedDocInc: '0',
};

type AdminQueueProps = {
  submissions: VerificationSubmissionWithUser[];
  onDecision: (
    id: string,
    input: {
      approve: boolean;
      note?: string;
      addDomain?: string;
      institutionId?: string;
      verifiedDocInc?: number;
    }
  ) => Promise<void> | void;
  isProcessing?: boolean;
};

const typeLabels: Record<VerificationType, string> = {
  DOCUMENT_ORG: 'Institutional documentation',
  EMAIL_DOMAIN: 'Email domain verification',
  INSTITUTION_ID: 'Institution ID',
  ORCID: 'ORCID identifier',
  PEER_ENDORSE: 'Peer endorsement',
  SCHOLAR_PROFILE: 'Scholarly profile',
};

export function AdminVerificationQueue({ submissions, onDecision, isProcessing }: AdminQueueProps) {
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  const sortedSubmissions = useMemo(
    () =>
      [...submissions].sort((a, b) =>
        dayjs(a.createdAt).isBefore(b.createdAt)
          ? -1
          : dayjs(a.createdAt).isAfter(b.createdAt)
            ? 1
            : 0
      ),
    [submissions]
  );

  const getDraft = (id: string) => drafts[id] ?? defaultDraft;

  const updateDraft = (id: string, partial: Partial<DraftState>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(id), ...partial } }));
  };

  const handleDecision = async (submissionId: string, approve: boolean) => {
    const draft = getDraft(submissionId);
    const verifiedDocInc = Number.parseInt(draft.verifiedDocInc, 10);
    await onDecision(submissionId, {
      approve,
      note: draft.note?.trim() || undefined,
      addDomain: draft.addDomain?.trim() || undefined,
      institutionId: draft.institutionId?.trim() || undefined,
      verifiedDocInc: Number.isNaN(verifiedDocInc) ? undefined : verifiedDocInc,
    });
    setDrafts((prev) => {
      const clone = { ...prev };
      delete clone[submissionId];
      return clone;
    });
  };

  if (!sortedSubmissions.length) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No verification requests in this queue.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedSubmissions.map((submission) => {
        const createdAt = dayjs(submission.createdAt).format('MMM D, YYYY HH:mm');
        const draft = getDraft(submission.id);
        const payloadPreview = JSON.stringify(submission.payload ?? {}, null, 2);

        return (
          <div
            key={submission.id}
            className="rounded-lg border border-border bg-background p-4 shadow-sm"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {typeLabels[submission.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">Submitted {createdAt}</span>
                </div>
                {submission.user ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {submission.user.display ??
                        submission.user.name ??
                        submission.user.email ??
                        submission.user.id}
                    </span>
                    {submission.user.tier ? <TierBadge tier={submission.user.tier} /> : null}
                    <UserBadge
                      tier={submission.user.tier}
                      role={submission.user.role}
                      isHistorical={submission.user.isHistorical ?? false}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Status: {submission.status}</span>
                {submission.reviewedAt ? (
                  <span>Reviewed {dayjs(submission.reviewedAt).fromNow()}</span>
                ) : null}
              </div>
            </div>

            <details className="mt-3 rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-foreground">
                Payload details
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {payloadPreview}
              </pre>
            </details>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor={`addDomain-${submission.id}`}
                >
                  Add domain
                </label>
                <input
                  id={`addDomain-${submission.id}`}
                  type="text"
                  value={draft.addDomain}
                  onChange={(event) =>
                    updateDraft(submission.id, { addDomain: event.target.value })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                  placeholder="domain.edu"
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor={`institutionId-${submission.id}`}
                >
                  Institution ID
                </label>
                <input
                  id={`institutionId-${submission.id}`}
                  type="text"
                  value={draft.institutionId}
                  onChange={(event) =>
                    updateDraft(submission.id, { institutionId: event.target.value })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                  placeholder="UUID if known"
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor={`verifiedDocInc-${submission.id}`}
                >
                  Verified docs +
                </label>
                <input
                  id={`verifiedDocInc-${submission.id}`}
                  type="number"
                  min={0}
                  value={draft.verifiedDocInc}
                  onChange={(event) =>
                    updateDraft(submission.id, { verifiedDocInc: event.target.value })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-1 md:col-span-1">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor={`note-${submission.id}`}
                >
                  Moderator note
                </label>
                <textarea
                  id={`note-${submission.id}`}
                  value={draft.note}
                  onChange={(event) => updateDraft(submission.id, { note: event.target.value })}
                  className="h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                  placeholder="Context for approval or rejection"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => void handleDecision(submission.id, true)}
                disabled={isProcessing}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDecision(submission.id, false)}
                disabled={isProcessing}
              >
                Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
