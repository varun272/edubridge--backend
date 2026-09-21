import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodType } from 'zod'
import { AppError } from '../lib/errors.js'
import { verifyToken, type JwtPayload } from '../lib/auth.js'

export type AuthedRequest = Request & {
  user?: JwtPayload
}

export function asyncHandler(
  fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next)
  }
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) return next(new AppError(401, 'Authentication required'))
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    next(new AppError(401, 'Invalid or expired token'))
  }
}

export function requireRoles(...roles: JwtPayload['role'][]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'))
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'))
    }
    next()
  }
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError(400, 'Validation failed', 'VALIDATION', err.flatten()))
        return
      }
      next(err)
    }
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details,
    })
  }
  console.error(err)
  return res.status(500).json({ error: 'Internal server error' })
}
