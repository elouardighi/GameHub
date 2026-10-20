// One-shot script: set a known bcrypt password hash for the NovaStrike demo user
// so they can log in via the Auth modal using email `nova@gamehub.gg` + password `demo`.
// Also sets the same hash for all other seeded users so any of them can log in too.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const passwordHash = bcrypt.hashSync('demo', 10)

  const users = await db.user.findMany()
  let updated = 0
  for (const u of users) {
    // Always set the hash so any seeded user can log in with "demo"
    if (!u.passwordHash || u.passwordHash.length < 20) {
      await db.user.update({ where: { id: u.id }, data: { passwordHash } })
      updated++
    }
  }
  console.log(`✓ Updated ${updated}/${users.length} user passwordHashes`)
  console.log('  Login with any seeded user email + password "demo"')
  console.log('  (e.g. nova@gamehub.gg / demo)')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
