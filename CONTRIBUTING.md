# Contributing to GameHub

Thanks for your interest in GameHub! This project is open source under the MIT
license and contributions are welcome — issues, bug reports, features, fixes and
docs all count.

## Table of contents

- [Getting set up](#getting-set-up)
- [Running the app](#running-the-app)
- [Running the tests](#running-the-tests)
- [Project layout](#project-layout)
- [Code style](#code-style)
- [Making a change](#making-a-change)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Reporting bugs](#reporting-bugs)
- [Adding a feature](#adding-a-feature)
- [Adding a dependency](#adding-a-dependency)
- [Database changes](#database-changes)
- [Code of conduct](#code-of-conduct)

## Getting set up

**Prerequisites**

| Tool | Version | Notes |
| --- | --- | --- |
| [Bun](https://bun.sh) | 1.0+ | Recommended — the project ships a `bun.lock` |
| Node.js | 20+ | Works fine as an alternative to Bun |
| Git | any | |

**Bootstrap**

```bash
git clone https://github.com/elouardighi/GameHub.git
cd GameHub
npm run setup     # or: bun run setup
```

`npm run setup` is idempotent and does everything for you:

1. detects your package manager (Bun preferred, npm fallback)
2. installs root **and** chat-service dependencies
3. creates `.env` from `.env.example` with a freshly generated `NEXTAUTH_SECRET`
4. generates the Prisma client
5. creates the SQLite schema and seeds it **only if** the database is missing

It never overwrites an existing `.env` or an existing database.

## Running the app

GameHub is three processes. Two terminals are enough for local development.

```bash
# Terminal 1 — Next.js on http://localhost:3000
npm run dev

# Terminal 2 — Socket.io chat service on :3003
npm run dev:chat
```

Then open <http://localhost:3000> and sign in with `nova@gamehub.gg` / `demo`.

**Why does the chat service need a separate port?** The browser connects to a
single origin and the app asks for the chat service using a
`?XTransformPort=3003` query parameter. In development you can either point
that straight at `:3003`, or run the included Caddy gateway which does the
routing for you:

```bash
caddy run --config Caddyfile     # gateway on http://localhost:81
```

`docker compose up --build` starts all three at once (app, chat service, and
gateway) — see the README for details.

## Running the tests

Two integration suites run against a **running** server. Start the app first
(plus the chat service for the socket suite), then:

```bash
npm run test:api       # 43 API checks
npm run test:socket    # 16 real-time event checks
npm test               # both
```

Point them at any host:

```bash
npm run test:api -- http://localhost:3000
npm run test:socket -- http://localhost:81
```

Both exit non-zero on failure, so they work as CI gates. They are run
automatically on every push and pull request.

## Project layout

```
src/app/            Next.js App Router — pages and 24 API routes
src/components/     gamehub/* = app components, ui/* = shadcn/ui
src/lib/            auth, db, socket, state stores, hooks
prisma/schema.prisma  16 database models
mini-services/chat-service/  the Socket.io service (port 3003)
scripts/             setup, build, seed and test tooling
db/custom.db         SQLite database with demo data
```

## Code style

- **TypeScript everywhere** — no `any` in new code; use the types in
  `src/lib/types.ts`.
- **ESLint must pass**: `npm run lint` before you push.
- Match the surrounding code. Read a file before you edit it.
- Keep API routes returning `NextResponse.json()` with a consistent shape.
- Client components need the `"use client"` directive at the top of the file.
- Prefer server components; add `"use client"` only when you need state,
  effects or browser APIs.

## Making a change

```bash
git checkout -b feature/my-change
# ... make your change ...
npm run lint
npm test
git commit -m "..."
git push -u origin feature/my-change
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add clan application review queue
fix: stop duplicate voice-state broadcasts
docs: document the docker compose stack
refactor: extract the message renderer
chore: bump next to 16.2
```

## Pull requests

1. Open a PR against `main`.
2. Fill in the PR template — what changed and why.
3. Make sure CI is green.
4. Keep the diff focused; unrelated refactors make review harder.

## Reporting bugs

Open an issue using the **Bug report** template. Include:

- what you did, what you expected, and what happened instead
- your OS, Node/Bun version, and browser
- the relevant console or server output
- a minimal reproduction if you have one

## Adding a feature

- Look for an existing issue first — someone may have asked for it already.
- Check whether it needs a new API route, a Prisma model, or a Socket.io event.
  All three need coordinated updates on the client and server.
- New Socket.io events should be documented in the README event list and
  covered by `scripts/socket-test.mjs`.
- New API routes should be covered by `scripts/smoke-test.mjs`.

## Adding a dependency

```bash
bun add <package>          # runtime dependency
bun add -d <package>       # dev dependency
```

Prefer packages that are already in the tree (Radix UI, shadcn/ui, lucide-react,
TanStack) before reaching for something new.

## Database changes

```bash
# 1. edit prisma/schema.prisma
# 2. apply the schema
npm run db:push

# 3. regenerate the client
npm run db:generate

# 4. if the change affects seed data, update scripts/seed.ts
```

`db/custom.db` is committed so the app is playable immediately after a clone.
If you change the schema, commit the updated database too.

## Code of conduct

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md).
