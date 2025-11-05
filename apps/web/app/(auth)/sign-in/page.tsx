'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const router = useRouter();

  const [email, setEmail] = useState('demo@euclid.network');
  const [passcodeEmail, setPasscodeEmail] = useState('root@euclid.network');
  const [passcode, setPasscode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [passcodeStatus, setPasscodeStatus] = useState<string | null>(null);

  const handleSignIn = async () => {
    setStatus('Sending magic link…');
    const result = await signIn('email', { email, redirect: false, callbackUrl });
    if (result?.error) {
      setStatus('Unable to send magic link. Please verify the email address.');
      return;
    }
    setStatus('Check your inbox for the magic link.');
  };

  const handlePasscodeSignIn = async () => {
    setPasscodeStatus('Signing in…');
    const result = await signIn('credentials', {
      email: passcodeEmail,
      passcode,
      redirect: false,
      callbackUrl,
    });
    if (result?.error) {
      setPasscodeStatus('Invalid passcode. Please try again.');
      return;
    }
    setPasscodeStatus('Passcode accepted. Redirecting…');
    const destination = result?.url ?? callbackUrl;
    router.push(destination);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground">Sign in to Euclid Network</h1>
      <p className="text-sm text-muted-foreground">
        Use your verified institutional email to unlock higher tiers and moderate debates. For demo
        access, enter any email to receive a magic link.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-4">
          <h2 className="text-sm font-semibold text-foreground">Magic link</h2>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@example.edu"
            className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={handleSignIn} className="w-full">
            Send magic link
          </Button>
          {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        </div>
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-4">
          <h2 className="text-sm font-semibold text-foreground">Admin / QA passcode</h2>
          <input
            value={passcodeEmail}
            onChange={(event) => setPasscodeEmail(event.target.value)}
            type="email"
            placeholder="admin@euclid.network"
            className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            type="password"
            placeholder="Enter passcode"
            className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={handlePasscodeSignIn} className="w-full" variant="secondary">
            Sign in with passcode
          </Button>
          {passcodeStatus ? (
            <p className="text-xs text-muted-foreground">{passcodeStatus}</p>
          ) : null}
        </div>
      </div>
      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        Want to explore without email? Sign in with demo credentials provided by the onboarding
        team. Demo users start at Tier 3 and can join most discussions.
      </div>
    </div>
  );
}
