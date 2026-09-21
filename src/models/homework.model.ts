import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IHomework {
  institutionId: Types.ObjectId
  classId?: Types.ObjectId | null
  title: string
  subject: string
  description: string
  className: string
  dueDate: string
  status: string
  createdById?: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const homeworkSchema = new Schema<IHomework>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    className: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'submitted', 'graded', 'overdue'],
    },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

homeworkSchema.index({ institutionId: 1, createdAt: -1 })
homeworkSchema.plugin(idTransformPlugin)

export const Homework = getModel<IHomework>('Homework', homeworkSchema)
