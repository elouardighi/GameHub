"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ServerIconProps {
  name: string;
  color: string;
  isActive?: boolean;
  isHome?: boolean;
  hasUnread?: boolean;
  onClick?: () => void;
}

export function ServerIcon({
  name,
  color,
  isActive = false,
  isHome = false,
  hasUnread = false,
  onClick,
}: ServerIconProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={cn(
        "server-icon-wrapper",
        isActive && "active",
        "group"
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Left pill indicator */}
      <span
        className={cn(
          "pill-indicator",
          isActive ? "active" : hover ? "hover" : "idle"
        )}
      />
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "server-icon-btn flex items-center justify-center text-white font-semibold text-base select-none",
          "hover:shadow-lg"
        )}
        style={{
          width: 48,
          height: 48,
          borderRadius: isActive || hover ? 14 : 24,
          background: isHome ? "#d4a03a" : color,
          transition: "border-radius 0.2s ease, background 0.2s ease",
        }}
      >
        {isHome ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.56 1.21a16.85 16.85 0 0 0-5.14 0c-.16-.41-.35-.81-.56-1.21a18.27 18.27 0 0 0-4.6 1.44A19.05 19.05 0 0 0 .96 16.59a18.43 18.43 0 0 0 5.62 2.84c.45-.61.84-1.26 1.18-1.94-.65-.24-1.27-.55-1.85-.91.16-.12.31-.24.46-.36a13.13 13.13 0 0 0 11.26 0c.15.13.3.25.46.36-.59.36-1.21.66-1.86.91.34.68.73 1.33 1.18 1.94a18.31 18.31 0 0 0 5.63-2.84A19.04 19.04 0 0 0 19.73 4.87ZM8.1 14.02c-1.12 0-2.04-1.02-2.04-2.28 0-1.25.9-2.28 2.04-2.28 1.14 0 2.06 1.03 2.04 2.28 0 1.26-.9 2.28-2.04 2.28Zm7.84 0c-1.12 0-2.04-1.02-2.04-2.28 0-1.25.9-2.28 2.04-2.28 1.14 0 2.06 1.03 2.04 2.28 0 1.26-.9 2.28-2.04 2.28Z" />
          </svg>
        ) : (
          name
            .split(/\s+/)
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        )}
      </button>

      {hasUnread && !isActive && (
        <span
          className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"
          aria-hidden="true"
        />
      )}

      {hover && (
        <span className="gh-server-tooltip">{name}</span>
      )}
    </div>
  );
}
