"use client";

import { Plus, Compass, Download, Gamepad2, Search, Bell } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { UserAvatar } from "./user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";

/**
 * ServerTopNav — replaces the old left ServerRail.
 * Renders as a horizontal top navigation bar with:
 *  - Brand on the left
 *  - Server pills (horizontal scrollable)
 *  - Quick actions (+ create, compass discover)
 *  - Search box (center-right)
 *  - User profile chip + dropdown (right)
 *
 * This is the novel Hearth-layout signature: no left sidebar anywhere.
 */
export function ServerTopNav() {
  const servers = useUIStore((s) => s.servers);
  const currentServerId = useUIStore((s) => s.currentServerId);
  const view = useUIStore((s) => s.view);
  const setServer = useUIStore((s) => s.setServer);
  const setChannel = useUIStore((s) => s.setChannel);
  const setView = useUIStore((s) => s.setView);
  const openCreateServer = useUIStore((s) => s.openCreateServer);
  const openDiscover = useUIStore((s) => s.openDiscover);
  const openSettings = useUIStore((s) => s.openSettings);
  const openQuests = useUIStore((s) => s.openQuests);
  const currentUser = useUIStore((s) => s.currentUser);
  const onlineUsers = useSocketStore((s) => s.onlineUsers);

  const [searchValue, setSearchValue] = useState("");

  const selectHome = () => {
    setView("friends");
  };

  const selectServer = (serverId: string) => {
    const srv = servers.find((s) => s.id === serverId);
    if (!srv?.channels) return;
    setServer(serverId);
    const firstText = srv.channels.find((c) => c.type === "text") ?? srv.channels[0];
    setChannel(firstText?.id ?? null);
  };

  const isHome = view === "friends" || view === "discover" || view === "clans";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      toast.info(`Searching for "${searchValue}"... (search coming soon)`);
      setSearchValue("");
    }
  };

  return (
    <header className="top-nav-bg h-14 flex items-center px-3 gap-3 shrink-0 z-30 relative">
      {/* Brand */}
      <button
        type="button"
        onClick={selectHome}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[var(--bg-raised)] transition-colors shrink-0"
        aria-label="GameHub Home"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--honey), var(--maroon))",
            boxShadow: "0 0 12px rgba(212, 160, 58, 0.4)",
          }}
        >
          <Gamepad2 size={18} className="text-[var(--bg-deepest)]" />
        </div>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-sm font-bold text-[var(--honey-bright)]">GameHub</span>
          <span className="text-[10px] text-[var(--muted-foreground)] -mt-0.5">Hearth</span>
        </div>
      </button>

      {/* Divider */}
      <div className="w-px h-7 bg-[var(--border)] shrink-0" />

      {/* Server pills (horizontal scrollable) */}
      <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={selectHome}
          className={`server-pill shrink-0 ${isHome ? "is-active" : ""}`}
          aria-label="Home — Friends & DMs"
        >
          <Compass size={14} />
          <span className="hidden sm:inline">Home</span>
        </button>

        <div className="w-px h-5 bg-[var(--border)] shrink-0 mx-1" />

        {servers.map((server) => {
          const isActive = !isHome && currentServerId === server.id;
          return (
            <button
              key={server.id}
              type="button"
              onClick={() => selectServer(server.id)}
              className={`server-pill shrink-0 ${isActive ? "is-active" : ""}`}
              title={server.description || server.name}
            >
              <span
                className="server-dot"
                style={{ background: server.iconColor }}
              />
              <span className="truncate max-w-[140px]">{server.name}</span>
              {server.verified && (
                <span className="text-[var(--honey)] text-[10px]" title="Verified">
                  ✓
                </span>
              )}
            </button>
          );
        })}

        {/* Create server */}
        <button
          type="button"
          onClick={openCreateServer}
          className="server-pill shrink-0 text-[var(--honey)]"
          aria-label="Create a server"
          title="Create a server"
        >
          <Plus size={14} />
          <span className="hidden md:inline">New</span>
        </button>

        {/* Discover */}
        <button
          type="button"
          onClick={openDiscover}
          className="server-pill shrink-0"
          aria-label="Discover servers"
          title="Discover servers"
        >
          <Compass size={14} />
          <span className="hidden md:inline">Discover</span>
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden md:flex items-center relative shrink-0">
        <Search size={14} className="absolute left-2.5 text-[var(--muted-foreground)] pointer-events-none" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search…"
          className="w-40 lg:w-56 bg-[var(--bg-input)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] text-sm rounded-lg pl-8 pr-3 py-1.5 outline-none border border-[var(--border)] focus:border-[var(--honey)] transition-colors"
        />
      </form>

      {/* Quests button */}
      <button
        type="button"
        onClick={openQuests}
        className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-[var(--bg-raised)] text-[var(--muted-foreground)] hover:text-[var(--honey-bright)] transition-colors shrink-0"
        aria-label="Quests"
        title="Quests"
      >
        <Bell size={16} />
      </button>

      {/* User profile chip */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-raised)] transition-colors shrink-0"
            aria-label="User menu"
          >
            {currentUser ? (
              <UserAvatar
                name={currentUser.name}
                color={currentUser.avatarColor}
                status={currentUser.status}
                size="sm"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--bg-raised)]" />
            )}
            <div className="hidden sm:flex flex-col leading-tight text-left max-w-[140px]">
              <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                {currentUser?.name}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] truncate -mt-0.5">
                {currentUser?.customStatus || currentUser?.status || "online"}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--foreground)] w-56"
        >
          <DropdownMenuLabel className="text-[var(--muted-foreground)] text-xs">
            Signed in as
          </DropdownMenuLabel>
          <DropdownMenuLabel className="text-[var(--foreground)] font-semibold -mt-1">
            {currentUser?.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[var(--border)]" />
          <DropdownMenuItem
            onClick={openSettings}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)]"
          >
            User Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={openQuests}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)]"
          >
            My Quests
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={openDiscover}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)]"
          >
            Discover Servers
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.info(`${onlineUsers.length} users online`)}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)]"
          >
            Online — {onlineUsers.length}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[var(--border)]" />
          <DropdownMenuItem
            onClick={openSettings}
            className="cursor-pointer hover:bg-[var(--bg-raised)] focus:bg-[var(--bg-raised)] text-[var(--maroon-bright)]"
          >
            <Download size={14} className="mr-2" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
