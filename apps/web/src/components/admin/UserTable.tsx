'use client';

import { Button } from '@/components/ui/button';
import type { AdminUserSummary } from '@/lib/types';

type UserTableProps = {
  users: AdminUserSummary[];
  onEdit?: (user: AdminUserSummary) => void;
};

export function UserTable({ users, onEdit }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        No users found. Adjust your filters or try a different search.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Handle</th>
            <th className="px-4 py-3 text-left">Tier</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Verified</th>
            <th className="px-4 py-3 text-left">Banned</th>
            <th className="px-4 py-3 text-left">Posts</th>
            <th className="px-4 py-3 text-left">Followers</th>
            <th className="px-4 py-3 text-left">Historical</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-muted/20">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{user.name ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">{user.email ?? 'No email'}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span>@{user.handle ?? user.displayHandle ?? user.id.slice(0, 6)}</span>
                  {user.displayHandle && user.displayHandle !== user.handle ? (
                    <span className="text-xs text-muted-foreground">
                      display: @{user.displayHandle}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {user.tier}
                </span>
              </td>
              <td className="px-4 py-3 capitalize">{user.role.toLowerCase()}</td>
              <td className="px-4 py-3">
                {user.verifiedAt ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Yes
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    No
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {user.isBanned ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    Banned
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Active
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{user.postCount}</td>
              <td className="px-4 py-3">{user.followerCount}</td>
              <td className="px-4 py-3">
                {user.isHistorical ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Legacy
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="outline" size="sm" onClick={() => onEdit?.(user)}>
                  View / Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
