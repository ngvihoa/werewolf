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

The playable MVP is developed and tested with local fake data first. Its domain rules do not connect to Supabase; the existing database integration is reserved for a later persistence phase.

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

- Product rules: [`rules/README.md`](./rules/README.md)
- Technical assessment: [`TECHNICAL_ASSESSMENT.md`](./TECHNICAL_ASSESSMENT.md)
- Delivery roadmap: [`ROADMAP.md`](./ROADMAP.md)
