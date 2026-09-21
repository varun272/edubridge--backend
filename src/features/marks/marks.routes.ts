import { Router } from 'express'
import { z } from 'zod'
import { Mark, Student } from '../../models/index.js'
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
    const marks = await Mark.find({ institutionId: req.user!.institutionId }).sort({
      createdAt: -1,
    })
    res.json({ marks })
  })
)

const createSchema = z.object({
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  subject: z.string().min(1),
  exam: z.string().min(1),
  score: z.number(),
  maxScore: z.number().positive(),
  grade: z.string().min(1),
  date: z.string().min(4),
})

router.post(
  '/',
  requireAuth,
  requireRoles('teacher', 'admin'),
  validateBody(createSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const mark = await Mark.create({
      institutionId: req.user!.institutionId,
      studentId: body.studentId ?? null,
      studentName: body.studentName,
      subject: body.subject,
      exam: body.exam,
      score: body.score,
      maxScore: body.maxScore,
      grade: body.grade,
      date: body.date,
    })

    if (body.studentId) {
      const all = await Mark.find({ studentId: body.studentId })
      const avg =
        all.reduce((a, m) => a + (m.score / m.maxScore) * 100, 0) / Math.max(all.length, 1)
      await Student.findByIdAndUpdate(body.studentId, {
        performanceAvg: Math.round(avg * 10) / 10,
      })
    }

    res.status(201).json({ mark })
  })
)

export default router
