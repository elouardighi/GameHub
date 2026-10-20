"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  X,
  MessageSquare,
  UserPlus,
  Users,
  Sparkles,
  Flag,
} from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { cn } from "@/lib/utils";
import type { Member, User } from "@/lib/types";

interface ProfilePanelProps {
  userId: string;
}

export function ProfilePanel({ userId }: ProfilePanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [serverId, setServerId] = useState<string | null>(null);
  const closeProfile = useUIStore((s) => s.closeProfile);
  const currentUser = useUIStore((s) => s.currentUser);
  const friends = useUIStore((s) => s.friends);
  const servers = useUIStore((s) => s.servers);
  const openProfile = useUIStore((s) => s.openProfile);
  const onlineUsers = useSocketStore((s) => s.onlineUsers);
  const userStatuses = useSocketStore((s) => s.userStatuses);

  // Find which server the user is in (current server)
  const currentServerId = useUIStore.getState().currentServerId;

  useEffect(() => {
    if (!currentServerId) return;
    setServerId(currentServerId);
    fetch(`/api/servers/${currentServerId}/members`)
      .then((r) => r.json())
      .then((data: Member[]) => setMembers(data))
      .catch(() => setMembers([]));
  }, [currentServerId, userId]);

  // Find the user data
  const member = members.find((m) => m.userId === userId);
  const user: User | undefined = member?.user;

  if (!user) {
    return null;
  }

  const isFriend = friends.some((f) => f.id === user.id);
  const isMe = currentUser?.id === user.id;
  const status = userStatuses[user.id] ?? user.status;
  const online = onlineUsers.some((u) => u.id === user.id);
  const roleColor = member?.roleColor;
  const mutualServers = servers.filter((s) => true).slice(0, 3); // demo
  const mutualFriends = friends.slice(0, 4);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 240, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 240, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-[340px] shrink-0 bg-[#241b16] border-l border-[#1a1310] flex flex-col overflow-y-auto gh-scroll"
      >
        <div className="relative">
          <div
            className="h-28"
            style={{ background: user.bannerColor }}
          />
          <button
            type="button"
            onClick={closeProfile}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
            aria-label="Close profile"
          >
            <X size={16} />
          </button>
          <div className="absolute -bottom-12 left-4">
            <div className="relative">
              <UserAvatar
                name={user.name}
                color={user.avatarColor}
                size="2xl"
                status={online ? status : "offline"}
                showStatus
                ringColor="#241b16"
              />
            </div>
          </div>
        </div>

        <div className="pt-14 px-4 pb-4">
          <div className="bg-[#1a1310] rounded-lg p-3">
            <div className="flex items-center gap-1.5">
              <h2
                className="text-xl font-bold truncate"
                style={{ color: roleColor ?? "#f5e6c8" }}
              >
                {user.name}
              </h2>
              {member?.isOwner && (
                <Crown size={16} className="text-[#d4a03a] shrink-0" />
              )}
            </div>
            <div className="text-xs text-[#6a5a50] mb-2">
              {member?.role ?? "MEMBER"}
            </div>
            {user.customStatus && (
              <div className="text-sm text-[#dcddde] mb-2">
                {user.customStatus}
              </div>
            )}

            <div className="border-t border-[#4a3a30] pt-2 mt-2">
              <div className="text-xs uppercase font-semibold text-[#6a5a50] mb-1">
                Member Since
              </div>
              <div className="text-sm text-[#f5e6c8]">
                {new Date(user.createdAt).toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            {user.bio && (
              <div className="border-t border-[#4a3a30] pt-2 mt-2">
                <div className="text-xs uppercase font-semibold text-[#6a5a50] mb-1">
                  About Me
                </div>
                <div className="text-sm text-[#dcddde]">{user.bio}</div>
              </div>
            )}

            {member && (
              <div className="border-t border-[#4a3a30] pt-2 mt-2">
                <div className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5">
                  Roles
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                    style={{
                      background: `${member.roleColor}33`,
                      color: member.roleColor,
                    }}
                  >
                    <Sparkles size={10} /> {member.role}
                  </span>
                </div>
              </div>
            )}

            {mutualServers.length > 0 && (
              <div className="border-t border-[#4a3a30] pt-2 mt-2">
                <div className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5">
                  Mutual Servers
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mutualServers.map((s) => (
                    <span
                      key={s.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ background: s.iconColor }}
                      title={s.name}
                    >
                      {s.name[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {mutualFriends.length > 0 && (
              <div className="border-t border-[#4a3a30] pt-2 mt-2">
                <div className="text-xs uppercase font-semibold text-[#6a5a50] mb-1.5">
                  Mutual Friends
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mutualFriends.map((f) => (
                    <UserAvatar
                      key={f.id}
                      name={f.name}
                      color={f.avatarColor}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isMe && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#d4a03a] hover:bg-[#b08530] text-white rounded-md text-sm font-semibold"
              >
                <MessageSquare size={16} /> Message
              </button>
              {!isFriend ? (
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-[#8bb04a] hover:bg-[#6b8b3a] text-white rounded-md text-sm font-semibold"
                >
                  <UserPlus size={16} /> Add Friend
                </button>
              ) : (
                <button
                  type="button"
                  className="flex items-center justify-center px-3 py-2 bg-[#241b16] text-[#6a5a50] rounded-md text-sm font-semibold"
                  disabled
                >
                  Friends
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
