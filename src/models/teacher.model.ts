import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface ITeacher {
  institutionId: Types.ObjectId
  userId: Types.ObjectId
  subject: string
  phone: string
  classIds: Types.ObjectId[]
  experienceYears: number
  createdAt: Date
  updatedAt: Date
}

const teacherSchema = new Schema<ITeacher>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, default: 'General' },
    phone: { type: String, default: '' },
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    experienceYears: { type: Number, default: 0 },
  },
  { timestamps: true }
)

teacherSchema.index({ institutionId: 1, userId: 1 }, { unique: true })
teacherSchema.plugin(idTransformPlugin)

export const Teacher = getModel<ITeacher>('Teacher', teacherSchema)
