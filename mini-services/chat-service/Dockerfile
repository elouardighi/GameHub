# GameHub — Socket.io chat-service image
#
#   docker build -f mini-services/chat-service/Dockerfile -t gamehub-chat .
#
# From the repository root.

FROM oven/bun:1-alpine
WORKDIR /app

COPY mini-services/chat-service/package.json mini-services/chat-service/bun.lock ./
RUN bun install --frozen-lockfile

COPY mini-services/chat-service/index.ts ./

ENV PORT=3003
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3003/socket.io/?EIO=4&transport=polling').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "index.ts"]
