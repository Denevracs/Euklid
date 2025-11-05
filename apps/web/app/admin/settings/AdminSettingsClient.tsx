'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { useAdminClient } from '@/hooks/useAdminClient';
import { queryKeys } from '@/lib/queryKeys';

export function AdminSettingsClient() {
  const queryClient = useQueryClient();
  const { getSettings, saveSetting } = useAdminClient();

  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: () => getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => saveSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() });
    },
  });

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load admin settings.
      </div>
    );
  }

  return (
    <SettingsPanel
      settings={settingsQuery.data.settings}
      onSave={(key, value) => updateMutation.mutateAsync({ key, value })}
    />
  );
}
