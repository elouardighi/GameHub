#!/usr/bin/env node
/**
 * GameHub API smoke test.
 *
 *   npm run test:api                          # defaults to http://localhost:81
 *   npm run test:api -- http://localhost:3000  # or point it anywhere
 *
 * Exercises the full API surface against a running server: auth guards,
 * signup/signin/signout, the two-user friend flow, quests, clans, activities,
 * servers, channels, messages, threads and search.
 *
 * Exits non-zero if anything fails, so it can gate a CI job.
 */
const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:81").replace(/\/$/, "");

const results = [];
const jar = new Map();

const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

function absorb(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    if (i < 0) continue;
    const name = kv.slice(0, i);
    const val = kv.slice(i + 1);
    if (val === "") jar.delete(name);
    else jar.set(name, val);
  }
}

const hasSessionCookie = () =>
  jar.has("next-auth.session-token") || jar.has("__Secure-next-auth.session-token");

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  ${name}${detail ? `  \x1b[2m-> ${detail}\x1b[0m` : ""}`);
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const ck = cookieHeader();
  if (ck) headers["Cookie"] = ck;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  absorb(res);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

/**
 * NextAuth credentials sign-in.
 *
 * The CSRF token cookie MUST ride along with the callback POST or NextAuth
 * silently rejects the sign-in. This clears the jar first so each call is a
 * fresh session.
 */
async function signIn(email, password) {
  jar.clear();
  const csrfRes = await req("/api/auth/csrf");
  const csrfToken = csrfRes.json?.csrfToken ?? "";
  const body = new URLSearchParams({ csrfToken, email, password, callbackUrl: BASE, json: "true" });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader() },
    body,
    redirect: "manual",
  });
  absorb(res);
  const session = await req("/api/auth/session");
  return { ok: hasSessionCookie() && session.json?.user?.email === email, status: res.status, session };
}

const DEMO_EMAIL = "nova@gamehub.gg";
const DEMO_PASSWORD = "demo";

try {
  console.log(`\n\x1b[1m=== GameHub API smoke test against ${BASE} ===\x1b[0m\n`);

  // ------------------------------------------------------------ public + guards
  {
    const r = await req("/");
    record("GET / (SSR page)", r.status === 200 && /GameHub|<html/i.test(r.text),
      `status=${r.status} len=${r.text.length}`);
  }

  const servers = await req("/api/servers");
  record("GET /api/servers", servers.status === 200 && servers.json?.length > 0,
    `status=${servers.status} count=${servers.json?.length}`);
  const serverId = servers.json?.[0]?.id;

  const clans = await req("/api/clans");
  record("GET /api/clans", clans.status === 200 && clans.json?.length > 0, `count=${clans.json?.length}`);

  const activities = await req("/api/activities");
  record("GET /api/activities", activities.status === 200 && activities.json?.length > 0,
    `count=${activities.json?.length}`);

  for (const p of ["/api/auth/me", "/api/seed-data", "/api/quests", "/api/friends"]) {
    const r = await req(p);
    record(`GET ${p} (unauthenticated -> 401)`, r.status === 401, `status=${r.status}`);
  }

  // ------------------------------------------------------------ signup + signin
  const email = `smoke_${Date.now()}@example.com`;
  const password = "smoketest123";
  const signup = await req("/api/auth/signup", { method: "POST", body: { email, name: "SmokeTester", password } });
  record("POST /api/auth/signup", signup.status === 200 || signup.status === 201,
    `status=${signup.status} ${JSON.stringify(signup.json)?.slice(0, 80)}`);

  {
    const r = await signIn(email, password);
    record("POST /api/auth/callback/credentials (signin)", r.ok, `user=${r.session.json?.user?.email}`);
  }
  {
    const r = await req("/api/auth/session");
    record("GET /api/auth/session (authenticated)", r.status === 200 && r.json?.user?.email === email,
      `status=${r.status} user=${r.json?.user?.email}`);
  }
  {
    const r = await req("/api/auth/me");
    record("GET /api/auth/me (authenticated)", r.status === 200 && r.json?.email === email, `status=${r.status}`);
  }

  // ------------------------------------------------------------ seed data
  {
    const r = await req("/api/seed-data");
    const d = r.json ?? {};
    const ok = r.status === 200 && Array.isArray(d.allServers) && Array.isArray(d.allClans) && Array.isArray(d.quests);
    record("GET /api/seed-data (authenticated)", ok,
      `status=${r.status} allServers=${d.allServers?.length} allClans=${d.allClans?.length} quests=${d.quests?.length}`);
  }

  const quests = await req("/api/quests");
  record("GET /api/quests (authenticated)", quests.status === 200 && quests.json?.length > 0,
    `status=${quests.status} count=${quests.json?.length}`);

  // ------------------------------------------------------------ servers / channels / messages
  let channelId = null;
  {
    const r = await req(`/api/servers/${serverId}`);
    channelId = r.json?.channels?.[0]?.id ?? null;
    record("GET /api/servers/[id]", r.status === 200 && Array.isArray(r.json?.channels),
      `status=${r.status} channels=${r.json?.channels?.length}`);
  }
  {
    const r = await req(`/api/servers/${serverId}/members`);
    record("GET /api/servers/[id]/members", r.status === 200 && Array.isArray(r.json),
      `status=${r.status} count=${r.json?.length}`);
  }
  {
    const r = await req(`/api/servers/${serverId}/join`, { method: "POST" });
    record("POST /api/servers/[id]/join", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }
  {
    const r = await req(`/api/servers/${serverId}/channels`, {
      method: "POST",
      body: { name: `smoke-${Date.now() % 100000}`, type: "text", topic: "smoke test" },
    });
    record("POST /api/servers/[id]/channels", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }
  {
    const r = await req(`/api/servers/${serverId}/channels/${channelId}/messages`, {
      method: "POST",
      body: { content: "smoke test message from the API harness" },
    });
    record("POST .../channels/[channelId]/messages", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }
  {
    const r = await req(`/api/servers/${serverId}/channels/${channelId}/messages`);
    record("GET .../channels/[channelId]/messages", r.status === 200 && Array.isArray(r.json),
      `status=${r.status} count=${r.json?.length}`);
  }
  {
    const r = await req(`/api/servers/${serverId}/channels/${channelId}/threads`, {
      method: "POST",
      body: { name: "smoke thread" },
    });
    record("POST .../channels/[channelId]/threads", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }
  {
    const r = await req(`/api/servers/${serverId}/search?q=smoke`);
    record("GET /api/servers/[id]/search", r.status === 200, `status=${r.status}`);
  }

  // ------------------------------------------------------------ profile
  {
    const r = await req("/api/me", { method: "PATCH", body: { bio: "smoke tested", customStatus: "testing" } });
    record("PATCH /api/me", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }
  {
    const r = await req("/api/me/settings", { method: "PATCH", body: { micEnabled: false, videoEnabled: false } });
    record("PATCH /api/me/settings", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }

  // ------------------------------------------------------------ friends (two-user flow)
  {
    const r = await req("/api/friends");
    record("GET /api/friends", r.status === 200, `status=${r.status}`);
  }
  let friendshipId = null;
  {
    const r = await req("/api/friends/request", { method: "POST", body: { identifier: DEMO_EMAIL } });
    friendshipId = r.json?.id ?? null;
    record("POST /api/friends/request {identifier}", r.status === 200 && !!friendshipId,
      `status=${r.status} id=${friendshipId} ${r.json?.error ?? ""}`);
  }
  if (friendshipId) {
    {
      const r = await req(`/api/friends/${friendshipId}/accept`, { method: "POST" });
      record("POST /api/friends/[id]/accept by requester -> 403", r.status === 403, `status=${r.status} ${r.json?.error ?? ""}`);
    }
    {
      const r = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      record(`Sign in as demo user ${DEMO_EMAIL}`, r.ok, `user=${r.session.json?.user?.email}`);
    }
    {
      const r = await req(`/api/friends/${friendshipId}/accept`, { method: "POST" });
      record("POST /api/friends/[id]/accept by addressee -> 200", r.status === 200, `status=${r.status} ${r.json?.error ?? ""}`);
    }
    {
      const r = await req("/api/friends");
      const names = (r.json?.friends ?? []).map((f) => f.email);
      record("GET /api/friends shows the new friend", r.status === 200 && names.includes(email),
        `friends=${names.length}`);
    }
    {
      const r = await req(`/api/friends/${friendshipId}`, { method: "DELETE" });
      record("DELETE /api/friends/[id] (unfriend)", r.status >= 200 && r.status < 300, `status=${r.status}`);
    }
  }

  // back to the throwaway account for the remaining checks
  {
    const r = await signIn(email, password);
    record("Re-signin as the test user", r.ok, `user=${r.session.json?.user?.email}`);
  }

  // ------------------------------------------------------------ quests
  const easyQuest = quests.json?.find((q) => q.progressGoal <= 2) ?? quests.json?.[0];
  {
    const r = await req(`/api/quests/${easyQuest?.id}/track`, { method: "POST" });
    record("POST /api/quests/[id]/track", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }
  {
    const r = await req(`/api/quests/${easyQuest?.id}/claim`, { method: "POST" });
    record("POST /api/quests/[id]/claim before goal -> 400", r.status === 400, `status=${r.status} ${r.json?.error ?? ""}`);
  }
  {
    const r = await req(`/api/quests/${easyQuest?.id}/increment`, { method: "POST" });
    record("POST /api/quests/[id]/increment", r.status >= 200 && r.status < 300,
      `status=${r.status} progress=${r.json?.progress}/${easyQuest?.progressGoal}`);
  }
  {
    const need = (easyQuest?.progressGoal ?? 1) - 1;
    for (let i = 0; i < need; i++) await req(`/api/quests/${easyQuest?.id}/increment`, { method: "POST" });
    const r = await req(`/api/quests/${easyQuest?.id}/claim`, { method: "POST" });
    record("POST /api/quests/[id]/claim at goal -> 200", r.status === 200,
      `status=${r.status} completed=${r.json?.completed} points=${r.json?.points} ${r.json?.error ?? ""}`);
  }
  {
    const r = await req(`/api/quests/${easyQuest?.id}/claim`, { method: "POST" });
    record("POST /api/quests/[id]/claim twice -> 400", r.status === 400, `status=${r.status} ${r.json?.error ?? ""}`);
  }

  // ------------------------------------------------------------ clans
  {
    const r = await req(`/api/clans/${clans.json?.[0]?.id}`);
    record("GET /api/clans/[id]", r.status === 200, `status=${r.status}`);
  }
  {
    const r = await req(`/api/clans/${clans.json?.[0]?.id}/apply`, {
      method: "POST",
      body: { answer: "smoke test application" },
    });
    record("POST /api/clans/[id]/apply", r.status >= 200 && r.status < 300, `status=${r.status} ${r.json?.error ?? ""}`);
  }
  {
    const r = await req("/api/clans/applications");
    record("GET /api/clans/applications", r.status === 200, `status=${r.status}`);
  }

  // ------------------------------------------------------------ activities
  {
    const r = await req(`/api/activities/${activities.json?.[0]?.id}/launch`, { method: "POST" });
    record("POST /api/activities/[id]/launch", r.status >= 200 && r.status < 300, `status=${r.status}`);
  }

  // ------------------------------------------------------------ signout
  {
    // NextAuth rejects a sign-out without the CSRF token (302 -> ?csrf=true)
    // and leaves the session alive, so send it exactly like the app does.
    const csrfRes = await req("/api/auth/csrf");
    const csrfToken = csrfRes.json?.csrfToken ?? "";
    const res = await fetch(`${BASE}/api/auth/signout`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader() },
      body: new URLSearchParams({ csrfToken, callbackUrl: BASE, json: "true" }),
      redirect: "manual",
    });
    absorb(res);
    record("POST /api/auth/signout (with csrf token)", res.status === 200 && !hasSessionCookie(),
      `status=${res.status} sessionCookie=${hasSessionCookie()}`);
  }
  {
    const r = await req("/api/auth/me");
    record("GET /api/auth/me after signout -> 401", r.status === 401, `status=${r.status}`);
  }

  // ------------------------------------------------------------ summary
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n\x1b[1m=== ${pass}/${results.length} passed, ${fail} failed ===\x1b[0m\n`);
  if (fail) {
    console.log("Failures:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
  }
  process.exit(fail ? 1 : 0);
} catch (e) {
  console.error("\n\x1b[31mHarness error:\x1b[0m", e);
  process.exit(2);
}
