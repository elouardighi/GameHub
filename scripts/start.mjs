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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(ROOT, ".next", "standalone", "server.js");

if (!existsSync(entry)) {
  console.error("\x1b[31mNo production build found.\x1b[0m Run \x1b[1mnpm run build\x1b[0m first.");
  process.exit(1);
}

const child = spawn(process.execPath, [entry], {
  cwd: join(ROOT, ".next", "standalone"),
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: process.env.PORT ?? "3000",
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
