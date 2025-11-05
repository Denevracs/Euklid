'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FlagButton } from '@/components/moderation/FlagButton';

const sessionMock: { data: unknown } = { data: null };
const moderationMock = {
  submitFlag: vi.fn(),
  decideOnFlag: vi.fn(),
  unbanUser: vi.fn(),
};

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock,
}));

vi.mock('@/hooks/useModerationClient', () => ({
  useModerationClient: () => moderationMock,
}));

describe('FlagButton', () => {
  beforeEach(() => {
    sessionMock.data = null;
    moderationMock.submitFlag.mockReset();
  });

  it('prompts to sign in when unauthenticated', async () => {
    render(<FlagButton targetType="NODE" targetId="node-1" />);

    const trigger = screen.getByRole('button', { name: /flag content/i });
    fireEvent.click(trigger);

    expect(await screen.findByText(/you must be signed in to report content/i)).toBeInTheDocument();
  });

  it('submits a flag with typed reason', async () => {
    sessionMock.data = { user: { id: 'user-1' } };
    render(<FlagButton targetType="NODE" targetId="node-1" />);

    fireEvent.click(screen.getByRole('button', { name: /flag content/i }));

    const textarea = await screen.findByPlaceholderText(/provide a short summary/i);
    fireEvent.change(textarea, { target: { value: 'Inaccurate statement' } });

    fireEvent.click(screen.getByRole('button', { name: /submit flag/i }));

    await waitFor(() => {
      expect(moderationMock.submitFlag).toHaveBeenCalledWith({
        targetType: 'NODE',
        targetId: 'node-1',
        reason: 'Inaccurate statement',
      });
    });

    expect(screen.getByText(/report submitted/i)).toBeInTheDocument();
  });
});
