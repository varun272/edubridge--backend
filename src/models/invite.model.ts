import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IInvite {
  token: string
  institutionId: Types.ObjectId
  email: string
  name: string
  role: 'parent' | 'teacher' | string
  status: string
  otpHash?: string | null
  otpExpiresAt?: Date | null
  otpVerifiedAt?: Date | null
  acceptedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const inviteSchema = new Schema<IInvite>(
  {
    token: { type: String, required: true, unique: true, index: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ['parent', 'teacher'] },
    status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'revoked'] },
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpVerifiedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

inviteSchema.index({ institutionId: 1, status: 1 })
inviteSchema.plugin(idTransformPlugin)

export const Invite = getModel<IInvite>('Invite', inviteSchema)
