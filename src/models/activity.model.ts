import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IActivity {
  institutionId: Types.ObjectId
  title: string
  description: string
  type: string
  createdAt: Date
  updatedAt: Date
}

const activitySchema = new Schema<IActivity>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['system', 'student', 'teacher', 'parent', 'finance', 'invite'],
    },
  },
  { timestamps: true }
)

activitySchema.index({ institutionId: 1, createdAt: -1 })
activitySchema.plugin(idTransformPlugin)

export const Activity = getModel<IActivity>('Activity', activitySchema)
