"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Clock,
  UserPlus,
  Ban,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  Trophy,
  Rocket,
  Compass,
  X,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./user-avatar";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User } from "@/lib/types";

type Tab = "online" | "all" | "pending" | "blocked" | "add";

export function FriendsView() {
  const friends = useUIStore((s) => s.friends);
  const pendingIncoming = useUIStore((s) => s.pendingIncoming);
  const pendingOutgoing = useUIStore((s) => s.pendingOutgoing);
  const addFriend = useUIStore((s) => s.addFriend);
  const removeFriend = useUIStore((s) => s.removeFriend);
  const removePendingIncoming = useUIStore((s) => s.removePendingIncoming);
  const addPendingOutgoing = useUIStore((s) => s.addPendingOutgoing);
  const removePendingOutgoing = useUIStore((s) => s.removePendingOutgoing);
  const openProfile = useUIStore((s) => s.openProfile);
  const openQuests = useUIStore((s) => s.openQuests);
  const openActivities = useUIStore((s) => s.openActivities);
  const setView = useUIStore((s) => s.setView);
  const userStatuses = useSocketStore((s) => s.userStatuses);

  const [tab, setTab] = useState<Tab>("online");
  const [addInput, setAddInput] = useState("");
  const [addMsg, setAddMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const isUserOnline = (u: User) => {
    const st = userStatuses[u.id] ?? u.status;
    return st !== "offline";
  };

  const pendingList = [...pendingIncoming, ...pendingOutgoing];
  const onlineList = friends.filter(isUserOnline);
  const displayList =
    tab === "online"
      ? onlineList
      : tab === "all"
      ? friends
      : tab === "pending"
      ? pendingList.map((p) => ({ ...p.user, isPending: p.id }))
      : [];

  const handleSendRequest = async () => {
    const identifier = addInput.trim();
    if (!identifier) return;
    setAdding(true);
    setAddMsg(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddMsg({ type: "err", text: data.error ?? "Failed to send request" });
        return;
      }
      if (data.autoAccepted) {
        // They had already sent us a request that was pending — it's now accepted
        addFriend(data.user);
        toast.success(`${data.user.name} is now your friend!`);
      } else {
        addPendingOutgoing({ id: data.id, user: data.user });
        toast.success(`Friend request sent to ${data.user.name}!`);
      }
      setAddInput("");
    } catch (e) {
      setAddMsg({ type: "err", text: "Network error" });
    } finally {
      setAdding(false);
    }
  };

  const handleAccept = async (friendshipId: string, user: User) => {
    setBusy(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not accept request");
        return;
      }
      const data = await res.json();
      if (data.user) {
        addFriend(data.user);
        removePendingIncoming(friendshipId);
        toast.success(`${data.user.name} is now your friend!`);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (friendshipId: string) => {
    setBusy(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not reject request");
        return;
      }
      removePendingIncoming(friendshipId);
      removePendingOutgoing(friendshipId);
      toast("Request dismissed");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, user: User) => {
    setBusy(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not remove friend");
        return;
      }
      removeFriend(user.id);
      toast.success(`Removed ${user.name} from friends`);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  // Unfriend flow: DELETE /api/friends/[userId] — the route smartly resolves
  // either a friendshipId or a userId.
  const handleUnfriendByLookup = async (user: User) => {
    setBusy(`unfriend-${user.id}`);
    try {
      const res = await fetch(`/api/friends/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Could not remove friend");
        return;
      }
      removeFriend(user.id);
      toast.success(`Removed ${user.name} from friends`);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-1 min-w-0">
      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#2e2520]">
        {/* Header */}
        <header className="h-12 px-4 flex items-center border-b border-[#1a1310] shadow-sm shrink-0 gap-3">
          <Users size={22} className="text-[#6a5a50]" />
          <h1 className="font-semibold text-white text-sm">Friends</h1>
          <span className="text-xs text-[#6a5a50] bg-[#1a1310] px-2 py-0.5 rounded">
            {friends.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openQuests}
              className="flex items-center gap-1.5 text-xs px-2 py-1 hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white rounded"
            >
              <Trophy size={16} /> Quests
            </button>
            <button
              type="button"
              onClick={openActivities}
              className="flex items-center gap-1.5 text-xs px-2 py-1 hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white rounded"
            >
              <Rocket size={16} /> Activities
            </button>
            <button
              type="button"
              onClick={() => setView("clans")}
              className="flex items-center gap-1.5 text-xs px-2 py-1 hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white rounded"
            >
              <Sparkles size={16} /> Clans
            </button>
            <button
              type="button"
              onClick={() => setView("discover")}
              className="flex items-center gap-1.5 text-xs px-2 py-1 hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white rounded"
            >
              <Compass size={16} /> Discover
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-[#1a1310] px-3 py-2 flex items-center gap-1">
          <TabButton active={tab === "online"} onClick={() => setTab("online")} label="Online" count={onlineList.length} />
          <TabButton active={tab === "all"} onClick={() => setTab("all")} label="All" count={friends.length} />
          <TabButton
            active={tab === "pending"}
            onClick={() => setTab("pending")}
            label="Pending"
            count={pendingList.length}
          />
          <TabButton active={tab === "blocked"} onClick={() => setTab("blocked")} label="Blocked" count={0} />
          <button
            type="button"
            onClick={() => setTab("add")}
            className={cn(
              "ml-1 px-3 h-8 rounded-[4px] text-sm font-medium",
              tab === "add"
                ? "bg-[#8bb04a]/30 text-[#8bb04a]"
                : "bg-[#8bb04a] hover:bg-[#6b8b3a] text-white"
            )}
          >
            <span className="text-lg leading-none">+</span> Add Friend
          </button>
        </div>

        <div className="flex-1 overflow-y-auto chat-scroll px-4 py-2">
          {tab === "add" ? (
            <div className="py-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide mb-2">
                Add Friend
              </h2>
              <p className="text-sm text-[#6a5a50] mb-3">
                You can add friends with their GameHub username or email.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={addInput}
                  onChange={(e) => setAddInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendRequest();
                  }}
                  placeholder="nova@gamehub.gg or NovaStrike"
                  className="flex-1 bg-[#1a1310] text-[#f5e6c8] placeholder:text-[#6a5a50] text-sm rounded-md px-3 py-2.5 outline-none border border-[#1a1310] focus:border-[#d4a03a]"
                />
                <button
                  type="button"
                  onClick={handleSendRequest}
                  disabled={!addInput.trim() || adding}
                  className="px-5 py-2 bg-[#d4a03a] hover:bg-[#b08530] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium flex items-center gap-2"
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : null}
                  Send Friend Request
                </button>
              </div>
              {addMsg && (
                <div
                  className={cn(
                    "text-sm rounded-md p-3 flex items-center gap-2",
                    addMsg.type === "ok"
                      ? "text-[#8bb04a] bg-[#8bb04a]/10 border border-[#8bb04a]/30"
                      : "text-[#b04a4a] bg-[#b04a4a]/10 border border-[#b04a4a]/30"
                  )}
                >
                  {addMsg.type === "ok" ? "✓" : "⚠"}
                  {addMsg.text}
                </div>
              )}
              <div className="mt-4 text-xs text-[#6a5a50]">
                Try: <code className="text-[#d4c4a8]">nova@gamehub.gg</code> ·{" "}
                <code className="text-[#d4c4a8]">kira@gamehub.gg</code> ·{" "}
                <code className="text-[#d4c4a8]">VexInfinity</code>
              </div>
            </div>
          ) : displayList.length === 0 ? (
            <div className="py-8 text-center text-[#6a5a50]">
              <Users size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {tab === "pending"
                  ? "No pending friend requests — try adding someone!"
                  : tab === "online"
                  ? "No friends online right now."
                  : "No friends yet — try adding someone!"}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-xs uppercase font-semibold text-[#6a5a50] tracking-wide mt-4 mb-2">
                {tab === "pending" ? "Pending" : tab === "online" ? "Online" : "All Friends"} — {displayList.length}
              </h2>
              {displayList.map((u: any) => {
                const isPendingIncoming = pendingIncoming.some(
                  (p) => p.user.id === u.id
                );
                const isPendingOutgoing = pendingOutgoing.some(
                  (p) => p.user.id === u.id
                );
                const status = userStatuses[u.id] ?? u.status;
                const online = isUserOnline(u);
                return (
                  <FriendRow
                    key={u.id + (u.isPending ?? "")}
                    user={u}
                    online={online}
                    status={status}
                    isPending={!!u.isPending}
                    isPendingIncoming={isPendingIncoming}
                    isPendingOutgoing={isPendingOutgoing}
                    busy={busy === (u.isPending ?? `unfriend-${u.id}`)}
                    onMessage={() => openProfile(u.id)}
                    onProfile={() => openProfile(u.id)}
                    onAccept={() =>
                      handleAccept(u.isPending, u)
                    }
                    onReject={() => handleReject(u.isPending)}
                    onRemove={() => handleUnfriendByLookup(u)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right empty state column */}
      <aside className="w-[360px] shrink-0 bg-[#241b16] border-l border-[#1a1310] hidden xl:flex flex-col items-center justify-center text-center p-6">
        <div className="w-24 h-24 rounded-full bg-[#1a1310] flex items-center justify-center text-[#d4a03a] mb-4">
          <Users size={48} />
        </div>
        <h3 className="text-base font-bold text-white mb-2">
          Your friends list is the place to be
        </h3>
        <p className="text-sm text-[#6a5a50]">
          See who&apos;s online, get into voice chat, and never miss a beat with the
          squad. Select a friend to start chatting.
        </p>
      </aside>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-sm font-medium transition-colors",
        active
          ? "bg-[#4a3a30] text-white"
          : "text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="bg-[#b04a4a] text-white text-[10px] font-bold rounded-full px-1.5 min-w-[16px] h-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}

function FriendRow({
  user,
  online,
  status,
  isPending,
  isPendingIncoming,
  isPendingOutgoing,
  busy,
  onMessage,
  onProfile,
  onAccept,
  onReject,
  onRemove,
}: {
  user: User;
  online: boolean;
  status: string;
  isPending: boolean;
  isPendingIncoming: boolean;
  isPendingOutgoing: boolean;
  busy?: boolean;
  onMessage: () => void;
  onProfile: () => void;
  onAccept: () => void;
  onReject: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      className="flex items-center gap-3 px-2 py-2.5 hover:bg-[#3d302a]/50 rounded-[4px] group cursor-pointer border-t border-[#4a3a30]/40"
      onClick={onProfile}
    >
      <UserAvatar
        name={user.name}
        color={user.avatarColor}
        size="md"
        status={online ? status : "offline"}
        showStatus
        ringColor="#241b16"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white truncate">
            {user.name}
          </span>
          {isPending && (
            <Clock size={12} className="text-[#d4a03a] shrink-0" />
          )}
        </div>
        <div className="text-xs text-[#6a5a50] truncate">
          {user.customStatus || (online ? STATUS_LABEL(status) : "Offline")}
        </div>
      </div>
      <div
        className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {isPending ? (
          isPendingIncoming ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                disabled={busy}
                className="w-9 h-9 rounded-full bg-[#8bb04a]/20 hover:bg-[#8bb04a]/30 text-[#8bb04a] flex items-center justify-center disabled:opacity-50"
                aria-label="Accept"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={16} />}
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="w-9 h-9 rounded-full bg-[#b04a4a]/20 hover:bg-[#b04a4a]/30 text-[#b04a4a] flex items-center justify-center disabled:opacity-50"
                aria-label="Ignore"
              >
                <Ban size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6a5a50] px-2">Outgoing request</span>
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="w-9 h-9 rounded-full bg-[#b04a4a]/20 hover:bg-[#b04a4a]/30 text-[#b04a4a] flex items-center justify-center"
                aria-label="Cancel request"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
              </button>
            </div>
          )
        ) : (
          <>
            <button
              type="button"
              onClick={onMessage}
              className="w-9 h-9 rounded-full bg-[#241b16] hover:bg-[#1a1310] text-[#d4c4a8] hover:text-white flex items-center justify-center"
              aria-label="Message"
            >
              <MessageSquare size={16} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-[#241b16] hover:bg-[#1a1310] text-[#d4c4a8] hover:text-white flex items-center justify-center"
                  aria-label="More"
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]"
              >
                <DropdownMenuItem
                  onClick={onMessage}
                  className="hover:bg-[#3d302a] cursor-pointer"
                >
                  <MessageSquare size={14} className="mr-2" /> Message
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onProfile}
                  className="hover:bg-[#3d302a] cursor-pointer"
                >
                  <Users size={14} className="mr-2" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onRemove}
                  className="hover:bg-[#b04a4a] hover:text-white text-[#b04a4a] cursor-pointer"
                >
                  <X size={14} className="mr-2" /> Remove Friend
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </motion.div>
  );
}

function STATUS_LABEL(status: string) {
  switch (status) {
    case "online":
      return "Online";
    case "idle":
      return "Idle";
    case "dnd":
      return "Do Not Disturb";
    default:
      return "Offline";
  }
}
