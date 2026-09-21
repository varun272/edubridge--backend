import { Router } from 'express'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { Fee, FeePayment, Institution } from '../../models/index.js'
import { assertFound } from '../../lib/errors.js'
import { pushActivity } from '../../lib/activity.js'
import {
  asyncHandler,
  requireAuth,
  requireRoles,
  validateBody,
  type AuthedRequest,
} from '../../middleware/index.js'

const router = Router()

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const institutionId = req.user!.institutionId
    const [fees, payments, institution] = await Promise.all([
      Fee.find({ institutionId }).sort({ createdAt: -1 }),
      FeePayment.find({ institutionId }).sort({ paidAt: -1 }).limit(50),
      Institution.findById(institutionId).orFail(),
    ])
    res.json({
      fees,
      payments,
      bankDetails: {
        accountName: institution.name,
        bankName: 'EduBridge Partner Bank',
        accountNumber: 'XXXXXX1234',
        ifsc: 'EDUB0001234',
        upi: `${institution.slug}@edubridge`,
      },
      feesCollectedInr: institution.feesCollectedInr,
    })
  })
)

const createFeeSchema = z.object({
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  title: z.string().min(2),
  category: z.string().min(1),
  amount: z.number().int().positive(),
  dueDate: z.string().min(4),
  term: z.string().min(1),
})

router.post(
  '/',
  requireAuth,
  requireRoles('admin'),
  validateBody(createFeeSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createFeeSchema>
    const fee = await Fee.create({
      institutionId: req.user!.institutionId,
      studentId: body.studentId ?? null,
      studentName: body.studentName,
      title: body.title,
      category: body.category,
      amount: body.amount,
      dueDate: body.dueDate,
      term: body.term,
      invoiceNo: `INV-${nanoid(8).toUpperCase()}`,
      status: 'pending',
    })
    res.status(201).json({ fee })
  })
)

const paySchema = z.object({
  feeId: z.string(),
  amount: z.number().int().positive(),
  method: z.enum(['upi', 'bank', 'card']),
})

router.post(
  '/pay',
  requireAuth,
  requireRoles('parent', 'admin'),
  validateBody(paySchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof paySchema>
    const institutionId = req.user!.institutionId
    const fee = assertFound(
      await Fee.findOne({ _id: body.feeId, institutionId }),
      'Fee not found'
    )

    const paidAmount = fee.paidAmount + body.amount
    const status =
      paidAmount >= fee.amount ? 'paid' : paidAmount > 0 ? 'partial' : fee.status

    const payment = await FeePayment.create({
      institutionId,
      feeId: fee._id,
      amount: body.amount,
      method: body.method,
      reference: `PAY-${nanoid(10).toUpperCase()}`,
      status: 'success',
    })

    fee.paidAmount = paidAmount
    fee.status = status
    await fee.save()

    await Institution.findByIdAndUpdate(institutionId, {
      $inc: { feesCollectedInr: body.amount },
    })

    await pushActivity(institutionId, {
      title: 'Fee received',
      description: `${fee.invoiceNo} · ₹${body.amount} via ${body.method}`,
      type: 'finance',
    })

    res.status(201).json({ payment, status })
  })
)

export default router
