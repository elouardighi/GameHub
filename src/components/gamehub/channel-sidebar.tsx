"use client";

import { useState } from "react";
import {
  ChevronDown,
  Hash,
  Volume2,
  Radio,
  MessageSquare,
  Megaphone,
  BookCheck,
  Plus,
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Settings as SettingsIcon,
  Sparkles,
  Trophy,
  Rocket,
  Users,
  Compass,
  Search,
  LogOut,
  Loader2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./user-avatar";
import { useUIStore, useCurrentServer } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { toast } from "sonner";
import type { Channel } from "@/lib/types";

const CHANNEL_GROUPS: { type: string; label: string }[] = [
  { type: "rules", label: "Information" },
  { type: "announcement", label: "Announcements" },
  { type: "text", label: "Text Channels" },
  { type: "forum", label: "Forums" },
  { type: "voice", label: "Voice Channels" },
  { type: "stage", label: "Stage Channels" },
];

function channelIcon(type: string) {
  switch (type) {
    case "voice":
      return <Volume2 size={20} className="channel-icon text-[#6a5a50]" />;
    case "stage":
      return <Radio size={20} className="channel-icon text-[#6a5a50]" />;
    case "forum":
      return <MessageSquare size={20} className="channel-icon text-[#6a5a50]" />;
    case "announcement":
      return <Megaphone size={20} className="channel-icon text-[#6a5a50]" />;
    case "rules":
      return <BookCheck size={20} className="channel-icon text-[#6a5a50]" />;
    default:
      return <Hash size={20} className="channel-icon text-[#6a5a50]" />;
  }
}

function FriendsDMButton({
  active,
  label,
  icon,
  onClick,
}: {
  active?: boolean;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "channel-item flex items-center gap-2 w-full px-2 h-8 rounded-[4px] text-sm text-[#6a5a50] hover:text-[#f5e6c8]",
        active && "channel-active text-white"
      )}
    >
      <span className="text-[#6a5a50]">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export function ChannelSidebar() {
  const server = useCurrentServer();
  const currentChannelId = useUIStore((s) => s.currentChannelId);
  const setChannel = useUIStore((s) => s.setChannel);
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const openSettings = useUIStore((s) => s.openSettings);
  const openQuests = useUIStore((s) => s.openQuests);
  const openClans = useUIStore((s) => s.openClans);
  const openActivities = useUIStore((s) => s.openActivities);
  const currentUser = useUIStore((s) => s.currentUser);
  const addServerChannel = useUIStore((s) => s.addServerChannel);
  const setCurrentUserStatus = useUIStore((s) => s.setCurrentUserStatus);
  const voiceMuted = useUIStore((s) => s.voiceMuted);
  const voiceDeafened = useUIStore((s) => s.voiceDeafened);
  const voiceJoinedChannelId = useUIStore((s) => s.voiceJoinedChannelId);
  const toggleMute = useUIStore((s) => s.toggleMute);
  const toggleDeafen = useUIStore((s) => s.toggleDeafen);

  const voiceParticipants = useSocketStore((s) => s.voiceParticipants);
  const onlineUsers = useSocketStore((s) => s.onlineUsers);
  const userStatuses = useSocketStore((s) => s.userStatuses);

  const [search, setSearch] = useState("");
  const [createChannelOpen, setCreateChannelOpen] = useState<{
    type: string;
    label: string;
  } | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">(
    "text"
  );
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (view === "friends" || view === "discover" || view === "clans") {
    return (
      <aside className="w-[240px] shrink-0 bg-[#241b16] flex flex-col">
        <div className="h-12 px-3 flex items-center border-b border-[#1a1310] shadow-sm">
          <button
            type="button"
            onClick={() => setView("friends")}
            className="w-full text-left text-sm font-medium text-[#f5e6c8] bg-[#1a1310] rounded-[2px] px-2 py-1.5 hover:bg-[#1a1310]"
          >
            Find or start a conversation
          </button>
        </div>
        <div className="flex-1 px-2 py-2 overflow-y-auto gh-scroll">
          <FriendsDMButton
            label="Friends"
            icon={<Users size={20} />}
            active={view === "friends"}
            onClick={() => setView("friends")}
          />
          <FriendsDMButton
            label="Discover"
            icon={<Compass size={20} />}
            active={view === "discover"}
            onClick={() => setView("discover")}
          />
          <FriendsDMButton
            label="Clans"
            icon={<Sparkles size={20} />}
            active={view === "clans"}
            onClick={() => setView("clans")}
          />
          <FriendsDMButton
            label="Quests"
            icon={<Trophy size={20} />}
            onClick={openQuests}
          />
          <FriendsDMButton
            label="Activities"
            icon={<Rocket size={20} />}
            onClick={openActivities}
          />

          <div className="mt-4 mb-1 px-2 flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-[#6a5a50] tracking-wide">
              Direct Messages
            </span>
          </div>
          <div className="relative mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a conversation"
              className="w-full bg-[#1a1310] text-[#f5e6c8] placeholder:text-[#6a5a50] text-sm rounded-[2px] px-2 py-1.5 outline-none"
            />
          </div>

          {/* DM list: show your friends */}
          {useUIStore.getState().friends
            .filter((f) =>
              f.name.toLowerCase().includes(search.toLowerCase())
            )
            .map((friend) => {
              const online =
                userStatuses[friend.id] !== "offline" &&
                (userStatuses[friend.id] ?? friend.status) !== "offline";
              return (
                <button
                  key={friend.id}
                  className="w-full flex items-center gap-3 px-2 h-8 rounded-[4px] hover:bg-[#3d302a] text-left group"
                >
                  <UserAvatar
                    name={friend.name}
                    color={friend.avatarColor}
                    size="sm"
                    status={online ? "online" : "offline"}
                    showStatus
                    ringColor="#241b16"
                  />
                  <span className={cn("text-sm truncate", online ? "text-[#f5e6c8]" : "text-[#6a5a50]")}>
                    {friend.name}
                  </span>
                  {friend.customStatus && (
                    <span className="text-xs text-[#6a5a50] truncate hidden group-hover:block">
                      — {friend.customStatus}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        <UserMiniCard />
      </aside>
    );
  }

  if (!server) {
    return (
      <aside className="w-[240px] shrink-0 bg-[#241b16] flex flex-col">
        <div className="flex-1 flex items-center justify-center text-[#6a5a50] text-sm px-4 text-center">
          Select a server to view its channels.
        </div>
        <UserMiniCard />
      </aside>
    );
  }

  // Group channels by type
  const grouped = CHANNEL_GROUPS.map((g) => ({
    ...g,
    channels: (server.channels ?? []).filter((c) => c.type === g.type),
  })).filter((g) => g.channels.length > 0);

  const handleCreateChannel = async () => {
    if (!server || !newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      const res = await fetch(`/api/servers/${server.id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName,
          type: newChannelType,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not create channel");
        return;
      }
      const channel: Channel = await res.json();
      addServerChannel(server.id, channel);
      toast.success(`#${channel.name} created!`);
      setCreateChannelOpen(null);
      setNewChannelName("");
    } catch {
      toast.error("Network error");
    } finally {
      setCreatingChannel(false);
    }
  };

  return (
    <aside className="w-[240px] shrink-0 bg-[#241b16] flex flex-col">
      {/* Server header with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-12 px-3 flex items-center justify-between border-b border-[#1a1310] shadow-sm hover:bg-[#3d302a] transition-colors"
          >
            <span className="text-sm font-bold text-white truncate">
              {server.name}
            </span>
            <ChevronDown size={16} className="text-[#f5e6c8]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[220px] bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]"
        >
          <DropdownMenuItem
            className="hover:bg-[#d4a03a] hover:text-white cursor-pointer"
            onClick={() => setCreateChannelOpen({ type: "text", label: "Text Channels" })}
          >
            <Plus size={16} className="mr-2" />
            Create Channel
          </DropdownMenuItem>
          <DropdownMenuItem
            className="hover:bg-[#d4a03a] hover:text-white cursor-pointer"
            onClick={() => {
              setCreateChannelOpen({ type: "voice", label: "Voice Channels" });
            }}
          >
            <Plus size={16} className="mr-2" />
            Create Voice Channel
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1a1310]" />
          <DropdownMenuItem
            className="hover:bg-[#d4a03a] hover:text-white cursor-pointer"
            onClick={openSettings}
          >
            <SettingsIcon size={16} className="mr-2" />
            Server Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-[#d4a03a] hover:text-white cursor-pointer">
            Notifications
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-[#d4a03a] hover:text-white cursor-pointer">
            Privacy Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1a1310]" />
          <DropdownMenuItem className="hover:bg-[#b04a4a] hover:text-white cursor-pointer text-[#b04a4a]">
            Leave Server
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Channels list */}
      <div className="flex-1 px-2 pt-3 pb-2 overflow-y-auto gh-scroll">
        {grouped.map((group) => (
          <div key={group.type} className="mb-4">
            <div className="px-1 mb-1 flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-[#6a5a50] tracking-wide hover:text-[#f5e6c8] cursor-pointer">
                {group.label}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCreateChannelOpen({
                    type: group.type,
                    label: group.label,
                  })
                }
                className="text-[#6a5a50] hover:text-[#f5e6c8]"
                aria-label={`Add channel in ${group.label}`}
              >
                <Plus size={16} />
              </button>
            </div>

            {group.channels.map((channel) => {
              const isActive = currentChannelId === channel.id;
              const participants = voiceParticipants[channel.id] ?? [];

              return (
                <div key={channel.id}>
                  <ChannelItem
                    channel={channel}
                    isActive={isActive}
                    onClick={() => setChannel(channel.id)}
                  />
                  {(channel.type === "voice" || channel.type === "stage") &&
                    participants.length > 0 && (
                      <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
                        {participants.map((p) => (
                          <div
                            key={p.userId}
                            className="flex items-center gap-1.5 px-1 py-0.5 rounded text-xs text-[#f5e6c8] hover:bg-[#3d302a] cursor-pointer"
                          >
                            <UserAvatar
                              name={p.username}
                              color={p.avatarColor}
                              size="sm"
                            />
                            <span className="truncate flex-1">{p.username}</span>
                            {p.deafened && (
                              <HeadphoneOff size={14} className="text-[#b04a4a]" />
                            )}
                            {p.muted && (
                              <MicOff size={14} className="text-[#b04a4a]" />
                            )}
                            {p.streaming && (
                              <Radio size={14} className="text-[#c44a8b]" />
                            )}
                            {p.videoOn && (
                              <span className="text-[#8bb04a]">📹</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <UserMiniCard />

      {/* Create channel dialog */}
      <Dialog
        open={!!createChannelOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreateChannelOpen(null);
            setNewChannelName("");
          }
        }}
      >
        <DialogContent className="max-w-[440px] bg-[#2e2520] border-[#1a1310] text-[#f5e6c8] p-0 [&>button]:hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="text-base font-bold">
              Create Channel
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-3">
            <div>
              <label className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5 block">
                Channel Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewChannelType("text")}
                  className={cn(
                    "flex-1 p-2 rounded-md border text-left",
                    newChannelType === "text"
                      ? "border-[#d4a03a] bg-[#d4a03a]/10"
                      : "border-[#1a1310] hover:bg-[#3d302a]/30"
                  )}
                >
                  <Hash size={16} className="mb-1" />
                  <div className="text-sm font-semibold text-white">Text</div>
                  <div className="text-[10px] text-[#6a5a50]">Messages, files, replies</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewChannelType("voice")}
                  className={cn(
                    "flex-1 p-2 rounded-md border text-left",
                    newChannelType === "voice"
                      ? "border-[#d4a03a] bg-[#d4a03a]/10"
                      : "border-[#1a1310] hover:bg-[#3d302a]/30"
                  )}
                >
                  <Volume2 size={16} className="mb-1" />
                  <div className="text-sm font-semibold text-white">Voice</div>
                  <div className="text-[10px] text-[#6a5a50]">Talk, hang out, video</div>
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5 block">
                Channel Name
              </label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="new-channel"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateChannel();
                }}
                className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreateChannelOpen(null);
                  setNewChannelName("");
                }}
                className="text-white hover:bg-[#3d302a]"
              >
                Cancel
              </Button>
              <Button
                disabled={!newChannelName.trim() || creatingChannel}
                onClick={handleCreateChannel}
                className="bg-[#d4a03a] hover:bg-[#b08530] text-white"
              >
                {creatingChannel ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : null}
                Create Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "channel-item group flex items-center gap-1.5 w-full px-2 h-8 rounded-[4px] text-sm text-[#6a5a50] hover:text-[#f5e6c8] cursor-pointer",
        isActive && "channel-active"
      )}
    >
      {channelIcon(channel.type)}
      <span className="truncate">{channel.name}</span>
    </button>
  );
}

function UserMiniCard() {
  const currentUser = useUIStore((s) => s.currentUser);
  const openSettings = useUIStore((s) => s.openSettings);
  const voiceMuted = useUIStore((s) => s.voiceMuted);
  const voiceDeafened = useUIStore((s) => s.voiceDeafened);
  const toggleMute = useUIStore((s) => s.toggleMute);
  const toggleDeafen = useUIStore((s) => s.toggleDeafen);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut({ redirect: false });
      window.location.reload();
    } catch {
      toast.error("Could not log out");
      setLoggingOut(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="h-[52px] px-2 flex items-center justify-between bg-[#3d302a] relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-1 py-1 hover:bg-[#3d302a] rounded-[4px] flex-1 min-w-0"
          >
            <UserAvatar
              name={currentUser.name}
              color={currentUser.avatarColor}
              size="sm"
              status={currentUser.status}
              showStatus
              ringColor="#3d302a"
            />
            <div className="flex flex-col text-left min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                {currentUser.name}
              </span>
              <span className="text-xs text-[#6a5a50] truncate">
                {currentUser.customStatus || STATUS_LABEL(currentUser.status)}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-[200px] bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]"
        >
          <DropdownMenuItem
            className="hover:bg-[#d4a03a] hover:text-white cursor-pointer"
            onClick={openSettings}
          >
            <SettingsIcon size={16} className="mr-2" />
            User Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="hover:bg-[#d4a03a] hover:text-white cursor-pointer"
            onClick={openSettings}
          >
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1a1310]" />
          <DropdownMenuItem
            className="hover:bg-[#b04a4a] hover:text-white cursor-pointer text-[#b04a4a]"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <LogOut size={16} className="mr-2" />
            )}
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleMute}
                aria-label="Mute"
                className={cn(
                  "w-8 h-8 rounded-[4px] flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white",
                  voiceMuted && "text-[#b04a4a]"
                )}
              >
                {voiceMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
              {voiceMuted ? "Unmute" : "Mute"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleDeafen}
                aria-label="Deafen"
                className={cn(
                  "w-8 h-8 rounded-[4px] flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white",
                  voiceDeafened && "text-[#b04a4a]"
                )}
              >
                {voiceDeafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
              {voiceDeafened ? "Undeafen" : "Deafen"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={openSettings}
                aria-label="User Settings"
                className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white"
              >
                <SettingsIcon size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
              User Settings
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
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
