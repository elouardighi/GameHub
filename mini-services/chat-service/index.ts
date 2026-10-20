import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path - Caddy uses it to forward to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ===== Types =====
interface User {
  id: string
  username: string
  avatarColor: string
  status: string
  customStatus?: string
}

interface Message {
  id: string
  channelId: string
  userId: string
  username: string
  avatarColor: string
  content: string
  timestamp: string
  isPinned: boolean
  replyToId?: string
  reactions: { emoji: string; count: number; reactedByMe: boolean }[]
}

interface VoiceParticipant {
  userId: string
  username: string
  avatarColor: string
  muted: boolean
  deafened: boolean
  videoOn: boolean
  streaming: boolean
  speaking: boolean
  isSpeaker: boolean
}

interface TypingState {
  [channelId: string]: { userId: string; username: string; timestamp: number }[]
}

// ===== In-memory state (matches Prisma models) =====
const onlineUsers = new Map<string, User>() // socketId -> user
const userSockets = new Map<string, Set<string>>() // userId -> socket ids
const channelTyping: TypingState = {}
const voiceStates = new Map<string, Map<string, VoiceParticipant>>() // channelId -> (userId -> participant)
const channelPresence = new Map<string, Set<string>>() // channelId -> userIds currently viewing

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36)

// ===== Helpers =====
function broadcastOnlineUsers() {
  const usersList = Array.from(onlineUsers.values())
  io.emit('users-list', { users: usersList })
}

function getVoiceParticipants(channelId: string) {
  return Array.from(voiceStates.get(channelId)?.values() ?? [])
}

function broadcastVoiceState(channelId: string) {
  io.to(`channel:${channelId}`).emit('voice-state', {
    channelId,
    participants: getVoiceParticipants(channelId),
  })
}

