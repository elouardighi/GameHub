#!/usr/bin/env node
/**
 * Cross-platform production build.
 *
 *   npm run build   (or: bun run build)
 *
 * `next build` with `output: "standalone"` does NOT copy the static assets or
 * `public/` into the standalone bundle — the original build script did that with
 * `cp -r`, which only works on POSIX shells. This script does it portably.
 */
import { existsSync, cpSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const step = (msg) => console.log(`\x1b[1m\x1b[36m> ${msg}\x1b[0m`);
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`  \x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
};

function run(cmd, args, cwd = ROOT) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

step("Running next build");
// Invoke the local Next.js CLI directly — no `npx`, which needs a shell on
// Windows and trips Node's DEP0190 warning.
const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextBin)) {
  fail("Next.js is not installed. Run `npm install` first.");
}
run(process.execPath, [nextBin, "build"]);

const standalone = join(ROOT, ".next", "standalone");
if (!existsSync(standalone)) {
  fail("Expected .next/standalone to exist after the build.");
}

step("Copying static assets into the standalone bundle");

// .next/static -> .next/standalone/.next/static
const staticSrc = join(ROOT, ".next", "static");
const staticDest = join(standalone, ".next", "static");
if (existsSync(staticSrc)) {
  mkdirSync(join(standalone, ".next"), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  ok(`.next/static -> ${staticDest.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
}

// public -> .next/standalone/public
const publicSrc = join(ROOT, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standalone, "public"), { recursive: true });
  ok("public -> .next/standalone/public");
}

// The standalone bundle ships a minimal node_modules; the Prisma engine and
// the generated client live in the root install and must be copied over.
step("Copying the Prisma engine and generated client");
let copied = 0;
for (const pkg of ["@prisma", ".prisma"]) {
  const src = join(ROOT, "node_modules", pkg);
  if (!existsSync(src)) continue;
  cpSync(src, join(standalone, "node_modules", pkg), { recursive: true });
  copied++;
}
if (copied) ok(`copied ${copied} Prisma package(s) into the bundle`);
else console.log("  \x1b[33m!\x1b[0m no Prisma packages found in node_modules — skipping");

// Carry .env into the bundle so `node .next/standalone/server.js` boots with
// the right configuration without extra environment variables.
const envSrc = join(ROOT, ".env");
if (existsSync(envSrc)) {
  cpSync(envSrc, join(standalone, ".env"));
  ok(".env -> .next/standalone/.env");
}

console.log("\n\x1b[1m\x1b[32mBuild complete.\x1b[0m Start it with: \x1b[1mnpm start\x1b[0m");
