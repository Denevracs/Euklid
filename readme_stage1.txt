# Phase 4 – Stage 1: Authentication Foundation

This stage introduces real authentication plumbing for Euclid Network.

## 1. Environment setup

1. Copy the example environment files and adjust secrets for your machine:
   ```bash
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   ```
2. Ensure PostgreSQL is running and that `DATABASE_URL` values point to a reachable database.
3. For local testing you can leave Google/GitHub credentials empty and rely on email magic links or the credentials passcode provider.

## 2. Prisma migration

Run the new migration to align the schema with the authentication features:

```bash
pnpm -w prisma migrate dev --name auth-foundation
```

Optionally reseed demo data:

```bash
pnpm db:seed
```

## 3. Start the stack

Use Turbo to boot both the Next.js app and Fastify API:

```bash
TURBO_DISABLE_REMOTE_CACHE=1 pnpm dev
```

Defaults assume the web app runs on `http://localhost:3000` and the API on `http://localhost:4000`.

## 4. Testing the flow

1. Visit `http://localhost:3000` and sign in with either the credentials provider (using the `CREDENTIALS_SECRET` passcode) or email magic link (SMTP settings required).
2. After signing in, the header shows your name along with tier and role badges.
3. Trigger an API JWT exchange by calling:
   ```bash
   curl -X POST http://localhost:3000/api/session-to-api-jwt --cookie "next-auth.session-token=..."
   ```
   Alternatively, call the Fastify endpoint directly:
   ```bash
   curl -X POST http://localhost:4000/auth/session \
     -H "x-internal-secret: $API_INTERNAL_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"userId": "<your-user-id>"}'
   ```
4. Probe the issued token:
   ```bash
   curl http://localhost:4000/auth/me \
     -H "Authorization: Bearer <token>"
   ```

You should receive the normalized session payload including tier, role, verification counters, and historical flag.

## 5. What changed in Stage 1

- Prisma `User` model updated with role/tier defaults, verification counters, and ban metadata.
- NextAuth configured with credentials, email magic link, Google, and GitHub providers (enabled when credentials provided).
- Session callbacks hydrate the shared session shape: `{ id, email, name, handle, tier, role, isHistorical, verifiedDomains, verifiedDocs }`.
- Fastify now issues short-lived API JWTs at `/auth/session` and validates them via `/auth/me`.
- New header UI surfaces role/tier badges plus sign-in/out actions.
- Helper utilities (`auth-guard`, `user-badge`, `/api/session-to-api-jwt`) make it easy to bridge web sessions to API tokens.

With this foundation in place we can proceed to Stage 2 (tier inference and verification workflows).
