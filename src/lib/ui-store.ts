"use client";

import { create } from "zustand";
import type {
  Server,
  Channel,
  User,
  Clan,
  Quest,
  Activity,
  Friendship,
  ViewMode,
  Status,
} from "./types";

interface PendingFriend {
  id: string;
  user: User;
}

interface UIStore {
  // data (loaded once on mount via /api/seed-data)
  currentUser: User | null;
  servers: Server[];
  clans: Clan[];
  friends: User[];
  pendingIncoming: PendingFriend[];
  pendingOutgoing: PendingFriend[];
  quests: Quest[];
  activities: Activity[];

  // navigation
  view: ViewMode;
  currentServerId: string | null;
  currentChannelId: string | null;
  showMembers: boolean;
  showMobileSidebar: boolean;

  // modals / panels
  showSettings: boolean;
  showCreateServer: boolean;
  showClans: boolean;
  showActivities: boolean;
  showQuests: boolean;
  showDiscover: boolean;
  profileUserId: string | null;

  // local voice state for the current user
  voiceJoinedChannelId: string | null;
  voiceMuted: boolean;
  voiceDeafened: boolean;
  voiceVideoOn: boolean;
  voiceStreaming: boolean;

  // reply / edit
  replyTo: { messageId: string; username: string; content: string } | null;
  editingMessageId: string | null;

  // setters
  setData: (data: {
    currentUser: User;
    allServers: Server[];
    allClans: Clan[];
    friends: User[];
    pendingIncoming: PendingFriend[];
    pendingOutgoing: PendingFriend[];
    quests: Quest[];
    activities: Activity[];
  }) => void;
  setView: (view: ViewMode) => void;
  setServer: (serverId: string | null) => void;
  setChannel: (channelId: string | null) => void;
  toggleMembers: () => void;
  setMobileSidebar: (open: boolean) => void;

  openSettings: () => void;
  closeSettings: () => void;
  openCreateServer: () => void;
  closeCreateServer: () => void;
  openClans: () => void;
  closeClans: () => void;
  openActivities: () => void;
  closeActivities: () => void;
  openQuests: () => void;
  closeQuests: () => void;
  openDiscover: () => void;
  closeDiscover: () => void;
  openProfile: (userId: string) => void;
  closeProfile: () => void;

  joinVoice: (channelId: string) => void;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleVideo: () => void;
  toggleStreaming: () => void;

  setReplyTo: (msg: { messageId: string; username: string; content: string } | null) => void;
  setEditingMessageId: (id: string | null) => void;

  addServer: (server: Server) => void;
  upsertServer: (server: Server) => void;
  addServerChannel: (serverId: string, channel: Channel) => void;
  setCurrentUserStatus: (status: Status, customStatus?: string) => void;
  updateCurrentUser: (partial: Partial<User>) => void;
  upsertQuest: (quest: Quest) => void;

