"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUIStore } from "@/lib/ui-store";
import { useSocketStore, EMPTY_VOICE } from "@/lib/socket";
import { toast } from "sonner";

// Real WebRTC + getUserMedia + getDisplayMedia hook for voice channels.
// Manages local mic/camera/screen capture and peer-to-peer audio+video with other voice participants.

interface RemoteStream {
  userId: string;
  username: string;
  stream: MediaStream | null;
  audioLevel: number; // 0-1, derived from analyser
  videoOn: boolean;
  streaming: boolean;
  muted: boolean;
}

interface VoiceMediaState {
  localStream: MediaStream | null;       // mic + camera combined
  screenStream: MediaStream | null;      // screen share stream
  audioLevel: number;                    // local mic level 0-1
  audioEnabled: boolean;                 // is mic track enabled
  cameraEnabled: boolean;                // is camera track active
  screenEnabled: boolean;                 // is screen share active
  micError: string | null;
  cameraError: string | null;
  screenError: string | null;
  remotes: RemoteStream[];               // remote peers' audio/video
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useVoiceMedia(channelId: string | null, isJoined: boolean) {
  const [state, setState] = useState<VoiceMediaState>({
    localStream: null,
    screenStream: null,
    audioLevel: 0,
    audioEnabled: true,
    cameraEnabled: false,
    screenEnabled: false,
    micError: null,
    cameraError: null,
    screenError: null,
    remotes: [],
  });

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<ReturnType<typeof useSocketStore.getState> | null>(null);
  const currentUserRef = useRef(useUIStore.getState().currentUser);

  // Get socket instance once
  useEffect(() => {
    socketRef.current = useSocketStore.getState();
  }, []);

  // ===== Local mic + camera capture =====
  const startLocalMedia = useCallback(async () => {
    // Always request mic when joining voice
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;

      // Set up audio analyser for level meter
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Animation loop to measure audio level
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        // Average the frequencies for an overall level
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255; // normalize 0-1
        // Use max for snappier visual
        const max = Math.max(...Array.from(data)) / 255;
        const level = Math.max(avg * 1.5, max);
        setState((s) => ({ ...s, audioLevel: Math.min(1, level) }));

        // Notify the socket that we're speaking (level > 0.05)
        const speaking = level > 0.05;
        if (socketRef.current && channelId) {
          socketRef.current.updateVoiceState(channelId, { speaking });
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setState((s) => ({
        ...s,
        localStream: stream,
        audioEnabled: true,
        micError: null,
      }));
      return stream;
    } catch (e: any) {
      console.error("Mic capture failed:", e);
      const msg =
        e?.name === "NotAllowedError"
          ? "Microphone permission denied. Click the lock icon in your browser address bar to allow."
          : e?.name === "NotFoundError"
          ? "No microphone found. Connect a mic and try again."
          : `Microphone error: ${e?.message || "unknown"}`;
      setState((s) => ({ ...s, micError: msg }));
      toast.error(msg);
      return null;
    }
  }, [channelId]);

  const stopLocalMedia = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setState((s) => ({
      ...s,
      localStream: null,
      screenStream: null,
      audioLevel: 0,
      cameraEnabled: false,
      screenEnabled: false,
    }));
  }, []);

  // Start mic when joined
  useEffect(() => {
    if (isJoined) {
      startLocalMedia();
    } else {
      stopLocalMedia();
    }
    return () => {
      stopLocalMedia();
    };
  }, [isJoined, startLocalMedia, stopLocalMedia]);

  // ===== Toggle camera on/off =====
  const toggleCamera = useCallback(async () => {
    if (!isJoined) {
      toast.error("Join the voice channel first to use your camera.");
      return;
    }
    if (cameraEnabled()) {
      // turn off
      const stream = localStreamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((t) => {
          t.stop();
          stream.removeTrack(t);
        });
      }
      // Remove video sender from all peers
      peersRef.current.forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === "video") {
            try { pc.removeTrack(sender); } catch {}
          }
        });
      });
      setState((s) => ({ ...s, cameraEnabled: false, localStream: localStreamRef.current }));
      // Notify socket
      if (socketRef.current && channelId) {
        socketRef.current.updateVoiceState(channelId, { videoOn: false });
      }
      return;
    }
    // turn on
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, facingMode: "user" },
        audio: false,
      });
      const videoTrack = camStream.getVideoTracks()[0];
      const local = localStreamRef.current;
      if (local && videoTrack) {
        local.addTrack(videoTrack);
        // Add to all peers
        peersRef.current.forEach((pc) => {
          try { pc.addTrack(videoTrack, local); } catch {}
        });
        setState((s) => ({
          ...s,
          localStream: local,
          cameraEnabled: true,
          cameraError: null,
        }));
        if (socketRef.current && channelId) {
          socketRef.current.updateVoiceState(channelId, { videoOn: true });
        }
      }
    } catch (e: any) {
      const msg =
        e?.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser."
          : e?.name === "NotFoundError"
          ? "No camera found."
          : `Camera error: ${e?.message || "unknown"}`;
      setState((s) => ({ ...s, cameraError: msg }));
      toast.error(msg);
    }
  }, [isJoined, channelId]);

  // ===== Toggle screen share =====
  const toggleScreenShare = useCallback(async () => {
    if (!isJoined) {
      toast.error("Join the voice channel first to share your screen.");
      return;
    }
    if (screenEnabled()) {
      // stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      // Remove screen video track from local stream + peers
      const local = localStreamRef.current;
      if (local) {
        const screenTracks = local.getVideoTracks().filter((t) => (t as any).__isScreen);
        screenTracks.forEach((t) => {
          local.removeTrack(t);
          peersRef.current.forEach((pc) => {
            pc.getSenders().forEach((sender) => {
              if (sender.track === t) {
                try { pc.removeTrack(sender); } catch {}
              }
            });
          });
        });
      }
      setState((s) => ({ ...s, screenStream: null, screenEnabled: false, localStream: localStreamRef.current }));
      if (socketRef.current && channelId) {
        socketRef.current.updateVoiceState(channelId, { streaming: false });
      }
      return;
    }
    // start screen share
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack) {
        (screenTrack as any).__isScreen = true;
        const local = localStreamRef.current;
        if (local) {
          local.addTrack(screenTrack);
          peersRef.current.forEach((pc) => {
            try { pc.addTrack(screenTrack, local); } catch {}
          });
        }
        screenStreamRef.current = screenStream;
        // Listen for user-initiated stop (browser native "Stop sharing" button)
        screenTrack.onended = () => {
          // Auto-stop screen share
          toggleScreenShare();
        };
        setState((s) => ({
          ...s,
          screenStream,
          screenEnabled: true,
          screenError: null,
          localStream: localStreamRef.current,
        }));
        if (socketRef.current && channelId) {
          socketRef.current.updateVoiceState(channelId, { streaming: true });
        }
      }
    } catch (e: any) {
      const msg =
        e?.name === "NotAllowedError"
          ? "Screen share permission denied."
          : `Screen share error: ${e?.message || "unknown"}`;
      setState((s) => ({ ...s, screenError: msg }));
      toast.error(msg);
    }
  }, [isJoined, channelId]);

  // ===== Mute toggle (real) =====
  const setMicMuted = useCallback((muted: boolean) => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
    setState((s) => ({ ...s, audioEnabled: !muted }));
    if (socketRef.current && channelId) {
      socketRef.current.updateVoiceState(channelId, { muted, speaking: false });
    }
  }, [channelId]);

  // ===== Helpers (stateless, just refs) =====
  function cameraEnabled() {
    const s = localStreamRef.current;
    return !!s && s.getVideoTracks().some((t) => t.readyState === "live" && !(t as any).__isScreen);
  }
  function screenEnabled() {
    return !!screenStreamRef.current;
  }

  // ===== Peer connection management (P2P WebRTC for cross-user audio/video) =====
  // Note: For a full mesh, when a new user joins, existing users should initiate connections to them.
  // This requires the chat-service to broadcast who's in the voice channel.
  // For now, we set up peer connections reactively when new voice participants arrive.

  const voiceParticipants = useSocketStore((s) =>
    channelId ? s.voiceParticipants[channelId] ?? EMPTY_VOICE : EMPTY_VOICE
  );

  useEffect(() => {
    if (!isJoined || !channelId) return;
    const socket = useSocketStore.getState().socket;
    if (!socket) return;
    const me = useUIStore.getState().currentUser;
    if (!me) return;
    currentUserRef.current = me;

    // Handle incoming WebRTC signaling
    const handleOffer = async (data: { fromUserId: string; offer: any; channelId: string }) => {
      if (data.channelId !== channelId || data.fromUserId === me.id) return;
      let pc = peersRef.current.get(data.fromUserId);
      if (!pc) {
        pc = createPeerConnection(data.fromUserId, false);
        if (!pc) return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", {
          toUserId: data.fromUserId,
          fromUserId: me.id,
          answer,
          channelId,
        });
      } catch (e) {
        console.error("WebRTC offer handling failed:", e);
      }
    };

    const handleAnswer = async (data: { fromUserId: string; answer: any; channelId: string }) => {
      if (data.channelId !== channelId || data.fromUserId === me.id) return;
      const pc = peersRef.current.get(data.fromUserId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (e) {
        console.error("WebRTC answer handling failed:", e);
      }
    };

    const handleIce = async (data: { fromUserId: string; candidate: any; channelId: string }) => {
      if (data.channelId !== channelId || data.fromUserId === me.id) return;
      const pc = peersRef.current.get(data.fromUserId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error("ICE candidate add failed:", e);
      }
    };

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIce);

    // For each NEW participant (other than me), initiate a peer connection (mesh)
    // The initiator is the user with the LOWER userId (deterministic, avoids duplicate offers)
    const knownIds = new Set(peersRef.current.keys());
    for (const p of voiceParticipants) {
      if (p.userId === me.id) continue;
      if (knownIds.has(p.userId)) continue;
      const shouldInitiate = me.id < p.userId;
      if (shouldInitiate) {
        const pc = createPeerConnection(p.userId, true);
        if (pc) {
          // createOffer happens inside createPeerConnection when polite=false
        }
      } else {
        // Just create the connection; the other side will initiate
        createPeerConnection(p.userId, false);
      }
    }

    // Clean up peers for users who left
    const currentIds = new Set(voiceParticipants.map((p) => p.userId));
    for (const id of knownIds) {
      if (!currentIds.has(id)) {
        const pc = peersRef.current.get(id);
        if (pc) {
          try { pc.close(); } catch {}
          peersRef.current.delete(id);
        }
      }
    }

    return () => {
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIce);
    };
  }, [isJoined, channelId, voiceParticipants]);

  function createPeerConnection(remoteUserId: string, initiate: boolean): RTCPeerConnection | null {
    if (peersRef.current.has(remoteUserId)) {
      return peersRef.current.get(remoteUserId)!;
    }
    const socket = useSocketStore.getState().socket;
    const me = useUIStore.getState().currentUser;
    if (!socket || !me) return null;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(remoteUserId, pc);

    // Add local tracks
    const local = localStreamRef.current;
    if (local) {
      local.getTracks().forEach((track) => {
        try { pc.addTrack(track, local); } catch {}
      });
    }

    // Receive remote tracks
    const remoteStreams = new MediaStream();
    pc.ontrack = (event) => {
      event.streams.forEach((s) => {
        s.getTracks().forEach((t) => remoteStreams.addTrack(t));
      });
      // Update remote state
      setState((s) => {
        const existing = s.remotes.find((r) => r.userId === remoteUserId);
        const updated = {
          userId: remoteUserId,
          username: voiceParticipants.find((p) => p.userId === remoteUserId)?.username || "User",
          stream: remoteStreams,
          audioLevel: 0,
          videoOn: remoteStreams.getVideoTracks().length > 0,
          streaming: false,
          muted: false,
        };
        const others = s.remotes.filter((r) => r.userId !== remoteUserId);
        return { ...s, remotes: [...others, updated] };
      });
    };

    // ICE candidates → send to remote
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          toUserId: remoteUserId,
          fromUserId: me.id,
          candidate: event.candidate,
          channelId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[webrtc] ${remoteUserId}: ${pc.connectionState}`);
    };

    // If we're the initiator, create the offer
    if (initiate) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", {
            toUserId: remoteUserId,
            fromUserId: me.id,
            offer,
            channelId,
          });
        } catch (e) {
          console.error("Offer creation failed:", e);
        }
      })();
    }

    return pc;
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach((pc) => {
        try { pc.close(); } catch {}
      });
      peersRef.current.clear();
      stopLocalMedia();
    };
  }, []);

  return {
    ...state,
    toggleCamera,
    toggleScreenShare,
    setMicMuted,
  };
}
