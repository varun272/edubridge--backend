import 'dotenv/config'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-32-characters!!'
process.env.JWT_EXPIRES_IN = '1d'
process.env.APP_URL = 'http://localhost:5173'
process.env.API_URL = 'http://localhost:4000'
process.env.TRIAL_DAYS = '7'
process.env.YEARLY_PRICE_INR = '29999'
process.env.OTP_TTL_MINUTES = '10'
process.env.DEV_OTP = '123456'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.PORT = '4001'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required for tests — set it in .env (MongoDB Atlas)')
}
