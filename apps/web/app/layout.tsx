import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Providers } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { UserBadge } from '@/components/user-badge';

export const metadata: Metadata = {
  title: 'Euclid Network',
  description: 'A knowledge-graph powered social network for mathematical proofs.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const displayName =
    session?.user?.handle ?? session?.user?.name ?? session?.user?.email ?? 'Account';
  const profileHref = session?.user
    ? session.user.handle
      ? `/u/${session.user.handle}`
      : `/u/${session.user.id}`
    : '#';
  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground">
        <Providers session={session}>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-border bg-background">
              <nav className="container mx-auto flex items-center justify-between py-4">
                <Link href="/" className="text-xl font-semibold">
                  Euclid Network
                </Link>
                <div className="flex items-center gap-3">
                  <Link
                    href="/home"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Home
                  </Link>
                  <Link
                    href="/landing"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Overview
                  </Link>
                  <Link
                    href="/feed/global"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Global feed
                  </Link>
                  <Link
                    href="/graph"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Graph
                  </Link>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/create">Create Node</Link>
                  </Button>
                  {session?.user ? (
                    <div className="flex items-center gap-3">
                      <Link
                        href="/verify"
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Verify
                      </Link>
                      {session.user.role === 'ADMIN' || session.user.role === 'MODERATOR' ? (
                        <Link
                          href="/admin/verification"
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          Admin
                        </Link>
                      ) : null}
                      <UserBadge
                        tier={session.user.tier}
                        role={session.user.role}
                        isHistorical={session.user.isHistorical}
                      />
                      <Link
                        href={profileHref}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {displayName}
                      </Link>
                      <form action="/api/auth/signout" method="post">
                        <input type="hidden" name="callbackUrl" value="/" />
                        <Button type="submit" variant="ghost" size="sm">
                          Sign out
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/sign-in">Sign in</Link>
                    </Button>
                  )}
                </div>
              </nav>
            </header>
            <main className="container mx-auto flex-1 py-8">
              {session?.user?.isBanned ? (
                <div className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  <strong>Account suspended.</strong>{' '}
                  {session.user.bannedUntil
                    ? `Access to posting is locked until ${new Date(session.user.bannedUntil).toLocaleString()}.`
                    : 'Access to posting is locked until a moderator reviews your account.'}{' '}
                  <a href="mailto:moderation@euclid.network" className="underline">
                    Contact moderators
                  </a>{' '}
                  if you believe this is an error.
                </div>
              ) : session?.user?.warningsCount && session.user.warningsCount > 0 ? (
                <div className="mb-6 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">
                  <strong>Heads up:</strong> you have {session.user.warningsCount}{' '}
                  {session.user.warningsCount === 1 ? 'active warning' : 'active warnings'}. Please
                  review recent moderator feedback before posting again.{' '}
                  <a href="mailto:moderation@euclid.network" className="underline">
                    Request clarification
                  </a>
                  .
                </div>
              ) : null}
              {children}
            </main>
            <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Euclid Network. Advancing collaborative proof discovery.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
