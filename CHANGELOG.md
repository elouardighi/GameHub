# Changelog

All notable changes to GameHub are documented here.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.1.0] — 2026-10-20

Makes the repository ready to clone, install and run — and adds automated
coverage for the parts that were previously only tested by hand.

### Added

**Install and setup**

- `npm run setup` — one-command bootstrap. Detects Bun or npm, installs the
  root and chat-service dependencies, creates `.env` from `.env.example` with a
  freshly generated `NEXTAUTH_SECRET`, generates the Prisma client and syncs
  the database schema. Idempotent, and it never overwrites an existing `.env`
  or database.
- `docs/INSTALLATION.md` — per-platform installation guide for Windows, macOS
  and Linux, plus a troubleshooting section.

**Docker**

- `Dockerfile` — multi-stage production image (deps → builder → runner) that
  produces a slim Node image running the Next.js standalone server.
- `mini-services/chat-service/Dockerfile` — image for the Socket.io service.
- `docker-compose.yml` — the full stack: `db-init`, `app`, `chat` and a Caddy
  `gateway`, with health checks and persistent volumes.
- `scripts/docker-db-init.sh` — prepares the SQLite database on first boot and
  keeps the schema in sync. `SEED_DEMO=false` starts from an empty database.

**Testing**

- `scripts/smoke-test.mjs` — 43 API integration checks: auth guards, signup,
  signin, session, seed data, servers, channels, messages, threads, search,
  profile, the two-user friend flow, quests, clans, activities and signout.
- `scripts/socket-test.mjs` — 16 real-time checks covering every documented
  Socket.io event, driven by two real clients.
- `npm test` runs both. Both exit non-zero on failure and accept a base URL,
  so they work against any deployment.
- CI now boots the whole stack (app + chat service + Caddy gateway) and runs
  both suites on every push and pull request.

**Repository**

- `CONTRIBUTING.md` — setup, code style, commit conventions, PR process and
  how to add features, dependencies and schema changes.
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1.
- `SECURITY.md` — how to report a vulnerability privately, supported versions,
  and a checklist for self-hosted deployments.
- `CHANGELOG.md` — Keep a Changelog format.
- Bug report and feature request issue templates, a pull request template, and
  a `config.yml` that routes security reports to private reporting.
- Dependabot configured for npm (root and chat service), Docker and GitHub
  Actions.

### Changed

- The README is now a full guide: quick start, architecture diagram,
  configuration reference, Docker, complete API and Socket.io tables, script
  reference, testing and troubleshooting.
- The `Caddyfile` takes its port, app upstream and chat host from environment
  variables (`GATEWAY_PORT`, `APP_UPSTREAM`, `CHAT_HOST`) with the previous
  values as defaults, so the same file works locally, in CI and in Docker.
  Removed the redundant `X-Forwarded-*` headers that Caddy already sets.
- The `dev`, `build` and `start` npm scripts are now portable across Windows,
  macOS and Linux. The previous `cp -r` and `NODE_ENV=... cmd` forms only
  worked in a POSIX shell.

### Fixed

- `next build` with `output: "standalone"` does not copy the static assets or
  `public/` into the bundle. The old build script did it with `cp -r`, which
  failed on Windows. `scripts/build.mjs` now does it portably, and also copies
  the Prisma query engine and the generated client into the bundle.
- The Docker stack never created the SQLite database, so the app started with
  no tables and the gateway never became healthy. A `db-init` service now
  prepares the database before the app starts.
- In Docker Compose the gateway resolved `localhost:3000`, which pointed at
  the gateway container itself. The upstreams are now configurable so the
  services can reach each other by name.

## [1.0.0] — 2026-10-20

First public release.

### Added

**Core platform**

- Discord-style gaming platform with a novel top-nav layout (no left sidebar)
- "Hearth" theme — honey gold `#d4a03a`, maroon `#8b3a3a` on warm dark brown,
  cream `#f5e6c8` text
- 5 pre-seeded gaming servers, 3 clans, 6 quests, 8 activities, 12 demo users

**Authentication**

- NextAuth v4 credentials provider with bcrypt password hashing
- Signup, login and logout flows with 30-day JWT sessions
- New accounts automatically join all public servers

**Real-time chat**

- Socket.io mini-service on port `3003`
- Live messages, typing indicators, reactions, replies, edits, deletes, pins
- Markdown formatting including bold, italic, code, links and `@mentions`
- Presence, online-user list, custom status and status updates
- 20+ client/server events

**Voice, video and screen share**

- Real microphone and camera capture via `getUserMedia()`
- Real screen sharing via `getDisplayMedia()`
- Peer-to-peer audio/video with `RTCPeerConnection` and Google STUN
- 10-bar audio level equalizer driven by live mic input
- Speaking detection broadcast to other participants
- Browser-native "Stop sharing" button respected automatically
- Graceful, actionable permission-error handling
- Stage channels with hand raising

**Servers, channels, clans, activities, quests**

- Text, voice, stage, forum, announcement and rules channel types
- Clans — application-based communities with tags, badges, banner styles and
  playstyle tags
- Quests with progress tracking, `+1` increment and a claim-reward flow
- Friends system — request, accept, reject, unfriend
- Profile panel with banner, avatar, custom status, roles and bio
- Member list grouped by role, with presence indicators

**API and tooling**

- 24 API routes across auth, servers, channels, messages, threads, clans,
  friends, quests, activities, user profile, settings and search
- `/api/seed-data` — single-call initial page-load payload
- `scripts/setup.mjs` — one-command bootstrap (dependencies, `.env`, Prisma
  client, schema, seed)
- `scripts/build.mjs` — cross-platform production build
- `scripts/smoke-test.mjs` — 43 API integration checks
- `scripts/socket-test.mjs` — 16 real-time event checks
- GitHub Actions CI running lint, build and both test suites
- Dockerfile, `docker-compose.yml` and a Caddy gateway for the full stack

### Changed

- `package.json` renamed to `gamehub`, version `1.0.0`, MIT license metadata
- Build and start scripts are now portable across Windows, macOS and Linux
  (the previous `cp -r` and `NODE_ENV=... cmd` forms were POSIX-only)

### Security

- `.env` is git-ignored; `.env.example` is the committed template
- The development `NEXTAUTH_SECRET` and a server-specific database path were
  removed from the README
- `db/custom.db` contains only demo and `@example.com` test accounts

[Unreleased]: https://github.com/elouardighi/GameHub/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/elouardighi/GameHub/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/elouardighi/GameHub/releases/tag/v1.0.0
