"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { useUIStore, useCurrentServer } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

const ROLE_GROUPS = ["OWNER", "MODERATORS", "PRO", "MEMBERS", "OFFLINE"];

export function MemberList() {
  const server = useCurrentServer();
  const openProfile = useUIStore((s) => s.openProfile);
  const profileUserId = useUIStore((s) => s.profileUserId);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const onlineUsers = useSocketStore((s) => s.onlineUsers);
  const userStatuses = useSocketStore((s) => s.userStatuses);

  useEffect(() => {
    let cancelled = false;
    if (!server) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMembers([]);
      return;
    }
    setLoading(true);
    fetch(`/api/servers/${server.id}/members`)
      .then((r) => r.json())
      .then((data: Member[]) => {
        if (cancelled) return;
        setMembers(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMembers([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [server?.id]);

  if (!server) return null;

  // Sort: owner first, then by join date
  const sorted = [...members].sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    return 0;
  });

  // Group by synthesized role
  const grouped = ROLE_GROUPS.map((role) => ({
    role,
    members: sorted.filter((m) => {
      if (role === "OFFLINE") {
        const st = userStatuses[m.user.id] ?? m.user.status;
        return st === "offline" || (!onlineUsers.some((u) => u.id === m.user.id) && st === "offline");
      }
      return m.role === role;
    }),
  })).filter((g) => g.members.length > 0);

  // Total online count
  const onlineCount = sorted.filter((m) => {
    const st = userStatuses[m.user.id] ?? m.user.status;
    return st !== "offline" || onlineUsers.some((u) => u.id === m.user.id);
  }).length;

  return (
    <aside className="w-[240px] shrink-0 bg-[#241b16] flex flex-col overflow-hidden">
      <div className="h-12 px-3 flex items-center justify-between border-b border-[#1a1310] shadow-sm shrink-0">
        <span className="font-semibold text-white text-sm">
          Members <span className="text-[#6a5a50]">· {onlineCount} online</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto gh-scroll px-2 pt-3 pb-3">
        {loading ? (
          <div className="text-xs text-[#6a5a50] text-center py-4">
            Loading members...
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-xs text-[#6a5a50] text-center py-4">
            No members found.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.role} className="mb-4">
              <div className="px-1 mb-1 text-xs uppercase font-semibold text-[#6a5a50] tracking-wide">
                {group.role} — {group.members.length}
              </div>
              {group.members.map((m) => {
                const st = userStatuses[m.user.id] ?? m.user.status;
                const online = st !== "offline";
                const isOffline = !online;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openProfile(m.user.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-1.5 py-1.5 rounded-[4px] hover:bg-[#3d302a] group transition-colors text-left",
                      profileUserId === m.user.id && "bg-[#3d302a]/70"
                    )}
                  >
                    <UserAvatar
                      name={m.user.name}
                      color={m.user.avatarColor}
                      size="sm"
                      status={isOffline ? "offline" : st}
                      showStatus
                      ringColor="#241b16"
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: m.roleColor }}
                      >
                        {m.user.name}
                      </span>
                      {m.isOwner && (
                        <Crown size={12} className="text-[#d4a03a] shrink-0" />
                      )}
                    </div>
                    {m.user.customStatus && !isOffline && (
                      <span className="text-xs text-[#6a5a50] truncate hidden xl:block">
                        {m.user.customStatus}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
