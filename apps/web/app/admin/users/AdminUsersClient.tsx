'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserTable } from '@/components/admin/UserTable';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { useAdminClient } from '@/hooks/useAdminClient';
import { queryKeys } from '@/lib/queryKeys';

const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
  { value: 'historical', label: 'Historical' },
];

const TIERS = ['all', 'TIER1', 'TIER2', 'TIER3', 'TIER4'];

export function AdminUsersClient() {
  const queryClient = useQueryClient();
  const { listUsers, getUser, updateUser, impersonate } = useAdminClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tier, status]);

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users({
      query: debouncedSearch,
      tier: tier !== 'all' ? tier : undefined,
      status: status !== 'all' ? status : undefined,
      page,
      sort: 'recent',
      order: 'desc',
    }),
    queryFn: () =>
      listUsers({
        query: debouncedSearch || undefined,
        tier: tier !== 'all' ? tier : undefined,
        status: status !== 'all' ? status : undefined,
        page,
      }),
    keepPreviousData: true,
  });

  const selectedUserQuery = useQuery({
    queryKey: selectedUserId ? queryKeys.admin.user(selectedUserId) : ['admin', 'user', 'disabled'],
    queryFn: () => getUser(selectedUserId!),
    enabled: Boolean(selectedUserId),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateUser>[1]) => updateUser(selectedUserId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.users({
          query: debouncedSearch,
          tier: tier !== 'all' ? tier : undefined,
          status: status !== 'all' ? status : undefined,
          page,
          sort: 'recent',
          order: 'desc',
        }),
      });
      if (selectedUserId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(selectedUserId) });
      }
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => impersonate(userId),
  });

  const handleEdit = (userId: string) => {
    setSelectedUserId(userId);
  };

  const users = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data]);

  const totalPages = usersQuery.data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="w-full border-none bg-transparent p-0 text-sm outline-none focus-visible:ring-0"
              placeholder="Search by name, email, handle…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="rounded-full border border-border bg-background px-3 py-2 text-sm"
              value={tier}
              onChange={(event) => setTier(event.target.value)}
            >
              {TIERS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All tiers' : option}
                </option>
              ))}
            </select>
            <select
              className="rounded-full border border-border bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {usersQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : usersQuery.isError ? (
        <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          Unable to load users. Please try again.
        </div>
      ) : (
        <UserTable users={users} onEdit={(user) => handleEdit(user.id)} />
      )}

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || usersQuery.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <EditUserModal
        open={Boolean(selectedUserId && selectedUserQuery.data)}
        detail={selectedUserQuery.data ?? null}
        onClose={() => setSelectedUserId(null)}
        onSave={(payload) => updateMutation.mutateAsync(payload)}
        onImpersonate={(userId) => impersonateMutation.mutateAsync(userId)}
        saving={updateMutation.isPending}
        impersonating={impersonateMutation.isPending}
      />
    </div>
  );
}
