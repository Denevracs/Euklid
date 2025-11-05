import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowButton } from '../FollowButton';

const sessionState: { value: { user: unknown } | null } = {
  value: { user: { id: 'viewer-1' } },
};

const invalidateQueriesMock = vi.fn();
type MockMutationOptions = { onSuccess?: () => void };

const useMutationMock = vi.fn((options: MockMutationOptions) => ({
  isPending: false,
  mutate: () => {
    options.onSuccess?.();
  },
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: sessionState.value }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: MockMutationOptions) => useMutationMock(options),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

describe('FollowButton', () => {
  beforeEach(() => {
    sessionState.value = { user: { id: 'viewer-1' } };
    invalidateQueriesMock.mockClear();
    useMutationMock.mockClear();
  });

  it('toggles label optimistically when clicked', async () => {
    const user = userEvent.setup();

    render(
      <FollowButton targetId="target-1" kind="user" initialFollowing={false} ownerId="viewer-1" />
    );

    const button = screen.getByRole('button', { name: /follow/i });
    expect(button).toBeInTheDocument();

    await act(async () => {
      await user.click(button);
    });
    expect(button).toHaveTextContent(/following/i);
    expect(invalidateQueriesMock).toHaveBeenCalled();

    await act(async () => {
      await user.click(button);
    });
    expect(button).toHaveTextContent(/^follow$/i);
  });
});
