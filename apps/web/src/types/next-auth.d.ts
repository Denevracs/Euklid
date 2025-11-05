import type { DefaultSession } from 'next-auth';
import type { Tier, UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      email: string | null;
      name: string | null;
      handle: string | null;
      tier: Tier;
      role: UserRole;
      isHistorical: boolean;
      verifiedDomains: string[];
      verifiedDocs: number;
      bannedUntil: string | null;
      warningsCount: number;
      isBanned: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    email?: string | null;
    name?: string | null;
    handle?: string | null;
    tier?: Tier;
    role?: UserRole;
    isHistorical?: boolean;
    verifiedDomains?: string[];
    verifiedDocs?: number;
    bannedUntil?: string | null;
    warningsCount?: number;
    isBanned?: boolean;
  }
}
