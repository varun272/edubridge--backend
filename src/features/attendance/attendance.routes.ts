import { Router } from 'express'
import { z } from 'zod'
import { Attendance, Student, Parent } from '../../models/index.js'
import { notifyUser } from '../../lib/activity.js'
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
    const { date, studentId, className } = req.query
    const filter: Record<string, unknown> = {
      institutionId: req.user!.institutionId,
    }
    if (typeof date === 'string') filter.date = date
    if (typeof studentId === 'string') filter.studentId = studentId
    if (typeof className === 'string') filter.className = className

    const records = await Attendance.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
    res.json({ records })
  })
)

const bulkSchema = z.object({
  className: z.string().min(1),
  subject: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  marks: z
    .array(
      z.object({
        studentId: z.string(),
        studentName: z.string(),
        status: z.enum(['present', 'absent', 'late', 'excused']),
      })
    )
    .min(1),
})

router.post(
  '/bulk',
  requireAuth,
  requireRoles('teacher', 'admin'),
  validateBody(bulkSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof bulkSchema>
    const institutionId = req.user!.institutionId
    const date = body.date ?? new Date().toISOString().slice(0, 10)

    // Parse className like "10A" into grade/section when possible
    const match = body.className.match(/^(\d+)([A-Za-z]+)$/)
    let classId = null
    if (match) {
      const cls = await findOrCreateClass(institutionId, match[1], match[2])
      classId = cls._id
    }

    await Attendance.deleteMany({ institutionId, date, className: body.className })

    const created = await Attendance.insertMany(
      body.marks.map((m) => ({
        institutionId,
        studentId: m.studentId,
        classId,
        studentName: m.studentName,
        date,
        status: m.status,
        className: body.className,
        subject: body.subject,
        markedById: req.user!.sub,
      }))
    )

    for (const m of body.marks) {
      const all = await Attendance.find({ studentId: m.studentId })
      if (all.length === 0) continue
      const presentish = all.filter((r) => r.status === 'present' || r.status === 'late').length
      const rate = Math.round((presentish / all.length) * 1000) / 10
      await Student.findByIdAndUpdate(m.studentId, { attendanceRate: rate })
    }

    const studentIds = body.marks.map((m) => m.studentId)
    const parents = await Parent.find({
      institutionId,
      studentIds: { $in: studentIds },
    })
    for (const parent of parents) {
      for (const sid of parent.studentIds) {
        const mark = body.marks.find((m) => m.studentId === String(sid))
        if (!mark) continue
        await notifyUser({
          userId: String(parent.userId),
          institutionId,
          title: `Attendance · ${mark.studentName}`,
          message: `Marked ${mark.status} for ${body.subject} (${body.className}) on ${date}.`,
          type: mark.status === 'absent' ? 'alert' : mark.status === 'late' ? 'warning' : 'success',
        })
      }
    }

    res.status(201).json({ count: created.length, records: created })
  })
)

export default router
