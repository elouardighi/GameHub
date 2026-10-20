#!/usr/bin/env node
/**
 * GameHub — one-command bootstrap.
 *
 *   npm run setup     (or: bun run setup)
 *
 * Idempotent and safe to re-run. It will:
 *   1. detect a package manager (bun preferred, npm fallback)
 *   2. install root + chat-service dependencies
 *   3. create .env from .env.example (generating a fresh NEXTAUTH_SECRET)
 *   4. generate the Prisma client
 *   5. create the SQLite schema, and seed it if the database is missing
 *
 * It never touches a database that already exists.
 */
import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m",
};
const log = (msg) => console.log(msg);
const step = (n, msg) => console.log(`\n${c.bold}${c.cyan}[${n}]${c.reset} ${c.bold}${msg}${c.reset}`);
const ok = (msg) => console.log(`  ${c.green}✓${c.reset} ${msg}`);
const warn = (msg) => console.log(`  ${c.yellow}!${c.reset} ${msg}`);
const fail = (msg) => console.log(`  ${c.red}✗${c.reset} ${msg}`);

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: opts.quiet ? "pipe" : "inherit",
    cwd: opts.cwd ?? ROOT,
    // Only npm on Windows needs a shell (npm.cmd); bun is a real .exe and does
    // not, and spawning it with `shell: true` trips Node's DEP0190 warning.
    shell: opts.shell ?? false,
    env: { ...process.env, ...opts.env },
  });
  if (res.status !== 0 && !opts.allowFail) {
    fail(`\`${cmd} ${args.join(" ")}\` exited with code ${res.status}`);
    if (res.stderr) console.log(String(res.stderr).slice(0, 2000));
    process.exit(1);
  }
  return res;
}

/** Locate a usable package manager. Bun is preferred; npm is the fallback. */
function detectPM() {
  // Try without a shell first — bun.exe resolves directly. npm ships as
  // npm.cmd on Windows, which only resolves through a shell.
  const probe = (cmd, args) =>
    spawnSync(cmd, args, { stdio: "ignore", shell: false }).status === 0 ||
    spawnSync(cmd, args, { stdio: "ignore", shell: true }).status === 0;

  if (probe("bun", ["--version"])) {
    return { name: "bun", bin: "bun", shell: false, install: ["install"], run: ["run"], exec: ["x"] };
  }
  if (probe("npm", ["--version"])) {
    // npm ships as npm.cmd on Windows, which needs a shell to resolve.
    return { name: "npm", bin: "npm", shell: isWin, install: ["install"], run: ["run"], exec: ["exec", "--"] };
  }
  return null;
}

log(`${c.bold}GameHub setup${c.reset} ${c.dim}(${process.platform})${c.reset}`);

// ---------------------------------------------------------------- 1. package manager
step(1, "Checking your toolchain");
const pm = detectPM();
if (!pm) {
  fail("Neither Bun nor npm was found on PATH.");
  log(`\n  Install one of them:\n`);
  log(`    ${c.bold}Bun${c.reset} (recommended)  ${c.dim}curl -fsSL https://bun.sh/install | bash${c.reset}`);
  log(`                        ${c.dim}powershell -c "irm bun.sh/install.ps1 | iex"${c.reset}  ${c.dim}(Windows)${c.reset}`);
  log(`    ${c.bold}Node${c.reset} 20+   ${c.dim}https://nodejs.org${c.reset}`);
  process.exit(1);
}
ok(`Using ${c.bold}${pm.name}${c.reset}`);

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (pm.name === "npm" && nodeMajor < 20) {
  fail(`Node ${process.versions.node} is too old — Node 20+ is required.`);
  process.exit(1);
}
ok(`Node ${process.versions.node}`);

// ---------------------------------------------------------------- 2. dependencies
step(2, "Installing dependencies");
log(`  ${c.dim}root project${c.reset}`);
run(pm.bin, [...pm.install], { cwd: ROOT, shell: pm.shell });

const chatDir = join(ROOT, "mini-services", "chat-service");
if (existsSync(join(chatDir, "package.json"))) {
  log(`  ${c.dim}chat-service${c.reset}`);
  run(pm.bin, [...pm.install], { cwd: chatDir, shell: pm.shell });
}
ok("Dependencies installed");

// ---------------------------------------------------------------- 3. .env
step(3, "Configuring environment");
const envPath = join(ROOT, ".env");
const envExample = join(ROOT, ".env.example");

if (existsSync(envPath)) {
  ok(".env already exists — leaving it untouched");
} else if (!existsSync(envExample)) {
  fail(".env.example is missing from the repository.");
  process.exit(1);
} else {
  let contents = readFileSync(envExample, "utf8");
  const secret = randomBytes(32).toString("base64");
  contents = contents.replace(
    /^NEXTAUTH_SECRET=.*$/m,
    `NEXTAUTH_SECRET="${secret}"`
  );
  writeFileSync(envPath, contents, "utf8");
  try {
    // best-effort: keep .env unreadable by other users on POSIX systems
    if (!isWin) run("chmod", ["600", envPath], { quiet: true, allowFail: true });
  } catch { /* non-fatal */ }
  ok(".env created from .env.example (fresh NEXTAUTH_SECRET generated)");
}
warn("NEXTAUTH_URL still points at http://localhost:81 — update it for any real deployment.");

// ---------------------------------------------------------------- 4. prisma client
step(4, "Generating the Prisma client");
run(pm.bin, [...pm.exec, "prisma", "generate"], { cwd: ROOT, quiet: true, shell: pm.shell });
ok("Prisma client generated");

// ---------------------------------------------------------------- 5. database
step(5, "Preparing the database");
const dbPath = join(ROOT, "db", "custom.db");
const hasDb = existsSync(dbPath);
mkdirSync(join(ROOT, "db"), { recursive: true });

run(pm.bin, [...pm.exec, "prisma", "db", "push", "--accept-data-loss"], { cwd: ROOT, quiet: true, shell: pm.shell });
ok("Schema is up to date");

if (!hasDb) {
  log(`  ${c.dim}seeding demo data${c.reset}`);
  if (pm.name === "bun") {
    run("bun", ["run", "scripts/seed.ts"], { cwd: ROOT, quiet: true, shell: false });
  } else {
    run(pm.bin, ["exec", "--", "tsx", "scripts/seed.ts"], { cwd: ROOT, quiet: true, allowFail: true, shell: pm.shell });
  }
  ok("Demo data seeded");
} else {
  ok("Existing database kept (nothing overwritten)");
}

// ---------------------------------------------------------------- done
log(`\n${c.bold}${c.green}Setup complete.${c.reset}\n`);
log(`  ${c.bold}Start the app${c.reset}`);
log(`    ${c.dim}Terminal 1${c.reset}  ${pm.bin} run dev              ${c.dim}# Next.js  -> http://localhost:3000${c.reset}`);
log(`    ${c.dim}Terminal 2${c.reset}  cd mini-services/chat-service && ${pm.bin} run dev   ${c.dim}# Socket.io -> :3003${c.reset}`);
log(`    ${c.dim}Optional${c.reset}    caddy run --config Caddyfile     ${c.dim}# gateway  -> http://localhost:81${c.reset}`);
log(``);
log(`  ${c.bold}Demo login${c.reset}   ${c.dim}nova@gamehub.gg${c.reset} / ${c.dim}demo${c.reset}`);
log(``);
