export class AppError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function assertFound<T>(
  value: T | null | undefined,
  message = 'Not found'
): NonNullable<T> {
  if (value == null) throw new AppError(404, message)
  return value
}
