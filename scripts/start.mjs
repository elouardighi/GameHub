#!/usr/bin/env node
/**
 * Start the production standalone server.
 *
 *   npm start   (or: bun run start)
 *
 * Sets NODE_ENV=production and PORT, then runs .next/standalone/server.js.
 * Portable across platforms (no `NODE_ENV=... cmd` shell syntax required).
 */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(ROOT, ".next", "standalone", "server.js");

if (!existsSync(entry)) {
  console.error("\x1b[31mNo production build found.\x1b[0m Run \x1b[1mnpm run build\x1b[0m first.");
  process.exit(1);
}

/**
 * Prisma resolves a relative SQLite path against the directory that holds
 * schema.prisma. That directory moves when the app is bundled for standalone
 * output, so a relative DATABASE_URL like "file:../db/custom.db" would point
 * somewhere different at runtime than it does in development.
 *
 * Resolve it here — against the project's prisma/ directory, which is where
 * schema.prisma lives — and hand the server an absolute path.
 */
function resolveDatabaseUrl(url) {
  if (!url || !url.startsWith("file:")) return url;
  const raw = url.slice("file:".length);
  if (!raw || raw.startsWith("/") || isAbsolute(raw)) return url;
  const absolute = resolve(ROOT, "prisma", raw);
  return `file:${absolute}`;
}

const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: process.env.PORT ?? "3000",
  HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
};

if (env.DATABASE_URL) {
  const resolved = resolveDatabaseUrl(env.DATABASE_URL);
  if (resolved !== env.DATABASE_URL) {
    console.log(`\x1b[2mDATABASE_URL resolved to ${resolved}\x1b[0m`);
    env.DATABASE_URL = resolved;
  }
}

const child = spawn(process.execPath, [entry], {
  cwd: join(ROOT, ".next", "standalone"),
  stdio: "inherit",
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
