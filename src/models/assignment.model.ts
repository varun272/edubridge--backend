import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IAssignment {
  institutionId: Types.ObjectId
  classId?: Types.ObjectId | null
  title: string
  subject: string
  className: string
  dueDate: string
  status: string
  totalMarks: number
  submissions: number
  createdById?: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const assignmentSchema = new Schema<IAssignment>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    className: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: { type: String, default: 'open', enum: ['open', 'closed', 'draft'] },
    totalMarks: { type: Number, required: true },
    submissions: { type: Number, default: 0 },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

assignmentSchema.index({ institutionId: 1, createdAt: -1 })
assignmentSchema.plugin(idTransformPlugin)

export const Assignment = getModel<IAssignment>('Assignment', assignmentSchema)
