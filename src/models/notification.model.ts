import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface INotification {
  institutionId?: Types.ObjectId | null
  userId: Types.ObjectId
  title: string
  message: string
  type: string
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info', enum: ['info', 'success', 'warning', 'alert'] },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, read: 1 })
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.plugin(idTransformPlugin)

export const Notification = getModel<INotification>('Notification', notificationSchema)
