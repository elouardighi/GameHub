"use client";

import { Plus, Compass, Download, Gamepad2 } from "lucide-react";
import { ServerIcon } from "./server-icon";
import { useUIStore } from "@/lib/ui-store";
import { motion } from "framer-motion";

export function ServerRail() {
  const servers = useUIStore((s) => s.servers);
  const currentServerId = useUIStore((s) => s.currentServerId);
  const view = useUIStore((s) => s.view);
  const setServer = useUIStore((s) => s.setServer);
  const setChannel = useUIStore((s) => s.setChannel);
  const setView = useUIStore((s) => s.setView);
  const openCreateServer = useUIStore((s) => s.openCreateServer);
  const openDiscover = useUIStore((s) => s.openDiscover);

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

  return (
    <nav
      className="flex flex-col items-center gap-2 py-3 bg-[#1a1310] w-[72px] shrink-0 overflow-y-auto no-scrollbar"
      aria-label="Server rail"
    >
      {/* Home / DMs */}
      <div className="server-icon-wrapper group">
        <span className={`pill-indicator ${view === "friends" ? "active" : "idle"}`} />
        <button
          type="button"
          onClick={selectHome}
          aria-label="GameHub Home"
          className="server-icon-btn flex items-center justify-center text-white"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: "#d4a03a",
          }}
        >
          <Gamepad2 size={22} />
        </button>
      </div>

      <div className="w-8 h-0.5 bg-[#241b16] rounded-full mx-auto" />

      {/* Server icons */}
      {servers.map((server) => (
        <ServerIcon
          key={server.id}
          name={server.name}
          color={server.iconColor}
          isActive={currentServerId === server.id}
          onClick={() => selectServer(server.id)}
        />
      ))}

      {/* Add server */}
      <button
        type="button"
        onClick={openCreateServer}
        aria-label="Create a server"
        className="group flex items-center justify-center bg-[#2e2520] hover:bg-[#8bb04a] hover:text-white text-[#8bb04a] transition-colors w-12 h-12 rounded-[24px] hover:rounded-[14px] duration-200"
      >
        <Plus size={22} />
      </button>

      {/* Discover */}
      <button
        type="button"
        onClick={openDiscover}
        aria-label="Discover servers"
        className="group flex items-center justify-center bg-[#2e2520] hover:bg-[#d4a03a] hover:text-white text-[#d4a03a] transition-colors w-12 h-12 rounded-[24px] hover:rounded-[14px] duration-200"
      >
        <Compass size={22} />
      </button>

      <div className="flex-1" />

      {/* Download app */}
      <motion.button
        type="button"
        whileHover={{ y: -1 }}
        aria-label="Download the desktop app"
        className="group flex items-center justify-center bg-[#2e2520] hover:bg-[#d4a03a] hover:text-white text-[#6a5a50] hover:text-white transition-colors w-12 h-12 rounded-[24px] hover:rounded-[14px] duration-200"
      >
        <Download size={20} />
      </motion.button>
    </nav>
  );
}
