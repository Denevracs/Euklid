'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileAbout } from '@/components/profile/ProfileAbout';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { useProfileClient } from '@/hooks/useProfileClient';
import { queryKeys } from '@/lib/queryKeys';
import type { PublicProfile } from '@/lib/types';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'about', label: 'About' },
  { id: 'activity', label: 'Activity' },
  { id: 'endorsements', label: 'Endorsements' },
  { id: 'verification', label: 'Verification history' },
];

type TabId = 'about' | 'activity' | 'endorsements' | 'verification';

type PreviewUser = {
  id: string;
  name: string | null;
  handle: string | null;
  displayHandle: string | null;
  tier: string | null;
};

type ProfilePageClientProps = {
  profile: PublicProfile & {
    displayName: string;
    verifiedDomains: string[];
    legacySource: string | null;
    legacyWorksCount: number;
  };
  followersPreview: PreviewUser[];
  followingPreview: PreviewUser[];
  mutualFollows: PreviewUser[];
  initialFollowing: boolean;
  viewerId?: string | null;
  isSelf: boolean;
};

export function ProfilePageClient({
  profile,
  followersPreview,
  followingPreview,
  mutualFollows,
  initialFollowing,
  viewerId,
  isSelf,
}: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [profileState, setProfileState] = useState(profile);
  const [editing, setEditing] = useState(false);
  const { getActivity } = useProfileClient();

  const activityQuery = useQuery({
    queryKey: queryKeys.profile.activity(profileState.id),
    queryFn: () => getActivity(profileState.id),
    enabled: activeTab === 'activity' || activeTab === 'endorsements',
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-16">
      <ProfileHeader
        profile={{ ...profileState, verifiedDomains: profile.verifiedDomains }}
        isSelf={isSelf}
        initialFollowing={initialFollowing}
        viewerId={viewerId}
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              activeTab === tab.id
                ? 'bg-foreground text-background shadow-sm'
                : 'border border-border bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'about' ? (
        <ProfileAbout
          profile={{ ...profileState, displayName: profileState.displayName }}
          followersPreview={followersPreview}
          followingPreview={followingPreview}
          mutualFollows={mutualFollows}
          isSelf={isSelf}
          onEdit={isSelf ? () => setEditing(true) : undefined}
        />
      ) : null}

      {activeTab === 'activity' ? (
        <ActivitySection loading={activityQuery.isLoading} data={activityQuery.data} />
      ) : null}

      {activeTab === 'endorsements' ? (
        <EndorsementsSection
          loading={activityQuery.isLoading}
          data={activityQuery.data?.endorsements ?? []}
        />
      ) : null}

      {activeTab === 'verification' ? <VerificationSection profile={profileState} /> : null}

      <EditProfileModal
        open={editing}
        onClose={() => setEditing(false)}
        initialBio={profileState.bio}
        initialWebsite={profileState.website}
        initialLocation={profileState.location}
        initialExpertise={profileState.expertise}
        onUpdated={(next) =>
          setProfileState((prev) => ({
            ...prev,
            bio: next.bio,
            website: next.website,
            location: next.location,
            expertise: next.expertise,
          }))
        }
      />
    </div>
  );
}

function ActivitySection({
  loading,
  data,
}: {
  loading: boolean;
  data:
    | {
        nodes: Array<{ id: string; title: string; status: string; createdAt: string }>;
        discussions: Array<{
          id: string;
          content: string;
          createdAt: string;
          nodeId: string | null | undefined;
        }>;
        endorsements: unknown[];
      }
    | undefined;
}) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Recent nodes</h3>
        {data?.nodes?.length ? (
          <ul className="space-y-2 text-sm">
            {data.nodes.map((node) => (
              <li key={node.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <Link
                  href={`/nodes/${node.id}`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {node.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {node.status} · {new Date(node.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No nodes yet.</p>
        )}
      </div>
      <div className="space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Recent discussions</h3>
        {data?.discussions?.length ? (
          <ul className="space-y-2 text-sm">
            {data.discussions.map((discussion) => (
              <li
                key={discussion.id}
                className="rounded-xl border border-border/60 bg-muted/20 p-3"
              >
                <p className="line-clamp-3 text-foreground/90">{discussion.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(discussion.createdAt).toLocaleString()}{' '}
                  {discussion.nodeId ? `· Node ${discussion.nodeId.slice(0, 6)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No discussions yet.</p>
        )}
      </div>
    </section>
  );
}

function EndorsementsSection({
  loading,
  data,
}: {
  loading: boolean;
  data: Array<{
    id: string;
    weight: number;
    note: string | null;
    createdAt: string;
    endorseed: {
      id: string;
      name: string | null;
      handle: string | null;
      displayHandle: string | null;
    };
  }>;
}) {
  if (loading && !data.length) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Recent endorsements</h3>
      {data.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {data.map((endorsement) => (
            <li key={endorsement.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  For @
                  {endorsement.endorseed.displayHandle ??
                    endorsement.endorseed.handle ??
                    endorsement.endorseed.id.slice(0, 6)}
                </span>
                <span>{new Date(endorsement.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/90">Weight {endorsement.weight}</p>
              {endorsement.note ? (
                <p className="mt-1 text-xs text-muted-foreground">“{endorsement.note}”</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No endorsements yet.</p>
      )}
    </section>
  );
}

function VerificationSection({ profile }: { profile: PublicProfile & { displayName: string } }) {
  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Verification status</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.verifiedAt
            ? `Verified on ${new Date(profile.verifiedAt).toLocaleString()}`
            : 'This account is not formally verified.'}
        </p>
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Documentation</h4>
        <p className="text-sm text-foreground">
          {profile.verifiedDocs
            ? `${profile.verifiedDocs} supporting document(s) uploaded.`
            : 'No supporting documents.'}
        </p>
      </div>
      {profile.isHistorical ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This is a historical account curated from {profile.legacySource ?? 'legacy archives'}.{' '}
          {profile.legacyWorksCount} referenced works imported.
        </div>
      ) : null}
    </section>
  );
}
