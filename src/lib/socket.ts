"use client";

import { create } from "zustand";
import { io as clientIo, type Socket } from "socket.io-client";
import type {
  Message,
  VoiceParticipant,
  TypingUser,
  User,
  Status,
} from "./types";

// Stable empty array constants - prevent React 19 useSyncExternalStore infinite loops
// when selecting `s.messages[channelId] ?? []` etc.
export const EMPTY_MESSAGES: Message[] = [];
export const EMPTY_TYPING: TypingUser[] = [];
export const EMPTY_VOICE: VoiceParticipant[] = [];
export const EMPTY_RAISED: string[] = [];
export const EMPTY_USERS: User[] = [];

// ===== Singleton socket instance =====
let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

function ensureSocket(): Socket {
  if (socket) return socket;
  socket = clientIo("/?XTransformPort=3003", {
    transports: ["websocket", "polling"],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });
  return socket;
}

interface SocketStore {
  // state
  socket: Socket | null;
  isConnected: boolean;
  currentUserId: string | null;
  currentUser: User | null;
  onlineUsers: User[];
  typingUsers: Record<string, TypingUser[]>;
  voiceParticipants: Record<string, VoiceParticipant[]>;
  messages: Record<string, Message[]>;
  raisedHands: Record<string, string[]>; // channelId -> userIds with raised hands
  userStatuses: Record<string, Status>;

  // setters
  setCurrentUser: (user: User) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  editMessage: (channelId: string, messageId: string, content: string) => void;
  pinMessage: (channelId: string, messageId: string, pinned: boolean) => void;
  setUserStatus: (userId: string, status: Status) => void;
  setOnlineUsers: (users: User[]) => void;
  setVoiceParticipants: (channelId: string, participants: VoiceParticipant[]) => void;
  addTypingUser: (channelId: string, user: TypingUser) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  addReaction: (channelId: string, messageId: string, emoji: string, userId: string, username: string) => void;
  removeReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  addRaisedHand: (channelId: string, userId: string) => void;

