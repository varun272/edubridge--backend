import type { Request } from 'express'
import { AppError } from './errors.js'

/** Express 5 can type params as string | string[] — normalize to a single string */
export function param(req: Request, name: string): string {
  const value = req.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) throw new AppError(400, `Missing path parameter: ${name}`)
  return raw
}
