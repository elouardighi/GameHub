"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Upload,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { SERVER_ICON_COLORS, SERVER_BANNER_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TEMPLATES = [
  {
    id: "gaming",
    name: "Gaming",
    emoji: "🎮",
    desc: "Hang out, voice chat, find squads and run ranked together.",
    color: "#d4a03a",
  },
  {
    id: "study",
    name: "Study Group",
    emoji: "📚",
    desc: "Stay on top of schoolwork with study partners and accountability.",
    color: "#8bb04a",
  },
  {
    id: "friends",
    name: "Friends",
    emoji: "💬",
    desc: "Just a small group chat for you and your friends.",
    color: "#c44a8b",
  },
  {
    id: "creators",
    name: "Creators",
    emoji: "🎨",
    desc: "Showcase work, share feedback, and grow your audience.",
    color: "#d4a03a",
  },
];

export function CreateServerModal() {
  const open = useUIStore((s) => s.showCreateServer);
  const close = useUIStore((s) => s.closeCreateServer);
  const addServer = useUIStore((s) => s.addServer);
  const currentUser = useUIStore((s) => s.currentUser);

  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState("gaming");
  const [name, setName] = useState("My Server");
  const [iconColor, setIconColor] = useState(SERVER_ICON_COLORS[0]);
  const [bannerColor, setBannerColor] = useState(SERVER_BANNER_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setStep(1);
    setTemplate("gaming");
    setName("My Server");
    setIconColor(SERVER_ICON_COLORS[0]);
    setBannerColor(SERVER_BANNER_COLORS[0]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          iconColor,
          bannerColor,
          description: `A ${template} server on GameHub.`,
        }),
      });
      const data = await res.json();
      if (data?.id) {
        // Fetch full server details (with channels)
        const full = await fetch(`/api/servers/${data.id}`).then((r) => r.json());
        addServer(full);
        toast.success(`"${full.name}" created!`);
        close();
        reset();
      }
    } catch (e) {
      toast.error("Failed to create server");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          close();
          setTimeout(reset, 200);
        }
      }}
    >
      <DialogContent
        className="max-w-[440px] bg-[#2e2520] border-[#1a1310] text-[#f5e6c8] p-0 [&>button]:hidden overflow-hidden"
        showCloseButton={false}
      >
        <button
          type="button"
          onClick={() => {
            close();
            setTimeout(reset, 200);
          }}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#241b16] hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white flex items-center justify-center border border-[#1a1310] z-10"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <h2 className="text-xl font-bold text-white mb-1">
                Create Your Server
              </h2>
              <p className="text-sm text-[#6a5a50] mb-4">
                Pick a template to get started — you can customize later.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTemplate(t.id);
                      setName(`${t.name} Server`);
                      setIconColor(t.color);
                    }}
                    className={cn(
                      "p-3 rounded-md border text-left hover:bg-[#3d302a]/40 transition-colors",
                      template === t.id
                        ? "border-[#d4a03a] bg-[#d4a03a]/10"
                        : "border-[#1a1310]"
                    )}
                  >
                    <div className="text-2xl mb-1">{t.emoji}</div>
                    <div className="text-sm font-semibold text-white">
                      {t.name}
                    </div>
                    <div className="text-xs text-[#6a5a50] mt-0.5 line-clamp-2">
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setTimeout(reset, 200);
                  }}
                  className="text-sm text-[#d4c4a8] hover:text-white"
                >
                  Cancel
                </button>
                <Button
                  onClick={() => setStep(2)}
                  className="bg-[#d4a03a] hover:bg-[#b08530] text-white"
                >
                  Customize <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <h2 className="text-xl font-bold text-white mb-1">
                Customize Your Server
              </h2>
              <p className="text-sm text-[#6a5a50] mb-4">
                Give your new server a name and identity.
              </p>

              <div className="flex justify-center mb-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-2xl"
                  style={{ background: iconColor }}
                >
                  {name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                </div>
              </div>

              <label className="text-xs uppercase font-semibold text-[#6a5a50] mb-1 block">
                Server Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Server name"
                className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] mb-3"
              />

              <label className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5 block">
                Server Icon Color
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {SERVER_ICON_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setIconColor(c)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform",
                      iconColor === c &&
                        "ring-2 ring-white ring-offset-2 ring-offset-[#2e2520]"
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>

              <label className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5 block">
                Banner Color
              </label>
              <div className="flex flex-wrap gap-2 mb-5">
                {SERVER_BANNER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBannerColor(c)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform",
                      bannerColor === c &&
                        "ring-2 ring-white ring-offset-2 ring-offset-[#2e2520]"
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-[#d4c4a8] hover:text-white flex items-center"
                >
                  <ChevronLeft size={16} className="mr-0.5" /> Back
                </button>
                <Button
                  onClick={handleSubmit}
                  disabled={!name.trim() || creating}
                  className="bg-[#d4a03a] hover:bg-[#b08530] text-white"
                >
                  {creating ? (
                    "Creating..."
                  ) : (
                    <>
                      <Check size={16} className="mr-1" /> Create
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
