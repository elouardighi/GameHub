"use client";

import { motion } from "framer-motion";
import { Sparkles, Users, Shield, Star, X, Trophy, Clock, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useUIStore } from "@/lib/ui-store";
import { bannerClass } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClanApplication {
  id: string;
  clanId: string;
  status: "pending" | "accepted" | "rejected";
}

export function ClansView() {
  const clans = useUIStore((s) => s.clans);
  const setView = useUIStore((s) => s.setView);

  const [applyClan, setApplyClan] = useState<{
    id: string;
    name: string;
    tag: string;
    question: string;
  } | null>(null);
  const [applicationText, setApplicationText] = useState("");
  const [applications, setApplications] = useState<Record<string, ClanApplication>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Fetch user's applications on mount so we can show "pending"/"joined" state
  useEffect(() => {
    fetch("/api/clans/applications")
      .then((r) => r.json())
      .then((data: ClanApplication[]) => {
        const map: Record<string, ClanApplication> = {};
        for (const a of data) map[a.clanId] = a;
        setApplications(map);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!applyClan) return;
    if (applicationText.trim().length < 5) {
      toast.error("Please write at least a few words");
      return;
    }
    setSubmitting(applyClan.id);
    try {
      const res = await fetch(`/api/clans/${applyClan.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: applicationText }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.status === "pending") {
          setApplications((s) => ({ ...s, [applyClan.id]: data.application }));
          toast.info("You already applied to this clan");
        } else if (data.status === "accepted") {
          setApplications((s) => ({ ...s, [applyClan.id]: data.application }));
          toast.info("You're already a member of this clan");
        } else {
          toast.error(data.error ?? "Could not submit application");
        }
        setApplyClan(null);
        setApplicationText("");
        return;
      }
      setApplications((s) => ({
        ...s,
        [data.clanId]: {
          id: data.id,
          clanId: data.clanId,
          status: data.status,
        },
      }));
      toast.success(`Application submitted to ${applyClan.name}! 🎉`);
      setApplyClan(null);
      setApplicationText("");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#2e2520] overflow-hidden">
      {/* Hero banner */}
      <div className="relative h-32 sm:h-40 bg-gradient-to-r from-[#1a1a2e] via-[#d4a03a] to-[#c44a8b] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative text-center px-4">
          <Sparkles size={36} className="text-white mx-auto mb-2" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            GameHub Clans
          </h1>
          <p className="text-sm text-white/80 mt-1 max-w-[600px]">
            Exclusive gaming communities. Application-based. Max 200 members. Find your forever squad.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView("friends")}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Clan grid */}
      <div className="flex-1 overflow-y-auto chat-scroll p-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Featured Clans <span className="text-[#6a5a50] text-sm font-normal">· {clans.length}</span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-[#6a5a50]">
              <span className="flex items-center gap-1">
                <Star size={14} /> Verified
              </span>
              <span className="flex items-center gap-1">
                <Shield size={14} /> Application-based
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} /> Max 200
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clans.map((clan) => {
              const app = applications[clan.id];
              return (
                <motion.div
                  key={clan.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="bg-[#241b16] border border-[#1a1310] rounded-lg overflow-hidden"
                >
                  <div
                    className={cn("h-24 relative", bannerClass(clan.bannerStyle))}
                  >
                    <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-4 border-[#241b16] flex items-center justify-center font-bold text-white text-lg"
                      style={{ background: clan.badgeColor }}
                    >
                      {clan.tag[0]}
                    </div>
                    <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {clan.tag}
                    </div>
                  </div>

                  <div className="p-4 pt-8">
                    <h3 className="text-base font-bold text-white">
                      {clan.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#6a5a50] mb-3">
                      <span className="bg-[#1a1310] px-1.5 py-0.5 rounded">
                        {clan.playstyle}
                      </span>
                      <span className="bg-[#1a1310] px-1.5 py-0.5 rounded">
                        {clan.minAge}+ min age
                      </span>
                      <span className="text-[#8bb04a]">
                        {clan.memberCount}/200
                      </span>
                    </div>
                    <p className="text-xs text-[#d4c4a8] line-clamp-3 mb-3">
                      {clan.description}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-[#6a5a50] mb-3">
                      <span className="font-semibold uppercase">Games:</span>
                      <span className="truncate">{clan.games}</span>
                    </div>
                    {app?.status === "pending" ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 bg-[#d4a03a]/20 text-[#d4a03a] rounded-md text-sm font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Clock size={14} /> Application Pending
                      </button>
                    ) : app?.status === "accepted" ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 bg-[#8bb04a]/20 text-[#8bb04a] rounded-md text-sm font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Check size={14} /> Joined
                      </button>
                    ) : app?.status === "rejected" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setApplyClan({
                            id: clan.id,
                            name: clan.name,
                            tag: clan.tag,
                            question: clan.applicationQuestion,
                          })
                        }
                        className="w-full py-2 bg-[#d4a03a] hover:bg-[#b08530] text-white rounded-md text-sm font-semibold"
                      >
                        Re-apply
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setApplyClan({
                            id: clan.id,
                            name: clan.name,
                            tag: clan.tag,
                            question: clan.applicationQuestion,
                          })
                        }
                        className="w-full py-2 bg-[#d4a03a] hover:bg-[#b08530] text-white rounded-md text-sm font-semibold"
                      >
                        Apply to Join
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Application modal */}
      <Dialog
        open={!!applyClan}
        onOpenChange={(o) => {
          if (!o) {
            setApplyClan(null);
            setApplicationText("");
          }
        }}
      >
        <DialogContent className="max-w-[500px] bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#d4a03a]" />
              Apply to {applyClan?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#6a5a50]">
              {applyClan?.question}
            </p>
            <Textarea
              value={applicationText}
              onChange={(e) => setApplicationText(e.target.value)}
              rows={5}
              placeholder="Tell them about yourself... (min 5 chars)"
              className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setApplyClan(null);
                  setApplicationText("");
                }}
                className="text-white hover:bg-[#3d302a]"
              >
                Cancel
              </Button>
              <Button
                disabled={applicationText.trim().length < 5 || submitting === applyClan?.id}
                onClick={handleSubmit}
                className="bg-[#d4a03a] hover:bg-[#b08530] text-white"
              >
                {submitting === applyClan?.id ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : null}
                Submit Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
