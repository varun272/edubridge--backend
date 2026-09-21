import mongoose, { model, type Model, type Schema } from 'mongoose'

/** Register a model once (safe with tsx watch / hot reload) */
export function getModel<T>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || model<T>(name, schema)
}
