import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Upsert anonymous user (creates if not exists, updates if exists)
  const anonymousUser = await prisma.user.upsert({
    where: {
      user_id: 'anonymous',
    },
    update: {}, // No updates needed if exists
    create: {
      user_id: 'anonymous',
      username: 'anonymous',
      full_name: 'Anonymous User',
    },
  })

  console.log('Seeded anonymous user:', anonymousUser)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 