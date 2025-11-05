'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/lib/types';

type AuditLogTableProps = {
  logs: AuditLogEntry[];
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Target</th>
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-right">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{log.action}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {log.actor
                    ? `${log.actor.name ?? log.actor.handle ?? log.actor.id.slice(0, 6)} (${log.actor.role})`
                    : 'System'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {log.targetType} · {log.targetId}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelected(log)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Log metadata</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-background p-3 text-xs text-muted-foreground">
            {JSON.stringify(selected.meta ?? {}, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
