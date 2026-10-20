# GameHub — Discord-style Gaming Platform

[![CI](https://github.com/elouardighi/GameHub/actions/workflows/ci.yml/badge.svg)](https://github.com/elouardighi/GameHub/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A full Discord clone for gamers, built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma + SQLite, and Socket.io. Features the **"Hearth"** theme — warm honey gold + maroon on dark brown backgrounds, with a novel top-nav layout (no left sidebar like Discord/Teams/Slack).

## Features

### Real Auth
- **NextAuth credentials provider** with bcrypt password hashing
- Signup, login, logout flows
- Demo user shortcut (NovaStrike, password `demo`)
- Per-user scoping: your friends, quest progress, server memberships

### Real-time Chat
- Socket.io mini-service on port 3003 for chat, presence, typing, reactions, voice state, WebRTC signaling
- Real-time messages, typing indicators, message reactions (toggle), replies, editing, deletion, pinning
- Markdown formatting (bold, italic, code, links, @mentions)

### Real Media (Mic / Camera / Screen Share)
- `navigator.mediaDevices.getUserMedia()` for real mic + camera capture
- `navigator.mediaDevices.getDisplayMedia()` for real screen share
- `RTCPeerConnection` with Google STUN for P2P audio/video between users
- Audio level meter (10-bar equalizer) that reacts to actual mic input
- Speaking detection (audio level > threshold → emits `speaking` state)
- Browser's native "Stop sharing" button auto-stops the share
- Permission error handling with clear guidance

### Servers, Channels, Clans, Activities, Quests
- 5 pre-seeded gaming servers (Valorant Hub, League Nexus, Block Builders, Los Santos RP, Apex Legends)
- Channel types: text, voice, stage, forum, announcement, rules — each with appropriate icon
- Clans (Discord's "Guilds" feature): exclusive application-based gaming communities with tags, badges, banner styles, playstyle tags
- 6 Quests with progress tracking, "+1" increment, claim reward flow
- 8 Activities (Gartic Phone, Watch Together, Jackbox, Chess in the Park, etc.)
- Friends system: send request, accept, reject, unfriend
- Profile panel showing user banner, avatar, custom status, member since, roles, bio

### Novel Hearth Layout (top-nav, NOT left sidebar)
```
┌────────────────────────────────────────────────────────────┐
│ [GameHub Hearth] [Home | VALORANT Hub✓ | League Nexus | ...] [+] [🔍] [👤 User] │ top nav (56px)
├────────────────────────────────────────────────────────────┤
│ [VALORANT Hub ▸] [#general — topic] [welcome announcements general ...] [🔍 📌 🔔 👥 ⚙] │ sub-nav (44px)
├────────────────────────────────────────────────────────────┤
│                  MAIN CONTENT AREA                         │
│              (chat messages OR voice view)                 │
│                                       [Members toggle]     │
├────────────────────────────────────────────────────────────┤
│ [+] [Message #general........] [😊 🎁]                     │ input bar
└────────────────────────────────────────────────────────────┘
```

### Color Palette — "Hearth"
- Honey gold `#d4a03a` (primary — replaces Discord blurple)
- Rich maroon `#8b3a3a` (secondary/danger)
- Warm dark brown backgrounds (NOT pure black): `#1a1310` deepest, `#241b16` dark, `#2e2520` main
- Warm cream text `#f5e6c8` (softer than pure white)
- Status colors (warm variants): olive green online, honey idle, maroon DND

## Tech Stack
- **Framework**: Next.js 16 App Router (TypeScript 5)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style)
- **Database**: Prisma ORM + SQLite
- **Realtime**: Socket.io mini-service on port 3003
- **Auth**: NextAuth.js v4 (credentials provider) + bcryptjs
- **State**: Zustand for client state
- **Animations**: framer-motion
- **Icons**: lucide-react
- **Toasts**: sonner

## Prerequisites
- **Node.js 20+** OR **Bun** (recommended — this project uses Bun)
- Install Bun: `curl -fsSL https://bun.sh/install | bash`

## How to Run

### 1. Install dependencies
```bash
cd GameHub
bun install
```

### 2. Set up the database
The SQLite database file (`db/custom.db`) is included with seed data (5 servers, 3 clans, 6 quests, 8 activities, 12 demo users). If you want a fresh database, delete `db/custom.db` and run:

```bash
bun run db:push   # Create schema
bun scripts/seed.ts   # Populate with demo data
```

### 3. Configure environment (`.env`)
Copy the example file and edit it:
```bash
cp .env.example .env
```
It contains:
```
DATABASE_URL="file:../db/custom.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-openssl-rand-base64-32"
```

- `DATABASE_URL` — SQLite file, resolved relative to `prisma/` (so `../db/custom.db` is `<project-root>/db/custom.db`).
- `NEXTAUTH_URL` — must match your actual deployment URL (e.g. `http://localhost:3000` for local dev, or your production URL).
- `NEXTAUTH_SECRET` — generate a real one for any deployment: `openssl rand -base64 32`.

The `.env` file itself is **not** committed (see `.gitignore`); `.env.example` is the committed template.

### 4. Start the Next.js dev server
```bash
bun run dev
```
This starts Next.js on port 3000.

### 5. Start the Socket.io mini-service (in a separate terminal)
```bash
cd mini-services/chat-service
bun install   # First time only
bun run dev   # Starts on port 3003
```

### 6. Open the app
Visit `http://localhost:3000` in your browser.

**Demo credentials**: email `nova@gamehub.gg` / password `demo` (or click "Try the demo user" on the login screen).

**OR sign up fresh**: any username + email + password (≥6 chars) — new users auto-join all 5 public servers.

## Project Structure

```
GameHub/
├── src/
│   ├── app/
│   │   ├── api/                       # 24 API routes (auth, servers, channels, messages, clans, friends, quests, activities, me, settings, search, threads, join, apply)
│   │   ├── globals.css                # Hearth theme tokens + custom utilities
│   │   ├── layout.tsx                 # Root layout with SessionProvider + Sonner toaster
│   │   └── page.tsx                   # Main page — top-nav layout
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components (40+ files)
│   │   └── gamehub/                   # GameHub-specific components
│   │       ├── server-top-nav.tsx     # Horizontal top nav (replaces left sidebar)
│   │       ├── channel-top-bar.tsx    # Horizontal sub-nav with channel tabs
│   │       ├── chat-area.tsx          # Main chat area
│   │       ├── message-list.tsx       # Message list with typing indicators
│   │       ├── message-item.tsx      # Single message with reactions + hover actions
│   │       ├── message-input.tsx     # Bottom input bar with emoji picker
│   │       ├── voice-channel-view.tsx # Voice view with REAL video/screen tiles + audio meter
│   │       ├── voice-controls.tsx     # Floating voice bar
│   │       ├── member-list.tsx        # Right-side member list grouped by role
│   │       ├── profile-panel.tsx      # User profile slide-over
│   │       ├── settings-modal.tsx     # FULLSCREEN settings modal with 10 tabs
│   │       ├── create-server-modal.tsx
│   │       ├── friends-view.tsx
│   │       ├── clans-view.tsx         # Apply-to-join with application modal
│   │       ├── discover-view.tsx     # Featured servers browser
│   │       ├── activities-panel.tsx   # Discord-style activities
│   │       ├── quests-panel.tsx      # Track / +1 / Claim
│   │       ├── forum-channel-view.tsx
│   │       ├── auth-modal.tsx        # Login/Signup screen
│   │       ├── user-avatar.tsx
│   │       └── server-icon.tsx
│   ├── lib/
│   │   ├── auth.ts                    # NextAuth options + getAuthUser() helper
│   │   ├── db.ts                      # Prisma client singleton
│   │   ├── socket.ts                  # Zustand store + singleton socket.io-client
│   │   ├── ui-store.ts                # Zustand UI state store
│   │   ├── use-voice-media.ts        # Real getUserMedia + getDisplayMedia + WebRTC hook
│   │   ├── types.ts                   # TypeScript interfaces
│   │   ├── constants.ts               # Colors, emojis, banner styles
│   │   └── utils.ts                   # cn() helper
│   └── hooks/
│       ├── use-mobile.ts
│       └── use-toast.ts
├── prisma/
│   └── schema.prisma                  # 16 models (User, Server, Clan, Channel, Message, etc.)
├── mini-services/
│   └── chat-service/
│       ├── index.ts                   # Socket.io service (port 3003)
│       └── package.json
├── scripts/
│   └── seed.ts                        # Seed script for demo data
├── db/
│   └── custom.db                      # SQLite database with seed data (included)
├── public/
├── package.json
├── bun.lock
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                    # shadcn/ui config
├── eslint.config.mjs
├── Caddyfile                          # Caddy gateway config (port 81 → port 3000, with XTransformPort for socket.io)
├── .env.example                       # Template for DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
├── .github/workflows/ci.yml           # CI: lint + build
├── .gitattributes
├── .gitignore
├── LICENSE                            # MIT
└── README.md                          # This file
```

## API Routes (24 total)

### Auth
- `POST /api/auth/[...nextauth]` — NextAuth handler (signin, signout, session, csrf, providers)
- `POST /api/auth/signup` — Create new user with bcrypt-hashed password, auto-join all public servers
- `GET /api/auth/me` — Returns authenticated user or 401

### Servers
- `GET /api/servers` — List all servers
- `POST /api/servers` — Create a new server
- `GET /api/servers/[id]` — Get server with channels
- `GET /api/servers/[id]/members` — Get server members with roles
- `POST /api/servers/[id]/join` — Join a public server
- `GET /api/servers/[id]/search?q=...` — Search messages in a server
- `POST /api/servers/[id]/channels` — Create a channel
- `POST /api/servers/[id]/channels/[channelId]/threads` — Create a thread
- `GET/POST /api/servers/[id]/channels/[channelId]/messages` — Get/persist messages

### Clans
- `GET /api/clans` — List all clans
- `GET /api/clans/[id]` — Get clan with members
- `POST /api/clans/[id]/apply` — Submit clan application
- `GET /api/clans/applications` — List user's applications

### Friends
- `GET /api/friends` — List friends + pending requests
- `POST /api/friends/request` — Send friend request
- `POST /api/friends/[friendshipId]/accept` — Accept friend request
- `POST /api/friends/[friendshipId]/reject` — Reject friend request
- `DELETE /api/friends/[friendshipId]` — Unfriend

### Quests
- `GET /api/quests` — List all quests with user's progress
- `POST /api/quests/[id]/track` — Toggle tracking
- `POST /api/quests/[id]/increment` — +1 progress
- `POST /api/quests/[id]/claim` — Claim reward (if progress >= goal)

### Activities
- `GET /api/activities` — List all activities
- `POST /api/activities/[id]/launch` — Launch an activity

### User
- `GET /api/me` — Get current user
- `PATCH /api/me` — Update profile (name, bio, avatarColor, bannerColor, customStatus)
- `PATCH /api/me/settings` — Update voice/video settings (JSON)
- `GET /api/seed-data` — Single-call initial page load payload (currentUser + allServers + allClans + friends + quests + activities)

## Socket.io Events

### Client → Server
- `identify({id, username, avatarColor, status, customStatus})` — Register current user
- `view-channel({channelId})` — Join channel view room (for receiving messages)
- `send-message({channelId, userId, username, avatarColor, content, replyToId?})` — Send a chat message
- `typing-start({channelId, userId, username})` / `typing-stop({channelId, userId})` — Typing indicators
- `add-reaction({messageId, channelId, emoji, userId, username})` / `remove-reaction(...)` — Toggle reactions
- `join-voice({channelId, userId, username, avatarColor})` — Join a voice channel (also joins voice room)
- `leave-voice({channelId, userId})` — Leave voice
- `update-voice-state({channelId, userId, muted?, deafened?, videoOn?, streaming?, speaking?, isSpeaker?})` — Update voice state
- `webrtc-offer({toUserId, fromUserId, offer, channelId})` / `webrtc-answer(...)` / `webrtc-ice-candidate(...)` — P2P signaling
- `raise-hand({channelId, userId, username})` — Stage channel hand raise
- `update-status({userId, status, customStatus?})` — Update user status

### Server → Client
- `users-list({users})` — Online users list
- `user-status({userId, status})` — User status changed
- `new-message(message)` — New chat message
- `message-deleted({messageId, channelId})` / `message-edited(...)` / `message-pinned(...)` — Message mutations
- `user-typing({userId, username, channelId})` / `user-stopped-typing({userId, channelId})` — Typing indicators
- `reaction-added(...)` / `reaction-removed(...)` — Reactions
- `voice-state({channelId, participants})` — Voice channel participants updated
- `hand-raised({channelId, userId, username})` — Stage hand raise
- `webrtc-offer(...)` / `webrtc-answer(...)` / `webrtc-ice-candidate(...)` — P2P signaling relay

## Browser Permissions Required

For voice/video/screen share to work, the browser will prompt for:
- **Microphone** — required when joining a voice channel (for speaking to others + audio level meter)
- **Camera** — required when clicking the Video button (for showing your face in your voice tile)
- **Screen** — required when clicking the Screenshare button (for screen capture)

**HTTPS required**: Browsers only allow `getUserMedia` on `https://` or `localhost`. The preview URL is HTTPS so it works; `localhost:3000` also works.

## Production Deployment

### Build
```bash
bun run build
bun run start
```

### Environment Variables (production)
- `DATABASE_URL` — your production database URL
- `NEXTAUTH_URL` — your production URL (e.g. `https://yourdomain.com`)
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32` and keep secret

### Reverse Proxy
The included `Caddyfile` shows how to set up Caddy as a reverse proxy:
- Listens on port 81 (configurable)
- Forwards to localhost:3000 (Next.js)
- Forwards requests with `?XTransformPort=3003` to localhost:3003 (Socket.io)

For production without Caddy, you can run Next.js and the chat-service on the same port using a custom Next.js API route to proxy socket.io, OR use a separate subdomain for the socket service.

## Known Limitations

1. **WebRTC P2P audio between users on restrictive NATs** (corporate/college networks) might fail without a TURN relay server. Google's free STUN server is configured but doesn't relay traffic. For production, consider running coturn (free) or a paid TURN service (Twilio, Xirsys).

2. **Mobile browsers**: `getDisplayMedia` may only share the entire screen (not specific apps).

3. **No real video calls between two browser tabs on the same machine** unless you use two different browser profiles or one incognito + one normal (Chrome blocks camera access from two tabs of the same profile).

## License
MIT — Use it however you want.

Built with ❤️ by GLM (Z.ai).
