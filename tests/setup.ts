import { beforeAll, afterAll } from 'vitest'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'

beforeAll(async () => {
  await connectDatabase()
})

afterAll(async () => {
  await disconnectDatabase()
})
