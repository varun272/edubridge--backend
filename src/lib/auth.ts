import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export type JwtPayload = {
  sub: string
  email: string
  institutionId: string
  role: 'admin' | 'teacher' | 'parent'
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}

export async function hashOtp(otp: string) {
  return bcrypt.hash(otp, 8)
}

export async function verifyOtp(otp: string, hash: string) {
  return bcrypt.compare(otp, hash)
}
