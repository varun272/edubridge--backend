import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IMeeting {
  institutionId: Types.ObjectId
  parentUserId?: Types.ObjectId | null
  teacherUserId?: Types.ObjectId | null
  teacherId?: Types.ObjectId | null
  studentId?: Types.ObjectId | null
  parentName: string
  teacherName: string
  studentName: string
  className: string
  date: string
  time: string
  durationMins: number
  topic: string
  reason: string
  mode: string
  location: string
  status: string
  initiatedBy: string
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

const meetingSchema = new Schema<IMeeting>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    parentUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    teacherUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', default: null },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    parentName: { type: String, required: true },
    teacherName: { type: String, required: true },
    studentName: { type: String, required: true },
    className: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    durationMins: { type: Number, default: 20 },
    topic: { type: String, required: true },
    reason: { type: String, required: true },
    mode: { type: String, default: 'in-person' },
    location: { type: String, default: '' },
    status: { type: String, default: 'pending' },
    initiatedBy: { type: String, required: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
)

meetingSchema.index({ institutionId: 1, createdAt: -1 })
meetingSchema.plugin(idTransformPlugin)

export const Meeting = getModel<IMeeting>('Meeting', meetingSchema)

export interface IMeetingSlot {
  institutionId: Types.ObjectId
  teacherUserId: Types.ObjectId
  date: string
  time: string
  available: boolean
  createdAt: Date
  updatedAt: Date
}

const meetingSlotSchema = new Schema<IMeetingSlot>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    teacherUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
)

meetingSlotSchema.index({ institutionId: 1, teacherUserId: 1 })
meetingSlotSchema.plugin(idTransformPlugin)

export const MeetingSlot = getModel<IMeetingSlot>('MeetingSlot', meetingSlotSchema)
