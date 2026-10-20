"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SessionProvider, signOut } from "next-auth/react";
import { ServerTopNav } from "@/components/gamehub/server-top-nav";
import { ChannelTopBar } from "@/components/gamehub/channel-top-bar";
import { ChatArea } from "@/components/gamehub/chat-area";
import { MemberList } from "@/components/gamehub/member-list";
import { ProfilePanel } from "@/components/gamehub/profile-panel";
import { SettingsModal } from "@/components/gamehub/settings-modal";
import { CreateServerModal } from "@/components/gamehub/create-server-modal";
import { FriendsView } from "@/components/gamehub/friends-view";
import { ClansView } from "@/components/gamehub/clans-view";
import { DiscoverView } from "@/components/gamehub/discover-view";
import { ActivitiesPanel } from "@/components/gamehub/activities-panel";
import { QuestsPanel } from "@/components/gamehub/quests-panel";
import { AuthModal } from "@/components/gamehub/auth-modal";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore, useTypingPrune } from "@/lib/socket";
import type { Server, Channel, User, Clan, Quest, Activity } from "@/lib/types";
import { toast } from "sonner";

interface SeedData {
  currentUser: User;
  allServers: (Server & { channels: Channel[] })[];
  allClans: Clan[];
  friends: User[];
  pendingIncoming: { id: string; user: User }[];
  pendingOutgoing: { id: string; user: User }[];
  quests: Quest[];
  activities: Activity[];
}

