"use client";

import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, X, Users, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useUIStore } from "@/lib/ui-store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ActivitiesPanel() {
  const open = useUIStore((s) => s.showActivities);
  const close = useUIStore((s) => s.closeActivities);
  const activities = useUIStore((s) => s.activities);
  const voiceJoinedChannelId = useUIStore((s) => s.voiceJoinedChannelId);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [launching, setLaunching] = useState<string | null>(null);

  const categories = ["All", "Games", "Watch", "Listen", "Play"];
  const filtered = activities.filter((a) => {
    const matchCat = category === "All" || a.category === category;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleLaunch = async (activityId: string, name: string, emoji: string) => {
    setLaunching(activityId);
    try {
      const res = await fetch(`/api/activities/${activityId}/launch`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Could not launch activity");
        return;
      }
      toast.success(`🎮 ${name} launched! Invite friends from the voice channel.`);
      close();
    } catch {
      toast.error("Network error");
    } finally {
      setLaunching(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[800px] bg-[#2e2520] border-[#1a1310] text-[#f5e6c8] p-0 [&>button]:hidden overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Rocket size={22} className="text-[#d4a03a]" />
            Activities
          </DialogTitle>
          <DialogDescription className="text-[#6a5a50]">
            {voiceJoinedChannelId
              ? "Launch a voice activity to play with the squad!"
              : "Join a voice channel first, then launch an activity here."}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#241b16] hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white flex items-center justify-center border border-[#1a1310]"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Search */}
        <div className="px-6 pb-3 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a5a50]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities..."
              className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] pl-9"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "px-3 py-1 text-xs rounded-full whitespace-nowrap",
                category === c
                  ? "bg-[#d4a03a] text-white"
                  : "bg-[#241b16] text-[#d4c4a8] hover:bg-[#3d302a]"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto gh-scroll">
          {filtered.map((a) => (
            <motion.div
              key={a.id}
              whileHover={{ y: -2 }}
              className="bg-[#241b16] border border-[#1a1310] rounded-lg p-4 flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-lg bg-[#1a1310] flex items-center justify-center text-3xl mb-2">
                {a.emoji}
              </div>
              <h3 className="text-sm font-bold text-white">{a.name}</h3>
              <p className="text-xs text-[#6a5a50] mt-1 mb-2 line-clamp-2 min-h-[28px]">
                {a.description}
              </p>
              <div className="text-[10px] text-[#6a5a50] mb-2 flex items-center gap-1">
                <Users size={12} /> {a.maxPlayers} max · {a.category}
              </div>
              <button
                type="button"
                disabled={!voiceJoinedChannelId || launching === a.id}
                onClick={() => handleLaunch(a.id, a.name, a.emoji)}
                className={cn(
                  "w-full py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                  voiceJoinedChannelId
                    ? "bg-[#d4a03a] hover:bg-[#b08530] text-white"
                    : "bg-[#1a1310] text-[#6a5a50] cursor-not-allowed"
                )}
              >
                {launching === a.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : voiceJoinedChannelId ? (
                  "Launch"
                ) : (
                  "Join Voice First"
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
