import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email    = 'student@test.com'
  const password = 'student123'
  const hashed   = await bcrypt.hash(password, 10)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Student account already exists — use these credentials:')
    console.log(`  Email:    ${email}`)
    console.log(`  Password: ${password}`)
    return
  }

  await prisma.user.create({
    data: {
      name:      'Test Student',
      firstName: 'Test',
      lastName:  'Student',
      email,
      password:  hashed,
      role:          'STUDENT',
      emailVerified: true,
      status:        'ACTIVE',
    },
  })

  console.log('Student account created!')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  URL:      http://localhost:3001`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
