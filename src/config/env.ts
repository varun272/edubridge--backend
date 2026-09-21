import dotenv from 'dotenv'
import { z } from 'zod'

// Force .env values over any stale shell/system MONGODB_URI
dotenv.config({ override: true })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:4000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required (MongoDB Atlas connection string)'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  TRIAL_DAYS: z.coerce.number().default(7),
  YEARLY_PRICE_INR: z.coerce.number().default(29999),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  DEV_OTP: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

export const env = envSchema.parse(process.env)

export const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
