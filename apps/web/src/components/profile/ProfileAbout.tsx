'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { PublicProfile } from '@/lib/types';

type PreviewUser = {
  id: string;
  name: string | null;
  handle: string | null;
  displayHandle: string | null;
  tier: string | null;
};

type ProfileAboutProps = {
  profile: PublicProfile & { displayName: string };
  followersPreview: PreviewUser[];
  followingPreview: PreviewUser[];
  mutualFollows: PreviewUser[];
  isSelf: boolean;
  onEdit?: () => void;
};

export function ProfileAbout({
  profile,
  followersPreview,
  followingPreview,
  mutualFollows,
  isSelf,
  onEdit,
}: ProfileAboutProps) {
  return (
    <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">About</h2>
        {isSelf ? (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit profile
          </Button>
        ) : null}
      </div>
      <div className="space-y-3 text-sm text-muted-foreground">
        {profile.bio ? (
          <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
        ) : (
          <p>No bio provided yet.</p>
        )}
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Website</dt>
            <dd className="text-foreground">
              {profile.website ? (
                <Link href={profile.website} target="_blank" className="hover:underline">
                  {profile.website}
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Location</dt>
            <dd className="text-foreground">{profile.location ?? '—'}</dd>
          </div>
        </dl>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Expertise</h3>
          {profile.expertise.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile.expertise.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No areas of expertise listed yet.</p>
          )}
        </div>
      </div>

      <PreviewSection title="Followers" users={followersPreview} emptyLabel="No followers yet." />
      <PreviewSection
        title="Following"
        users={followingPreview}
        emptyLabel="Not following anyone yet."
      />
      {mutualFollows.length ? (
        <PreviewSection
          title="Mutual follows"
          users={mutualFollows}
          emptyLabel="No mutual connections."
        />
      ) : null}
    </div>
  );
}

function PreviewSection({
  title,
  users,
  emptyLabel,
}: {
  title: string;
  users: PreviewUser[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {users.length ? (
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                href={`/u/${user.handle ?? user.displayHandle ?? user.id}`}
                className="rounded-full border border-border px-3 py-1 hover:border-primary/40 hover:text-foreground"
              >
                @{user.displayHandle ?? user.handle ?? user.id.slice(0, 6)}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
