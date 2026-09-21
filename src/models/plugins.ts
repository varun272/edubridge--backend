import type { Schema } from 'mongoose'

/** Expose `id` (string) instead of `_id` in JSON responses */
export function idTransformPlugin(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id)
      delete ret._id
      return ret
    },
  })
  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id)
      delete ret._id
      return ret
    },
  })
}
