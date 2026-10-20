"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Video,
  Radio,
  Rocket,
  PhoneOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore } from "@/lib/socket";
import { useVoiceMedia } from "@/lib/use-voice-media";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceControlsProps {
  channelId: string;
  channelName: string;
  serverName: string;
  serverId: string;
}

export function VoiceControls({
  channelId,
  channelName,
  serverName,
}: VoiceControlsProps) {
  const voiceMuted = useUIStore((s) => s.voiceMuted);
  const voiceDeafened = useUIStore((s) => s.voiceDeafened);
  const voiceVideoOn = useUIStore((s) => s.voiceVideoOn);
  const voiceStreaming = useUIStore((s) => s.voiceStreaming);
  const toggleDeafen = useUIStore((s) => s.toggleDeafen);
  const leaveVoice = useUIStore((s) => s.leaveVoice);
  const openActivities = useUIStore((s) => s.openActivities);
  const leaveVoiceChannel = useSocketStore((s) => s.leaveVoice);

  // Real media hook — captures mic/camera/screen and manages P2P
  const media = useVoiceMedia(channelId, true);

  const [expanded, setExpanded] = useState(false);

  const handleLeave = () => {
    leaveVoice();
    leaveVoiceChannel(channelId);
  };

  // Real handlers — toggle UI state AND the actual media tracks
  const handleMute = () => {
    const newMuted = !voiceMuted;
    useUIStore.setState({ voiceMuted: newMuted });
    media.setMicMuted(newMuted);
    if (newMuted) toast.info("Mic muted"); else toast.success("Mic unmuted 🎤");
  };

  const handleDeafen = () => {
    const newDeafened = !voiceDeafened;
    useUIStore.setState({ voiceDeafened: newDeafened });
    if (newDeafened) {
      useUIStore.setState({ voiceMuted: true });
      media.setMicMuted(true);
      toast.info("Deafened — can't hear others");
    } else {
      toast.success("Undeafened");
    }
  };

  const handleVideo = async () => {
    useUIStore.setState({ voiceVideoOn: !voiceVideoOn });
    await media.toggleCamera();
  };

  const handleStreaming = async () => {
    useUIStore.setState({ voiceStreaming: !voiceStreaming });
    await media.toggleScreenShare();
  };

  const btnCls = "w-9 h-9 rounded-md flex items-center justify-center text-[#d4c4a8] hover:bg-[#3d302a] hover:text-white transition-colors";

  return (
    <motion.div
      layout
      className="absolute bottom-4 left-4 right-4 voice-control-bar z-20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#8bb04a] pulse-online" />
          <div className="min-w-0">
            <div className="text-xs text-[#8bb04a] font-semibold flex items-center gap-1">
              Voice Connected
              {!voiceMuted && media.audioLevel > 0.05 && (
                <span className="text-[10px] text-[#8bb04a] bg-[#8bb04a]/20 px-1 rounded">
                  ● Speaking
                </span>
              )}
            </div>
            <div className="text-xs text-[#d4c4a8] truncate">
              {channelName} / {serverName}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[#d4c4a8] hover:text-white"
          aria-label="Expand"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 pb-2 pt-1 gap-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMute}
                  className={btnCls}
                  style={voiceMuted ? { color: "#b04a4a" } : undefined}
                  aria-label="Mute"
                >
                  {voiceMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  type="button"
                  onClick={handleDeafen}
                  className={btnCls}
                  style={voiceDeafened ? { color: "#b04a4a" } : undefined}
                  aria-label="Deafen"
                >
                  {voiceDeafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
                </button>
                <button
                  type="button"
                  onClick={handleVideo}
                  className={btnCls}
                  style={voiceVideoOn ? { color: "#8bb04a" } : undefined}
                  aria-label="Video"
                >
                  <Video size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleStreaming}
                  className={btnCls}
                  style={voiceStreaming ? { color: "#c44a8b" } : undefined}
                  aria-label="Screen share"
                >
                  <Radio size={18} />
                </button>
                <button
                  type="button"
                  onClick={openActivities}
                  className={btnCls}
                  aria-label="Activities"
                >
                  <Rocket size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleLeave}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#b04a4a] hover:bg-[#8b3a3a] text-white rounded-md text-xs font-semibold"
              >
                <PhoneOff size={14} /> Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
