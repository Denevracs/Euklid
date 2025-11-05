'use client';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ReplyDTO, Tier } from '@/lib/types';
import { TierChip } from '@/components/common/TierChip';
import { FlagButton } from '@/components/moderation/FlagButton';

interface ReplyItemProps {
  reply: ReplyDTO;
  canModerate: boolean;
  onDelete?: (id: string) => void;
}

dayjs.extend(relativeTime);

export function ReplyItem({ reply, canModerate, onDelete }: ReplyItemProps) {
  const author = reply.author;
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {author?.display?.[0]?.toUpperCase() ?? author?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {author?.display ?? author?.name ?? 'Unknown contributor'}
              {author?.tier ? <TierChip tier={author.tier as Tier} /> : null}
            </div>
            <div className="text-xs text-muted-foreground">{dayjs(reply.createdAt).fromNow()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FlagButton targetType="REPLY" targetId={reply.id} className="shrink-0" />
          {canModerate ? (
            <button
              type="button"
              onClick={() => onDelete?.(reply.id)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{reply.content}</p>
    </div>
  );
}
