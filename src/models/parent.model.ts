import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IParent {
  institutionId: Types.ObjectId
  userId: Types.ObjectId
  phone: string
  studentIds: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const parentSchema = new Schema<IParent>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, default: '' },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true }
)

parentSchema.index({ institutionId: 1, userId: 1 }, { unique: true })
parentSchema.plugin(idTransformPlugin)

export const Parent = getModel<IParent>('Parent', parentSchema)
