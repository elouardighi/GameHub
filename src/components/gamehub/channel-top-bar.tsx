"use client";

import { useState } from "react";
import {
  Hash,
  Volume2,
  Radio,
  MessageSquare,
  Megaphone,
  BookCheck,
  ChevronDown,
  Plus,
  Users,
  Bell,
  Pin,
  Search,
  Settings as SettingsIcon,
  Gamepad2,
  Compass,
} from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/types";
import { toast } from "sonner";

const CHANNEL_ICON: Record<string, typeof Hash> = {
  text: Hash,
  voice: Volume2,
  stage: Radio,
  forum: MessageSquare,
  announcement: Megaphone,
  rules: BookCheck,
};

const CATEGORY_GROUPS: { name: string; types: string[] }[] = [
  { name: "Information", types: ["rules"] },
  { name: "Announcements", types: ["announcement"] },
  { name: "Text Channels", types: ["text"] },
  { name: "Forums", types: ["forum"] },
  { name: "Voice Channels", types: ["voice"] },
  { name: "Stage Channels", types: ["stage"] },
];

/**
 * ChannelTopBar — replaces the left ChannelSidebar.
 *
 * Renders as a horizontal sub-navigation bar BELOW the top server nav:
 *  - Left: breadcrumb (VALORANT Hub ▸ #general)
 *  - Center: horizontal scrollable channel tabs (browser-tab style)
 *  - Right: action icons (members toggle, pinned messages, search, settings)
 *
 * Also handles the "Home" view (friends/discover/clans) by showing a different breadcrumb.
 */
