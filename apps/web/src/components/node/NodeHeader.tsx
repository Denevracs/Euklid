'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import { StatusBadge } from '@/components/common/StatusBadge';
import { BookPill } from '@/components/common/BookPill';
import { TierChip } from '@/components/common/TierChip';
import type { NodeDTO } from '@/lib/types';
import { FlagButton } from '@/components/moderation/FlagButton';

interface NodeHeaderProps {
  node: NodeDTO;
}

export function NodeHeader({ node }: NodeHeaderProps) {
  const createdBy = node.createdBy;
  const discipline = node.discipline;
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <StatusBadge status={node.status} />
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {node.type}
            </span>
            {discipline?.book?.title ? <BookPill title={discipline.book.title} /> : null}
            {discipline ? (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {discipline.title}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{node.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{node.statement}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Created {dayjs(node.createdAt).format('MMM D, YYYY')}</span>
            <FlagButton targetType="NODE" targetId={node.id} className="shrink-0" />
          </div>
          {createdBy ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {createdBy.display?.[0]?.toUpperCase() ?? createdBy.name?.[0]?.toUpperCase() ?? 'E'}
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">
                  {createdBy.display ?? createdBy.name ?? 'Contributor'}
                </div>
                <div className="flex items-center gap-2">
                  <TierChip tier={createdBy.tier} />
                  {createdBy.isHistorical ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      Historical
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {node.metadata && Object.keys(node.metadata).length ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <div className="font-semibold uppercase tracking-wide text-foreground/80">Metadata</div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">
            {JSON.stringify(node.metadata, null, 2)}
          </pre>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>Node ID: {node.id}</span>
        {discipline?.book?.title ? (
          <Link
            href={`/?book=${encodeURIComponent(discipline.book.title)}`}
            className="hover:text-foreground"
          >
            Explore {discipline.book.title}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
