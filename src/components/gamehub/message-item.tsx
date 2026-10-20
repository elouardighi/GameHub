"use client";

import { useState } from "react";
import {
  Smile,
  Reply,
  Edit,
  Trash,
  MoreHorizontal,
  Pin,
  AtSign,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "./user-avatar";
import { useSocketStore } from "@/lib/socket";
import { useUIStore } from "@/lib/ui-store";
import { QUICK_REACTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const isYest = d.toDateString() === yest.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today at ${time}`;
    if (isYest) return `Yesterday at ${time}`;
    return d.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" }) + ` at ${time}`;
  } catch {
    return "";
  }
}

// Simple markdown: **bold**, *italic*, `code`, links, @mentions, #channel mentions
function renderContent(content: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(https?:\/\/[^\s]+)|(@\w+)|(#[a-z0-9-]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("http")) {
      parts.push(
        <a key={key++} href={token} target="_blank" rel="noreferrer noopener">
          {token}
        </a>
      );
    } else if (token.startsWith("@")) {
      parts.push(
        <span key={key++} className="mention" role="button">
          {token}
        </span>
      );
    } else if (token.startsWith("#")) {
      parts.push(
        <span key={key++} className="channel-mention" role="button">
          {token}
        </span>
      );
    }
    last = m.index + token.length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return parts;
}

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const currentUserId = useSocketStore((s) => s.currentUserId);
  const addReactionEmit = useSocketStore((s) => s.addReactionEmit);
  const removeReactionEmit = useSocketStore((s) => s.removeReactionEmit);
  const deleteMessageEmit = useSocketStore((s) => s.deleteMessageEmit);
  const editMessageEmit = useSocketStore((s) => s.editMessageEmit);
  const pinMessageEmit = useSocketStore((s) => s.pinMessageEmit);
  const setReplyTo = useUIStore((s) => s.setReplyTo);
  const setEditingMessageId = useUIStore((s) => s.setEditingMessageId);
  const [hover, setHover] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const toggleReaction = (emoji: string) => {
    const reaction = message.reactions.find((r) => r.emoji === emoji);
    if (reaction && reaction.reactedByMe) {
      removeReactionEmit(message.id, message.channelId, emoji);
    } else {
      addReactionEmit(message.id, message.channelId, emoji);
    }
    setShowEmojiPicker(false);
  };

  const isMine = message.userId === currentUserId;

  return (
    <div
      className="relative group px-2 py-0.5 hover:bg-[#2e3035]/30"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {showHeader && message.replyTo && (
        <div className="ml-12 pl-1 mb-0.5 text-sm text-[#6a5a50] flex items-center gap-1 before:absolute before:left-2 before:mt-[-6px] before:h-5 before:w-[3px] before:bg-[#4e5058] before:rounded-full">
          <Reply size={12} className="ml-0" />
          <span className="font-semibold text-[#f5e6c8]">@{message.replyTo.username}</span>
          <span className="truncate max-w-[400px]">
            {message.replyTo.content}
          </span>
        </div>
      )}

      <div className={cn("flex gap-3", !showHeader && "pt-1")}>
        {showHeader ? (
          <UserAvatar
            name={message.username}
            color={message.avatarColor}
            size="md"
            className="mt-0.5"
          />
        ) : (
          <div className="w-8 shrink-0 flex items-center justify-center text-[10px] text-[#6a5a50] opacity-0 group-hover:opacity-100">
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {showHeader && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white hover:underline cursor-pointer">
                {message.username}
              </span>
              <span className="text-xs text-[#6a5a50]">
                {formatTime(message.timestamp)}
              </span>
              {message.isEdited && (
                <span className="text-[10px] text-[#6a5a50]">(edited)</span>
              )}
            </div>
          )}
          <div className="message-content text-sm text-[#dcddde] break-words leading-[1.4]">
            {renderContent(message.content)}
          </div>

          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => toggleReaction(r.emoji)}
                  className={cn("reaction-pill", r.reactedByMe && "reacted")}
                  aria-label={`Reaction ${r.emoji}: ${r.count}`}
                >
                  <span className="text-sm">{r.emoji}</span>
                  <span className="text-xs font-semibold">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        {hover && (
          <div className="absolute -top-3 right-2 flex items-center bg-[#241b16] border border-[#1a1310] rounded-md shadow-lg z-10">
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Add reaction"
                  className="w-8 h-8 flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white"
                >
                  <Smile size={18} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="w-auto p-1 bg-[#3d302a] border-[#1a1310] grid grid-cols-6 gap-1"
              >
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleReaction(e)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#3d302a] rounded text-lg"
                  >
                    {e}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <button
              type="button"
              aria-label="Reply"
              onClick={() =>
                setReplyTo({
                  messageId: message.id,
                  username: message.username,
                  content: message.content,
                })
              }
              className="w-8 h-8 flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white"
            >
              <Reply size={18} />
            </button>
            {isMine && (
              <button
                type="button"
                aria-label="Edit"
                onClick={() => setEditingMessageId(message.id)}
                className="w-8 h-8 flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white"
              >
                <Edit size={18} />
              </button>
            )}
            {isMine && (
              <button
                type="button"
                aria-label="Delete"
                onClick={() => {
                  if (confirm("Delete this message?")) {
                    deleteMessageEmit(message.id, message.channelId);
                  }
                }}
                className="w-8 h-8 flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-[#b04a4a]"
              >
                <Trash size={18} />
              </button>
            )}
            <button
              type="button"
              aria-label="More"
              className="w-8 h-8 flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
