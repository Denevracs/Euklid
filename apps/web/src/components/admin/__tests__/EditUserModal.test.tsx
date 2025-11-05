import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditUserModal } from '../EditUserModal';

const detail = {
  user: {
    id: 'user-99',
    name: 'Bob Archimedes',
    email: 'bob@euclid.network',
    handle: 'bob.euklid',
    displayHandle: 'bob-a',
    tier: 'TIER2',
    role: 'MODERATOR',
    isHistorical: false,
    isBanned: false,
    verifiedAt: null,
    verifiedById: null,
    legacySource: null,
    legacyWorksCount: 0,
    followerCount: 10,
    followingCount: 5,
    postCount: 2,
    discussionCount: 4,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bio: 'Geometry moderator',
    website: null,
    location: 'Boston, USA',
    expertise: ['geometry'],
    verifiedBy: null,
  },
  moderationEvents: [
    {
      id: 'event-1',
      actorId: 'admin-1',
      targetUserId: 'user-99',
      targetType: 'USER',
      targetId: 'user-99',
      action: 'WARN',
      reason: 'Reminder to cite sources',
      note: 'Initial warning',
      weight: 1,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    },
  ],
  verificationSubmissions: [],
  recentNodes: [],
  recentDiscussions: [],
  endorsements: [],
} as const;

describe('EditUserModal', () => {
  it('pre-populates form fields and saves changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onImpersonate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    await act(async () => {
      render(
        <EditUserModal
          open
          detail={detail}
          onClose={() => undefined}
          onSave={onSave}
          onImpersonate={onImpersonate}
        />
      );
    });

    const displayHandleInput = screen.getByLabelText(/display handle/i) as HTMLInputElement;
    expect(displayHandleInput.value).toBe('bob-a');

    await user.clear(displayHandleInput);
    await user.type(displayHandleInput, 'moderator-bob');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save changes/i }));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          displayHandle: 'moderator-bob',
          tier: 'TIER2',
          role: 'MODERATOR',
        })
      );
    });
  });

  it('triggers impersonation handler and displays confirmation', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onImpersonate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    await act(async () => {
      render(
        <EditUserModal
          open
          detail={detail}
          onClose={() => undefined}
          onSave={onSave}
          onImpersonate={onImpersonate}
        />
      );
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /impersonate/i }));
    });

    await waitFor(() => {
      expect(onImpersonate).toHaveBeenCalledWith('user-99');
    });
    expect(await screen.findByText(/new api token issued/i)).toBeInTheDocument();
  });
});
