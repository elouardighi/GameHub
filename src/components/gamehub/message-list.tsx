"use client";

import { memo, useEffect, useRef } from "react";
import { MessageItem } from "./message-item";
import { useSocketStore, EMPTY_MESSAGES, EMPTY_TYPING } from "@/lib/socket";
import type { Message } from "@/lib/types";

interface MessageListProps {
  channelId: string;
}

function MessageListImpl({ channelId }: MessageListProps) {
  const messages = useSocketStore((s) => s.messages[channelId] ?? EMPTY_MESSAGES);
  const typingUsers = useSocketStore((s) => s.typingUsers[channelId] ?? EMPTY_TYPING);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when a new message arrives
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    // Only auto-scroll if user is already near the bottom
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, channelId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [typingUsers.length]);

  // Group consecutive messages by same user
  const grouped: Message[][] = [];
  for (const m of messages) {
    const last = grouped[grouped.length - 1];
    if (last && last[last.length - 1].userId === m.userId) {
      last.push(m);
    } else {
      grouped.push([m]);
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto chat-scroll px-4 pt-4 pb-0"
    >
      {messages.length === 0 ? (
        <EmptyChannel channelId={channelId} />
      ) : (
        grouped.map((group, gi) => (
          <div key={gi}>
            {group.map((msg, mi) => (
              <MessageItem
                key={msg.id}
                message={msg}
                showHeader={mi === 0}
              />
            ))}
          </div>
        ))
      )}
      <div ref={bottomRef} className="h-1" />

      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 py-1 text-xs text-[#6a5a50]">
          <span className="flex gap-0.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
          <span>
            <b className="text-[#f5e6c8]">{typingUsers[0].username}</b>
            {typingUsers.length > 1
              ? ` and ${typingUsers.length - 1} others are typing...`
              : " is typing..."}
          </span>
        </div>
      )}
    </div>
  );
}

function EmptyChannel({ channelId }: { channelId: string }) {
  return (
    <div className="py-8">
      <div className="w-16 h-16 rounded-full bg-[#d4a03a]/20 flex items-center justify-center text-[#d4a03a] mb-3 text-2xl">
        #
      </div>
      <h2 className="text-xl font-bold text-white">Welcome!</h2>
      <p className="text-sm text-[#6a5a50] mt-1">
        This is the beginning of <span className="text-[#f5e6c8]">{channelId}</span>. Be the first to say something!
      </p>
    </div>
  );
}

export const MessageList = memo(MessageListImpl);
