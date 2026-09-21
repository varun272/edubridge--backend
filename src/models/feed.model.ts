import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IFeed {
  institutionId: Types.ObjectId
  type: string
  title: string
  body: string
  mediaUrl?: string | null
  authorId?: Types.ObjectId | null
  authorName: string
  likeCount: number
  celebrateCount: number
  createdAt: Date
  updatedAt: Date
}

const feedSchema = new Schema<IFeed>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['image', 'video', 'event', 'announcement', 'achievement'],
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, required: true },
    likeCount: { type: Number, default: 0 },
    celebrateCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

feedSchema.index({ institutionId: 1, createdAt: -1 })
feedSchema.plugin(idTransformPlugin)

export const Feed = getModel<IFeed>('Feed', feedSchema)
