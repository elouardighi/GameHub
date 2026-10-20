// Shared constants for GameHub

export const AVATAR_COLORS = [
  "#d4a03a", // blurple
  "#b04a4a", // red
  "#8bb04a", // green
  "#e8c159", // yellow
  "#EB459E", // pink
  "#b04a4a", // coral
  "#8b3a3a", // purple
  "#6b8b3a", // teal
  "#d4a03a", // orange
  "#8bb04a", // emerald
];

export const STATUS_COLORS: Record<string, string> = {
  online: "#8bb04a",
  idle: "#d4a03a",
  dnd: "#b04a4a",
  offline: "#6a5a50",
};

export const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

// Common gaming emojis for the reaction picker / message input
export const EMOJI_SET = [
  "👍", "❤️", "🔥", "😂", "🎉", "🎮", "👀", "🙏", "😎", "😭",
  "💀", "🤡", "🥳", "🤯", "🥺", "😤", "👏", "🙌", "💪", "🎯",
  "🏆", "⚡", "✨", "🌈", "💜", "💚", "💙", "💛", "🧡", "❤️‍🔥",
  "🤝", "👋", "🫡", "🍿", "🧠", "🦄", "🐉", "👾", "🕹️", "🎲",
];

// Banner styles available for clans (Discord-style "Guilds" feature)
export const BANNER_STYLES = [
  "Mesh",
  "Night Sky",
  "Castle",
  "World Map",
  "Sea Foam",
  "Warp",
  "House",
  "Pulsar",
  "Spatter",
] as const;

// Map a banner style name to a tailwind class (defined in globals.css)
export function bannerClass(style: string | null | undefined): string {
  if (!style) return "clan-banner-Mesh";
  const key = style.replace(/\s+/g, "\\ ");
  return `clan-banner-${key}`;
}

// Channel types
export const CHANNEL_TYPES = [
  "text",
  "voice",
  "stage",
  "forum",
  "announcement",
  "rules",
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const CHANNEL_TYPE_LABELS: Record<string, string> = {
  text: "Text Channel",
  voice: "Voice Channel",
  stage: "Stage Channel",
  forum: "Forum Channel",
  announcement: "Announcement Channel",
  rules: "Rules & Info",
};

// Server icon colors (used for randomization on new server create)
export const SERVER_ICON_COLORS = [
  "#b04a4a", "#d4a03a", "#6b8b3a", "#d4a03a", "#b04a4a",
  "#d4a03a", "#8b3a3a", "#6b8b3a", "#d4a03a", "#8bb04a",
];

export const SERVER_BANNER_COLORS = [
  "#0F1923", "#0A1428", "#1F3A28", "#1A1A1A", "#1A0A14",
  "#1E1F22", "#2B2D31",
];

// Playstyle options for clans
export const PLAYSTYLES = ["Very Casual", "Casual", "Hardcore", "Very Hardcore"];

// Quests / activities emoji palette
export const QUEST_GAME_EMOJI: Record<string, string> = {
  Valorant: "🎯",
  "League of Legends": "🏆",
  Minecraft: "⛏️",
  "Apex Legends": "🔫",
  "Grand Theft Auto V": "🚗",
  "Counter-Strike": "💥",
};

// Default reaction set offered on a message hover
export const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "🎉", "👀"];
