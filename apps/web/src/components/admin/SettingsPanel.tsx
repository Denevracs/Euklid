'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AdminSettingsResponse } from '@/lib/types';

type SettingsPanelProps = {
  settings: AdminSettingsResponse['settings'];
  onSave: (key: string, value: unknown) => Promise<void>;
};

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const setting of settings) {
      map[setting.key] = JSON.stringify(setting.value, null, 2);
    }
    return map;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSave = async (key: string) => {
    setErrorKey(null);
    setSavingKey(key);
    try {
      const raw = drafts[key];
      const parsed = raw ? JSON.parse(raw) : null;
      await onSave(key, parsed);
    } catch (error) {
      setErrorKey(key);
      console.error(error);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {settings.map((setting) => (
        <div key={setting.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{setting.key}</h3>
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(setting.updatedAt).toLocaleString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={savingKey === setting.key}
              onClick={() => handleSave(setting.key)}
            >
              {savingKey === setting.key ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <textarea
            className="mt-3 w-full rounded-md border border-border bg-background p-3 text-xs font-mono text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={8}
            value={drafts[setting.key] ?? ''}
            onChange={(event) =>
              setDrafts((prev) => ({
                ...prev,
                [setting.key]: event.target.value,
              }))
            }
          />
          {errorKey === setting.key ? (
            <p className="mt-2 text-xs text-destructive">
              Invalid JSON payload. Please ensure the value is valid JSON.
            </p>
          ) : null}
        </div>
      ))}
      {settings.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          No configurable settings found.
        </div>
      ) : null}
    </div>
  );
}
