"use client";

import {
  Hash,
  Volume2,
  Radio,
  MessageSquare,
  Megaphone,
  BookCheck,
  Pin,
  Bell,
  Users,
  Search,
  ListTree,
  X,
  Loader2,
} from "lucide-react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { VoiceChannelView } from "./voice-channel-view";
import { ForumChannelView } from "./forum-channel-view";
import { UserAvatar } from "./user-avatar";
import { useUIStore, useCurrentChannel, useCurrentServer } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const CHANNEL_TYPE_ICON: Record<string, React.ReactNode> = {
  text: <Hash size={22} />,
  voice: <Volume2 size={22} />,
  stage: <Radio size={22} />,
  forum: <MessageSquare size={22} />,
  announcement: <Megaphone size={22} />,
  rules: <BookCheck size={22} />,
};

interface SearchResult {
  id: string;
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  avatarColor: string;
  content: string;
  timestamp: string;
}

export function ChatArea() {
  const server = useCurrentServer();
  const channel = useCurrentChannel();
  const showMembers = useUIStore((s) => s.showMembers);
  const toggleMembers = useUIStore((s) => s.toggleMembers);
  const voiceJoinedChannelId = useUIStore((s) => s.voiceJoinedChannelId);
  const joinChannel = useSocketStore((s) => s.joinChannel);

  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  // When channel changes, notify socket we're viewing this channel + close search
  useEffect(() => {
    if (channel?.id) {
      joinChannel(channel.id);
    }
    setSearchOpen(false);
    setResults([]);
  }, [channel?.id, joinChannel]);

  const runSearch = async (q: string) => {
    if (!server) return;
    setSearching(true);
    setSearchOpen(true);
    try {
      const res = await fetch(
        `/api/servers/${server.id}/search?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (!channel || !server) {
    return (
      <main className="flex-1 flex flex-col bg-[#2e2520] items-center justify-center">
        <div className="text-[#6a5a50] text-sm">No channel selected.</div>
      </main>
    );
  }

  const inThisVoice =
    (channel.type === "voice" || channel.type === "stage") &&
    voiceJoinedChannelId === channel.id;

  return (
    <main className="flex-1 flex flex-col bg-[#2e2520] min-w-0 relative">
      {/* Channel header */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-[#1a1310] shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#6a5a50]">{CHANNEL_TYPE_ICON[channel.type]}</span>
          <span className="font-semibold text-white text-sm truncate">
            {channel.name}
          </span>
          {channel.topic && (
            <>
              <span className="mx-2 text-[#4a3a30]">|</span>
              <span className="text-xs text-[#6a5a50] truncate max-w-[400px]">
                {channel.topic}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-[#d4c4a8]">
          <button
            type="button"
            aria-label="Threads"
            className="hover:text-white"
          >
            <ListTree size={22} />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="hover:text-white"
          >
            <Bell size={22} />
          </button>
          <button
            type="button"
            aria-label="Pinned messages"
            className="hover:text-white"
          >
            <Pin size={22} />
          </button>
          <button
            type="button"
            aria-label="Members"
            onClick={toggleMembers}
            className={cn("hover:text-white", showMembers && "text-white")}
          >
            <Users size={22} />
          </button>
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchValue.trim().length >= 2) {
                  runSearch(searchValue.trim());
                }
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSearchValue("");
                }
              }}
              placeholder="Search (then press Enter)"
              className="w-32 bg-[#1a1310] text-[#f5e6c8] text-xs rounded px-2 py-1 outline-none placeholder:text-[#6a5a50] focus:w-44 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Search results panel */}
      {searchOpen && (
        <div className="absolute z-20 top-12 right-2 w-[480px] max-w-[90vw] bg-[#3d302a] border border-[#1a1310] rounded-md shadow-xl max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1310]">
            <div className="flex items-center gap-2 text-xs text-[#f5e6c8]">
              <Search size={14} className="text-[#6a5a50]" />
              Search results for{" "}
              <code className="text-[#d4c4a8]">{searchValue}</code>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setResults([]);
              }}
              className="text-[#6a5a50] hover:text-white"
              aria-label="Close search"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto gh-scroll p-2">
            {searching ? (
              <div className="flex items-center justify-center py-8 text-[#6a5a50] text-sm">
                <Loader2 size={16} className="animate-spin mr-2" />
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-[#6a5a50] text-sm">
                No messages match your search.
              </div>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    const ch = server.channels?.find((c) => c.id === r.channelId);
                    if (ch) {
                      useUIStore.getState().setServer(server.id);
                      useUIStore.getState().setChannel(ch.id);
                    }
                    setSearchOpen(false);
                  }}
                  className="w-full text-left flex gap-2 items-start p-2 rounded hover:bg-[#3d302a] cursor-pointer"
                >
                  <UserAvatar
                    name={r.username}
                    color={r.avatarColor}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold text-white truncate">
                        {r.username}
                      </span>
                      <span className="text-[10px] text-[#6a5a50]">
                        #{r.channelName} ·{" "}
                        {new Date(r.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-[#dcddde] line-clamp-2">
                      {r.content}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Body */}
      {channel.type === "voice" || channel.type === "stage" ? (
        <VoiceChannelView
          channelId={channel.id}
          channelName={channel.name}
          channelType={channel.type}
          serverName={server.name}
          serverId={server.id}
          isJoined={inThisVoice}
        />
      ) : channel.type === "forum" ? (
        <ForumChannelView channelId={channel.id} channelName={channel.name} />
      ) : (
        <>
          <MessageList channelId={channel.id} />
          <MessageInput />
        </>
      )}
    </main>
  );
}
