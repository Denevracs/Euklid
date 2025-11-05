'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/moderation/queue', label: 'Flag queue' },
  { href: '/moderation/stats', label: 'Stats' },
];

export function ModerationNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
