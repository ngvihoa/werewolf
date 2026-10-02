# Werewolf Moderator Assistant

Mobile-first assistant for an in-person Werewolf game. The system coordinates the game flow while the Moderator remains in control of confirmations and exceptions.

## Stack

- TanStack Start, Router and Query
- React, TypeScript and Tailwind CSS
- oRPC and Zod
- Supabase PostgreSQL and Realtime
- Drizzle ORM
- Vitest and Playwright

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Fill `.env` with a Supabase pooled PostgreSQL connection string, project URL and anon key.

The playable MVP persists game state in PostgreSQL through Drizzle (`src/game/store/postgres-game-store.ts`). Supabase Realtime carries only lightweight `{ gameId, version }` invalidation signals — never game state. Unit tests run without a database; the Postgres integration suite needs a real `DATABASE_URL` (`pnpm test:integration`).

## Commands

```bash
pnpm dev
pnpm build
pnpm check
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Documentation

All project documents live in [`docs/`](./docs):

- Product rules: [`docs/rules/README.md`](./docs/rules/README.md)
- UI/UX design log (source of truth for the interface): [`docs/revamp-ui-ux.md`](./docs/revamp-ui-ux.md)
- Technical assessment: [`docs/TECHNICAL_ASSESSMENT.md`](./docs/TECHNICAL_ASSESSMENT.md)
- Delivery roadmap: [`docs/ROADMAP.md`](./docs/ROADMAP.md)

Agent instructions: [`AGENTS.md`](./AGENTS.md)