  // socket actions
  initSocket: (user: User) => void;
  disconnectSocket: () => void;
  joinChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string, replyToId?: string) => void;
  deleteMessageEmit: (messageId: string, channelId: string) => void;
  editMessageEmit: (messageId: string, channelId: string, content: string) => void;
  pinMessageEmit: (messageId: string, channelId: string, pinned: boolean) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  addReactionEmit: (messageId: string, channelId: string, emoji: string) => void;
  removeReactionEmit: (messageId: string, channelId: string, emoji: string) => void;
  joinVoice: (channelId: string) => void;
  leaveVoice: (channelId: string) => void;
  updateVoiceState: (channelId: string, partial: Partial<VoiceParticipant>) => void;
  raiseHand: (channelId: string) => void;
  updateStatus: (status: Status, customStatus?: string) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  currentUserId: null,
  currentUser: null,
  onlineUsers: [],
  typingUsers: {},
  voiceParticipants: {},
  messages: {},
  raisedHands: {},
  userStatuses: {},

  setCurrentUser: (user) =>
    set({ currentUser: user, currentUserId: user.id }),

  setMessages: (channelId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [channelId]: messages },
    })),

  addMessage: (channelId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] ?? []), message],
      },
    })),

  deleteMessage: (channelId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).filter(
          (m) => m.id !== messageId
        ),
      },
    })),

  editMessage: (channelId, messageId, content) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, content, isEdited: true } : m
        ),
      },
    })),

  pinMessage: (channelId, messageId, pinned) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, isPinned: pinned } : m
        ),
      },
    })),

  setUserStatus: (userId, status) =>
    set((state) => ({
      userStatuses: { ...state.userStatuses, [userId]: status },
    })),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setVoiceParticipants: (channelId, participants) =>
    set((state) => ({
      voiceParticipants: {
        ...state.voiceParticipants,
        [channelId]: participants,
      },
    })),

  addTypingUser: (channelId, user) =>
    set((state) => {
      const current = state.typingUsers[channelId] ?? [];
      if (current.some((u) => u.userId === user.userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: [...current, user].slice(-5),
        },
      };
    }),

  removeTypingUser: (channelId, userId) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: (state.typingUsers[channelId] ?? []).filter(
          (u) => u.userId !== userId
        ),
      },
    })),

  addReaction: (channelId, messageId, emoji, userId, _username) =>
    set((state) => {
      const list = state.messages[channelId] ?? [];
      const updated = list.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          return {
            ...m,
            reactions: m.reactions.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    reactedByMe: r.reactedByMe || userId === get().currentUserId,
                  }
                : r
            ),
          };
        }
        return {
          ...m,
          reactions: [
            ...m.reactions,
            {
              emoji,
              count: 1,
              reactedByMe: userId === get().currentUserId,
            },
          ],
        };
      });
      return { messages: { ...state.messages, [channelId]: updated } };
    }),

  removeReaction: (channelId, messageId, emoji, userId) =>
    set((state) => {
      const list = state.messages[channelId] ?? [];
      const updated = list.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          reactions: m.reactions
            .map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: Math.max(0, r.count - 1),
                    reactedByMe:
                      r.reactedByMe && userId !== get().currentUserId,
                  }
                : r
            )
            .filter((r) => r.count > 0),
        };
      });
      return { messages: { ...state.messages, [channelId]: updated } };
    }),

  addRaisedHand: (channelId, userId) =>
    set((state) => {
      const current = state.raisedHands[channelId] ?? [];
      if (current.includes(userId)) return state;
      return {
        raisedHands: { ...state.raisedHands, [channelId]: [...current, userId] },
      };
    }),

  // ===== socket actions =====

  initSocket: (user) => {
    if (socket?.connected) {
      socket.emit("identify", {
        id: user.id,
        username: user.name,
        avatarColor: user.avatarColor,
        status: user.status,
        customStatus: user.customStatus ?? "",
      });
      return;
    }
    const s = ensureSocket();
    set({
      socket: s,
      currentUserId: user.id,
      currentUser: user,
    });

    // Wire up event listeners (idempotent — guarded by a __bound flag)
    const anySocket = s as unknown as { __bound?: boolean };
    if (anySocket.__bound) {
      s.emit("identify", {
        id: user.id,
        username: user.name,
        avatarColor: user.avatarColor,
        status: user.status,
        customStatus: user.customStatus ?? "",
      });
      return;
    }
    anySocket.__bound = true;

    s.on("connect", () => {
      set({ isConnected: true });
      s.emit("identify", {
        id: user.id,
        username: user.name,
        avatarColor: user.avatarColor,
        status: user.status,
        customStatus: user.customStatus ?? "",
      });
    });

    s.on("disconnect", () => {
      set({ isConnected: false });
    });

    s.on("reconnect", () => {
      const cur = get().currentUser;
      if (cur) {
        s.emit("identify", {
          id: cur.id,
          username: cur.name,
          avatarColor: cur.avatarColor,
          status: cur.status,
          customStatus: cur.customStatus ?? "",
        });
      }
    });

    s.on("users-list", (data: { users: User[] }) => {
      set({ onlineUsers: data.users });
    });

    s.on("user-status", (data: { userId: string; status: Status }) => {
      get().setUserStatus(data.userId, data.status);
    });

    s.on("new-message", (message: Message) => {
      // Remove the sender from typing list for this channel
      get().removeTypingUser(message.channelId, message.userId);
      get().addMessage(message.channelId, message);
    });

    s.on("message-deleted", (data: { messageId: string; channelId: string }) => {
      get().deleteMessage(data.channelId, data.messageId);
    });

    s.on("message-edited", (data: { messageId: string; channelId: string; content: string }) => {
      get().editMessage(data.channelId, data.messageId, data.content);
    });

    s.on("message-pinned", (data: { messageId: string; channelId: string; pinned: boolean }) => {
      get().pinMessage(data.channelId, data.messageId, data.pinned);
    });

    s.on("user-typing", (data: { userId: string; username: string; channelId: string }) => {
      if (data.userId === get().currentUserId) return;
      get().addTypingUser(data.channelId, {
        userId: data.userId,
        username: data.username,
        timestamp: Date.now(),
      });
    });

    s.on("user-stopped-typing", (data: { userId: string; channelId: string }) => {
      get().removeTypingUser(data.channelId, data.userId);
    });

    s.on("reaction-added", (data: { messageId: string; channelId: string; emoji: string; userId: string; username: string }) => {
      get().addReaction(data.channelId, data.messageId, data.emoji, data.userId, data.username);
    });

    s.on("reaction-removed", (data: { messageId: string; channelId: string; emoji: string; userId: string }) => {
      get().removeReaction(data.channelId, data.messageId, data.emoji, data.userId);
    });

    s.on("voice-state", (data: { channelId: string; participants: VoiceParticipant[] }) => {
      get().setVoiceParticipants(data.channelId, data.participants);
    });

    s.on("hand-raised", (data: { channelId: string; userId: string; username: string }) => {
      get().addRaisedHand(data.channelId, data.userId);
    });

    s.on("connect_error", (err: Error) => {
      console.warn("[socket] connect_error", err.message);
    });

    if (s.connected) {
      s.emit("identify", {
        id: user.id,
        username: user.name,
        avatarColor: user.avatarColor,
        status: user.status,
        customStatus: user.customStatus ?? "",
      });
    }
  },

  disconnectSocket: () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    set({
      socket: null,
      isConnected: false,
      onlineUsers: [],
      typingUsers: {},
      voiceParticipants: {},
      raisedHands: {},
    });
  },

  joinChannel: (channelId) => {
    const s = get().socket;
    if (!s) return;
    s.emit("view-channel", { channelId });
  },

  sendMessage: (channelId, content, replyToId) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("send-message", {
      channelId,
      userId: user.id,
      username: user.name,
      avatarColor: user.avatarColor,
      content,
      replyToId,
    });
    // stop typing
    s.emit("typing-stop", { channelId, userId: user.id });
  },

  deleteMessageEmit: (messageId, channelId) => {
    const s = get().socket;
    if (!s) return;
    s.emit("delete-message", { messageId, channelId });
  },

  editMessageEmit: (messageId, channelId, content) => {
    const s = get().socket;
    if (!s) return;
    s.emit("edit-message", { messageId, channelId, content });
  },

  pinMessageEmit: (messageId, channelId, pinned) => {
    const s = get().socket;
    if (!s) return;
    s.emit("pin-message", { messageId, channelId, pinned });
  },

  startTyping: (channelId) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("typing-start", { channelId, userId: user.id, username: user.name });
  },

  stopTyping: (channelId) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("typing-stop", { channelId, userId: user.id });
  },

  addReactionEmit: (messageId, channelId, emoji) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("add-reaction", {
      messageId,
      channelId,
      emoji,
      userId: user.id,
      username: user.name,
    });
  },

  removeReactionEmit: (messageId, channelId, emoji) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("remove-reaction", {
      messageId,
      channelId,
      emoji,
      userId: user.id,
    });
  },

  joinVoice: (channelId) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("join-voice", {
      channelId,
      userId: user.id,
      username: user.name,
      avatarColor: user.avatarColor,
    });
  },

  leaveVoice: (channelId) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("leave-voice", { channelId, userId: user.id });
  },

  updateVoiceState: (channelId, partial) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("update-voice-state", {
      channelId,
      userId: user.id,
      ...partial,
    });
  },

  raiseHand: (channelId) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("raise-hand", {
      channelId,
      userId: user.id,
      username: user.name,
    });
  },

  updateStatus: (status, customStatus) => {
    const s = get().socket;
    const user = get().currentUser;
    if (!s || !user) return;
    s.emit("update-status", { userId: user.id, status, customStatus });
    set((state) => ({
      currentUser: state.currentUser
        ? { ...state.currentUser, status, customStatus: customStatus ?? state.currentUser.customStatus }
        : state.currentUser,
    }));
  },
}));

// Helper hook: prune stale typing indicators (older than 6s)
export function useTypingPrune() {
  // Can be invoked from a component on an interval
  return () => {
    const state = useSocketStore.getState();
    const now = Date.now();
    let changed = false;
    const next: Record<string, TypingUser[]> = {};
    for (const [channelId, users] of Object.entries(state.typingUsers)) {
      const fresh = users.filter((u) => now - u.timestamp < 6000);
      if (fresh.length !== users.length) changed = true;
      next[channelId] = fresh;
    }
    if (changed) {
      useSocketStore.setState({ typingUsers: next });
    }
  };
}
