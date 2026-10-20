"use client";

import { useState } from "react";
import {
  User as UserIcon,
  Shield,
  Bell,
  Keyboard,
  Globe,
  Mic,
  Video,
  Gamepad2,
  Monitor,
  X,
  ChevronRight,
  LogOut,
  Loader2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { UserAvatar } from "./user-avatar";
import { AVATAR_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Status } from "@/lib/types";

const TABS = [
  { id: "account", label: "My Account", icon: UserIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "privacy", label: "Privacy & Safety", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "keybinds", label: "Keybinds", icon: Keyboard },
  { id: "language", label: "Language", icon: Globe },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "video", label: "Video", icon: Video },
  { id: "game", label: "Game Activity", icon: Gamepad2 },
  { id: "overlay", label: "Overlay", icon: Monitor },
];

interface VoiceSettings {
  inputVolume?: number;
  outputVolume?: number;
  noiseSuppression?: boolean;
  pushToTalk?: string;
  inputDevice?: string;
  outputDevice?: string;
}

function parseSettings(raw?: string | null): VoiceSettings {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function SettingsModal() {
  const open = useUIStore((s) => s.showSettings);
  const close = useUIStore((s) => s.closeSettings);
  const currentUser = useUIStore((s) => s.currentUser);
  const setCurrentUserStatus = useUIStore((s) => s.setCurrentUserStatus);
  const updateCurrentUser = useUIStore((s) => s.updateCurrentUser);
  const updateStatus = useSocketStore((s) => s.updateStatus);

  const [activeTab, setActiveTab] = useState("account");
  const existingSettings = parseSettings(currentUser?.settings);
  const [inputVolume, setInputVolume] = useState([existingSettings.inputVolume ?? 75]);
  const [outputVolume, setOutputVolume] = useState([existingSettings.outputVolume ?? 100]);
  const [noiseSupp, setNoiseSupp] = useState(existingSettings.noiseSuppression ?? true);
  const [pushToTalk, setPushToTalk] = useState(existingSettings.pushToTalk ?? "");
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentUser?.avatarColor ?? AVATAR_COLORS[0]
  );
  const [selectedBanner, setSelectedBanner] = useState(
    currentUser?.bannerColor ?? AVATAR_COLORS[0]
  );
  const [name, setName] = useState(currentUser?.name ?? "");
  const [email] = useState(currentUser?.email ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [customStatus, setCustomStatus] = useState(
    currentUser?.customStatus ?? ""
  );
  const [selectedStatus, setSelectedStatus] = useState<Status>(
    currentUser?.status ?? "online"
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!open) return null;

  const applyStatus = async () => {
    setSavingStatus(true);
    try {
      // Apply locally + emit socket update
      setCurrentUserStatus(selectedStatus, customStatus || undefined);
      updateStatus(selectedStatus, customStatus || undefined);
      // Persist to DB
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus, customStatus }),
      });
      if (!res.ok) {
        toast.error("Could not save status");
        return;
      }
      toast.success("Status saved! ✓");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingStatus(false);
    }
  };

  const saveAccount = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          avatarColor: selectedAvatar,
          bannerColor: selectedBanner,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save profile");
        return;
      }
      const data = await res.json();
      updateCurrentUser({
        name: data.name,
        bio: data.bio,
        avatarColor: data.avatarColor,
        bannerColor: data.bannerColor,
      });
      toast.success("Profile saved! ✓");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveVoice = async () => {
    setSavingVoice(true);
    try {
      const res = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputVolume: inputVolume[0],
          outputVolume: outputVolume[0],
          noiseSuppression: noiseSupp,
          pushToTalk,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save voice settings");
        return;
      }
      toast.success("Voice settings saved! ✓");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingVoice(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Direct fetch to /api/auth/signout — more reliable than signOut() wrapper
      // (which sometimes doesn't fire when inside a Dialog that auto-closes)
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `csrfToken=${csrfToken}&callbackUrl=${encodeURIComponent(window.location.origin)}&json=true`,
      });
      // Also call signOut for good measure (belt + suspenders)
      try { await signOut({ redirect: false }); } catch {}
      // Hard reload to reset all client state cleanly
      window.location.reload();
    } catch (e) {
      console.error("Logout failed:", e);
      toast.error("Could not log out");
      setLoggingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="!w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-0 p-0 bg-[#2e2520] overflow-hidden [&>button]:hidden fixed inset-0 top-0 left-0 right-0 bottom-0 translate-x-0 translate-y-0"
        showCloseButton={false}
      >
        <div className="flex h-full w-full">
          {/* Sidebar — full-height, scrollable, all 10 tabs always visible */}
          <aside className="w-[240px] shrink-0 bg-[#241b16] flex flex-col h-full">
            <div className="py-3 px-2 overflow-y-auto gh-scroll flex-1">
              <p className="px-2 text-xs uppercase font-semibold text-[#6a5a50] tracking-wide mb-2 mt-2">
                User Settings
              </p>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 h-9 rounded-[4px] text-sm transition-colors",
                      activeTab === tab.id
                        ? "bg-[#4a3a30] text-[#f5e6c8]"
                        : "text-[#d4c4a8] hover:bg-[#3d302a] hover:text-[#f5e6c8]"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={16} />
                      {tab.label}
                    </span>
                    <ChevronRight size={14} className="opacity-0" />
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#1a1310] p-2 space-y-1 shrink-0">
              <div className="w-full flex items-center gap-2 px-2 h-9 rounded-[4px] text-sm text-[#d4c4a8] truncate">
                <span className="w-5 h-5 rounded-full bg-[#8bb04a] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  ✓
                </span>
                <span className="truncate flex-1 text-left">
                  {currentUser?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-2 h-9 rounded-[4px] text-sm hover:bg-[#3d302a] text-[#d4c4a8] hover:text-[#f5e6c8] disabled:opacity-50 transition-colors"
              >
                {loggingOut ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
                Log Out
              </button>
            </div>
          </aside>

          {/* Content — full-height scrollable */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {/* Top bar with close button — sticky */}
            <div className="flex justify-between items-center p-3 shrink-0 border-b border-[#1a1310]">
              <div className="text-sm text-[#6a5a50] ml-auto pr-2">
                Press <kbd className="px-1.5 py-0.5 bg-[#1a1310] rounded text-xs border border-[#3d302a]">Esc</kbd> to close
              </div>
              <button
                type="button"
                onClick={close}
                className="w-9 h-9 rounded-full bg-[#241b16] hover:bg-[#3d302a] text-[#d4c4a8] hover:text-white flex items-center justify-center border border-[#1a1310] transition-colors shrink-0"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto gh-scroll px-6 lg:px-10 py-8">
              <div className="max-w-[760px] mx-auto pb-12">
                {activeTab === "account" && (
                  <div>
                    <h1 className="text-xl font-bold text-white mb-6">My Account</h1>
                  <div className="bg-[#241b16] rounded-lg overflow-hidden">
                    <div
                      className="h-24"
                      style={{ background: selectedBanner }}
                    />
                    <div className="p-4 pt-12 relative">
                      <div className="absolute -top-12 left-4">
                        <UserAvatar
                          name={name}
                          color={selectedAvatar}
                          size="xl"
                          ringColor="#241b16"
                          status={selectedStatus}
                          showStatus
                        />
                      </div>
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <div className="text-xl font-bold text-white">{name}</div>
                          <div className="text-sm text-[#6a5a50]">{email}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <FieldRow label="Display Name">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8]"
                      />
                    </FieldRow>
                    <FieldRow label="Email">
                      <Input
                        value={email}
                        readOnly
                        className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8]"
                      />
                    </FieldRow>
                    <FieldRow label="Bio">
                      <Textarea
                        value={bio ?? ""}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder="Tell the world about yourself..."
                        className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] resize-none"
                      />
                    </FieldRow>
                    <FieldRow label="Avatar Color">
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedAvatar(c)}
                            className={cn(
                              "w-8 h-8 rounded-full transition-transform",
                              selectedAvatar === c &&
                                "ring-2 ring-white ring-offset-2 ring-offset-[#2e2520]"
                            )}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </FieldRow>
                    <FieldRow label="Banner Color">
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedBanner(c)}
                            className={cn(
                              "w-8 h-8 rounded-full transition-transform",
                              selectedBanner === c &&
                                "ring-2 ring-white ring-offset-2 ring-offset-[#2e2520]"
                            )}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </FieldRow>
                  </div>

                  <Button
                    onClick={saveAccount}
                    disabled={savingProfile}
                    className="mt-6 bg-[#d4a03a] hover:bg-[#b08530] text-white"
                  >
                    {savingProfile ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              )}

              {activeTab === "profile" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Profile</h1>
                  <FieldRow label="Status">
                    <Select
                      value={selectedStatus}
                      onValueChange={(v) => setSelectedStatus(v as Status)}
                    >
                      <SelectTrigger className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
                        <SelectItem value="online">🟢 Online</SelectItem>
                        <SelectItem value="idle">🟡 Idle</SelectItem>
                        <SelectItem value="dnd">🔴 Do Not Disturb</SelectItem>
                        <SelectItem value="offline">⚪ Invisible</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Custom Status">
                    <Input
                      value={customStatus ?? ""}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      placeholder="What's on your mind?"
                      className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8]"
                    />
                  </FieldRow>
                  <Button
                    onClick={applyStatus}
                    disabled={savingStatus}
                    className="mt-4 bg-[#d4a03a] hover:bg-[#b08530] text-white"
                  >
                    {savingStatus ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : null}
                    Save Status
                  </Button>
                </div>
              )}

              {activeTab === "privacy" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Privacy & Safety</h1>
                  <ToggleRow label="Direct messages from server members" />
                  <ToggleRow label="Allow message requests" defaultOn />
                  <ToggleRow label="Explicit media filter" />
                  <ToggleRow label="DM scan for spam" defaultOn />
                  <ToggleRow label="Allow access to age-restricted commands" />
                </div>
              )}

              {activeTab === "notifications" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Notifications</h1>
                  <ToggleRow label="Enable Desktop Notifications" defaultOn />
                  <ToggleRow label="Enable unread message badge" defaultOn />
                  <ToggleRow label="Enable push notification for mentions" defaultOn />
                </div>
              )}

              {activeTab === "keybinds" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Keybinds</h1>
                  <KeybindRow label="Open Quick Switcher" keys="Ctrl+K" />
                  <KeybindRow label="Mute" keys="Ctrl+Shift+M" />
                  <KeybindRow label="Deafen" keys="Ctrl+Shift+D" />
                  <KeybindRow label="Push to Talk" keys="V" />
                  <KeybindRow label="Open Threads" keys="Ctrl+T" />
                </div>
              )}

              {activeTab === "language" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Language</h1>
                  <FieldRow label="App Language">
                    <Select defaultValue="en-US">
                      <SelectTrigger className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
                        <SelectItem value="en-US">English, US</SelectItem>
                        <SelectItem value="en-GB">English, UK</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                        <SelectItem value="fr-FR">Français</SelectItem>
                        <SelectItem value="de-DE">Deutsch</SelectItem>
                        <SelectItem value="ja-JP">日本語</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              )}

              {activeTab === "voice" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Voice & Video</h1>
                  <FieldRow label="Input Device">
                    <Select defaultValue="default">
                      <SelectTrigger className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
                        <SelectItem value="default">Default - System Microphone</SelectItem>
                        <SelectItem value="mic1">Blue Yeti</SelectItem>
                        <SelectItem value="mic2">Headset Mic</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Output Device">
                    <Select defaultValue="default">
                      <SelectTrigger className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
                        <SelectItem value="default">Default - System Speakers</SelectItem>
                        <SelectItem value="sp1">Headphones</SelectItem>
                        <SelectItem value="sp2">Monitor Speakers</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Input Volume">
                    <div className="w-full">
                      <Slider
                        value={inputVolume}
                        onValueChange={setInputVolume}
                        max={100}
                        className="w-full"
                      />
                      <div className="text-xs text-[#6a5a50] mt-1">
                        {inputVolume[0]}%
                      </div>
                    </div>
                  </FieldRow>
                  <FieldRow label="Output Volume">
                    <div className="w-full">
                      <Slider
                        value={outputVolume}
                        onValueChange={setOutputVolume}
                        max={100}
                        className="w-full"
                      />
                      <div className="text-xs text-[#6a5a50] mt-1">
                        {outputVolume[0]}%
                      </div>
                    </div>
                  </FieldRow>
                  <div className="mt-4">
                    <ToggleRow
                      label="Noise Suppression (Krisp)"
                      defaultOn={noiseSupp}
                      onToggle={(v) => setNoiseSupp(v)}
                    />
                  </div>
                  <div className="mt-4">
                    <ToggleRow
                      label="Push to Talk"
                      onToggle={(v) => {
                        if (v) setPushToTalk("V");
                        else setPushToTalk("");
                      }}
                    />
                    {pushToTalk && (
                      <div className="ml-12 text-xs text-[#6a5a50]">
                        Press a key to set your Push to Talk keybind. (Currently: {pushToTalk})
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={saveVoice}
                    disabled={savingVoice}
                    className="mt-6 bg-[#d4a03a] hover:bg-[#b08530] text-white"
                  >
                    {savingVoice ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              )}

              {activeTab === "video" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Video Settings</h1>
                  <FieldRow label="Camera">
                    <Select defaultValue="default">
                      <SelectTrigger className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
                        <SelectItem value="default">Default Webcam</SelectItem>
                        <SelectItem value="c1">Logitech C920</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Video Preview">
                    <div className="w-full aspect-video bg-[#1a1310] rounded-md flex items-center justify-center text-[#6a5a50] text-sm">
                      Your camera is off. Click "Test Video" to preview.
                    </div>
                  </FieldRow>
                  <FieldRow label="Resolution">
                    <Select defaultValue="720">
                      <SelectTrigger className="bg-[#1a1310] border-[#1a1310] text-[#f5e6c8] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
                        <SelectItem value="480">480p</SelectItem>
                        <SelectItem value="720">720p</SelectItem>
                        <SelectItem value="1080">1080p</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              )}

              {activeTab === "game" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Game Activity</h1>
                  <ToggleRow label="Display current activity as a status message" defaultOn />
                  <div className="mt-4 space-y-2">
                    {["Valorant", "League of Legends", "Minecraft"].map((g) => (
                      <div
                        key={g}
                        className="flex items-center gap-3 p-3 bg-[#241b16] rounded-md"
                      >
                        <div className="w-12 h-12 rounded-md bg-[#1a1310] flex items-center justify-center text-xl">
                          🎮
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{g}</div>
                          <div className="text-xs text-[#6a5a50]">
                            3h 24m today
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "overlay" && (
                <div>
                  <h1 className="text-xl font-bold text-white mb-6">Overlay</h1>
                  <ToggleRow label="Enable in-game overlay" defaultOn />
                  <ToggleRow label="Show FPS overlay" />
                  <ToggleRow label="Show voice channel participants" defaultOn />
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-6 mb-4 items-start">
      <div className="text-sm text-[#6a5a50] mt-2">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  defaultOn,
  onToggle,
}: {
  label: string;
  defaultOn?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  const [checked, setChecked] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#4a3a30]">
      <span className="text-sm text-[#dcddde]">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={(v) => {
          setChecked(v);
          onToggle?.(v);
        }}
      />
    </div>
  );
}

function KeybindRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#4a3a30]">
      <span className="text-sm text-[#dcddde]">{label}</span>
      <kbd className="px-2 py-1 bg-[#1a1310] text-[#f5e6c8] text-xs font-mono rounded border border-[#1a1310]">
        {keys}
      </kbd>
    </div>
  );
}

// (no trailing exports needed)
