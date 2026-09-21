import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDatabase() {
  // Windows/ISP resolvers often fail mongodb+srv SRV lookups; use public DNS
  dns.setServers(['8.8.8.8', '1.1.1.1'])
  mongoose.set('strictQuery', true)

  await mongoose.connect(env.MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 20000,
  })

  console.log(`MongoDB connected · ${mongoose.connection.name}`)

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected')
  })
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
