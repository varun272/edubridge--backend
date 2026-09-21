import { Router } from 'express'
import { z } from 'zod'
import { Homework } from '../../models/index.js'
import { findOrCreateClass } from '../../lib/class.js'
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
    const items = await Homework.find({ institutionId: req.user!.institutionId }).sort({
      createdAt: -1,
    })
    res.json({ homework: items })
  })
)

const createSchema = z.object({
  title: z.string().min(2),
  subject: z.string().min(1),
  description: z.string().min(1),
  className: z.string().min(1),
  dueDate: z.string().min(4),
  status: z.enum(['pending', 'submitted', 'graded', 'overdue']).optional(),
})

router.post(
  '/',
  requireAuth,
  requireRoles('teacher', 'admin'),
  validateBody(createSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const match = body.className.match(/^(\d+)([A-Za-z]+)$/)
    let classId = null
    if (match) {
      const cls = await findOrCreateClass(req.user!.institutionId, match[1], match[2])
      classId = cls._id
    }

    const item = await Homework.create({
      institutionId: req.user!.institutionId,
      classId,
      title: body.title,
      subject: body.subject,
      description: body.description,
      className: body.className,
      dueDate: body.dueDate,
      status: body.status ?? 'pending',
      createdById: req.user!.sub,
    })
    res.status(201).json({ homework: item })
  })
)

export default router
