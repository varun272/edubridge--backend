import { Router } from 'express'
import { z } from 'zod'
import { Assignment } from '../../models/index.js'
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
    const items = await Assignment.find({ institutionId: req.user!.institutionId }).sort({
      createdAt: -1,
    })
    res.json({ assignments: items })
  })
)

const createSchema = z.object({
  title: z.string().min(2),
  subject: z.string().min(1),
  className: z.string().min(1),
  dueDate: z.string().min(4),
  totalMarks: z.number().int().positive(),
  status: z.enum(['open', 'closed', 'draft']).optional(),
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

    const item = await Assignment.create({
      institutionId: req.user!.institutionId,
      classId,
      title: body.title,
      subject: body.subject,
      className: body.className,
      dueDate: body.dueDate,
      totalMarks: body.totalMarks,
      status: body.status ?? 'open',
      createdById: req.user!.sub,
    })
    res.status(201).json({ assignment: item })
  })
)

export default router
