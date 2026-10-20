"use client";

import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, X, Check, Flame, Star, Zap, Target, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useUIStore } from "@/lib/ui-store";
import { QUEST_GAME_EMOJI } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Quest } from "@/lib/types";

export function QuestsPanel() {
  const open = useUIStore((s) => s.showQuests);
  const close = useUIStore((s) => s.closeQuests);
  const quests = useUIStore((s) => s.quests);
  const upsertQuest = useUIStore((s) => s.upsertQuest);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const toggleTrack = async (q: Quest) => {
    setTracked((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
    try {
      await fetch(`/api/quests/${q.id}/track`, { method: "POST" });
    } catch {
      /* best-effort */
    }
  };

  const handleIncrement = async (q: Quest) => {
    setBusy(`inc-${q.id}`);
    try {
      const res = await fetch(`/api/quests/${q.id}/increment`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Could not increment progress");
        return;
      }
      const data = await res.json();
      upsertQuest({
        ...q,
        progress: data.progress,
        completed: data.completed,
      });
      toast.success(`+1 progress on ${q.title}! (${data.progress}/${q.progressGoal})`);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  const claimReward = async (q: Quest) => {
    setBusy(`claim-${q.id}`);
    try {
      const res = await fetch(`/api/quests/${q.id}/claim`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not claim reward");
        return;
      }
      const data = await res.json();
      upsertQuest({
        ...q,
        progress: data.progress,
        completed: data.completed,
      });
      toast.success(`🎉 ${q.title} reward claimed! +${data.points} GameHub coins`);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[800px] bg-[#2e2520] border-[#1a1310] text-[#f5e6c8] p-0 [&>button]:hidden overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Trophy size={22} className="text-[#d4a03a]" />
            GameHub Quests
          </DialogTitle>
        </DialogHeader>
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#241b16] hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white flex items-center justify-center border border-[#1a1310]"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto gh-scroll">
          {quests.map((q) => {
            const progress = Math.min(100, (q.progress / q.progressGoal) * 100);
            const isCompleted = q.completed;
            const isClaimed = q.completed && q.progress >= q.progressGoal;
            const canClaim = !isClaimed && q.progress >= q.progressGoal;
            const isTracked = tracked.has(q.id);

            return (
              <motion.div
                key={q.id}
                layout
                className={cn(
                  "bg-[#241b16] border border-[#1a1310] rounded-lg p-4",
                  isTracked && "ring-1 ring-[#d4a03a]"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-md flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "#1a1310" }}
                  >
                    {QUEST_GAME_EMOJI[q.game] ?? "🎮"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="text-sm font-bold text-white truncate">
                        {q.title}
                      </h3>
                      {isClaimed && (
                        <span className="bg-[#8bb04a]/20 text-[#8bb04a] text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Check size={10} /> Claimed
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#6a5a50] mb-1.5 flex items-center gap-1.5">
                      <span className="bg-[#1a1310] px-1.5 py-0.5 rounded">{q.game}</span>
                      <span className="flex items-center gap-0.5 text-[#d4a03a]">
                        <Zap size={10} /> {q.pointsReward} pts
                      </span>
                    </div>
                    <p className="text-xs text-[#d4c4a8] mb-2 line-clamp-2">
                      {q.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-[#6a5a50] flex items-center gap-1">
                      <Target size={12} /> Progress
                    </span>
                    <span className="text-[#f5e6c8] font-semibold">
                      {q.progress} / {q.progressGoal}
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-2 bg-[#1a1310]"
                    style={
                      isClaimed
                        ? ({
                            background: "rgba(35,165,90,0.15)",
                            "--progress-foreground": "#8bb04a",
                          } as React.CSSProperties)
                        : undefined
                    }
                  />
                </div>

                <div className="mt-3 pt-3 border-t border-[#1a1310] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#6a5a50] truncate">
                    <Flame size={12} className="text-[#d4a03a] shrink-0" />
                    <span className="truncate">
                      Reward: <span className="text-[#f5e6c8]">{q.reward}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleTrack(q)}
                      className={cn(
                        "text-xs hover:bg-[#3d302a] hover:text-white h-7 px-2",
                        isTracked ? "text-[#d4a03a]" : "text-[#d4c4a8]"
                      )}
                    >
                      {isTracked ? (
                        <span className="flex items-center gap-1">
                          <Check size={12} /> Tracked
                        </span>
                      ) : (
                        "Track"
                      )}
                    </Button>
                    {!isCompleted && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === `inc-${q.id}`}
                        onClick={() => handleIncrement(q)}
                        className="text-xs bg-[#1a1310] hover:bg-[#4a3a30] text-[#d4c4a8] hover:text-white h-7 px-2 flex items-center gap-1"
                      >
                        {busy === `inc-${q.id}` ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Plus size={12} />
                        )}
                        I did it! (+1)
                      </Button>
                    )}
                    {canClaim && (
                      <Button
                        size="sm"
                        disabled={busy === `claim-${q.id}`}
                        onClick={() => claimReward(q)}
                        className="bg-[#8bb04a] hover:bg-[#6b8b3a] text-white h-7 px-3"
                      >
                        {busy === `claim-${q.id}` ? (
                          <Loader2 size={12} className="animate-spin mr-1" />
                        ) : (
                          <Star size={12} className="mr-1" />
                        )}
                        Claim
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