  // Friends list mutations
  addFriend: (user: User) => void;
  removeFriend: (userId: string) => void;
  addPendingIncoming: (p: { id: string; user: User }) => void;
  removePendingIncoming: (friendshipId: string) => void;
  addPendingOutgoing: (p: { id: string; user: User }) => void;
  removePendingOutgoing: (friendshipId: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  currentUser: null,
  servers: [],
  clans: [],
  friends: [],
  pendingIncoming: [],
  pendingOutgoing: [],
  quests: [],
  activities: [],

  view: "server",
  currentServerId: null,
  currentChannelId: null,
  showMembers: true,
  showMobileSidebar: false,

  showSettings: false,
  showCreateServer: false,
  showClans: false,
  showActivities: false,
  showQuests: false,
  showDiscover: false,
  profileUserId: null,

  voiceJoinedChannelId: null,
  voiceMuted: false,
  voiceDeafened: false,
  voiceVideoOn: false,
  voiceStreaming: false,

  replyTo: null,
  editingMessageId: null,

  setData: (data) =>
    set({
      currentUser: data.currentUser,
      servers: data.allServers,
      clans: data.allClans,
      friends: data.friends,
      pendingIncoming: data.pendingIncoming,
      pendingOutgoing: data.pendingOutgoing,
      quests: data.quests,
      activities: data.activities,
    }),

  setView: (view) => set({ view, showMobileSidebar: false }),
  setServer: (serverId) => set({ currentServerId: serverId, view: "server" }),
  setChannel: (channelId) => set({ currentChannelId: channelId }),
  toggleMembers: () => set((s) => ({ showMembers: !s.showMembers })),
  setMobileSidebar: (open) => set({ showMobileSidebar: open }),

  openSettings: () => set({ showSettings: true }),
  closeSettings: () => set({ showSettings: false }),
  openCreateServer: () => set({ showCreateServer: true }),
  closeCreateServer: () => set({ showCreateServer: false }),
  openClans: () => set({ showClans: true }),
  closeClans: () => set({ showClans: false }),
  openActivities: () => set({ showActivities: true }),
  closeActivities: () => set({ showActivities: false }),
  openQuests: () => set({ showQuests: true }),
  closeQuests: () => set({ showQuests: false }),
  openDiscover: () => set({ showDiscover: true, view: "discover" }),
  closeDiscover: () => set({ showDiscover: false }),
  openProfile: (userId) => set({ profileUserId: userId }),
  closeProfile: () => set({ profileUserId: null }),

  joinVoice: (channelId) =>
    set({ voiceJoinedChannelId: channelId }),
  leaveVoice: () =>
    set({
      voiceJoinedChannelId: null,
      voiceMuted: false,
      voiceDeafened: false,
      voiceVideoOn: false,
      voiceStreaming: false,
    }),
  toggleMute: () => set((s) => ({ voiceMuted: !s.voiceMuted })),
  toggleDeafen: () => set((s) => ({ voiceDeafened: !s.voiceDeafened })),
  toggleVideo: () => set((s) => ({ voiceVideoOn: !s.voiceVideoOn })),
  toggleStreaming: () => set((s) => ({ voiceStreaming: !s.voiceStreaming })),

  setReplyTo: (msg) => set({ replyTo: msg, editingMessageId: null }),
  setEditingMessageId: (id) => set({ editingMessageId: id, replyTo: null }),

  addServer: (server) =>
    set((s) => ({
      servers: [...s.servers.filter((x) => x.id !== server.id), server],
      currentServerId: server.id,
      currentChannelId: server.channels?.[0]?.id ?? null,
      view: "server",
    })),

  upsertServer: (server) =>
    set((s) => ({
      servers: s.servers.some((x) => x.id === server.id)
        ? s.servers.map((x) => (x.id === server.id ? server : x))
        : [...s.servers, server],
    })),

  addServerChannel: (serverId, channel) =>
    set((s) => ({
      servers: s.servers.map((srv) =>
        srv.id === serverId
          ? {
              ...srv,
              channels: [...(srv.channels ?? []), channel].sort(
                (a, b) => a.position - b.position
              ),
            }
          : srv
      ),
    })),

  setCurrentUserStatus: (status, customStatus) =>
    set((s) => ({
      currentUser: s.currentUser
        ? { ...s.currentUser, status, customStatus: customStatus ?? s.currentUser.customStatus }
        : s.currentUser,
    })),

  updateCurrentUser: (partial) =>
    set((s) => ({
      currentUser: s.currentUser
        ? { ...s.currentUser, ...partial }
        : s.currentUser,
    })),

  upsertQuest: (quest) =>
    set((s) => ({
      quests: s.quests.some((q) => q.id === quest.id)
        ? s.quests.map((q) => (q.id === quest.id ? quest : q))
        : [...s.quests, quest],
    })),

  addFriend: (user) =>
    set((s) => ({
      friends: s.friends.some((f) => f.id === user.id)
        ? s.friends
        : [...s.friends, user],
      pendingIncoming: s.pendingIncoming.filter((p) => p.user.id !== user.id),
      pendingOutgoing: s.pendingOutgoing.filter((p) => p.user.id !== user.id),
    })),

  removeFriend: (userId) =>
    set((s) => ({
      friends: s.friends.filter((f) => f.id !== userId),
    })),

  addPendingIncoming: (p) =>
    set((s) => ({
      pendingIncoming: s.pendingIncoming.some(
        (x) => x.user.id === p.user.id
      )
        ? s.pendingIncoming
        : [...s.pendingIncoming, p],
    })),

  removePendingIncoming: (friendshipId) =>
    set((s) => ({
      pendingIncoming: s.pendingIncoming.filter((p) => p.id !== friendshipId),
    })),

  addPendingOutgoing: (p) =>
    set((s) => ({
      pendingOutgoing: s.pendingOutgoing.some(
        (x) => x.user.id === p.user.id
      )
        ? s.pendingOutgoing
        : [...s.pendingOutgoing, p],
    })),

  removePendingOutgoing: (friendshipId) =>
    set((s) => ({
      pendingOutgoing: s.pendingOutgoing.filter((p) => p.id !== friendshipId),
    })),
}));

// Convenience selectors
export const useCurrentServer = () => {
  return useUIStore((s) =>
    s.servers.find((srv) => srv.id === s.currentServerId) ?? null
  );
};

export const useCurrentChannel = () => {
  return useUIStore((s) => {
    const srv = s.servers.find((srv) => srv.id === s.currentServerId);
    if (!srv) return null;
    return srv.channels?.find((c) => c.id === s.currentChannelId) ?? null;
  });
};

export type { Friendship };
