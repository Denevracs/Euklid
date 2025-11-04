import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Providers } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Euclid Network',
  description: 'A knowledge-graph powered social network for mathematical proofs.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        <Providers session={session}>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-border bg-background">
              <nav className="container mx-auto flex items-center justify-between py-4">
                <Link href="/" className="text-xl font-semibold">
                  Euclid Network
                </Link>
                <div className="flex items-center gap-3">
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
                    <form action="/api/auth/signout" method="post">
                      <input type="hidden" name="callbackUrl" value="/" />
                      <Button type="submit" variant="ghost" size="sm">
                        Sign out
                      </Button>
                    </form>
                  ) : (
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/api/auth/signin">Sign in</Link>
                    </Button>
                  )}
                </div>
              </nav>
            </header>
            <main className="container mx-auto flex-1 py-8">{children}</main>
            <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Euclid Network. Advancing collaborative proof discovery.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
