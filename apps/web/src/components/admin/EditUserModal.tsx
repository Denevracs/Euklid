'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AdminUserDetail } from '@/lib/types';

const TIERS = ['TIER1', 'TIER2', 'TIER3', 'TIER4'];
const ROLES = ['ADMIN', 'MODERATOR', 'MEMBER'];

type EditUserModalProps = {
  open: boolean;
  detail: AdminUserDetail | null;
  onClose: () => void;
  onSave: (payload: {
    tier?: string;
    role?: string;
    isHistorical?: boolean;
    verifiedAt?: string | null;
    legacySource?: string | null;
    displayHandle?: string | null;
  }) => Promise<void>;
  onImpersonate: (userId: string) => Promise<void>;
  saving?: boolean;
  impersonating?: boolean;
};

export function EditUserModal({
  open,
  detail,
  onClose,
  onSave,
  onImpersonate,
  saving = false,
  impersonating = false,
}: EditUserModalProps) {
  const user = detail?.user;
  const [tier, setTier] = useState<string | undefined>(user?.tier);
  const [role, setRole] = useState<string | undefined>(user?.role);
  const [isHistorical, setIsHistorical] = useState<boolean>(user?.isHistorical ?? false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(user?.verifiedAt ?? null);
  const [legacySource, setLegacySource] = useState<string | null>(user?.legacySource ?? null);
  const [displayHandle, setDisplayHandle] = useState<string | null>(user?.displayHandle ?? null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setTier(user.tier);
      setRole(user.role);
      setIsHistorical(user.isHistorical);
      setVerifiedAt(user.verifiedAt ?? null);
      setLegacySource(user.legacySource ?? null);
      setDisplayHandle(user.displayHandle ?? null);
      setError(null);
      setSuccessMessage(null);
    }
  }, [user]);

  if (!open || !user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await onSave({
        tier,
        role,
        isHistorical,
        verifiedAt,
        legacySource,
        displayHandle,
      });
      setSuccessMessage('User updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-background/80 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Edit {user.name ?? user.handle ?? user.id}
            </h2>
            <p className="text-xs text-muted-foreground">User ID: {user.id}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Tier
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={tier}
                onChange={(event) => setTier(event.target.value)}
              >
                {TIERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Role
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Display handle
              <input
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={displayHandle ?? ''}
                onChange={(event) => setDisplayHandle(event.target.value || null)}
                placeholder="Optional vanity handle"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Verified at
              <input
                type="datetime-local"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={verifiedAt ? toLocalInput(verifiedAt) : ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setVerifiedAt(value ? new Date(value).toISOString() : null);
                }}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isHistorical}
                onChange={(event) => setIsHistorical(event.target.checked)}
              />
              Mark as historical account
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Legacy source
              <input
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={legacySource ?? ''}
                onChange={(event) => setLegacySource(event.target.value || null)}
                placeholder="e.g. classical corpus"
              />
            </label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={impersonating}
              onClick={async () => {
                try {
                  await onImpersonate(user.id);
                  setSuccessMessage(
                    'New API token issued for impersonation. Reload the app to use it.'
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Unable to impersonate user');
                }
              }}
            >
              {impersonating ? 'Impersonating…' : 'Impersonate'}
            </Button>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>

        <section className="mt-8 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Moderation history</h3>
            {detail?.moderationEvents.length ? (
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {detail.moderationEvents.map((event) => (
                  <li key={event.id} className="rounded-md border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{event.action}</span>
                      <span>{new Date(event.createdAt).toLocaleString()}</span>
                    </div>
                    {event.reason ? <p>Reason: {event.reason}</p> : null}
                    {event.note ? <p>Note: {event.note}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No moderation events recorded.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Verification submissions</h3>
            {detail?.verificationSubmissions.length ? (
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {detail.verificationSubmissions.map((submission) => (
                  <li
                    key={submission.id}
                    className="rounded-md border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{submission.type}</span>
                      <span>{submission.status}</span>
                    </div>
                    <span>{new Date(submission.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No verification submissions.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function toLocalInput(iso: string) {
  try {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  } catch (error) {
    return '';
  }
}
