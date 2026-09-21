import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IMark {
  institutionId: Types.ObjectId
  studentId?: Types.ObjectId | null
  studentName: string
  subject: string
  exam: string
  score: number
  maxScore: number
  grade: string
  date: string
  createdAt: Date
  updatedAt: Date
}

const markSchema = new Schema<IMark>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    studentName: { type: String, required: true },
    subject: { type: String, required: true },
    exam: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    grade: { type: String, required: true },
    date: { type: String, required: true },
  },
  { timestamps: true }
)

markSchema.index({ institutionId: 1, createdAt: -1 })
markSchema.plugin(idTransformPlugin)

export const Mark = getModel<IMark>('Mark', markSchema)
