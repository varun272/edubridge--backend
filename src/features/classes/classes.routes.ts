import { Router } from 'express'
import { z } from 'zod'
import { ClassModel } from '../../models/index.js'
import { AppError } from '../../lib/errors.js'
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
    const classes = await ClassModel.find({ institutionId: req.user!.institutionId }).sort({
      grade: 1,
      section: 1,
    })
    res.json({ classes })
  })
)

const createSchema = z.object({
  grade: z.string().min(1),
  section: z.string().min(1),
  teacherId: z.string().optional(),
})

router.post(
  '/',
  requireAuth,
  requireRoles('admin'),
  validateBody(createSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const grade = body.grade.trim()
    const section = body.section.trim().toUpperCase()
    const name = `${grade}${section}`

    try {
      const cls = await ClassModel.create({
        institutionId: req.user!.institutionId,
        grade,
        section,
        name,
        teacherId: body.teacherId ?? null,
      })
      res.status(201).json({ class: cls })
    } catch {
      throw new AppError(409, 'This class already exists')
    }
  })
)

export default router
