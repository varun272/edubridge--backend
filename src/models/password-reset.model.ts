import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IPasswordReset {
  userId: Types.ObjectId
  token: string
  expiresAt: Date
  usedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

passwordResetSchema.plugin(idTransformPlugin)

export const PasswordReset = getModel<IPasswordReset>('PasswordReset', passwordResetSchema)
