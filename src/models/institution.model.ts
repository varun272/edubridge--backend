import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IInstitution {
  name: string
  city: string
  slug: string
  adminName: string
  adminEmail: string
  plan: 'trial' | 'yearly' | string
  trialEndsAt?: Date | null
  yearlyPriceInr: number
  feesCollectedInr: number
  createdAt: Date
  updatedAt: Date
}

const institutionSchema = new Schema<IInstitution>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    adminName: { type: String, required: true, trim: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    plan: { type: String, required: true, enum: ['trial', 'yearly'] },
    trialEndsAt: { type: Date, default: null },
    yearlyPriceInr: { type: Number, default: 29999 },
    feesCollectedInr: { type: Number, default: 0 },
  },
  { timestamps: true }
)

institutionSchema.plugin(idTransformPlugin)

export type InstitutionDocument = IInstitution & { _id: Types.ObjectId; id: string }
export const Institution = getModel<IInstitution>('Institution', institutionSchema)
