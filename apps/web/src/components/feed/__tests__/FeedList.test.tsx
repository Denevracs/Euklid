import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { FeedList } from '../FeedList';

const sessionState: { value: { data: unknown } } = {
  value: { data: null },
};

type MockFeedItem = { kind: string; id: string; activityId: string };
type MockPage = { items: MockFeedItem[]; nextCursor: string | null };
type MockQueryState = {
  isLoading: boolean;
  data: { pages: MockPage[] } | undefined;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
};

const infiniteState: { personal: MockQueryState; global: MockQueryState } = {
  personal: {
    isLoading: false,
    data: undefined,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  },
  global: {
    isLoading: false,
    data: undefined,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  },
};

const useSessionMock = vi.fn(() => sessionState.value);

type InfiniteQueryParams = { queryKey: string[]; [key: string]: unknown };

const useInfiniteQueryMock = vi.fn(({ queryKey }: InfiniteQueryParams) => {
  if (queryKey.includes('personal')) {
    return infiniteState.personal;
  }
  return infiniteState.global;
});

vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
}));

vi.mock('../FeedCard', () => ({
  FeedCard: ({ item }: { item: { id: string; kind: string } }) => (
    <div data-testid="feed-card">
      {item.kind}:{item.id}
    </div>
  ),
}));

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (args: InfiniteQueryParams) => useInfiniteQueryMock(args),
}));

describe('FeedList', () => {
  beforeEach(() => {
    sessionState.value = { data: null };
    infiniteState.personal = {
      isLoading: false,
      data: undefined,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    };
    infiniteState.global = {
      isLoading: false,
      data: undefined,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    };
    useInfiniteQueryMock.mockClear();
  });

  it('renders empty state when the viewer is not signed in', () => {
    sessionState.value = { data: null };

    render(<FeedList />);

    expect(screen.getByText(/Your feed is quiet/i)).toBeInTheDocument();
  });

  it('renders personalized feed items for authenticated viewers', () => {
    sessionState.value = { data: { user: { id: 'user-1' } } };
    infiniteState.personal = {
      isLoading: false,
      data: {
        pages: [
          {
            items: [
              {
                kind: 'NODE',
                id: 'node-1',
                activityId: 'activity-1',
              },
            ],
            nextCursor: null,
          },
        ],
      },
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    };

    render(<FeedList />);

    expect(screen.getByTestId('feed-card')).toHaveTextContent('NODE:node-1');
  });

  it('switches to the global feed tab', () => {
    sessionState.value = { data: { user: { id: 'user-1' } } };
    infiniteState.personal = {
      isLoading: false,
      data: {
        pages: [{ items: [], nextCursor: null }],
      },
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    };
    infiniteState.global = {
      isLoading: false,
      data: {
        pages: [
          {
            items: [
              {
                kind: 'DISCUSSION',
                id: 'discussion-1',
                activityId: 'activity-2',
              },
            ],
            nextCursor: null,
          },
        ],
      },
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    };

    render(<FeedList />);

    fireEvent.click(screen.getByRole('button', { name: /Global/i }));

    expect(screen.getByTestId('feed-card')).toHaveTextContent('DISCUSSION:discussion-1');
  });
});
