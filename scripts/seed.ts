// Seed script: populates GameHub with gaming servers, clans, channels, users, quests, activities
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const AVATAR_COLORS = ['#5865F2', '#ED4245', '#57F287', '#FEE75C', '#EB459E', '#F47B67', '#9B59B6', '#1ABC9C', '#E67E22', '#2ECC71']

function color(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}

async function main() {
  console.log('🌱 Seeding GameHub...')

  // === Users ===
  const users = [
    { email: 'nova@gamehub.gg', name: 'NovaStrike', color: color(0), status: 'online', customStatus: 'Grinding ranked 🎮' },
    { email: 'kira@gamehub.gg', name: 'KiraPlays', color: color(1), status: 'online', customStatus: 'Watching pro replays' },
    { email: 'shadow@gamehub.gg', name: 'ShadowGoblin', color: color(2), status: 'idle', customStatus: 'AFK - eating pizza' },
    { email: 'pyro@gamehub.gg', name: 'PyroVortex', color: color(3), status: 'dnd', customStatus: 'In ranked - dont @ me' },
    { email: 'luna@gamehub.gg', name: 'LunaEclipse', color: color(4), status: 'online', customStatus: 'Looking for duo 🌙' },
    { email: 'rift@gamehub.gg', name: 'RiftWalker', color: color(5), status: 'online', customStatus: 'Clan leader - DM for trials' },
    { email: 'vex@gamehub.gg', name: 'VexInfinity', color: color(6), status: 'idle' },
    { email: 'byte@gamehub.gg', name: 'ByteHunter', color: color(7), status: 'online', customStatus: 'Streaming in voice' },
    { email: 'echo@gamehub.gg', name: 'EchoSiren', color: color(8), status: 'online', customStatus: 'Buying skins' },
    { email: 'flux@gamehub.gg', name: 'FluxPhantom', color: color(9), status: 'dnd', customStatus: 'Tournament time' },
    { email: 'raven@gamehub.gg', name: 'RavenX', color: color(0), status: 'online' },
    { email: 'storm@gamehub.gg', name: 'StormChaser', color: color(1), status: 'online', customStatus: 'Mod applications open' },
  ]

  const createdUsers = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        avatarColor: u.color,
        status: u.status,
        customStatus: u.customStatus,
        bio: i === 0 ? 'Founder of GameHub. Top 500 Valorant. Always up for a clutch.' : i === 5 ? 'Clan leader of VOID. Recruiting competitive players for upcoming tournament season.' : 'Just a gamer who loves a good chat.',
      },
    })
    createdUsers.push(user)
  }
  console.log(`✓ Created ${createdUsers.length} users`)

  // === Servers ===
  const servers = [
    { name: 'VALORANT Hub', iconColor: '#FF4655', bannerColor: '#0F1923', desc: 'The home of Valorant competitive. Ranked grinds, agent discussions, VOD reviews, and pro tournaments.', isPublic: true, verified: true, partnered: true },
    { name: 'League Nexus', iconColor: '#C89B3C', bannerColor: '#0A1428', desc: 'League of Legends community. Find your duo, discuss the meta, and climb the ladder together.', isPublic: true, verified: true, partnered: true },
    { name: 'Block Builders', iconColor: '#3FB59B', bannerColor: '#1F3A28', desc: 'Minecraft survival, creative, and modded. Build showcases, server listings, and resource packs.', isPublic: true, verified: false, partnered: true },
    { name: 'Los Santos RP', iconColor: '#F0A500', bannerColor: '#1A1A1A', desc: 'GTA V Roleplay server. FiveM whitelisted jobs, gang applications, and weekly events.', isPublic: true, verified: false, partnered: false },
    { name: 'Apex Legends', iconColor: '#FF0043', bannerColor: '#1A0A14', desc: 'Apex community for ranked, scrims, and casual. Find your squad and drop hot.', isPublic: true, verified: true, partnered: true },
  ]

  const createdServers = []
  for (let i = 0; i < servers.length; i++) {
    const s = servers[i]
    const owner = createdUsers[(i * 2) % createdUsers.length]
    const server = await db.server.create({
      data: {
        name: s.name,
        iconColor: s.iconColor,
        bannerColor: s.bannerColor,
        description: s.desc,
        ownerId: owner.id,
        isPublic: s.isPublic,
        verified: s.verified,
        partnered: s.partnered,
        memberCount: 0,
      },
    })
    createdServers.push(server)

    // Owner membership
    await db.member.create({
      data: { serverId: server.id, userId: owner.id, isOwner: true }
    })

    // Add a few other members
    for (let j = 0; j < 6; j++) {
      const otherUser = createdUsers[(i * 2 + j + 1) % createdUsers.length]
      if (otherUser.id !== owner.id) {
        await db.member.create({
          data: { serverId: server.id, userId: otherUser.id }
        })
      }
    }
  }
  console.log(`✓ Created ${createdServers.length} servers`)

  // === Channels per server ===
  const channelTemplates = [
    { name: 'welcome', type: 'rules', topic: 'Welcome to the server! Read the rules first.' },
    { name: 'announcements', type: 'announcement', topic: 'Official server announcements.' },
    { name: 'general', type: 'text', topic: 'General chat. Be respectful.' },
    { name: 'looking-for-group', type: 'text', topic: 'Find your duo, trio, or full squad.' },
    { name: 'highlights', type: 'text', topic: 'Drop your best clips here.' },
    { name: 'memes', type: 'text', topic: 'Post your funniest gaming memes.' },
    { name: 'general-voice', type: 'voice', topic: 'Hang out voice channel' },
    { name: 'gaming-1', type: 'voice', topic: 'Squad up here' },
    { name: 'gaming-2', type: 'voice', topic: 'Squad up here' },
    { name: 'music', type: 'voice', topic: 'Vibes only' },
    { name: 'stage-events', type: 'stage', topic: 'Live talks & AMAs' },
    { name: 'forum-discussion', type: 'forum', topic: 'Threaded discussions' },
  ]

  for (const server of createdServers) {
    for (let i = 0; i < channelTemplates.length; i++) {
      const c = channelTemplates[i]
      await db.channel.create({
        data: {
          serverId: server.id,
          name: c.name,
          type: c.type,
          topic: c.topic,
          position: i,
          userLimit: c.type === 'voice' ? 10 : null,
        },
      })
    }
  }
  console.log(`✓ Created channels (${channelTemplates.length} per server)`)

  // === Roles per server ===
  for (const server of createdServers) {
    await db.role.createMany({
      data: [
        { serverId: server.id, name: '@everyone', color: '#99AAB5', position: 0, isDefault: true, mentionable: true },
        { serverId: server.id, name: 'Members', color: '#3498DB', position: 1, mentionable: true },
        { serverId: server.id, name: 'Pro', color: '#E91E63', position: 2, mentionable: true },
        { serverId: server.id, name: 'Moderators', color: '#2ECC71', position: 3, mentionable: true },
        { serverId: server.id, name: 'Admins', color: '#F1C40F', position: 4, mentionable: true },
        { serverId: server.id, name: 'Owner', color: '#E74C3C', position: 5, mentionable: true },
      ],
    })
  }
  console.log('✓ Created roles (6 per server)')

  // === Seed messages in general channel ===
  for (const server of createdServers) {
    const generalChannel = await db.channel.findFirst({
      where: { serverId: server.id, name: 'general' }
    })
    if (!generalChannel) continue

    const messages = [
      { userId: createdUsers[0].id, content: `Welcome to **${server.name}**! 🎮 Drop a hello and tag your favorite game below.` },
      { userId: createdUsers[1].id, content: 'Anyone down for ranked tonight? Need 2 more for full squad 🔥' },
      { userId: createdUsers[2].id, content: 'Just pulled an all-nighter. Worth it? Yes. Should I do it again? Also yes.' },
      { userId: createdUsers[3].id, content: 'New patch dropped. The buff to my main is INSANE. finally we eat 🙏' },
      { userId: createdUsers[4].id, content: 'Streaming my climb to immortal tonight at 8pm. Come hang out!' },
      { userId: createdUsers[5].id, content: 'Clan recruitment open! We\'re a competitive team prepping for upcoming tournament season. DM if interested.' },
      { userId: createdUsers[6].id, content: 'The meta is shifting boys. Time to lab new strats.' },
      { userId: createdUsers[7].id, content: 'Just hit my dream rank today after 3 years of grinding 😭 never give up kings' },
      { userId: createdUsers[8].id, content: 'Best gameplay moment of my life just happened. Uploading the clip now.' },
      { userId: createdUsers[9].id, content: 'Tournament reminder: sign-ups close Friday. Don\'t miss out on the $5k prize pool!' },
    ]

    for (const m of messages) {
      await db.message.create({
        data: {
          channelId: generalChannel.id,
          userId: m.userId,
          content: m.content,
        },
      })
    }
  }
  console.log('✓ Seeded messages in #general for each server')

  // === Clans (Discord Guilds feature) ===
  const clans = [
    { name: 'VOID', tag: 'VOID', badgeColor: '#7289DA', bannerColor: '#1a1a2e', bannerStyle: 'Pulsar', desc: 'Competitive Valorant clan. Top 500 only. Tournament ready. Recruiting for VCT Challengers.', playstyle: 'Hardcore', minAge: 18 },
    { name: 'Eclipse Squad', tag: 'ECLP', badgeColor: '#F47B67', bannerColor: '#2d1b3d', bannerStyle: 'Night Sky', desc: 'LoL clan focused on ranked climb and competitive play. We run nightly scrims and weekly tournaments.', playstyle: 'Hardcore', minAge: 17 },
    { name: 'Block Empire', tag: 'BLOK', badgeColor: '#57F287', bannerColor: '#1F3A28', bannerStyle: 'Castle', desc: 'Minecraft builders & survival experts. Building mega-projects and running SMP servers together.', playstyle: 'Casual', minAge: 13 },
  ]

  for (let i = 0; i < clans.length; i++) {
    const c = clans[i]
    const owner = createdUsers[(i + 5) % createdUsers.length]
    const clan = await db.clan.create({
      data: {
        name: c.name,
        tag: c.tag,
        badgeColor: c.badgeColor,
        bannerColor: c.bannerColor,
        bannerStyle: c.bannerStyle,
        description: c.desc,
        ownerId: owner.id,
        playstyle: c.playstyle,
        minAge: c.minAge,
        memberCount: 1,
      },
    })
    // Owner as clan leader
    await db.clanMember.create({
      data: { clanId: clan.id, userId: owner.id, role: 'Leader' }
    })
    // Add a few more members
    for (let j = 1; j <= 3; j++) {
      const u = createdUsers[(i + 5 + j) % createdUsers.length]
      if (u.id !== owner.id) {
        await db.clanMember.create({
          data: { clanId: clan.id, userId: u.id, role: j === 1 ? 'Officer' : 'Member' }
        })
      }
    }
  }
  console.log(`✓ Created ${clans.length} clans`)

  // === Quests ===
  const quests = [
    { title: 'Ranked Warrior', description: 'Win 10 ranked matches this week', game: 'Valorant', reward: 'Exclusive "Warrior" badge + 1000 GameHub coins', pointsReward: 1000, progressGoal: 10 },
    { title: 'Ace Hunter', description: 'Get 5 aces in competitive play', game: 'Valorant', reward: 'Ace role + clan priority queue', pointsReward: 500, progressGoal: 5 },
    { title: 'Pentakill Master', description: 'Achieve 3 pentakills in ranked', game: 'League of Legends', reward: 'Pentakill badge + 800 GameHub coins', pointsReward: 800, progressGoal: 3 },
    { title: 'Diamond Climber', description: 'Reach Diamond rank this season', game: 'League of Legends', reward: 'Diamond role + 1500 GameHub coins', pointsReward: 1500, progressGoal: 1 },
    { title: 'Builder Master', description: 'Complete 5 mega-build projects', game: 'Minecraft', reward: 'Builder role + clan vault access', pointsReward: 600, progressGoal: 5 },
    { title: 'Apex Predator', description: 'Win 20 matches as Predator', game: 'Apex Legends', reward: 'Predator badge + 1200 GameHub coins', pointsReward: 1200, progressGoal: 20 },
  ]
  for (const q of quests) {
    await db.quest.create({ data: q })
  }
  console.log(`✓ Created ${quests.length} quests`)

  // === Activities (Discord Activities feature) ===
  const activities = [
    { name: 'Gartic Phone', description: 'Hilarious drawing telephone game', emoji: '🎨', category: 'Games', maxPlayers: 8 },
    { name: 'Watch Together', description: 'YouTube sync watch party', emoji: '📺', category: 'Watch', maxPlayers: 10 },
    { name: 'Jackbox', description: 'Party pack with friends', emoji: '🎲', category: 'Games', maxPlayers: 8 },
    { name: 'Sketch Heads', description: 'Pictionary with strangers', emoji: '✏️', category: 'Games', maxPlayers: 8 },
    { name: 'Chess in the Park', description: 'Casual chess with voice chat', emoji: '♟️', category: 'Games', maxPlayers: 4 },
    { name: 'Putt Party', description: 'Mini-golf chaos with modifiers', emoji: '⛳', category: 'Games', maxPlayers: 8 },
    { name: 'Land-io', description: 'Territory capture multiplayer', emoji: '🌍', category: 'Games', maxPlayers: 16 },
    { name: 'Listen Along', description: 'Spotify listening party', emoji: '🎵', category: 'Listen', maxPlayers: 10 },
  ]
  for (const a of activities) {
    await db.activity.create({ data: a })
  }
  console.log(`✓ Created ${activities.length} activities`)

  // === Friendships ===
  for (let i = 1; i < 6; i++) {
    await db.friendship.create({
      data: { requesterId: createdUsers[0].id, addresseeId: createdUsers[i].id, status: 'accepted' }
    })
  }
  await db.friendship.create({
    data: { requesterId: createdUsers[6].id, addresseeId: createdUsers[0].id, status: 'pending' }
  })
  await db.friendship.create({
    data: { requesterId: createdUsers[7].id, addresseeId: createdUsers[0].id, status: 'pending' }
  })
  console.log('✓ Created friendships')

  // === Quest progress for the first user ===
  const firstUser = createdUsers[0]
  const allQuests = await db.quest.findMany()
  for (const q of allQuests) {
    await db.questProgress.create({
      data: {
        questId: q.id,
        userId: firstUser.id,
        progress: Math.floor(Math.random() * q.progressGoal),
        completed: false,
      },
    })
  }
  console.log('✓ Seeded quest progress')

  console.log('✅ Seed completed successfully!')
  console.log(`📊 Summary: ${createdUsers.length} users, ${createdServers.length} servers, ${clans.length} clans, ${quests.length} quests, ${activities.length} activities`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
