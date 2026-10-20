# Installation & setup

Detailed, per-platform instructions for GameHub. The
[README quick start](../README.md#quick-start) covers the happy path — this
page covers every platform, Docker, and what to do when something breaks.

## Contents

- [Requirements](#requirements)
- [Install Bun](#install-bun)
- [Install Node.js](#install-nodejs)
- [Get the code](#get-the-code)
- [Run the automated setup](#run-the-automated-setup)
- [Manual setup](#manual-setup)
- [Start the services](#start-the-services)
- [Docker](#docker)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| Tool | Version | Required? |
| --- | --- | --- |
| Bun | 1.0+ | Recommended — the repo ships a `bun.lock` |
| Node.js | 20+ | Required unless you use Bun |
| Git | any | Required |
| Docker + Compose | any | Optional alternative |
| Caddy | 2.x | Optional — the production gateway |

You need **both** Bun (or Node) **and** a package manager that can install the
project's dependencies. Nothing else is required to run the app locally.

---

## Install Bun

Bun is the recommended runtime — it installs dependencies roughly 10× faster
than npm and the project is pinned to a `bun.lock`.

**macOS / Linux**

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (PowerShell)**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Windows (winget)**

```powershell
winget install Oven-sh.Bun
```

Bun installs to `~/.bun/bin`. Add it to your `PATH`:

```bash
# macOS / Linux — ~/.zshrc or ~/.bashrc
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

```powershell
# Windows PowerShell (user profile)
[Environment]::SetEnvironmentVariable("BUN_INSTALL", "$env:USERPROFILE\.bun", "User")
[Environment]::SetEnvironmentVariable(
  "PATH", [Environment]::GetEnvironmentVariable("PATH", "User") + ";$env:USERPROFILE\.bun\bin", "User"
)
```

Close and reopen your terminal, then check:

```bash
bun --version
```

---

## Install Node.js

If you would rather use npm:

- **Windows** — `winget install OpenJS.NodeJS.LTS`
- **macOS** — `brew install node`
- **Linux** — see <https://github.com/nodesource/distributions#installation-instructions>

```bash
node --version   # must be v20 or newer
```

---

## Get the code

```bash
git clone https://github.com/elouardighi/GameHub.git
cd GameHub
```

Already have it? `git pull`.

---

## Run the automated setup

```bash
npm run setup
# or
bun run setup
```

This single command:

1. **detects** Bun or npm
2. **installs** the root dependencies *and* the chat-service dependencies
3. **creates `.env`** from `.env.example` with a freshly generated
   `NEXTAUTH_SECRET` (it never touches an existing `.env`)
4. **generates** the Prisma client
5. **syncs** the database schema, and seeds demo data **only if**
   `db/custom.db` is missing

Expected output:

```
GameHub setup (win32)

[1] Checking your toolchain
  ✓ Using bun
  ✓ Node v24.19.0

[2] Installing dependencies
  ✓ Dependencies installed

[3] Configuring environment
  ✓ .env created from .env.example (fresh NEXTAUTH_SECRET generated)

[4] Generating the Prisma client
  ✓ Prisma client generated

[5] Preparing the database
  ✓ Schema is up to date
  ✓ Existing database kept (nothing overwritten)

Setup complete.
```

---

## Manual setup

If you prefer to do each step yourself:

```bash
# 1. dependencies
bun install
cd mini-services/chat-service && bun install && cd ../..

# 2. environment
cp .env.example .env          # Windows: copy .env.example .env
#    then edit .env — see "Configuration" in the README

# 3. Prisma client
bunx prisma generate

# 4. database schema
bunx prisma db push --accept-data-loss
```

### About `DATABASE_URL`

The path is resolved **relative to the `prisma/` directory**, because that is
where `schema.prisma` lives:

| Value | Resolves to |
| --- | --- |
| `file:../db/custom.db` | `<project-root>/db/custom.db` ✅ |
| `file:./custom.db` | `<project-root>/prisma/custom.db` |
| `file:/data/custom.db` | absolute path — use this in Docker |

### Starting from an empty database

`db/custom.db` is committed, so the app is playable immediately. To build it
from scratch:

```bash
rm db/custom.db
bunx prisma db push --accept-data-loss
bun scripts/seed.ts
```

---

## Start the services

GameHub runs as three processes. Two are required for the core experience; the
third is the gateway.

### 1. The web app — port 3000

```bash
npm run dev        # or: bun run dev
```

### 2. The chat service — port 3003

```bash
npm run dev:chat
# equivalent to: cd mini-services/chat-service && bun run dev
```

### 3. The gateway — port 81 (optional but recommended)

```bash
caddy run --config Caddyfile
```

Install Caddy from <https://caddyserver.com/docs/install>. On Windows, grab
the ZIP from <https://github.com/caddyserver/caddy/releases> and run
`caddy.exe` directly.

The gateway port is configurable:

```bash
GATEWAY_PORT=8080 caddy run --config Caddyfile
```

### Which URL do I open?

| Setup | Open |
| --- | --- |
| Without Caddy | <http://localhost:3000> |
| With Caddy | <http://localhost:81> |

### Running everything at once

**Docker Compose** (see below) or, on macOS/Linux:

```bash
npm run dev & npm run dev:chat & caddy run --config Caddyfile
```

---

## Docker

### Compose (recommended)

```bash
cp .env.example .env
# edit .env: set NEXTAUTH_SECRET and NEXTAUTH_URL
docker compose up --build
```

Open <http://localhost:81>.

The SQLite database is stored in the `gamehub-data` volume, so it survives
`docker compose down`. To wipe it:

```bash
docker compose down -v
```

### Plain Docker

```bash
docker build -t gamehub .
docker run -d --name gamehub -p 3000:3000 \
  -v gamehub-data:/data \
  -e DATABASE_URL="file:/data/custom.db" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  gamehub

docker run -d --name gamehub-chat -p 3003:3003 \
  gamehub-chat
```

Build the chat image from the repository root:

```bash
docker build -f mini-services/chat-service/Dockerfile -t gamehub-chat .
```

---

## Production build

```bash
npm run build
npm start
```

`npm run build` runs `next build` and then copies the static assets and
`public/` into the standalone bundle — the step Next.js leaves out of
`output: "standalone"`. The original build script used `cp -r`, which only
works in a POSIX shell; `scripts/build.mjs` does it portably, so Windows
works too.

---

## Troubleshooting

### `bun: command not found`

Bun is installed but not on your `PATH`. Restart your terminal, then add
`~/.bun/bin` to `PATH` (see [Install Bun](#install-bun)).

### `PrismaClient is not exported` / `Cannot find module '.prisma/client'`

The Prisma client has not been generated:

```bash
bunx prisma generate
```

### `Error: P1013 The database file could not be found`

`DATABASE_URL` points at a file that does not exist. Either use the default
`file:../db/custom.db`, or create the database:

```bash
bunx prisma db push --accept-data-loss
```

### `DATABASE_URL` is relative to the wrong place

The SQLite path is resolved relative to `prisma/`, not the project root. Use
`file:../db/custom.db` for `<root>/db/custom.db`.

### The page loads but chat is not real-time

The Socket.io service is not running, or the gateway is not routing to it.

```bash
# is it listening?
curl "http://localhost:3003/socket.io/?EIO=4&transport=polling"
# should return: 0{"sid":"...","upgrades":["websocket"],...}
```

If that works, the problem is the gateway. Open the browser dev tools, look at
the WebSocket frame URL, and confirm it is going to the gateway port with
`?XTransformPort=3003`.

### `NEXTAUTH_SECRET` errors or sessions not persisting

- `NEXTAUTH_URL` must match the URL you actually open, including the scheme
  and port (`http://localhost:3000` vs `http://localhost:81`).
- `NEXTAUTH_SECRET` must be set and stable across restarts.

### Mic / camera does not work

- Browsers only allow `getUserMedia` on `https://` or `localhost`.
- The browser will prompt for permission — if you dismissed it, click the
  lock icon in the address bar and allow it.
- The app shows a clear banner when permission is denied; that is expected
  behaviour, not a crash.

### `cp` / `cp -r` errors during build

You are on an old checkout that still has the POSIX build script. Run
`npm run build` (which uses the portable `scripts/build.mjs`) instead of
`npm run build --` with the old script, or pull the latest changes.

### Port already in use

```bash
# find what is holding a port
netstat -ano | findstr :3000     # Windows
lsof -i :3000                    # macOS / Linux
```

Change the port with `PORT=3001 npm start`, or edit the `Caddyfile` if the
conflict is on 81.

### The database looks wrong / you want a clean slate

```bash
rm db/custom.db
bunx prisma db push --accept-data-loss
bun scripts/seed.ts
```

---

## Getting help

- Read the [README](../README.md)
- Open an issue using the **Bug report** template
- Read [CONTRIBUTING.md](../CONTRIBUTING.md) before sending a pull request
