# Euclid Network Monorepo

A production-ready monorepo for **Euclid Network**, a knowledge-graph powered social network that captures mathematical proofs, evidence, and activity. The stack combines a Next.js 15 web experience, optional Fastify API, Prisma/PostgreSQL data layer, and shared packages for UI, linting, and validation.

## Workspace Layout

```
.
├── apps/
│   ├── api/        # Fastify API (optional deployment target)
│   └── web/        # Next.js App Router frontend with API routes
├── packages/
│   ├── eslint/     # Shared ESLint flat config
│   ├── tsconfig/   # Shared TypeScript configs
│   ├── ui/         # shadcn-inspired component library
│   └── validation/ # Zod schemas shared across web + api
├── prisma/         # Prisma schema, migrations, and seed script
└── turbo.json      # Task orchestration via Turborepo
```

### ASCII Architecture

```
+----------------------+       +-----------------------+
|  Next.js (App Router)| <---> |  Next API routes      |
|  Tailwind + shadcn   |       |  NextAuth, Prisma     |
+----------+-----------+       +-----------+-----------+
           |                               |
           | (optional)                    |
           v                               v
+----------------------+       +-----------------------+
|  Fastify API         | <---> |  Prisma Client        |
|  Swagger / OpenAPI   |       |  PostgreSQL / Neo4j   |
+----------+-----------+       +-----------+-----------+
           \_____________________  __________________/
                                 \/
                         Shared packages (UI, ESLint, Validation)
```

## Tech Highlights

- **Monorepo**: pnpm workspaces + Turborepo for task orchestration.
- **Frontend**: Next.js 15 App Router, Tailwind CSS, shadcn/ui-inspired design system via `@euclid/ui`.
- **Auth**: NextAuth (Email provider) with Prisma adapter; ready to swap to Auth0.
- **Data**: PostgreSQL with Prisma ORM; optional Neo4j driver wrapper enabled through environment flags.
- **API**: Fastify + Zod schemas + Swagger UI (`/docs`) mirroring the Next.js API surface.
- **Validation**: Centralized Zod schemas in `@euclid/validation` to keep API + web in sync.
- **Testing**: Vitest + Testing Library (unit) and Playwright (e2e) for the web app; Vitest for the API.
- **Tooling**: ESLint (flat config), Prettier, Husky + lint-staged, GitHub Actions CI, release-please.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8 (Corepack recommended)
- PostgreSQL 15+ (or run via Docker Compose)

### Installation

```bash
pnpm install
cp .env.example .env
# update secrets as needed (NEXTAUTH_SECRET, EMAIL settings, etc.)
```

Run the database migrations and seed content:

```bash
pnpm db:migrate
pnpm db:seed
```

### Development Workflow

- `pnpm dev` – run web and api concurrently via Turborepo
- `pnpm build` – build all packages/apps
- `pnpm test` – run unit tests (Vitest)
- `pnpm --filter @euclid/web test:e2e` – run Playwright suite (requires browsers installed)
- `pnpm lint` – ESLint across the workspace
- `pnpm format` – Prettier formatting

### Database Utilities

- `pnpm db:migrate` – deploy migrations (`prisma migrate deploy`)
- `pnpm db:generate` – regenerate Prisma client
- `pnpm db:seed` – seed demo Euclid subgraph (definitions → axioms → theorems + probabilistic example)

### Docker Compose

```bash
docker-compose up -d
```

The compose file provisions PostgreSQL and Neo4j. Optional `web`/`api` services are stubbed for reference. Update `.env` with matching credentials if you enable Neo4j.

### API Documentation

- Next.js API routes: `/api/*`
- Fastify API (optional): starts on `PORT` (default 4000). Swagger UI available at `http://localhost:4000/docs`.

### Authentication

- Email magic-link provider via NextAuth. Replace `EMAIL_SERVER` and `EMAIL_FROM` with a working SMTP server.
- Swap providers later by editing `apps/web/src/lib/auth.ts`.

### Optional Neo4j

Set `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` to enable the driver in both apps. Helper utilities live in `apps/web/src/lib/neo4j.ts` and `apps/api/src/lib/neo4j.ts`.

## Testing

- Unit tests (Vitest) located under `apps/web/src/lib/__tests__` and `apps/api/src/lib/__tests__`.
- Playwright configuration auto-starts the Next.js dev server. Install browsers with `pnpm --filter @euclid/web exec playwright install --with-deps`.

## Continuous Integration

GitHub Actions workflow (`.github/workflows/ci.yml`) runs linting, type-checking, tests, Playwright e2e, Prisma generate, and build steps on pushes and pull requests.

## Deployment (Heroku prep)

1. Build a Next.js standalone bundle via the `heroku-postbuild` script.
2. Provision Postgres (`heroku addons:create heroku-postgresql:mini`).
3. Configure environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, etc.).
4. Run `pnpm db:migrate` during the release phase.
5. Use the provided Procfile entries:
   - `web: pnpm --filter @euclid/web start`
   - `api: pnpm --filter @euclid/api start`

More detailed Heroku steps are documented below.

### Heroku Deployment Steps

1. `heroku create euclid-network-web`
2. `heroku addons:create heroku-postgresql:mini`
3. `heroku config:set NEXTAUTH_SECRET=... NEXTAUTH_URL=https://<app>.herokuapp.com ...`
4. `git push heroku main`
5. `heroku run pnpm db:migrate`

(If deploying the Fastify API separately, create a second Heroku app and point `Procfile` accordingly.)

## Contributing

- Follow the Code of Conduct (`CODE_OF_CONDUCT.md`).
- Open issues or RFCs before major changes.
- Run `pnpm lint`, `pnpm test`, and `pnpm --filter @euclid/web test:e2e` before submitting PRs.

## License

MIT © Euclid Network contributors
