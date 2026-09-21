import { Schema, type Types } from 'mongoose'
import { idTransformPlugin } from './plugins.js'
import { getModel } from './register.js'

export interface IFee {
  institutionId: Types.ObjectId
  studentId?: Types.ObjectId | null
  studentName: string
  title: string
  category: string
  amount: number
  paidAmount: number
  dueDate: string
  status: string
  invoiceNo: string
  term: string
  createdAt: Date
  updatedAt: Date
}

const feeSchema = new Schema<IFee>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    studentName: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'paid', 'overdue', 'partial'],
    },
    invoiceNo: { type: String, required: true },
    term: { type: String, required: true },
  },
  { timestamps: true }
)

feeSchema.index({ institutionId: 1, createdAt: -1 })
feeSchema.plugin(idTransformPlugin)

export const Fee = getModel<IFee>('Fee', feeSchema)

export interface IFeePayment {
  institutionId: Types.ObjectId
  feeId: Types.ObjectId
  amount: number
  method: string
  reference: string
  status: string
  paidAt: Date
  createdAt: Date
  updatedAt: Date
}

const feePaymentSchema = new Schema<IFeePayment>(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    feeId: { type: Schema.Types.ObjectId, ref: 'Fee', required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true, enum: ['upi', 'bank', 'card'] },
    reference: { type: String, required: true },
    status: { type: String, default: 'success', enum: ['success', 'failed'] },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

feePaymentSchema.plugin(idTransformPlugin)

export const FeePayment = getModel<IFeePayment>('FeePayment', feePaymentSchema)
