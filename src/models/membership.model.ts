import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IMembership {
  userId: Types.ObjectId
  institutionId: Types.ObjectId
  role: 'admin' | 'teacher' | 'parent' | string
  status: string
  createdAt: Date
  updatedAt: Date
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    role: { type: String, required: true, enum: ['admin', 'teacher', 'parent'] },
    status: { type: String, default: 'active', enum: ['active', 'invited', 'disabled'] },
  },
  { timestamps: true }
)

membershipSchema.index({ userId: 1, institutionId: 1 }, { unique: true })
membershipSchema.index({ institutionId: 1, role: 1 })
membershipSchema.plugin(idTransformPlugin)

export const Membership = getModel<IMembership>('Membership', membershipSchema)
