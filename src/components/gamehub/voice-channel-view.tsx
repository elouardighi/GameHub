"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Video,
  VideoOff,
  Radio,
  Hand,
  Rocket,
  Phone,
  PhoneOff,
  Users,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "./user-avatar";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore, EMPTY_VOICE, EMPTY_RAISED } from "@/lib/socket";
import { useVoiceMedia } from "@/lib/use-voice-media";
import { cn } from "@/lib/utils";
import type { VoiceParticipant } from "@/lib/types";
import { toast } from "sonner";

interface VoiceChannelViewProps {
  channelId: string;
  channelName: string;
  channelType: "voice" | "stage";
  serverName: string;
  serverId: string;
  isJoined: boolean;
}

export function VoiceChannelView({
  channelId,
  channelName,
  channelType,
  serverName,
  serverId,
  isJoined,
}: VoiceChannelViewProps) {
  const voiceParticipants = useSocketStore((s) => s.voiceParticipants[channelId] ?? EMPTY_VOICE);
  const raisedHands = useSocketStore((s) => s.raisedHands[channelId] ?? EMPTY_RAISED);
  const joinVoice = useUIStore((s) => s.joinVoice);
  const leaveVoice = useUIStore((s) => s.leaveVoice);
  const voiceMuted = useUIStore((s) => s.voiceMuted);
  const voiceDeafened = useUIStore((s) => s.voiceDeafened);
  const voiceVideoOn = useUIStore((s) => s.voiceVideoOn);
  const voiceStreaming = useUIStore((s) => s.voiceStreaming);
  const openActivities = useUIStore((s) => s.openActivities);
  const toggleDeafen = useUIStore((s) => s.toggleDeafen);

  const joinVoiceChannel = useSocketStore((s) => s.joinVoice);
  const leaveVoiceChannel = useSocketStore((s) => s.leaveVoice);
  const updateVoiceState = useSocketStore((s) => s.updateVoiceState);
  const raiseHand = useSocketStore((s) => s.raiseHand);
  const currentUser = useUIStore((s) => s.currentUser);

  // ===== REAL MEDIA HOOK =====
  const media = useVoiceMedia(channelId, isJoined);

  // When local mic level crosses threshold, emit speaking state via socket
  // (handled inside the hook)

  const handleJoin = () => {
    if (!currentUser) return;
    joinVoice(channelId);
    joinVoiceChannel(channelId);
    toast.success(`Joined ${channelName} — speak up! 🎤`);
  };

  const handleLeave = () => {
    leaveVoice();
    leaveVoiceChannel(channelId);
  };

  // Real mute handler — toggles audio track on the local stream
  const handleMute = () => {
    const newMuted = !voiceMuted;
    // Update UI store (for display) AND real audio track
    useUIStore.setState({ voiceMuted: newMuted });
    media.setMicMuted(newMuted);
  };

  // Real video handler — requests camera permission and toggles track
  const handleVideo = async () => {
    // Toggle UI state first (so button shows immediately)
    useUIStore.setState({ voiceVideoOn: !voiceVideoOn });
    await media.toggleCamera();
  };

  // Real screen share handler — requests screen permission
  const handleStreaming = async () => {
    useUIStore.setState({ voiceStreaming: !voiceStreaming });
    await media.toggleScreenShare();
  };

  const handleDeafen = () => {
    const newDeafened = !voiceDeafened;
    useUIStore.setState({ voiceDeafened: newDeafened });
    if (newDeafened) {
      useUIStore.setState({ voiceMuted: true });
      media.setMicMuted(true);
    }
  };

  if (!isJoined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#2e2520] text-center p-8">
        <div className="w-24 h-24 rounded-full bg-[#d4a03a]/20 flex items-center justify-center mb-4">
          <Radio size={40} className="text-[#d4a03a]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{channelName}</h2>
        <p className="text-sm text-[#6a5a50] mb-2 max-w-md">
          {channelType === "stage"
            ? "Join this stage channel to listen or speak."
            : "No one is here yet. Be the first to join."}
        </p>
        <p className="text-xs text-[#6a5a50] mb-6 max-w-md">
          When you join, your browser will ask permission to use your <strong>microphone</strong>.
          Click <strong>Allow</strong> to speak with others.
          To show your face, click the <Video size={12} className="inline" /> Video button after joining.
          To share your screen, click the <Radio size={12} className="inline" /> Screen Share button.
        </p>
        <button
          type="button"
          onClick={handleJoin}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#8bb04a] hover:bg-[#6b8b3a] text-white rounded-md font-semibold text-sm shadow-md"
        >
          <Phone size={18} /> Join Voice
        </button>
      </div>
    );
  }

  // Stage layout: speakers row + audience
  if (channelType === "stage") {
    const speakers = voiceParticipants.filter((p) => p.isSpeaker);
    const audience = voiceParticipants.filter((p) => !p.isSpeaker);
    const me = voiceParticipants.find((p) => p.userId === currentUser?.id);
    const isSpeaker = me?.isSpeaker ?? false;

    return (
      <div className="flex-1 flex flex-col bg-[#2e2520] min-w-0 relative">
        <div className="flex-1 overflow-y-auto gh-scroll p-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">{channelName}</h2>
            <p className="text-sm text-[#6a5a50]">Stage channel in {serverName}</p>
          </div>

          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-[#6a5a50] font-semibold mb-3">
              Speakers · {speakers.length}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {speakers.map((p) => (
                <VoiceTile
                  key={p.userId}
                  participant={p}
                  isLocal={p.userId === currentUser?.id}
                  localStream={p.userId === currentUser?.id ? media.localStream : null}
                  screenStream={p.userId === currentUser?.id ? media.screenStream : null}
                  audioLevel={p.userId === currentUser?.id ? media.audioLevel : 0}
                  isStageSpeaker
                />
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-[#6a5a50] font-semibold mb-3 flex items-center justify-between">
              <span>Audience · {audience.length}</span>
              {!isSpeaker && (
                <button
                  type="button"
                  onClick={() => raiseHand(channelId)}
                  className="text-xs bg-[#d4a03a] hover:bg-[#b08530] text-white px-3 py-1.5 rounded flex items-center gap-1 normal-case"
                >
                  <Hand size={14} /> Request to Speak
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {audience.length === 0 && (
                <div className="col-span-full text-center text-sm text-[#6a5a50] py-6">
                  No one in the audience yet. Be the first to listen.
                </div>
              )}
              {audience.map((p) => (
                <VoiceTile
                  key={p.userId}
                  participant={p}
                  isLocal={p.userId === currentUser?.id}
                  localStream={p.userId === currentUser?.id ? media.localStream : null}
                  screenStream={p.userId === currentUser?.id ? media.screenStream : null}
                  audioLevel={p.userId === currentUser?.id ? media.audioLevel : 0}
                  isAudience
                  handRaised={raisedHands.includes(p.userId)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Media error banners */}
        <MediaErrorBanners
          micError={media.micError}
          cameraError={media.cameraError}
          screenError={media.screenError}
        />

        <VoiceBottomBar
          muted={voiceMuted}
          deafened={voiceDeafened}
          videoOn={voiceVideoOn}
          streaming={voiceStreaming}
          audioLevel={media.audioLevel}
          onMute={handleMute}
          onDeafen={handleDeafen}
          onVideo={handleVideo}
          onStreaming={handleStreaming}
          onActivities={openActivities}
          onLeave={handleLeave}
        />
      </div>
    );
  }

  // Voice channel "Living Room" grid
  return (
    <div className="flex-1 flex flex-col bg-[#2e2520] min-w-0 relative">
      <div className="flex-1 overflow-y-auto gh-scroll p-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">{channelName}</h2>
          <p className="text-sm text-[#6a5a50]">
            {voiceParticipants.length === 0
              ? "No one is here yet. Invite your squad."
              : `${voiceParticipants.length} in this voice channel`}
          </p>
        </div>

        {voiceParticipants.length === 0 ? (
          <div className="text-center text-sm text-[#6a5a50] py-12">
            You joined {channelName}. Others will appear here when they join.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {voiceParticipants.map((p) => (
              <VoiceTile
                key={p.userId}
                participant={p}
                isLocal={p.userId === currentUser?.id}
                localStream={p.userId === currentUser?.id ? media.localStream : null}
                screenStream={p.userId === currentUser?.id ? media.screenStream : null}
                audioLevel={p.userId === currentUser?.id ? media.audioLevel : 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Media error banners */}
      <MediaErrorBanners
        micError={media.micError}
        cameraError={media.cameraError}
        screenError={media.screenError}
      />

      <VoiceBottomBar
        muted={voiceMuted}
        deafened={voiceDeafened}
        videoOn={voiceVideoOn}
        streaming={voiceStreaming}
        audioLevel={media.audioLevel}
        onMute={handleMute}
        onDeafen={handleDeafen}
        onVideo={handleVideo}
        onStreaming={handleStreaming}
        onActivities={openActivities}
        onLeave={handleLeave}
      />
    </div>
  );
}

// ===== Voice Tile with REAL video element =====
function VoiceTile({
  participant,
  isLocal,
  localStream,
  screenStream,
  audioLevel,
  isStageSpeaker,
  isAudience,
  handRaised,
}: {
  participant: VoiceParticipant;
  isLocal: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioLevel: number;
  isStageSpeaker?: boolean;
  isAudience?: boolean;
  handRaised?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to the video element
  useEffect(() => {
    if (!isLocal) return;
    if (videoRef.current && localStream) {
      // Only attach video tracks (not audio - to avoid echo for self)
      const videoTracks = localStream.getVideoTracks().filter((t) => !(t as any).__isScreen);
      if (videoTracks.length > 0) {
        const videoOnly = new MediaStream(videoTracks);
        videoRef.current.srcObject = videoOnly;
        videoRef.current.muted = true; // no echo
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [isLocal, localStream]);

  // Attach screen stream
  useEffect(() => {
    if (!isLocal) return;
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.muted = true;
    }
  }, [isLocal, screenStream]);

  const showScreen = isLocal && !!screenStream;
  const showVideo = isLocal && !!localStream && localStream.getVideoTracks().some((t) => !(t as any).__isScreen && t.readyState === "live") && !participant.muted;

  return (
    <div
      className={cn(
        "voice-grid-tile aspect-video flex flex-col items-center justify-center relative overflow-hidden",
        (participant.speaking || (isLocal && audioLevel > 0.05)) && "is-speaking",
        participant.streaming && "is-streaming"
      )}
      style={
        showVideo || showScreen
          ? { background: "#000" }
          : {
              background: `linear-gradient(135deg, ${participant.avatarColor}99 0%, ${participant.avatarColor}33 100%)`,
            }
      }
    >
      {/* Real screen share */}
      {showScreen && (
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      )}

      {/* Real local camera */}
      {showVideo && !showScreen && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }} // mirror selfie
        />
      )}

      {/* Audio level meter overlay (only for local user) */}
      {isLocal && !participant.muted && audioLevel > 0.02 && !showVideo && !showScreen && (
        <div className="absolute inset-x-0 bottom-0 h-2 bg-black/30">
          <div
            className="h-full bg-gradient-to-r from-[#8bb04a] to-[#d4a03a] transition-all"
            style={{ width: `${Math.min(100, audioLevel * 200)}%` }}
          />
        </div>
      )}

      {/* Avatar (when no video) */}
      {!showVideo && !showScreen && (
        <div className="flex items-center justify-center mb-2">
          <UserAvatar
            name={participant.username}
            color={participant.avatarColor}
            size="xl"
            className="shadow-lg"
          />
        </div>
      )}

      {/* Name + status icons */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-semibold max-w-[calc(100%-4rem)]">
        {participant.deafened && (
          <HeadphoneOff size={14} className="text-[#b04a4a] shrink-0" />
        )}
        {participant.muted ? (
          <MicOff size={14} className="text-[#b04a4a] shrink-0" />
        ) : (
          isLocal && audioLevel > 0.05 && (
            <Mic size={14} className="text-[#8bb04a] shrink-0 animate-pulse" />
          )
        )}
        {participant.streaming && (
          <Radio size={14} className="text-[#c44a8b] shrink-0" />
        )}
        {participant.videoOn && !showVideo && (
          <Video size={14} className="text-[#8bb04a] shrink-0" />
        )}
        <span className="truncate">{isLocal ? `${participant.username} (you)` : participant.username}</span>
      </div>

      {/* Status badges */}
      <div className="absolute top-2 right-2 flex gap-1">
        {participant.streaming && (
          <span className="bg-[#c44a8b] text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
            LIVE
          </span>
        )}
        {isStageSpeaker && (
          <span className="bg-[#8bb04a] text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
            Speaker
          </span>
        )}
        {handRaised && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-[#d4a03a] text-black text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center"
          >
            <Hand size={10} />
          </motion.span>
        )}
      </div>
    </div>
  );
}

// ===== Media Error Banners (show when permission denied) =====
function MediaErrorBanners({
  micError,
  cameraError,
  screenError,
}: {
  micError: string | null;
  cameraError: string | null;
  screenError: string | null;
}) {
  if (!micError && !cameraError && !screenError) return null;
  return (
    <div className="px-4 py-2 space-y-1">
      {micError && (
        <div className="flex items-start gap-2 text-xs text-[#b04a4a] bg-[#b04a4a]/10 border border-[#b04a4a]/30 rounded p-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{micError}</span>
        </div>
      )}
      {cameraError && (
        <div className="flex items-start gap-2 text-xs text-[#d4a03a] bg-[#d4a03a]/10 border border-[#d4a03a]/30 rounded p-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
      {screenError && (
        <div className="flex items-start gap-2 text-xs text-[#c44a8b] bg-[#c44a8b]/10 border border-[#c44a8b]/30 rounded p-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{screenError}</span>
        </div>
      )}
    </div>
  );
}

// ===== Voice bottom bar with REAL mic level meter =====
function VoiceBottomBar({
  muted,
  deafened,
  videoOn,
  streaming,
  audioLevel,
  onMute,
  onDeafen,
  onVideo,
  onStreaming,
  onActivities,
  onLeave,
}: {
  muted: boolean;
  deafened: boolean;
  videoOn: boolean;
  streaming: boolean;
  audioLevel: number;
  onMute: () => void;
  onDeafen: () => void;
  onVideo: () => void;
  onStreaming: () => void;
  onActivities: () => void;
  onLeave: () => void;
}) {
  const btnCls =
    "w-10 h-10 rounded-full flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white transition-colors";
  const activeCls = (active: boolean, color = "#b04a4a") =>
    active ? { color: color, background: "#3d302a" } : undefined;

  return (
    <div className="px-4 py-2 bg-[#1a1310] flex items-center justify-center gap-2 border-t border-[#1a1310]">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onMute}
              className={btnCls}
              style={activeCls(muted)}
              aria-label="Mute"
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
            {muted ? "Unmute" : "Mute"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onDeafen}
              className={btnCls}
              style={activeCls(deafened)}
              aria-label="Deafen"
            >
              {deafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
            {deafened ? "Undeafen" : "Deafen"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onVideo}
              className={btnCls}
              style={activeCls(videoOn, "#8bb04a")}
              aria-label="Video"
            >
              {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
            {videoOn ? "Turn Off Camera" : "Turn On Camera"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onStreaming}
              className={btnCls}
              style={activeCls(streaming, "#c44a8b")}
              aria-label="Screenshare"
            >
              <Radio size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
            {streaming ? "Stop Screen Share" : "Share Your Screen"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onActivities}
              className={btnCls}
              aria-label="Activities"
            >
              <Rocket size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
            Activities
          </TooltipContent>
        </Tooltip>

        {/* Real audio level meter */}
        {!muted && (
          <div className="flex items-center gap-0.5 ml-2 h-6 w-20 bg-[#3d302a] rounded px-1.5 py-1">
            {[...Array(10)].map((_, i) => {
              const threshold = (i + 1) / 10;
              const active = audioLevel >= threshold;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-sm transition-all duration-75",
                    active ? "bg-[#8bb04a]" : "bg-[#1a1c1f]"
                  )}
                  style={{ height: `${(i + 1) * 8 + 4}%` }}
                />
              );
            })}
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onLeave}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#b04a4a] hover:bg-[#b04a4a] hover:text-white"
              aria-label="Disconnect"
            >
              <PhoneOff size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-[#1a1310] border-[#1a1310] text-white">
            Disconnect
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// Re-export dialog
export function VoiceActivitiesDialog() {
  return <Dialog open={false} onOpenChange={() => {}}>
    <DialogContent className="bg-[#3d302a] border-[#1a1310] text-[#f5e6c8]">
      <DialogHeader>
        <DialogTitle>Activities</DialogTitle>
      </DialogHeader>
    </DialogContent>
  </Dialog>;
}