// Auth gate: shows AuthModal when unauthenticated. Once authed, loads the main app.
function GameHubApp() {
  const [authState, setAuthState] = useState<"loading" | "auth" | "ready">(
    "loading"
  );
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setData = useUIStore((s) => s.setData);
  const setServer = useUIStore((s) => s.setServer);
  const setChannel = useUIStore((s) => s.setChannel);
  const setView = useUIStore((s) => s.setView);
  const showSettings = useUIStore((s) => s.showSettings);
  const showCreateServer = useUIStore((s) => s.showCreateServer);
  const showActivities = useUIStore((s) => s.showActivities);
  const showQuests = useUIStore((s) => s.showQuests);
  const profileUserId = useUIStore((s) => s.profileUserId);
  const showMembers = useUIStore((s) => s.showMembers);
  const showMobileSidebar = useUIStore((s) => s.showMobileSidebar);
  const setMobileSidebar = useUIStore((s) => s.setMobileSidebar);
  const view = useUIStore((s) => s.view);
  const currentServerId = useUIStore((s) => s.currentServerId);
  const currentChannelId = useUIStore((s) => s.currentChannelId);
  const currentUser = useUIStore((s) => s.currentUser);

  const initSocket = useSocketStore((s) => s.initSocket);
  const disconnectSocket = useSocketStore((s) => s.disconnectSocket);
  const setMessages = useSocketStore((s) => s.setMessages);

  const pruneTyping = useTypingPrune();
  const toastShownRef = useRef(false);

  // ===== Check auth on mount =====
  const loadAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        setAuthState("auth");
        return;
      }
      if (!res.ok) {
        setError("Could not reach GameHub servers. Please retry.");
        setAuthState("auth");
        return;
      }
      setAuthState("ready");
    } catch (e) {
      setError("Network error. Please retry.");
      setAuthState("auth");
    }
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  // ===== Load seed-data once authenticated =====
  useEffect(() => {
    if (authState !== "ready") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/seed-data");
        if (res.status === 401) {
          // Session expired (e.g. after logout)
          setAuthState("auth");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SeedData = await res.json();
        if (cancelled) return;
        setData({
          currentUser: data.currentUser,
          allServers: data.allServers as Server[],
          allClans: data.allClans,
          friends: data.friends,
          pendingIncoming: data.pendingIncoming,
          pendingOutgoing: data.pendingOutgoing,
          quests: data.quests,
          activities: data.activities,
        });

        // Pick first server + its #general channel (or first text channel)
        if (data.allServers.length > 0) {
          const firstServer = data.allServers[0];
          setServer(firstServer.id);
          const general = firstServer.channels.find(
            (c) => c.name === "general" && c.type === "text"
          );
          const firstText = firstServer.channels.find((c) => c.type === "text");
          setChannel(general?.id ?? firstText?.id ?? firstServer.channels[0]?.id ?? null);
          setView("server");
        }

        setBooted(true);
      } catch (e: any) {
        if (cancelled) return;
        console.error("[seed-data] failed", e);
        setError(e?.message ?? "Failed to load GameHub data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authState, setData, setServer, setChannel, setView]);

  // ===== Initialize socket once we have a user =====
  useEffect(() => {
    if (!currentUser) return;
    initSocket(currentUser);
  }, [currentUser, initSocket]);

  // ===== Welcome toast =====
  useEffect(() => {
    if (booted && currentUser && !toastShownRef.current) {
      toastShownRef.current = true;
      toast(`Welcome to GameHub, ${currentUser.name}! 🎮`, {
        description: "Drop a hello in #general and explore.",
      });
    }
  }, [booted, currentUser]);

  // ===== Disconnect socket on unmount only =====
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  // ===== Fetch messages for current channel on switch =====
  const loadMessages = useCallback(
    async (serverId: string, channelId: string) => {
      try {
        const res = await fetch(
          `/api/servers/${serverId}/channels/${channelId}/messages`
        );
        if (!res.ok) return;
        const data = await res.json();
        setMessages(channelId, data);
      } catch (e) {
        console.warn("[loadMessages]", e);
      }
    },
    [setMessages]
  );

  useEffect(() => {
    if (!currentServerId || !currentChannelId) return;
    loadMessages(currentServerId, currentChannelId);
  }, [currentServerId, currentChannelId, loadMessages]);

  // ===== Prune typing indicators on interval =====
  useEffect(() => {
    const t = setInterval(() => pruneTyping(), 2000);
    return () => clearInterval(t);
  }, [pruneTyping]);

  // ===== Loading state =====
  if (authState === "loading") {
    return (
      <div className="h-screen bg-[#1a1310] flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#d4a03a] border-t-transparent animate-spin" />
        <p className="text-sm text-[#d4c4a8]">Loading GameHub...</p>
      </div>
    );
  }

  // ===== Auth gate =====
  if (authState === "auth") {
    return (
      <AuthModal
        onSuccess={() => {
          toastShownRef.current = false;
          setBooted(false);
          setAuthState("loading");
          // Reset state then re-check auth so we reload seed-data
          setTimeout(() => loadAuth(), 50);
        }}
      />
    );
  }

  // ===== Error state =====
  if (error && !booted) {
    return (
      <div className="h-screen bg-[#1a1310] flex flex-col items-center justify-center text-white gap-3 p-6">
        <div className="text-[#b04a4a] text-3xl">⚠</div>
        <h1 className="text-lg font-bold">Failed to load GameHub</h1>
        <p className="text-sm text-[#d4c4a8] text-center max-w-md">{error}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#d4a03a] hover:bg-[#b08530] text-white rounded-md text-sm font-semibold"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              signOut({ redirect: false }).then(() => {
                setAuthState("auth");
                setBooted(false);
              });
            }}
            className="px-4 py-2 bg-[#241b16] hover:bg-[#3d302a] text-white rounded-md text-sm font-semibold"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="gamehub-root"
      className="flex flex-col h-screen overflow-hidden text-[#f5e6c8] dark"
    >
      {/* ===== NEW HEARTH LAYOUT: top navigation (no left sidebar) ===== */}
      <ServerTopNav />
      <ChannelTopBar />

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {view === "friends" ? (
          <FriendsView />
        ) : view === "discover" ? (
          <DiscoverView />
        ) : view === "clans" ? (
          <ClansView />
        ) : (
          <ChatArea />
        )}

        {/* Member list (right side, toggleable) */}
        {view === "server" && showMembers && (
          <div className="hidden md:flex shrink-0">
            <MemberList />
          </div>
        )}
      </div>

      {/* Profile panel */}
      <AnimatePresence>
        {profileUserId && (
          <ProfilePanel userId={profileUserId} key={profileUserId} />
        )}
      </AnimatePresence>

      {/* Modals */}
      {showSettings && <SettingsModal />}
      {showCreateServer && <CreateServerModal />}
      {showActivities && <ActivitiesPanel />}
      {showQuests && <QuestsPanel />}
    </div>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <GameHubApp />
    </SessionProvider>
  );
}
