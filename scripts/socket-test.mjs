#!/usr/bin/env node
/**
 * GameHub real-time (Socket.io) integration test.
 *
 *   npm run test:socket                           # defaults to http://localhost:81
 *   npm run test:socket -- http://localhost:3003  # talk straight to the service
 *
 * Opens two real clients and asserts that every documented Socket.io event is
 * relayed correctly. Requires the chat-service to be running.
 *
 * Note: `send-message` and reactions are broadcast to the `view:{channelId}`
 * room, and voice events to `channel:{channelId}` — so every receiver has to
 * join the corresponding room first. This mirrors how the app behaves.
 */
import { io } from "socket.io-client";

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:81").replace(/\/$/, "");
const CHANNEL = "smoke-channel-1";
const VOICE = "smoke-voice-1";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  ${name}${detail ? `  \x1b[2m-> ${detail}\x1b[0m` : ""}`);
}

const waitFor = (socket, event, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), timeout);
    socket.once(event, (payload) => { clearTimeout(t); resolve(payload); });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(name) {
  const s = io(`${BASE}/?XTransformPort=3003`, {
    path: "/",
    transports: ["websocket", "polling"],
    query: { XTransformPort: "3003" },
    reconnection: false,
    forceNew: true,
    timeout: 10000,
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${name}: connect timeout`)), 12000);
    s.on("connect", () => { clearTimeout(t); console.log(`  \x1b[2m[${name}] connected (${s.id})\x1b[0m`); resolve(s); });
    s.on("connect_error", (e) => { clearTimeout(t); reject(new Error(`${name}: ${e.message}`)); });
  });
}

