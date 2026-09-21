import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IAttendance {
  institutionId: Types.ObjectId
  studentId: Types.ObjectId
  classId?: Types.ObjectId | null
  studentName: string
  date: string
  status: string
  className: string
  subject?: string | null
  markedById?: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const attendanceSchema = new Schema<IAttendance>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    studentName: { type: String, required: true },
    date: { type: String, required: true },
    status: { type: String, required: true, enum: ['present', 'absent', 'late', 'excused'] },
    className: { type: String, required: true },
    subject: { type: String, default: null },
    markedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

attendanceSchema.index({ institutionId: 1, date: 1 })
attendanceSchema.index({ studentId: 1, date: 1 })
attendanceSchema.plugin(idTransformPlugin)

export const Attendance = getModel<IAttendance>('Attendance', attendanceSchema)
