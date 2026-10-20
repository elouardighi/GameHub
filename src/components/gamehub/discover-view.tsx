"use client";

import { motion } from "framer-motion";
import { Compass, Sparkles, Users, Search, Star, Shield, Flame, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DiscoverView() {
  const servers = useUIStore((s) => s.servers);
  const setServer = useUIStore((s) => s.setServer);
  const setChannel = useUIStore((s) => s.setChannel);
  const setView = useUIStore((s) => s.setView);
  const upsertServer = useUIStore((s) => s.upsertServer);
  const openClans = () => setView("clans");

  const [search, setSearch] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const filtered = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewServer = async (serverId: string) => {
    setJoining(serverId);
    try {
      // Call /join — it ensures the user is a member (no-op if already in) and
      // returns the server with all channels.
      const res = await fetch(`/api/servers/${serverId}/join`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Could not join server");
        return;
      }
      const data = await res.json();
      upsertServer(data);
      setServer(data.id);
      const first = data.channels?.find((c: any) => c.type === "text") ?? data.channels?.[0];
      setChannel(first?.id ?? null);
      toast.success(`Joined ${data.name}!`);
    } catch {
      toast.error("Network error");
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#2e2520] overflow-hidden">
      <header className="h-12 px-4 flex items-center border-b border-[#1a1310] shadow-sm shrink-0 gap-2">
        <Compass size={22} className="text-[#6a5a50]" />
        <h1 className="font-semibold text-white text-sm">Discover</h1>
      </header>

      {/* Hero */}
      <div className="relative h-44 sm:h-56 bg-gradient-to-r from-[#d4a03a] via-[#3a1f6b] to-[#c44a8b] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative text-center px-4">
          <Compass size={48} className="text-white mx-auto mb-2" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Find your squad
          </h2>
          <p className="text-sm text-white/80 mt-1">
            Browse public servers, join gaming communities, and find your people.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll p-6">
        <div className="max-w-[1100px] mx-auto">
          {/* Search + tags */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a5a50]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Explore gaming communities..."
                className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {["All", "Gaming", "FPS", "RPG", "Strategy", "Music"].map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full whitespace-nowrap",
                    i === 0
                      ? "bg-[#d4a03a] text-white"
                      : "bg-[#241b16] text-[#d4c4a8] hover:bg-[#3d302a]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Clans CTA */}
          <motion.button
            whileHover={{ y: -2 }}
            onClick={openClans}
            className="w-full bg-gradient-to-r from-[#1a1a2e] via-[#3a1f6b] to-[#c44a8b] rounded-lg p-4 flex items-center gap-4 mb-6 text-left"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Browse Clans <Flame size={16} className="text-[#d4a03a]" />
              </h3>
              <p className="text-sm text-white/80">
                Exclusive application-based gaming communities. Top-tier players only.
              </p>
            </div>
            <span className="text-white text-sm font-semibold">→</span>
          </motion.button>

          {/* Server grid */}
          <h2 className="text-lg font-bold text-white mb-3">
            Featured Servers <span className="text-[#6a5a50] text-sm font-normal">· {filtered.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((server) => (
              <motion.div
                key={server.id}
                whileHover={{ y: -2 }}
                className="bg-[#241b16] border border-[#1a1310] rounded-lg overflow-hidden group"
              >
                <div
                  className="h-20 relative"
                  style={{ background: server.bannerColor ?? server.iconColor }}
                >
                  <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-4 border-[#241b16] flex items-center justify-center font-bold text-white"
                    style={{ background: server.iconColor }}
                  >
                    {server.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {server.verified && (
                      <span className="bg-[#d4a03a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Shield size={10} /> Verified
                      </span>
                    )}
                    {server.partnered && (
                      <span className="bg-[#8bb04a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Star size={10} /> Partnered
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-8">
                  <h3 className="text-base font-bold text-white">
                    {server.name}
                  </h3>
                  <p className="text-xs text-[#6a5a50] mb-2 flex items-center gap-1">
                    <Users size={12} /> {server.memberCount.toLocaleString()} members · {server.channelCount} channels
                  </p>
                  <p className="text-xs text-[#d4c4a8] line-clamp-2 mb-3 min-h-[28px]">
                    {server.description}
                  </p>
                  <Button
                    size="sm"
                    disabled={joining === server.id}
                    onClick={() => handleViewServer(server.id)}
                    className="w-full bg-[#d4a03a] hover:bg-[#b08530] text-white"
                  >
                    {joining === server.id ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : null}
                    View Server
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
