import NextAuth, { getServerSession } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import type { Prisma } from '@prisma/client';
import { Tier, UserRole } from '@prisma/client';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

type SessionSeed = {
  id: string;
  email?: string | null;
  name?: string | null;
};

const providers: NextAuthOptions['providers'] = [];

if (env.CREDENTIALS_SECRET) {
  providers.push(
    CredentialsProvider({
      name: 'Passcode',
      credentials: {
        email: { label: 'Email', type: 'email' },
        passcode: { label: 'Passcode', type: 'password' },
        name: { label: 'Name', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.passcode) {
          return null;
        }

        if (credentials.passcode !== env.CREDENTIALS_SECRET) {
          return null;
        }

        const email = credentials.email.toLowerCase();
        const name = credentials.name?.trim() || email.split('@')[0];

        const user = await prisma.user.upsert({
          where: { email },
          update: {
            name,
          },
          create: {
            email,
            name,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? name,
        };
      },
    })
  );
}

providers.push(
  EmailProvider({
    server: env.EMAIL_SERVER,
    from: env.EMAIL_FROM,
  })
);

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (env.GITHUB_ID && env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    })
  );
}

async function ensureUserProfile(seed: SessionSeed) {
  const existing = await prisma.user.findUnique({
    where: { id: seed.id },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      tier: true,
      role: true,
      verifiedDomains: true,
      verifiedDocs: true,
      warningsCount: true,
      isBanned: true,
      bannedUntil: true,
    },
  });

  if (!existing) {
    return null;
  }

  const updates: Prisma.UserUpdateInput = {};

  if (!existing.name && seed.name) {
    updates.name = seed.name;
  }

  if (!existing.handle) {
    const handle = await generateHandle(seed.email ?? existing.email ?? null);
    updates.handle = handle;
    updates.display = existing.name ?? seed.name ?? handle;
  }

  if (!existing.verifiedDomains) {
    updates.verifiedDomains = [];
  }

  if (existing.verifiedDocs === null || existing.verifiedDocs === undefined) {
    updates.verifiedDocs = 0;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: existing.id },
      data: updates,
    });
  }

  return prisma.user.findUnique({
    where: { id: existing.id },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      tier: true,
      role: true,
      isHistorical: true,
      verifiedDomains: true,
      verifiedDocs: true,
      bannedUntil: true,
      isBanned: true,
      warningsCount: true,
    },
  });
}

async function generateHandle(source: string | null): Promise<string> {
  const base =
    (source ?? 'member')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'member';

  let attempt = 0;
  while (attempt < 1000) {
    const handle = attempt === 0 ? base : `${base}-${attempt}`;
    const existing = await prisma.user.findUnique({ where: { handle } });
    if (!existing) {
      return handle;
    }
    attempt += 1;
  }

  return `${base}-${Date.now()}`;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers,
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user?.id) {
        return false;
      }
      const profile = await ensureUserProfile({ id: user.id, email: user.email, name: user.name });
      if (!profile) {
        return false;
      }
      if (profile.bannedUntil && profile.bannedUntil > new Date()) {
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      const userId = (token.id as string | undefined) ?? (token.sub as string | undefined);
      if (!userId) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          handle: true,
          tier: true,
          role: true,
          isHistorical: true,
          verifiedDomains: true,
          verifiedDocs: true,
          bannedUntil: true,
          isBanned: true,
          warningsCount: true,
        },
      });

      if (!dbUser) {
        return token;
      }

      token.id = dbUser.id;
      token.email = dbUser.email;
      token.name = dbUser.name;
      token.handle = dbUser.handle;
      token.tier = dbUser.tier;
      token.role = dbUser.role;
      token.isHistorical = dbUser.isHistorical;
      token.verifiedDomains = dbUser.verifiedDomains ?? [];
      token.verifiedDocs = dbUser.verifiedDocs ?? 0;
      token.bannedUntil = dbUser.bannedUntil?.toISOString() ?? null;
      token.isBanned = dbUser.isBanned ?? false;
      token.warningsCount = dbUser.warningsCount ?? 0;

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = {} as typeof session.user;
      }

      session.user.id = (token.id as string) ?? (token.sub as string) ?? '';
      session.user.email = (token.email as string | undefined) ?? session.user.email ?? null;
      session.user.name = (token.name as string | undefined) ?? session.user.name ?? null;
      session.user.handle = (token.handle as string | undefined) ?? null;
      session.user.tier = (token.tier as Tier | undefined) ?? Tier.TIER4;
      session.user.role = (token.role as UserRole | undefined) ?? UserRole.MEMBER;
      session.user.isHistorical = Boolean(token.isHistorical);
      session.user.verifiedDomains = Array.isArray(token.verifiedDomains)
        ? (token.verifiedDomains as string[])
        : [];
      session.user.verifiedDocs =
        typeof token.verifiedDocs === 'number'
          ? token.verifiedDocs
          : Number(token.verifiedDocs ?? 0);
      session.user.bannedUntil = (token.bannedUntil as string | undefined) ?? null;
      session.user.isBanned = Boolean(
        token.isBanned ??
          (token.bannedUntil ? new Date(token.bannedUntil as string) > new Date() : false)
      );
      session.user.warningsCount =
        typeof token.warningsCount === 'number'
          ? token.warningsCount
          : Number(token.warningsCount ?? 0);

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await ensureUserProfile({ id: user.id, email: user.email, name: user.name });
      }
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        path: '/',
      },
    },
  },
  trustHost: true,
  logger: {
    warn(message) {
      console.warn('[auth]', message);
    },
    error(error) {
      console.error('[auth]', error);
    },
  },
  secret: env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export const auth = () => getServerSession(authOptions);

export const GET = handler;
export const POST = handler;