let a, b;
try {
  console.log(`\n\x1b[1m=== GameHub socket.io test against ${BASE} ===\x1b[0m\n`);

  try {
    a = await connect("A");
    b = await connect("B");
  } catch (e) {
    record("connect two clients", false, e.message);
    process.exit(1);
  }
  record("connect two clients", true);

  // ---------------------------------------------------------------- identity + presence
  {
    const both = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout waiting for both users in users-list")), 6000);
      const onList = (payload) => {
        const names = payload?.users?.map((u) => u.username) ?? [];
        if (names.includes("Alpha") && names.includes("Beta")) {
          clearTimeout(t);
          a.off("users-list", onList);
          resolve(payload);
        }
      };
      a.on("users-list", onList);
    });
    a.emit("identify", { id: "userA", username: "Alpha", avatarColor: "#d4a03a", status: "online" });
    b.emit("identify", { id: "userB", username: "Beta", avatarColor: "#8b3a3a", status: "online" });
    const users = await both;
    const names = users?.users?.map((u) => u.username) ?? [];
    record("identify -> users-list broadcast", names.includes("Alpha") && names.includes("Beta"),
      `users=${JSON.stringify(names)}`);
  }

  a.emit("view-channel", { channelId: CHANNEL });
  b.emit("view-channel", { channelId: CHANNEL });
  await sleep(300);

  // ---------------------------------------------------------------- messaging
  {
    const p = waitFor(b, "new-message");
    a.emit("send-message", { channelId: CHANNEL, userId: "userA", username: "Alpha", avatarColor: "#d4a03a", content: "hello from A" });
    const m = await p;
    record("send-message -> new-message relay", m?.content === "hello from A" && m?.username === "Alpha",
      `content="${m?.content}" from=${m?.username}`);
  }
  {
    const p = waitFor(a, "user-typing");
    b.emit("typing-start", { channelId: CHANNEL, userId: "userB", username: "Beta" });
    const t = await p;
    record("typing-start -> user-typing relay", t?.username === "Beta", `username=${t?.username}`);
  }
  {
    const p = waitFor(a, "user-stopped-typing");
    b.emit("typing-stop", { channelId: CHANNEL, userId: "userB" });
    const s = await p;
    record("typing-stop -> user-stopped-typing relay", s?.userId === "userB", `userId=${s?.userId}`);
  }
  {
    const p = waitFor(b, "reaction-added");
    a.emit("add-reaction", { messageId: "m1", channelId: CHANNEL, emoji: "🔥", userId: "userA", username: "Alpha" });
    const r = await p;
    record("add-reaction -> reaction-added relay", r?.emoji === "🔥", `emoji=${r?.emoji}`);
  }
  {
    const p = waitFor(b, "message-deleted");
    a.emit("delete-message", { messageId: "m1", channelId: CHANNEL });
    const d = await p;
    record("delete-message -> message-deleted relay", d?.messageId === "m1", `id=${d?.messageId}`);
  }
  {
    const p = waitFor(b, "message-edited");
    a.emit("edit-message", { messageId: "m1", channelId: CHANNEL, content: "edited" });
    const e = await p;
    record("edit-message -> message-edited relay", e?.content === "edited", `content=${e?.content}`);
  }
  {
    const p = waitFor(b, "message-pinned");
    a.emit("pin-message", { messageId: "m1", channelId: CHANNEL, pinned: true });
    const pin = await p;
    record("pin-message -> message-pinned relay", pin?.pinned === true, `pinned=${pin?.pinned}`);
  }

  // ---------------------------------------------------------------- voice
  {
    b.emit("join-voice", { channelId: VOICE, userId: "userB", username: "Beta", avatarColor: "#8b3a3a" });
    await sleep(300);
    const p = waitFor(b, "voice-state");
    a.emit("join-voice", { channelId: VOICE, userId: "userA", username: "Alpha", avatarColor: "#d4a03a" });
    const v = await p;
    record("join-voice -> voice-state broadcast", v?.participants?.some((x) => x.userId === "userA"),
      `participants=${JSON.stringify(v?.participants?.map((x) => x.username))}`);
  }
  {
    const p = waitFor(b, "voice-state");
    a.emit("update-voice-state", { channelId: VOICE, userId: "userA", muted: true, speaking: true });
    const v = await p;
    const who = v?.participants?.find((x) => x.userId === "userA");
    record("update-voice-state -> voice-state broadcast", who?.muted === true && who?.speaking === true,
      `muted=${who?.muted} speaking=${who?.speaking}`);
  }
  {
    const p = waitFor(b, "hand-raised");
    a.emit("raise-hand", { channelId: VOICE, userId: "userA", username: "Alpha" });
    const h = await p;
    record("raise-hand -> hand-raised relay", h?.username === "Alpha", `username=${h?.username}`);
  }

  // ---------------------------------------------------------------- webrtc signalling
  {
    const p = waitFor(b, "webrtc-offer");
    a.emit("webrtc-offer", { toUserId: "userB", fromUserId: "userA", offer: { sdp: "v=0 fake" }, channelId: VOICE });
    const o = await p;
    record("webrtc-offer -> webrtc-offer relay", o?.fromUserId === "userA", `from=${o?.fromUserId}`);
  }
  {
    const p = waitFor(b, "webrtc-ice-candidate");
    a.emit("webrtc-ice-candidate", { toUserId: "userB", fromUserId: "userA", candidate: { candidate: "c1" }, channelId: VOICE });
    const c = await p;
    record("webrtc-ice-candidate -> relay", c?.fromUserId === "userA", `from=${c?.fromUserId}`);
  }

  // ---------------------------------------------------------------- status + cleanup
  {
    const p = waitFor(b, "user-status");
    a.emit("update-status", { userId: "userA", status: "dnd", customStatus: "afk" });
    const s = await p;
    record("update-status -> user-status broadcast", s?.status === "dnd", `status=${s?.status}`);
  }
  {
    const p = waitFor(b, "users-list");
    a.close();
    const users = await p;
    const names = users?.users?.map((u) => u.username) ?? [];
    record("disconnect -> users-list cleanup", !names.includes("Alpha"), `users=${JSON.stringify(names)}`);
  }

  b.close();

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n\x1b[1m=== ${pass}/${results.length} passed, ${fail} failed ===\x1b[0m\n`);
  process.exit(fail ? 1 : 0);
} catch (e) {
  console.error("\n\x1b[31mHarness error:\x1b[0m", e);
  process.exit(2);
}
