# syntax=docker/dockerfile:1
#
# GameHub — multi-stage production image.
#
#   docker build -t gamehub .
#   docker run -p 3000:3000 -e DATABASE_URL="file:/data/custom.db" gamehub
#
# This image contains only the Next.js standalone server. The Socket.io
# chat-service has its own target, and the Caddy gateway is a separate
# container — see docker-compose.yml for the full three-service stack.
#
# Stages
#   deps     install dependencies with Bun
#   builder  generate the Prisma client + build the app
#   runner   the slim production image (plain Node)

# ---------- deps ----------
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- builder ----------
FROM oven/bun:1-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma needs a resolvable DATABASE_URL to parse the schema, even for
# `generate`. The real value is supplied at runtime.
ENV DATABASE_URL="file:./build.db"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bunx next build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# The standalone output is self-contained apart from the static assets and
# public/ directory, which Next.js leaves out of `output: "standalone"`.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The generated Prisma client resolves the schema through a path relative to
# its own location, which from inside the bundle means ./prisma — so the
# schema has to be copied in as well.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# The standalone bundle ships a minimal node_modules; the Prisma query engine
# and the generated client live in the root install and must be copied over.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# SQLite lives on a volume so the database survives container restarts.
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME ["/data"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/servers').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
