import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IStudent {
  institutionId: Types.ObjectId
  classId?: Types.ObjectId | null
  name: string
  grade: string
  section: string
  rollNumber: string
  parentName: string
  parentEmail: string
  parentIds: Types.ObjectId[]
  attendanceRate: number
  performanceAvg: number
  avatarUrl?: string | null
  enrolledAt: Date
  createdAt: Date
  updatedAt: Date
}

const studentSchema = new Schema<IStudent>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    name: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    rollNumber: { type: String, required: true, trim: true },
    parentName: { type: String, default: '' },
    parentEmail: { type: String, default: '', lowercase: true },
    parentIds: [{ type: Schema.Types.ObjectId, ref: 'Parent' }],
    attendanceRate: { type: Number, default: 100 },
    performanceAvg: { type: Number, default: 0 },
    avatarUrl: { type: String, default: null },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

studentSchema.index({ institutionId: 1, grade: 1, section: 1, rollNumber: 1 }, { unique: true })
studentSchema.plugin(idTransformPlugin)

export const Student = getModel<IStudent>('Student', studentSchema)
