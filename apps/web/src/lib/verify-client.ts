'use client';

import { apiBaseUrl } from '@/lib/env';
import {
  authMeResponseSchema,
  emailVerificationCompleteResponseSchema,
  emailVerificationResponseSchema,
  endorsementSummarySchema,
  verificationDecisionResponseSchema,
  verificationMineSchema,
  verificationQueueResponseSchema,
  verificationSubmissionSchema,
} from '@/lib/types';
import type { VerificationType } from '@/lib/types';
import { exchangeSessionForApiToken } from '@/lib/api';
import { z } from 'zod';

const submissionResponseSchema = z.object({
  submission: verificationSubmissionSchema,
});

type RequestInitWithBody = RequestInit & { body?: BodyInit | null };

async function authorizedFetch<T>(
  schema: z.ZodSchema<T>,
  path: string,
  init: RequestInitWithBody = {},
  attempt = 0
): Promise<T> {
  const token = await exchangeSessionForApiToken(attempt > 0);

  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (response.status === 401 && attempt === 0) {
    return authorizedFetch(schema, path, init, attempt + 1);
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message =
      typeof (errorPayload as { message?: string }).message === 'string'
        ? (errorPayload as { message?: string }).message
        : `Request to ${path} failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return schema.parse({}) as T;
  }

  const payload = await response.json();
  return schema.parse(payload);
}

export async function getVerificationOverview() {
  const [me, mine] = await Promise.all([
    authorizedFetch(authMeResponseSchema, '/auth/me'),
    authorizedFetch(verificationMineSchema, '/verification/mine'),
  ]);

  return {
    profile: me.user ?? null,
    submissions: mine.submissions,
  };
}

export async function submitVerification(type: VerificationType, payload: Record<string, unknown>) {
  return authorizedFetch(submissionResponseSchema, '/verification/submit', {
    method: 'POST',
    body: JSON.stringify({ type, payload }),
  });
}

export async function requestEmailVerification(email: string) {
  return authorizedFetch(emailVerificationResponseSchema, '/auth/verify/email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function completeEmailVerification(email: string, code: string) {
  return authorizedFetch(emailVerificationCompleteResponseSchema, '/auth/verify/code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function fetchVerificationQueue(status: string = 'PENDING') {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }

  const query = params.toString();
  const path = `/verification/admin/queue${query ? `?${query}` : ''}`;
  return authorizedFetch(verificationQueueResponseSchema, path);
}

export type VerificationDecisionInput = {
  approve: boolean;
  note?: string;
  addDomain?: string;
  institutionId?: string;
  verifiedDocInc?: number;
};

export async function decideVerificationSubmission(id: string, input: VerificationDecisionInput) {
  return authorizedFetch(verificationDecisionResponseSchema, `/verification/admin/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchEndorsementSummary(userId: string) {
  return authorizedFetch(endorsementSummarySchema, `/verification/endorse/inbound/${userId}`);
}
