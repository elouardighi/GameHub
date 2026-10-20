"use client";

import { useEffect, useState } from "react";
import { Plus, MessageSquare, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./user-avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ForumThread {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerAvatarColor: string;
  createdAt: string;
  messageCount: number;
  preview: string;
}

export function ForumChannelView({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/servers/any/channels/${channelId}/threads`)
      .then((r) => r.json())
      .then((data: ForumThread[]) => {
        if (cancelled) return;
        setThreads(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setThreads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(
        `/api/servers/any/channels/${channelId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            firstMessage: newMessage,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not create thread");
        return;
      }
      const data: ForumThread = await res.json();
      setThreads((prev) => [data, ...prev]);
      toast.success(`Thread "${data.name}" created!`);
      setShowCreate(false);
      setNewName("");
      setNewMessage("");
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">#{channelName}</h1>
          <p className="text-sm text-[#6a5a50] mt-1">
            Discuss topics in long-form threads. Anyone can post a new thread.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#8bb04a] hover:bg-[#6b8b3a] text-white rounded-md font-medium text-sm"
        >
          <Plus size={18} /> New Post
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#6a5a50]">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading threads...
        </div>
      ) : threads.length === 0 ? (
        <div className="py-12 text-center text-[#6a5a50]">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            No threads yet. Be the first to start a discussion!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              className="w-full text-left bg-[#241b16] hover:bg-[#3d302a] border border-[#1a1310] rounded-md p-4 flex gap-3 transition-colors group"
            >
              <UserAvatar
                name={t.ownerName}
                color={t.ownerAvatarColor}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#f5e6c8] font-semibold text-base group-hover:underline truncate">
                    {t.name}
                  </span>
                </div>
                <div className="text-xs text-[#6a5a50] mb-1">
                  <span className="font-semibold text-[#d4c4a8]">{t.ownerName}</span>{" "}
                  · {new Date(t.createdAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-[#dcddde] truncate">{t.preview}</div>
              </div>
              <div className="flex flex-col items-center justify-center text-[#6a5a50] text-xs gap-1 shrink-0">
                <MessageSquare size={18} />
                <span>{t.messageCount}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New post dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[500px] bg-[#2e2520] border-[#1a1310] text-[#f5e6c8] p-0 [&>button]:hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus size={18} className="text-[#8bb04a]" />
              New Thread in #{channelName}
            </DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#241b16] hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white flex items-center justify-center border border-[#1a1310]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div className="px-5 pb-5 space-y-3">
            <div>
              <label className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5 block">
                Thread Title
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Best clutch tips for ranked"
                className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8]"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5 block">
                First Message (optional)
              </label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                placeholder="Share your thoughts..."
                className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewMessage("");
                }}
                className="text-white hover:bg-[#3d302a]"
              >
                Cancel
              </Button>
              <Button
                disabled={!newName.trim() || creating}
                onClick={handleCreate}
                className={cn(
                  "bg-[#8bb04a] hover:bg-[#6b8b3a] text-white"
                )}
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : null}
                Create Thread
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// (no trailing exports needed)
