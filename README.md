# GameHub — Discord-style Gaming Platform

[![CI](https://github.com/elouardighi/GameHub/actions/workflows/ci.yml/badge.svg)](https://github.com/elouardighi/GameHub/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-4169E1.svg)](https://nodejs.org)
[![Bun](https://img.shields.io/badge/bun-1.0%2B-black.svg)](https://bun.sh)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A full Discord clone for gamers, built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma + SQLite and Socket.io. It ships with the **"Hearth"** theme — warm honey gold + maroon on dark brown — and a novel top-nav layout with no left sidebar.

> **Demo login:** `nova@gamehub.gg` / `demo` — or click **"Try the demo user"** on the login screen.

---

## Table of contents

- [Quick start](#quick-start)
- [Running the app](#running-the-app)
- [Docker](#docker)
- [Configuration](#configuration)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [npm scripts](#npm-scripts)
- [Testing](#testing)
- [API routes](#api-routes)
- [Socket.io events](#socketio-events)
- [Browser permissions](#browser-permissions)
- [Production deployment](#production-deployment)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Quick start

### Prerequisites

| Tool | Version | Required? |
| --- | --- | --- |
| [Bun](https://bun.sh) | 1.0+ | Recommended — the repo ships a `bun.lock` |
| Node.js | 20+ | Yes, unless you use Bun |
| Git | any | Yes |
| Docker | any | Only for the [Docker](#docker) path |

### 1. Clone and install

```bash
git clone https://github.com/elouardighi/GameHub.git
cd GameHub
```

### 2. Set everything up

One command installs dependencies, creates `.env` with a fresh secret,
generates the Prisma client and prepares the database:

```bash
npm run setup          # or: bun run setup
```

It is idempotent — safe to re-run, and it will never overwrite an existing
`.env` or database.

<details>
<summary>Prefer to do it by hand?</summary>

```bash
bun install                                        # or: npm install
cd mini-services/chat-service && bun install && cd ../..
cp .env.example .env                               # Windows: copy .env.example .env
bunx prisma generate
bunx prisma db push --accept-data-loss
```

The database `db/custom.db` is already committed with demo data, so you can
skip the last step. To start from scratch, delete it and run
`bun scripts/seed.ts`.
</details>

### 3. Start the app

GameHub is **three processes**. Open two terminals:

```bash
# Terminal 1 — Next.js on http://localhost:3000
npm run dev

# Terminal 2 — Socket.io chat service on :3003
npm run dev:chat
```

### 4. Open it

Go to <http://localhost:3000> and sign in with **`nova@gamehub.gg`** /
**`demo`**.

---

## Running the app

```
                    ┌──────────────────────────────┐
   Browser  ──────► │  Caddy gateway  :81          │
                    │  ?XTransformPort=3003 ───────┼──► Socket.io chat service :3003
                    │  everything else ────────────┼──► Next.js app             :3000
                    └──────────────────────────────┘
```

The browser talks to a single origin. The app asks for the chat service using
a `?XTransformPort=3003` query parameter, and the gateway routes that request
to port 3003 while forwarding everything else to Next.js.

**Do you need Caddy locally?** Not strictly — the chat service works fine
standalone and the UI degrades gracefully if the socket cannot connect. But
the Caddy path is the production setup and is what the app was designed
around, so it is worth running:

```bash
caddy run --config Caddyfile     # → http://localhost:81
```

Install Caddy from <https://caddyserver.com/docs/install>. The gateway port is
configurable with `GATEWAY_PORT=8080 caddy run --config Caddyfile`.

---

## Docker

The full stack — app, chat service and gateway — in three containers:

```bash
cp .env.example .env       # set NEXTAUTH_SECRET and NEXTAUTH_URL
docker compose up --build
```

Then open <http://localhost:81>.

| Service | Port | Purpose |
| --- | --- | --- |
| `app` | 3000 | Next.js 16 standalone server |
| `chat` | 3003 | Socket.io chat service |
| `gateway` | 81 | Caddy reverse proxy |

The SQLite database lives in the `gamehub-data` volume, so it survives
restarts.

---

## Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | `file:../db/custom.db` | SQLite path, resolved **relative to `prisma/`** |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | Must match the public origin of the app |
| `NEXTAUTH_SECRET` | ✅ | — | Generate with `openssl rand -base64 32` |

`.env` is git-ignored; `.env.example` is the committed template.

---

## Features

### Real auth
- NextAuth credentials provider with bcrypt password hashing
- Signup, login and logout flows with 30-day JWT sessions
- Per-user scoping for friends, quest progress and server memberships
- New accounts automatically join all public servers

### Real-time chat
- Socket.io mini-service on port `3003`
- Live messages, typing indicators, reactions (toggle), replies, edits, deletes, pins
- Markdown formatting — bold, italic, code, links, `@mentions`
- Presence, online-user list, custom status

### Real media — mic, camera, screen share
- `navigator.mediaDevices.getUserMedia()` for live mic + camera capture
- `navigator.mediaDevices.getDisplayMedia()` for real screen sharing
- `RTCPeerConnection` peer-to-peer audio/video with Google STUN
- 10-bar audio level equalizer driven by the actual mic input
- Speaking detection — level over threshold emits a `speaking` state
- The browser's native "Stop sharing" button is respected automatically
- Clear, actionable permission-error handling

### Servers, channels, clans, activities, quests
- 5 pre-seeded gaming servers (Valorant Hub, League Nexus, Block Builders, Los Santos RP, Apex Legends)
- Channel types: text, voice, stage, forum, announcement, rules
- **Clans** — Discord's "Guilds": exclusive, application-based communities with tags, badges, banner styles and playstyle tags
- 6 quests with progress tracking, `+1` increment and a claim-reward flow
- 8 activities (Gartic Phone, Watch Together, Jackbox, Chess in the Park, …)
- Friends system — send request, accept, reject, unfriend
- Profile panel — banner, avatar, custom status, member since, roles, bio

### The "Hearth" layout — top nav, not a left sidebar
```
┌────────────────────────────────────────────────────────────┐
│ [GameHub Hearth] [Home | VALORANT Hub✓ | League Nexus | ...] [+] [🔍] [👤 User] │ top nav
├────────────────────────────────────────────────────────────┤
│ [VALORANT Hub ▸] [#general — topic] [welcome announcements general ...] [🔍 📌 🔔 👥 ⚙] │ sub-nav
├────────────────────────────────────────────────────────────┤
│                  MAIN CONTENT AREA                         │
│              (chat messages OR voice view)                 │
│                                       [Members toggle]     │
├────────────────────────────────────────────────────────────┤
│ [+] [Message #general........] [😊 🎁]                     │ input bar
└────────────────────────────────────────────────────────────┘
```

### Colour palette — "Hearth"
- Honey gold `#d4a03a` (primary)
- Rich maroon `#8b3a3a` (secondary / danger)
- Warm dark brown backgrounds — `#1a1310` deepest, `#241b16` dark, `#2e2520` main
- Warm cream text `#f5e6c8`
- Status colours — olive green online, honey idle, maroon DND

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite (16 models) |
| Realtime | Socket.io (`mini-services/chat-service`, port 3003) |
| Auth | NextAuth.js v4 (credentials) + bcryptjs |
| State | Zustand, TanStack Query / Table |
| Animation / icons / toasts | framer-motion, lucide-react, sonner |
| Gateway | Caddy 2 |

---

## Project structure

```
GameHub/
├── src/
│   ├── app/
│   │   ├── api/                       # 24 API routes
│   │   ├── globals.css                # Hearth theme tokens
│   │   ├── layout.tsx                 # SessionProvider + Sonner toaster
│   │   └── page.tsx                   # Main page — top-nav layout
│   ├── components/
│   │   ├── ui/                        # shadcn/ui (40+ files)
│   │   └── gamehub/                   # App components
│   │       ├── server-top-nav.tsx     # Horizontal top nav
│   │       ├── channel-top-bar.tsx    # Horizontal sub-nav with channel tabs
│   │       ├── chat-area.tsx          # Main chat area
│   │       ├── message-list.tsx       # Messages + typing indicators
│   │       ├── message-item.tsx       # One message + reactions
│   │       ├── message-input.tsx      # Bottom input bar
│   │       ├── voice-channel-view.tsx # Real video/screen tiles + audio meter
│   │       ├── voice-controls.tsx     # Floating voice bar
│   │       ├── member-list.tsx        # Right-side member list by role
│   │       ├── profile-panel.tsx      # User profile slide-over
│   │       ├── settings-modal.tsx     # Fullscreen settings, 10 tabs
│   │       ├── create-server-modal.tsx
│   │       ├── friends-view.tsx
│   │       ├── clans-view.tsx         # Apply-to-join + application modal
│   │       ├── discover-view.tsx      # Featured servers browser
│   │       ├── activities-panel.tsx
│   │       ├── quests-panel.tsx       # Track / +1 / Claim
│   │       ├── forum-channel-view.tsx
│   │       └── auth-modal.tsx         # Login / signup screen
│   ├── lib/
│   │   ├── auth.ts                    # NextAuth options + getAuthUser()
│   │   ├── db.ts                      # Prisma client singleton
│   │   ├── socket.ts                  # Zustand store + socket.io client
│   │   ├── ui-store.ts                # UI state
│   │   ├── use-voice-media.ts         # getUserMedia/getDisplayMedia/WebRTC
│   │   ├── types.ts                   # TypeScript interfaces
│   │   └── constants.ts               # Colours, emojis, banner styles
│   └── hooks/
├── prisma/schema.prisma              # 16 models
├── mini-services/chat-service/        # Socket.io service (port 3003)
├── scripts/
│   ├── setup.mjs                      # One-command bootstrap
│   ├── build.mjs                      # Cross-platform production build
│   ├── start.mjs                      # Production server launcher
│   ├── seed.ts                        # Demo data seed
│   ├── smoke-test.mjs                 # 43 API integration checks
│   └── socket-test.mjs                # 16 real-time event checks
├── db/custom.db                      # SQLite database with demo data
├── docs/INSTALLATION.md               # Detailed per-platform setup + troubleshooting
├── .github/workflows/ci.yml           # Lint, build and both test suites
├── Caddyfile                          # Gateway config
├── docker-compose.yml                 # Full stack in Docker
├── Dockerfile
├── .env.example
└── README.md
```

---

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run setup` | Bootstrap: dependencies, `.env`, Prisma client, database |
| `npm run dev` | Next.js dev server on `:3000` |
| `npm run dev:chat` | Socket.io chat service on `:3003` |
| `npm run build` | Production build (cross-platform, copies static assets) |
| `npm start` | Run the production standalone server |
| `npm run lint` | ESLint |
| `npm test` | Both integration suites |
| `npm run test:api` | API smoke test against a running server |
| `npm run test:socket` | Socket.io integration test against a running server |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Re-seed the demo data |

---

## Testing

Two integration suites run against a **running** server. Start the app first
(plus the chat service for the socket suite), then:

```bash
npm run test:api       # 43 checks — auth, friends, quests, clans, messages
npm run test:socket    # 16 checks — every documented Socket.io event
npm test               # both
```

Point them anywhere:

```bash
npm run test:api -- http://localhost:3000
npm run test:socket -- http://localhost:8081
```

Both exit non-zero on failure and run automatically in CI on every push.

---

## API routes

### Auth
| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/auth/signup` | Create a user, bcrypt-hash the password, auto-join public servers |
| GET | `/api/auth/me` | The authenticated user, or 401 |

### Servers
| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/servers` | List all servers |
| POST | `/api/servers` | Create a server |
| GET | `/api/servers/[id]` | Server with its channels |
| GET | `/api/servers/[id]/members` | Members with roles |
| POST | `/api/servers/[id]/join` | Join a public server |
| GET | `/api/servers/[id]/search?q=` | Search messages |
| POST | `/api/servers/[id]/channels` | Create a channel |
| POST | `/api/servers/[id]/channels/[channelId]/threads` | Create a thread |
| GET/POST | `/api/servers/[id]/channels/[channelId]/messages` | Read / persist messages |

### Clans
| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/clans` | List all clans |
| GET | `/api/clans/[id]` | Clan with members |
| POST | `/api/clans/[id]/apply` | Submit an application |
| GET | `/api/clans/applications` | The user's applications |

### Friends
| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/friends` | Friends + pending requests |
| POST | `/api/friends/request` | Send a request — body `{ identifier }` (email **or** username) |
| POST | `/api/friends/[friendshipId]/accept` | Accept a request |
| POST | `/api/friends/[friendshipId]/reject` | Reject a request |
| DELETE | `/api/friends/[friendshipId]` | Unfriend |

### Quests
| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/quests` | All quests with the user's progress |
| POST | `/api/quests/[id]/track` | Toggle tracking |
| POST | `/api/quests/[id]/increment` | `+1` progress |
| POST | `/api/quests/[id]/claim` | Claim the reward (needs progress ≥ goal) |

### Activities and user
| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/activities` | List all activities |
| POST | `/api/activities/[id]/launch` | Launch an activity |
| GET | `/api/me` | The current user |
| PATCH | `/api/me` | Update profile — name, bio, avatarColor, bannerColor, customStatus |
| PATCH | `/api/me/settings` | Update voice/video settings (JSON) |
| GET | `/api/seed-data` | Single-call initial payload — `currentUser`, `allServers`, `allClans`, `friends`, `quests`, `activities` |

---

## Socket.io events

### Client → server
| Event | Payload |
| --- | --- |
| `identify` | `{id, username, avatarColor, status, customStatus}` |
| `view-channel` | `{channelId}` — joins the `view:{channelId}` room |
| `send-message` | `{channelId, userId, username, avatarColor, content, replyToId?}` |
| `typing-start` / `typing-stop` | `{channelId, userId, username}` |
| `add-reaction` / `remove-reaction` | `{messageId, channelId, emoji, userId, username}` |
| `edit-message` / `delete-message` / `pin-message` | message mutations |
| `join-voice` / `leave-voice` | `{channelId, userId, username, avatarColor}` |
| `update-voice-state` | `{channelId, userId, muted?, deafened?, videoOn?, streaming?, speaking?, isSpeaker?}` |
| `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate` | P2P signalling |
| `raise-hand` | `{channelId, userId, username}` |
| `update-status` | `{userId, status, customStatus?}` |

### Server → client
| Event | Payload |
| --- | --- |
| `users-list` | `{users}` — online users |
| `user-status` | `{userId, status}` |
| `new-message` | The message |
| `message-deleted` / `message-edited` / `message-pinned` | Message mutations |
| `user-typing` / `user-stopped-typing` | Typing indicators |
| `reaction-added` / `reaction-removed` | Reactions |
| `voice-state` | `{channelId, participants}` |
| `hand-raised` | `{channelId, userId, username}` |
| `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate` | P2P signalling relay |

> Messages and reactions are broadcast to the `view:{channelId}` room; voice
> events to the `channel:{channelId}` room. Clients must join the room first.

---

## Browser permissions

Voice, video and screen capture require these permissions:

- **Microphone** — when joining a voice channel
- **Camera** — when clicking the Video button
- **Screen** — when clicking the Screenshare button

**HTTPS is required.** Browsers only allow `getUserMedia` on `https://` or
`localhost`.

---

## Production deployment

### Build and run

```bash
npm run build
npm start
```

### Environment

- `DATABASE_URL` — your production database URL
- `NEXTAUTH_URL` — your production URL, e.g. `https://yourdomain.com`
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`, and keep it secret

### Reverse proxy

`Caddyfile` shows the reference setup — it listens on port 81, forwards to
Next.js on 3000 and routes `?XTransformPort=3003` to the chat service on 3003.

Without Caddy you can run Next.js and the chat service on the same port using
a custom Next.js route to proxy Socket.io, or give the socket service its own
subdomain.

### Before you go live

See [SECURITY.md](SECURITY.md) — in particular, **do not ship the demo
database** and **do not ship the example `NEXTAUTH_SECRET`**.

---

## Known limitations

1. **WebRTC behind restrictive NATs** — Google's free STUN server does not
   relay traffic. Run coturn or a paid TURN service for production.
2. **Mobile browsers** — `getDisplayMedia` may only share the entire screen,
   not a single app.
3. **Two tabs, one browser profile** — Chrome blocks camera access from two
   tabs of the same profile. Use two profiles, or one normal and one incognito
   window, to test camera between tabs.
4. **NextAuth sign-out needs the CSRF token** — a `POST /api/auth/signout`
   without it silently leaves the session alive. The app already sends it.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for
the setup, code style, commit conventions and how to run the tests, and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for the community guidelines.

---

## Security

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md).
Never open a public issue for a security problem.

---

## License

[MIT](LICENSE) — use it however you want.
