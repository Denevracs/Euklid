'use client';

import Link from 'next/link';
import { ArrowUpRight, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { TierBadge } from '@/components/tier-badge';
import type { FeedResponseItem } from '@/lib/types';
import { FlagButton } from '@/components/moderation/FlagButton';

function relativeTime(input: string) {
  const date = new Date(input);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function authorHref(author: { id: string; handle: string | null }): string {
  return author.handle ? `/u/${author.handle}` : `/u/${author.id}`;
}

type FeedCardProps = {
  item: FeedResponseItem;
};

export function FeedCard({ item }: FeedCardProps) {
  if (item.kind === 'NODE') {
    return <NodeCard item={item} />;
  }
  if (item.kind === 'DISCUSSION') {
    return <DiscussionCard item={item} />;
  }
  return <EvidenceCard item={item} />;
}

function NodeCard({ item }: { item: Extract<FeedResponseItem, { kind: 'NODE' }> }) {
  const author = item.author;
  const discipline = item.node.discipline;
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <header className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link href={authorHref(author)} className="font-medium text-foreground hover:underline">
          {author.name ?? author.handle ?? 'Researcher'}
        </Link>
        <TierBadge tier={author.tier} />
        <span aria-hidden className="text-muted-foreground">
          •
        </span>
        <span>{relativeTime(item.createdAt)}</span>
        <div className="ml-auto flex items-center gap-2">
          {discipline ? (
            <Link
              href={`/d/${discipline.id}`}
              className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {discipline.title}
            </Link>
          ) : null}
          <FlagButton targetType="NODE" targetId={item.node.id} />
        </div>
      </header>
      <div className="space-y-2">
        <Link
          href={`/nodes/${item.node.id}`}
          className="text-lg font-semibold text-foreground hover:underline"
        >
          {item.node.title}
        </Link>
        {item.node.statement ? (
          <p className="text-sm text-muted-foreground line-clamp-3">{item.node.statement}</p>
        ) : null}
      </div>
      <footer className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>{item.discussionCount} discussions</span>
        <span>{item.edgesSummary.outgoing} dependencies</span>
        <span>{item.edgesSummary.incoming} references</span>
        <span className="ml-auto flex items-center gap-1 text-primary">
          <Sparkles size={14} /> {item.score.toFixed(2)}
        </span>
      </footer>
    </article>
  );
}

function DiscussionCard({ item }: { item: Extract<FeedResponseItem, { kind: 'DISCUSSION' }> }) {
  const discussion = item.discussion;
  const author = discussion.author;
  const latest = item.latestReply;
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <header className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link href={authorHref(author)} className="font-medium text-foreground hover:underline">
          {author.name ?? author.handle ?? 'Participant'}
        </Link>
        <TierBadge tier={author.tier} />
        <span aria-hidden className="text-muted-foreground">
          •
        </span>
        <span>{relativeTime(item.createdAt)}</span>
        <div className="ml-auto flex items-center gap-2">
          {discussion.node ? (
            <Link
              href={`/nodes/${discussion.node.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View node <ArrowUpRight size={14} />
            </Link>
          ) : null}
          <FlagButton targetType="DISCUSSION" targetId={discussion.id} />
        </div>
      </header>
      <div className="space-y-2">
        <p className="text-sm text-foreground line-clamp-4">{discussion.content}</p>
        {latest ? (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              Latest reply •
              <Link href={authorHref(latest.author)} className="hover:underline">
                {latest.author.name ?? latest.author.handle ?? 'Participant'}
              </Link>
              <TierBadge tier={latest.author.tier} />
              <span className="text-muted-foreground">{relativeTime(latest.createdAt)}</span>
            </div>
            <p className="mt-1 line-clamp-3">{latest.content}</p>
          </div>
        ) : null}
      </div>
      <footer className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageCircle size={14} /> {item.repliesCount}
        </span>
        <span className="ml-auto flex items-center gap-1 text-primary">
          <Sparkles size={14} /> {item.score.toFixed(2)}
        </span>
      </footer>
    </article>
  );
}

function EvidenceCard({ item }: { item: Extract<FeedResponseItem, { kind: 'EVIDENCE' }> }) {
  const evidence = item.evidence;
  const author = evidence.author;
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      <header className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link href={authorHref(author)} className="font-medium text-foreground hover:underline">
          {author.name ?? author.handle ?? 'Contributor'}
        </Link>
        <TierBadge tier={author.tier} />
        <span aria-hidden className="text-muted-foreground">
          •
        </span>
        <span>{relativeTime(item.createdAt)}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            {evidence.kind.toLowerCase()}
          </span>
          <FlagButton targetType="EVIDENCE" targetId={evidence.id} />
        </div>
      </header>
      <div className="space-y-2">
        <Link
          href={`/nodes/${evidence.node.id}`}
          className="text-sm font-semibold text-foreground hover:underline"
        >
          {evidence.node.title}
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-4">{evidence.summary}</p>
      </div>
      <footer className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Share2 size={14} /> Evidence added
        </span>
        <span className="ml-auto flex items-center gap-1 text-primary">
          <Sparkles size={14} /> {item.score.toFixed(2)}
        </span>
      </footer>
    </article>
  );
}
