import { Router } from 'express'
import { z } from 'zod'
import { Student, Attendance, Mark } from '../../models/index.js'
import { AppError, assertFound } from '../../lib/errors.js'
import { pushActivity } from '../../lib/activity.js'
import { findOrCreateClass } from '../../lib/class.js'
import { param } from '../../lib/params.js'
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
    const students = await Student.find({ institutionId: req.user!.institutionId }).sort({
      enrolledAt: -1,
    })
    res.json({ students })
  })
)

const createSchema = z.object({
  name: z.string().min(2),
  grade: z.string().min(1),
  section: z.string().min(1),
  rollNumber: z.string().min(1),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional().or(z.literal('')),
})

router.post(
  '/',
  requireAuth,
  requireRoles('admin'),
  validateBody(createSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const institutionId = req.user!.institutionId
    const section = body.section.trim().toUpperCase()

    try {
      const cls = await findOrCreateClass(institutionId, body.grade, section)
      const student = await Student.create({
        institutionId,
        classId: cls._id,
        name: body.name.trim(),
        grade: body.grade.trim(),
        section,
        rollNumber: body.rollNumber.trim(),
        parentName: body.parentName?.trim() || '—',
        parentEmail: body.parentEmail?.trim().toLowerCase() || '',
        attendanceRate: 100,
        performanceAvg: 0,
      })

      await pushActivity(institutionId, {
        title: 'Student enrolled',
        description: `${student.name} joined Class ${student.grade}${student.section}`,
        type: 'student',
      })

      res.status(201).json({ student })
    } catch {
      throw new AppError(409, 'A student with this roll number already exists in this class')
    }
  })
)

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const student = assertFound(
      await Student.findOne({
        _id: param(req, 'id'),
        institutionId: req.user!.institutionId,
      }),
      'Student not found'
    )
    const [attendance, marks] = await Promise.all([
      Attendance.find({ studentId: student._id }).sort({ date: -1 }).limit(30),
      Mark.find({ studentId: student._id }).sort({ date: -1 }).limit(20),
    ])
    res.json({ student, attendance, marks })
  })
)

export default router
