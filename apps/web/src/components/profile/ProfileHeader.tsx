'use client';

import { TierBadge } from '@/components/tier-badge';
import { FollowButton } from '@/components/follow/FollowButton';
import { tierSchema, type PublicProfile, type Tier } from '@/lib/types';

type ProfileHeaderProps = {
  profile: PublicProfile & {
    displayName: string;
  };
  isSelf: boolean;
  initialFollowing: boolean;
  viewerId?: string | null;
};

export function ProfileHeader({ profile, isSelf, initialFollowing, viewerId }: ProfileHeaderProps) {
  const handleLabel = profile.displayHandle ?? profile.handle ?? profile.id.slice(0, 6);
  const tier: Tier = (() => {
    const parsed = tierSchema.safeParse(profile.tier);
    return parsed.success ? parsed.data : 'TIER4';
  })();

  return (
    <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="h-28 w-full bg-gradient-to-r from-indigo-700/70 via-purple-600/70 to-blue-500/70" />
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-foreground">{profile.displayName}</h1>
            <TierBadge tier={tier} />
            {profile.isHistorical ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Historical
              </span>
            ) : null}
            {profile.verifiedAt ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Verified
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>@{handleLabel}</span>
            <span aria-hidden>•</span>
            <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            {profile.legacySource ? <span aria-hidden>•</span> : null}
            {profile.legacySource ? <span>Imported from {profile.legacySource}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground">
            <Stat label="Followers" value={profile.followerCount} />
            <Stat label="Following" value={profile.followingCount} />
            <Stat label="Posts" value={profile.postCount} />
            <Stat label="Discussions" value={profile.discussionCount} />
          </div>
          {profile.verifiedDomains?.length ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Verified domains:</span>
              {profile.verifiedDomains.map((domain) => (
                <span
                  key={domain}
                  className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground"
                >
                  {domain}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {!isSelf ? (
          <FollowButton
            targetId={profile.id}
            kind="user"
            initialFollowing={initialFollowing}
            ownerId={viewerId ?? undefined}
            size="default"
          />
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