// ===== Connection Handler =====
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`)

  // === Identity ===
  socket.on('identify', (data: User) => {
    socket.data.user = data
    onlineUsers.set(socket.id, data)

    if (!userSockets.has(data.id)) userSockets.set(data.id, new Set())
    userSockets.get(data.id)!.add(socket.id)

    broadcastOnlineUsers()
    io.emit('user-status', { userId: data.id, status: data.status })
    console.log(`[identify] ${data.username} (${data.id})`)
  })

  // === Channel presence ===
  socket.on('view-channel', (data: { channelId: string }) => {
    // Leave previous channel presence rooms
    for (const room of socket.rooms) {
      if (room.startsWith('view:')) socket.leave(room)
    }
    socket.join(`view:${data.channelId}`)
    socket.data.currentChannelId = data.channelId

    // Notify others in the channel that this user is viewing
    socket.to(`view:${data.channelId}`).emit('user-viewing', {
      userId: socket.data.user?.id,
      username: socket.data.user?.username,
    })
  })

  // === Messages ===
  socket.on('send-message', (data: { channelId: string; userId: string; username: string; avatarColor: string; content: string; replyToId?: string }) => {
    const message: Message = {
      id: generateId(),
      channelId: data.channelId,
      userId: data.userId,
      username: data.username,
      avatarColor: data.avatarColor,
      content: data.content,
      timestamp: new Date().toISOString(),
      isPinned: false,
      replyToId: data.replyToId,
      reactions: [],
    }
    // Broadcast to all clients currently viewing this channel (the view: room)
    io.to(`view:${data.channelId}`).emit('new-message', message)
    console.log(`[msg] ${data.username} → #${data.channelId}: ${data.content.substring(0, 60)}`)
  })

  socket.on('delete-message', (data: { messageId: string; channelId: string }) => {
    io.to(`view:${data.channelId}`).emit('message-deleted', { messageId: data.messageId, channelId: data.channelId })
  })

  socket.on('edit-message', (data: { messageId: string; channelId: string; content: string }) => {
    io.to(`view:${data.channelId}`).emit('message-edited', data)
  })

  socket.on('pin-message', (data: { messageId: string; channelId: string; pinned: boolean }) => {
    io.to(`view:${data.channelId}`).emit('message-pinned', data)
  })

  // === Typing ===
  socket.on('typing-start', (data: { channelId: string; userId: string; username: string }) => {
    socket.to(`view:${data.channelId}`).emit('user-typing', { userId: data.userId, username: data.username, channelId: data.channelId })
  })

  socket.on('typing-stop', (data: { channelId: string; userId: string }) => {
    socket.to(`view:${data.channelId}`).emit('user-stopped-typing', { userId: data.userId, channelId: data.channelId })
  })

  // === Reactions ===
  socket.on('add-reaction', (data: { messageId: string; channelId: string; emoji: string; userId: string; username: string }) => {
    io.to(`view:${data.channelId}`).emit('reaction-added', data)
  })

  socket.on('remove-reaction', (data: { messageId: string; channelId: string; emoji: string; userId: string }) => {
    io.to(`view:${data.channelId}`).emit('reaction-removed', data)
  })

  // === Voice / Stage / Video / Streaming ===
  socket.on('join-voice', (data: { channelId: string; userId: string; username: string; avatarColor: string }) => {
    socket.join(`channel:${data.channelId}`)
    socket.data.voiceChannelId = data.channelId
    socket.data.voiceUserId = data.userId

    if (!voiceStates.has(data.channelId)) voiceStates.set(data.channelId, new Map())
    voiceStates.get(data.channelId)!.set(data.userId, {
      userId: data.userId,
      username: data.username,
      avatarColor: data.avatarColor,
      muted: false,
      deafened: false,
      videoOn: false,
      streaming: false,
      speaking: false,
      isSpeaker: true,
    })
    broadcastVoiceState(data.channelId)
    console.log(`[voice] ${data.username} joined ${data.channelId}`)
  })

  socket.on('leave-voice', (data: { channelId: string; userId: string }) => {
    voiceStates.get(data.channelId)?.delete(data.userId)
    socket.leave(`channel:${data.channelId}`)
    broadcastVoiceState(data.channelId)
    console.log(`[voice] ${data.userId} left ${data.channelId}`)
  })

  socket.on('update-voice-state', (data: { channelId: string; userId: string; muted?: boolean; deafened?: boolean; videoOn?: boolean; streaming?: boolean; speaking?: boolean; isSpeaker?: boolean }) => {
    const channel = voiceStates.get(data.channelId)
    if (!channel) return
    const participant = channel.get(data.userId)
    if (!participant) return
    if (data.muted !== undefined) participant.muted = data.muted
    if (data.deafened !== undefined) participant.deafened = data.deafened
    if (data.videoOn !== undefined) participant.videoOn = data.videoOn
    if (data.streaming !== undefined) participant.streaming = data.streaming
    if (data.speaking !== undefined) participant.speaking = data.speaking
    if (data.isSpeaker !== undefined) participant.isSpeaker = data.isSpeaker
    broadcastVoiceState(data.channelId)
  })

  // === WebRTC Signaling (for video/voice peer connections) ===
  socket.on('webrtc-offer', (data: { toUserId: string; fromUserId: string; offer: any; channelId: string }) => {
    const targetSockets = userSockets.get(data.toUserId)
    targetSockets?.forEach(sid => io.to(sid).emit('webrtc-offer', data))
  })

  socket.on('webrtc-answer', (data: { toUserId: string; fromUserId: string; answer: any; channelId: string }) => {
    const targetSockets = userSockets.get(data.toUserId)
    targetSockets?.forEach(sid => io.to(sid).emit('webrtc-answer', data))
  })

  socket.on('webrtc-ice-candidate', (data: { toUserId: string; fromUserId: string; candidate: any; channelId: string }) => {
    const targetSockets = userSockets.get(data.toUserId)
    targetSockets?.forEach(sid => io.to(sid).emit('webrtc-ice-candidate', data))
  })

  // === Stage channel - raise hand ===
  socket.on('raise-hand', (data: { channelId: string; userId: string; username: string }) => {
    io.to(`channel:${data.channelId}`).emit('hand-raised', data)
  })

  // === Status updates ===
  socket.on('update-status', (data: { userId: string; status: string; customStatus?: string }) => {
    io.emit('user-status', data)
  })

  // === Disconnect ===
  socket.on('disconnect', () => {
    const user = socket.data.user
    if (user) {
      onlineUsers.delete(socket.id)
      const sids = userSockets.get(user.id)
      if (sids) {
        sids.delete(socket.id)
        if (sids.size === 0) {
          userSockets.delete(user.id)
          io.emit('user-status', { userId: user.id, status: 'offline' })
        }
      }
      // Leave any voice channels
      if (socket.data.voiceChannelId && socket.data.voiceUserId) {
        voiceStates.get(socket.data.voiceChannelId)?.delete(socket.data.voiceUserId)
        broadcastVoiceState(socket.data.voiceChannelId)
      }
      broadcastOnlineUsers()
    }
    console.log(`[socket] disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`[socket] error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`🎮 GameHub WebSocket service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
