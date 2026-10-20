"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Smile, Gift, Sticker, X, AtSign, Bold, Italic } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUIStore, useCurrentChannel } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { EMOJI_SET } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

export function MessageInput() {
  const channel = useCurrentChannel();
  const sendMessage = useSocketStore((s) => s.sendMessage);
  const startTyping = useSocketStore((s) => s.startTyping);
  const stopTyping = useSocketStore((s) => s.stopTyping);
  const replyTo = useUIStore((s) => s.replyTo);
  const setReplyTo = useUIStore((s) => s.setReplyTo);
  const editingMessageId = useUIStore((s) => s.editingMessageId);
  const setEditingMessageId = useUIStore((s) => s.setEditingMessageId);
  const editMessageEmit = useSocketStore((s) => s.editMessageEmit);
  const voiceJoinedChannelId = useUIStore((s) => s.voiceJoinedChannelId);
  const leaveVoice = useUIStore((s) => s.leaveVoice);

  const [value, setValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Reset / pre-fill for edit
  useEffect(() => {
    if (editingMessageId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingMessageId]);

  // Load existing message content for edit
  useEffect(() => {
    if (!editingMessageId || !channel) {
      return;
    }
    const msgs = useSocketStore.getState().messages[channel.id] ?? [];
    const m = msgs.find((x) => x.id === editingMessageId);
    if (m) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(m.content);
    }
  }, [editingMessageId, channel]);

  // Reset value when channel changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue("");
    setReplyTo(null);
    setEditingMessageId(null);
  }, [channel?.id, setReplyTo, setEditingMessageId]);

  const placeholder = channel
    ? `Message #${channel.name}`
    : "Send a message";

  const onSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || !channel) return;

    if (editingMessageId) {
      editMessageEmit(editingMessageId, channel.id, trimmed);
      setEditingMessageId(null);
    } else {
      // 1) emit to socket (real-time broadcast + local append)
      sendMessage(channel.id, trimmed, replyTo?.messageId);
      // 2) persist to DB (best-effort)
      try {
        const me = useUIStore.getState().currentUser;
        await fetch(
          `/api/servers/${channel.serverId}/channels/${channel.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: trimmed,
              userId: me?.id,
              replyToId: replyTo?.messageId ?? null,
            }),
          }
        );
      } catch {
        // best-effort persistence; ignore
      }
    }

    setValue("");
    setReplyTo(null);
    setEditingMessageId(null);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    if (channel) stopTyping(channel.id);
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (!channel) return;

    // Typing indicator (debounced start/stop)
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(channel.id);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      stopTyping(channel.id);
    }, 4000);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
    if (e.key === "Escape") {
      setReplyTo(null);
      setEditingMessageId(null);
      setValue("");
    }
  };

  const insertEmoji = (emoji: string) => {
    setValue((v) => v + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  if (!channel) return null;

  return (
    <div className="px-4 pb-4 pt-0 relative">
      {/* Reply indicator */}
      <AnimatePresence>
        {(replyTo || editingMessageId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute -top-8 left-4 right-4 bg-[#241b16] px-2 py-1 rounded-t-md flex items-center justify-between text-xs text-[#6a5a50] border-t border-l border-r border-[#1a1310]"
          >
            <span>
              {replyTo ? (
                <>
                  Replying to <b className="text-[#f5e6c8]">{replyTo.username}</b>
                </>
              ) : (
                <>Editing message</>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setEditingMessageId(null);
                setValue("");
              }}
              className="hover:text-[#f5e6c8]"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice-connected inline indicator */}
      {voiceJoinedChannelId && (
        <div className="absolute -top-8 right-4 text-xs text-[#8bb04a] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#8bb04a] pulse-online" />
          <span>Voice Connected</span>
          <button
            type="button"
            onClick={leaveVoice}
            className="hover:text-[#b04a4a] hover:underline"
          >
            Leave
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 bg-[#383a40] rounded-lg px-4 py-3 min-h-[48px]">
        <button
          type="button"
          aria-label="Add attachment"
          className="w-6 h-6 rounded-full bg-[#d4c4a8] text-[#383a40] hover:bg-[#dcddde] flex items-center justify-center text-lg leading-none"
        >
          +
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[#f5e6c8] placeholder:text-[#5a4a40] text-sm resize-none outline-none py-1 max-h-[200px] overflow-y-auto gh-scroll"
          style={{ height: "auto" }}
        />

        <div className="flex items-center gap-3 text-[#d4c4a8]">
          <button
            type="button"
            aria-label="Gift"
            className="hover:text-white"
          >
            <Gift size={22} />
          </button>
          <button
            type="button"
            aria-label="GIF"
            className="hover:text-white text-xs font-bold"
          >
            GIF
          </button>
          <button
            type="button"
            aria-label="Sticker"
            className="hover:text-white"
          >
            <Sticker size={22} />
          </button>

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Emoji"
                className="hover:text-[#d4a03a] hover:bg-[#4a3a30] rounded-full w-8 h-8 flex items-center justify-center"
              >
                <Smile size={22} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-[300px] p-2 bg-[#3d302a] border-[#1a1310] grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto gh-scroll"
            >
              {EMOJI_SET.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => insertEmoji(e)}
                  className="w-7 h-7 hover:bg-[#3d302a] rounded flex items-center justify-center text-lg"
                >
                  {e}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
