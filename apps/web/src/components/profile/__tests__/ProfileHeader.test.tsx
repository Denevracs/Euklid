import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileHeader } from '../ProfileHeader';

vi.mock('@/components/follow/FollowButton', () => ({
  FollowButton: () => <button type="button">Follow</button>,
}));

vi.mock('@/components/tier-badge', () => ({
  TierBadge: ({ tier }: { tier: string }) => <span>{tier}</span>,
}));

describe('ProfileHeader', () => {
  it('renders historical and verified badges with stats', () => {
    render(
      <ProfileHeader
        profile={{
          id: 'user-1',
          name: 'Isaac Newton',
          handle: 'newton.euklid',
          displayHandle: 'isaac-newton',
          displayName: 'Isaac Newton',
          bio: 'Physicist',
          website: null,
          location: null,
          expertise: ['calculus'],
          followerCount: 42,
          followingCount: 5,
          postCount: 3,
          discussionCount: 7,
          tier: 'TIER1',
          role: 'MEMBER',
          isHistorical: true,
          legacySource: 'Royal Society',
          legacyWorksCount: 70,
          verifiedAt: new Date().toISOString(),
          verifiedDocs: 2,
          verifiedDomains: ['royalsociety.org'],
          verifiedBy: null,
          createdAt: new Date('2020-01-01').toISOString(),
          lastLoginAt: null,
        }}
        isSelf={false}
        initialFollowing={false}
        viewerId="viewer-1"
      />
    );

    expect(screen.getByText('Isaac Newton')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('TIER1')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument();
  });
});
