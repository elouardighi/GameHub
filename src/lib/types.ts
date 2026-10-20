// Shared TypeScript types for GameHub (matches Prisma models + socket message shapes)

export type Status = "online" | "idle" | "dnd" | "offline";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  status: Status;
  customStatus?: string | null;
  bio?: string | null;
  bannerColor: string;
  createdAt: string;
}

export interface Server {
  id: string;
  name: string;
  iconColor: string;
  bannerColor?: string | null;
  description?: string | null;
  ownerId: string;
  inviteCode: string;
  isPublic: boolean;
  verified: boolean;
  partnered: boolean;
  memberCount: number;
  channelCount?: number;
  channels?: Channel[];
  createdAt: string;
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  badgeColor: string;
  bannerColor: string;
  bannerStyle: string;
  description: string;
  ownerId: string;
  inviteCode: string;
  games: string;
  playstyle: string;
  minAge: number;
  memberCount: number;
  applicationQuestion: string;
  members?: ClanMember[];
  createdAt: string;
}

export interface ClanMember {
  id: string;
  clanId: string;
  userId: string;
  role: string; // Leader, Officer, Member
  joinedAt: string;
  user?: User;
}

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string;
  position: number;
  permissions: string;
  isDefault: boolean;
  mentionable: boolean;
}

export interface Member {
  id: string;
  serverId: string;
  userId: string;
  nickname?: string | null;
  joinedAt: string;
  isOwner: boolean;
  user?: User;
  roles?: Role[];
}

export type ChannelType =
  | "text"
  | "voice"
  | "stage"
  | "forum"
  | "announcement"
  | "rules";

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  topic?: string | null;
  categoryId?: string | null;
  position: number;
  isPrivate: boolean;
  userLimit?: number | null;
  bitrate: number;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  avatarColor: string;
  content: string;
  timestamp: string;
  isPinned: boolean;
  isEdited?: boolean;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    userId: string;
    username: string;
    content: string;
  } | null;
  reactions: Reaction[];
}

export interface Thread {
  id: string;
  channelId: string;
  name: string;
  ownerId: string;
  isLocked: boolean;
  isArchived: boolean;
  createdAt: string;
  messageCount?: number;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "blocked";
  createdAt: string;
  user?: User; // the "other" user
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatarColor: string;
  muted: boolean;
  deafened: boolean;
  videoOn: boolean;
  streaming: boolean;
  speaking: boolean;
  isSpeaker: boolean;
  raisedHand?: boolean;
}

export interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  game: string;
  reward: string;
  pointsReward: number;
  progressGoal: number;
  progress?: number;
  completed?: boolean;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  maxPlayers: number;
}

// View modes for the main page
export type ViewMode = "server" | "friends" | "discover" | "clans";
