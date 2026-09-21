import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IUser {
  email: string
  passwordHash: string
  name: string
  phone?: string | null
  bio?: string | null
  avatarUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    bio: { type: String, default: null },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: true }
)

userSchema.plugin(idTransformPlugin)

export type UserDocument = IUser & { _id: Types.ObjectId; id: string }
export const User = getModel<IUser>('User', userSchema)
