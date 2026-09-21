import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import {
  User,
  Institution,
  Membership,
  Activity,
} from '../src/models/index.js'

async function main() {
  console.log('Seeding EduBridge (MongoDB)…')
  await connectDatabase()

  const count = await Institution.countDocuments()
  if (count > 0) {
    console.log('Database already has institutions — skipping seed.')
    return
  }

  const passwordHash = await bcrypt.hash('password123', 12)

  const admin = await User.create({
    email: 'admin@greenwood.edu',
    name: 'Rahul Desai',
    passwordHash,
    bio: 'Administrator · Greenwood High',
  })

  const institution = await Institution.create({
    name: 'Greenwood High School',
    city: 'Pune',
    slug: 'greenwood-high',
    adminName: 'Rahul Desai',
    adminEmail: 'admin@greenwood.edu',
    plan: 'trial',
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    yearlyPriceInr: 29999,
    feesCollectedInr: 0,
  })

  await Membership.create({
    userId: admin._id,
    institutionId: institution._id,
    role: 'admin',
    status: 'active',
  })

  await Activity.create({
    institutionId: institution._id,
    title: 'Workspace created',
    description: 'Greenwood High School is live · roster starts at 0',
    type: 'system',
  })

  console.log('Seed complete')
  console.log('  Admin: admin@greenwood.edu / password123')
  console.log(`  Institution: ${institution.name} (${institution.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await disconnectDatabase()
  })
