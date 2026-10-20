"use client";

import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import type { Status } from "@/lib/types";

type AvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 80,
  "2xl": 100,
};

const DOT_PX: Record<AvatarSize, number> = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 22,
  "2xl": 28,
};

interface UserAvatarProps {
  name: string;
  color: string;
  size?: AvatarSize;
  status?: Status;
  showStatus?: boolean;
  ringColor?: string;
  className?: string;
  onClick?: () => void;
}

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  name,
  color,
  size = "md",
  status,
  showStatus = false,
  ringColor = "#241b16",
  className,
  onClick,
}: UserAvatarProps) {
  const px = SIZE_PX[size];
  const dot = DOT_PX[size];

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: px, height: px }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div
        className="flex items-center justify-center rounded-full font-semibold text-white select-none"
        style={{
          width: px,
          height: px,
          background: color,
          fontSize: px * 0.4,
          cursor: onClick ? "pointer" : "default",
        }}
      >
        {initials(name)}
      </div>
      {showStatus && status && (
        <span
          className="absolute rounded-full"
          style={{
            width: dot,
            height: dot,
            background: STATUS_COLORS[status] ?? "#6a5a50",
            bottom: -2,
            right: -2,
            border: `3px solid ${ringColor}`,
          }}
        />
      )}
    </div>
  );
}