export function ChannelTopBar() {
  const servers = useUIStore((s) => s.servers);
  const currentServerId = useUIStore((s) => s.currentServerId);
  const currentChannelId = useUIStore((s) => s.currentChannelId);
  const view = useUIStore((s) => s.view);
  const setChannel = useUIStore((s) => s.setChannel);
  const setView = useUIStore((s) => s.setView);
  const showMembers = useUIStore((s) => s.showMembers);
  const toggleMembers = useUIStore((s) => s.toggleMembers);
  const openSettings = useUIStore((s) => s.openSettings);
  const voiceJoinedChannelId = useUIStore((s) => s.voiceJoinedChannelId);
  const voiceMuted = useUIStore((s) => s.voiceMuted);
  const voiceDeafened = useUIStore((s) => s.voiceDeafened);
  const toggleMute = useUIStore((s) => s.toggleMute);
  const toggleDeafen = useUIStore((s) => s.toggleDeafen);

  const [searchValue, setSearchValue] = useState("");

  const server = servers.find((s) => s.id === currentServerId);
  const channel = server?.channels?.find((c) => c.id === currentChannelId);

  if (view === "friends") {
    return (
      <SubNav>
        <Breadcrumb>
          <Gamepad2 size={14} className="text-[var(--honey)]" />
          <span className="text-[var(--muted-foreground)]">Home</span>
          <ChevronDown size={12} className="text-[var(--muted-foreground)]" />
          <span className="text-[var(--foreground)] font-semibold">Friends</span>
        </Breadcrumb>
        <div className="flex-1" />
        <SubNavIconButton onClick={() => toast.info("Pinned messages coming soon")} title="Pinned">
          <Pin size={16} />
        </SubNavIconButton>
        <SubNavIconButton onClick={() => toast.info("Notifications coming soon")} title="Notifications">
          <Bell size={16} />
        </SubNavIconButton>
        <SubNavIconButton onClick={openSettings} title="User Settings">
          <SettingsIcon size={16} />
        </SubNavIconButton>
      </SubNav>
    );
  }

  if (view === "discover" || view === "clans") {
    return (
      <SubNav>
        <Breadcrumb>
          <Compass size={14} className="text-[var(--honey)]" />
          <span className="text-[var(--muted-foreground)]">Home</span>
          <ChevronDown size={12} className="text-[var(--muted-foreground)]" />
          <span className="text-[var(--foreground)] font-semibold capitalize">
            {view === "clans" ? "Clans" : "Discover"}
          </span>
        </Breadcrumb>
        <div className="flex-1" />
        <SubNavIconButton onClick={openSettings} title="User Settings">
          <SettingsIcon size={16} />
        </SubNavIconButton>
      </SubNav>
    );
  }

  if (!server || !server.channels) {
    return <SubNav><Breadcrumb><span>Loading…</span></Breadcrumb></SubNav>;
  }

  const selectChannel = (ch: Channel) => {
    setChannel(ch.id);
  };

  return (
    <SubNav>
      {/* Breadcrumb: Server ▸ #channel */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-raised)] transition-colors shrink-0">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: server.iconColor }}
            />
            <span className="text-sm font-bold text-[var(--foreground)] truncate max-w-[200px]">
              {server.name}
            </span>
            <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--foreground)] w-56"
        >
          <DropdownMenuItem
            onClick={() => toast.info("Invite link copied (coming soon)")}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)]"
          >
            Invite People
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setView("discover")}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)]"
          >
            Switch Server
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.info("Server settings (coming soon)")}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)]"
          >
            Server Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[var(--border)]" />
          <DropdownMenuItem
            onClick={() => toast.info("Create channel (coming soon)")}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)] text-[var(--honey-bright)]"
          >
            <Plus size={14} className="mr-2" />
            Create Channel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="text-[var(--muted-foreground)] text-xs">▸</div>

      {channel && (
        <div className="flex items-center gap-1.5 shrink-0">
          {(() => {
            const Icon = CHANNEL_ICON[channel.type] || Hash;
            return <Icon size={16} className="text-[var(--muted-foreground)]" />;
          })()}
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {channel.name}
          </span>
          {channel.topic && (
            <span className="hidden lg:inline text-xs text-[var(--muted-foreground)] truncate max-w-[200px] ml-2">
              — {channel.topic}
            </span>
          )}
        </div>
      )}

      <div className="w-px h-5 bg-[var(--border)] mx-2 shrink-0" />

      {/* Channel tabs (horizontal scrollable) */}
      <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-end gap-0.5">
        {CATEGORY_GROUPS.map((group) => {
          const channels = server.channels!.filter((c) => group.types.includes(c.type));
          if (channels.length === 0) return null;
          return channels.map((ch) => {
            const Icon = CHANNEL_ICON[ch.type] || Hash;
            const isActive = ch.id === currentChannelId;
            const isVoiceConnected = ch.id === voiceJoinedChannelId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => selectChannel(ch)}
                className={cn(
                  "channel-tab",
                  isActive && "is-active",
                  isVoiceConnected && !isActive && "is-voice-connected"
                )}
                title={ch.topic || ch.name}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate max-w-[100px]">{ch.name}</span>
                {isVoiceConnected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-online)] shrink-0 pulse-online" />
                )}
              </button>
            );
          });
        })}
      </div>

      {/* Right action icons */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {/* Quick mute toggle (visible if user is in voice) */}
        {voiceJoinedChannelId && (
          <>
            <SubNavIconButton
              onClick={toggleMute}
              title={voiceMuted ? "Unmute" : "Mute"}
            >
              {voiceMuted ? (
                <span className="text-[var(--maroon-bright)]">🔇</span>
              ) : (
                <span className="text-[var(--status-online)]">🎤</span>
              )}
            </SubNavIconButton>
            <SubNavIconButton
              onClick={toggleDeafen}
              title={voiceDeafened ? "Undeafen" : "Deafen"}
            >
              {voiceDeafened ? "🔇" : "🎧"}
            </SubNavIconButton>
          </>
        )}
        <SubNavIconButton onClick={() => toast.info("In-channel search coming soon")} title="Search messages">
          <Search size={16} />
        </SubNavIconButton>
        <SubNavIconButton onClick={() => toast.info("Pinned messages coming soon")} title="Pinned">
          <Pin size={16} />
        </SubNavIconButton>
        <SubNavIconButton onClick={() => toast.info("Notifications coming soon")} title="Notifications">
          <Bell size={16} />
        </SubNavIconButton>
        <SubNavIconButton
          onClick={toggleMembers}
          title={showMembers ? "Hide members" : "Show members"}
          active={showMembers}
        >
          <Users size={16} />
        </SubNavIconButton>
        <SubNavIconButton onClick={openSettings} title="User Settings">
          <SettingsIcon size={16} />
        </SubNavIconButton>
      </div>
    </SubNav>
  );
}

// ===== Helper sub-components =====
function SubNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-11 bg-[var(--bg-dark)] border-b border-[var(--border)] flex items-center px-3 gap-2 shrink-0 z-20">
      {children}
    </div>
  );
}

function Breadcrumb({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0 min-w-0">
      {children}
    </div>
  );
}

function SubNavIconButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-raised)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors",
        active && "bg-[var(--bg-raised)] text-[var(--honey-bright)]"
      )}
    >
      {children}
    </button>
  );
}
