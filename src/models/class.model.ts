import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IClass {
  institutionId: Types.ObjectId
  name: string
  grade: string
  section: string
  teacherId?: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const classSchema = new Schema<IClass>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', default: null },
  },
  { timestamps: true }
)

classSchema.index({ institutionId: 1, grade: 1, section: 1 }, { unique: true })
classSchema.plugin(idTransformPlugin)

export const ClassModel = getModel<IClass>('Class', classSchema)
