'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { queryKeys } from '@/lib/queryKeys';
import type { UserSession, VerificationSubmission } from '@/lib/types';
import {
  completeEmailVerification,
  getVerificationOverview,
  requestEmailVerification,
  submitVerification,
} from '@/lib/verify-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TierBadge } from '@/components/tier-badge';
import { VerificationSubmissionForm } from '@/components/verification/submission-form';

type VerifyPageClientProps = {
  initialProfile: UserSession | null;
};

type ActiveTab = 'email' | 'documents' | 'scholarly' | 'submissions';

const EMPTY_SUBMISSIONS: VerificationSubmission[] = [];

export function VerifyPageClient({ initialProfile }: VerifyPageClientProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('email');
  const [emailInput, setEmailInput] = useState(initialProfile?.email ?? '');
  const [emailCode, setEmailCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.verification.overview(),
    queryFn: getVerificationOverview,
    initialData: {
      profile: initialProfile,
      submissions: [] as VerificationSubmission[],
    },
  });

  const profile = data?.profile ?? null;
  const submissions = data?.submissions ?? EMPTY_SUBMISSIONS;

  const requestCodeMutation = useMutation({
    mutationFn: (email: string) => requestEmailVerification(email),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.verification.overview() });
      setStatusMessage(
        response.devCode ? `${response.message} (dev code: ${response.devCode})` : response.message
      );
      setErrorMessage(null);
    },
    onError: (error: Error) => {
      setStatusMessage(null);
      setErrorMessage(error.message);
    },
  });

  const confirmCodeMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      completeEmailVerification(email, code),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.verification.overview() });
      setStatusMessage(response.message);
      setErrorMessage(null);
      setEmailCode('');
    },
    onError: (error: Error) => {
      setStatusMessage(null);
      setErrorMessage(error.message);
    },
  });

  const documentMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => submitVerification('DOCUMENT_ORG', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.verification.overview() });
      setStatusMessage('Documentation submitted successfully for review.');
      setErrorMessage(null);
    },
    onError: (error: Error) => {
      setStatusMessage(null);
      setErrorMessage(error.message);
    },
  });

  const scholarlyMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      submitVerification('SCHOLAR_PROFILE', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.verification.overview() });
      setStatusMessage('Scholarly identifiers submitted successfully.');
      setErrorMessage(null);
    },
    onError: (error: Error) => {
      setStatusMessage(null);
      setErrorMessage(error.message);
    },
  });

  const verifiedDomains = profile?.verifiedDomains ?? [];
  const verifiedDocs = profile?.verifiedDocs ?? 0;
  const tierBadge = profile?.tier ? (
    <TierBadge tier={profile.tier} />
  ) : (
    <span className="text-sm text-muted-foreground">Unverified</span>
  );

  const submissionsByStatus = useMemo(() => {
    return submissions.reduce<Record<string, VerificationSubmission[]>>((acc, submission) => {
      acc[submission.status] = acc[submission.status] ?? [];
      acc[submission.status].push(submission);
      return acc;
    }, {});
  }, [submissions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            Verification overview
            {tierBadge}
            {profile?.verificationScore !== undefined ? (
              <span className="text-sm text-muted-foreground">
                Score {profile.verificationScore}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-muted-foreground">Verified domains</p>
              {verifiedDomains.length ? (
                <ul className="mt-1 list-disc pl-5">
                  {verifiedDomains.map((domain) => (
                    <li key={domain}>{domain}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">No domains verified yet.</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Verified documents</p>
              <p className="mt-1 font-medium text-foreground">{verifiedDocs}</p>
            </div>
            {profile?.verifiedAt ? (
              <div>
                <p className="text-muted-foreground">Verified since</p>
                <p className="mt-1 text-foreground">
                  {dayjs(profile.verifiedAt).format('MMM D, YYYY')}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-border pb-4">
          <TabButton
            label="Verify email domain"
            active={activeTab === 'email'}
            onClick={() => setActiveTab('email')}
          />
          <TabButton
            label="Upload documentation"
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
          />
          <TabButton
            label="Scholarly IDs"
            active={activeTab === 'scholarly'}
            onClick={() => setActiveTab('scholarly')}
          />
          <TabButton
            label="Submissions"
            active={activeTab === 'submissions'}
            onClick={() => setActiveTab('submissions')}
          />
          <div className="ml-auto text-xs text-muted-foreground">
            {isFetching ? 'Refreshing overview…' : 'Overview is up to date'}
          </div>
        </div>

        <div className="pt-4">
          {statusMessage ? (
            <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {statusMessage}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mb-4 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {activeTab === 'email' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4 rounded-md border border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Request verification code</h3>
                <label className="text-xs font-medium text-foreground" htmlFor="emailInput">
                  Institutional email
                </label>
                <input
                  id="emailInput"
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                  placeholder="you@institution.edu"
                />
                <Button
                  size="sm"
                  onClick={() => requestCodeMutation.mutate(emailInput)}
                  disabled={requestCodeMutation.isPending || !emailInput.length}
                >
                  {requestCodeMutation.isPending ? 'Sending…' : 'Send code'}
                </Button>
              </div>
              <div className="space-y-4 rounded-md border border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Enter verification code</h3>
                <label className="text-xs font-medium text-foreground" htmlFor="emailCode">
                  Verification code
                </label>
                <input
                  id="emailCode"
                  type="text"
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
                  placeholder="6-digit code"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => confirmCodeMutation.mutate({ email: emailInput, code: emailCode })}
                  disabled={
                    confirmCodeMutation.isPending || !emailInput.length || !emailCode.length
                  }
                >
                  {confirmCodeMutation.isPending ? 'Verifying…' : 'Confirm code'}
                </Button>
              </div>
            </div>
          ) : null}

          {activeTab === 'documents' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Provide links to documentation such as appointment letters, faculty profiles, or
                organizational press releases that confirm your affiliation. Moderators will review
                and approve.
              </p>
              <VerificationSubmissionForm
                variant="DOCUMENT_ORG"
                onSubmit={async (values) => {
                  await documentMutation.mutateAsync(values as Record<string, unknown>);
                }}
                isSubmitting={documentMutation.isPending}
              />
            </div>
          ) : null}

          {activeTab === 'scholarly' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Share scholarly identifiers so peers can validate your publication record and
                replication history.
              </p>
              <VerificationSubmissionForm
                variant="SCHOLAR_PROFILE"
                onSubmit={async (values) => {
                  await scholarlyMutation.mutateAsync(values as Record<string, unknown>);
                }}
                isSubmitting={scholarlyMutation.isPending}
              />
            </div>
          ) : null}

          {activeTab === 'submissions' ? (
            <div className="space-y-3 text-sm">
              {Object.entries(submissionsByStatus).length ? (
                Object.entries(submissionsByStatus).map(([status, items]) => (
                  <div key={status} className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">{status}</h3>
                    <div className="space-y-2 rounded-md border border-border/70 bg-muted/40 p-3">
                      {items
                        .sort((a, b) => (dayjs(a.createdAt).isAfter(b.createdAt) ? -1 : 1))
                        .map((submission) => (
                          <div
                            key={submission.id}
                            className="rounded-md border border-dashed border-border/60 bg-background p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>{submission.type}</span>
                              <span>
                                Submitted {dayjs(submission.createdAt).format('MMM D, YYYY')}
                              </span>
                              {submission.reviewedAt ? (
                                <span>
                                  Reviewed {dayjs(submission.reviewedAt).format('MMM D, YYYY')}
                                </span>
                              ) : null}
                            </div>
                            <details className="mt-2 rounded-md border border-dashed border-border/50 bg-muted/20 p-3">
                              <summary className="cursor-pointer text-xs font-medium text-foreground">
                                View payload
                              </summary>
                              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                                {JSON.stringify(submission.payload ?? {}, null, 2)}
                              </pre>
                            </details>
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  You have not submitted any verification requests yet.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow'
          : 'rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80'
      }
    >
      {label}
    </button>
  );
}
