# Stage 4 – Phase 2 runbook

## Database & migrations

```
pnpm -w prisma migrate dev --name tier-verification
pnpm db:seed
```

## Local development

```
pnpm install
pnpm dev
```

The dev script runs the Next.js app and Fastify API together via Turborepo. Verify the API at `http://localhost:4000/docs` and the web UI at `http://localhost:3000`.

## Verification workflow quick checks

1. Sign in and open `/verify` to request an email code, upload documentation, and review pending submissions.
2. Sign in as an admin and open `/admin/verification` to moderate incoming verification requests.
3. Use the seed data demo accounts:
   - `alice@euclid.network` (ADMIN) – already verified and seeded with institutional affiliation.
   - `dave@euclid.network` (Tier 4) – has a pending documentation submission for review.
4. After approving a submission, call `pnpm --filter @euclid/api test` to ensure tier scoring logic and API flows remain green.
