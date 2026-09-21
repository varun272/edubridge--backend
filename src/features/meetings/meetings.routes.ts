import { Router } from 'express'
import { z } from 'zod'
import { Meeting, MeetingSlot, User } from '../../models/index.js'
import { assertFound } from '../../lib/errors.js'
import { notifyUser } from '../../lib/activity.js'
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
    const role = req.user!.role
    const filter: Record<string, unknown> = {
      institutionId: req.user!.institutionId,
    }
    if (role === 'parent') filter.parentUserId = req.user!.sub
    if (role === 'teacher') filter.teacherUserId = req.user!.sub

    const meetings = await Meeting.find(filter).sort({ createdAt: -1 })
    res.json({ meetings })
  })
)

router.get(
  '/slots',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const teacherUserId =
      typeof req.query.teacherUserId === 'string' ? req.query.teacherUserId : req.user!.sub
    const slots = await MeetingSlot.find({
      institutionId: req.user!.institutionId,
      teacherUserId,
      available: true,
    }).sort({ date: 1, time: 1 })
    res.json({ slots })
  })
)

const slotSchema = z.object({
  date: z.string().min(4),
  time: z.string().min(1),
})

router.post(
  '/slots',
  requireAuth,
  requireRoles('teacher', 'admin'),
  validateBody(slotSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof slotSchema>
    const slot = await MeetingSlot.create({
      institutionId: req.user!.institutionId,
      teacherUserId: req.user!.sub,
      date: body.date,
      time: body.time,
      available: true,
    })
    res.status(201).json({ slot })
  })
)

const createSchema = z.object({
  teacherUserId: z.string().optional(),
  teacherName: z.string().min(1),
  parentName: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  className: z.string().min(1),
  date: z.string().min(4),
  time: z.string().min(1),
  durationMins: z.number().int().positive().optional(),
  topic: z.enum(['academics', 'attendance', 'behaviour', 'homework', 'ptm', 'other']),
  reason: z.string().min(2),
  mode: z.enum(['in-person', 'online']).optional(),
  location: z.string().optional(),
  slotId: z.string().optional(),
})

router.post(
  '/',
  requireAuth,
  requireRoles('parent', 'teacher', 'admin'),
  validateBody(createSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const user = await User.findById(req.user!.sub).orFail()
    const initiatedBy = req.user!.role === 'teacher' ? 'teacher' : 'parent'

    const meeting = await Meeting.create({
      institutionId: req.user!.institutionId,
      parentUserId: initiatedBy === 'parent' ? user._id : null,
      teacherUserId: body.teacherUserId ?? null,
      parentName: body.parentName ?? (initiatedBy === 'parent' ? user.name : 'Parent'),
      teacherName: body.teacherName,
      studentId: body.studentId ?? null,
      studentName: body.studentName,
      className: body.className,
      date: body.date,
      time: body.time,
      durationMins: body.durationMins ?? 20,
      topic: body.topic,
      reason: body.reason,
      mode: body.mode ?? 'in-person',
      location: body.location ?? '',
      status: 'pending',
      initiatedBy,
    })

    if (body.slotId) {
      await MeetingSlot.findByIdAndUpdate(body.slotId, { available: false })
    }

    if (body.teacherUserId) {
      await notifyUser({
        userId: body.teacherUserId,
        institutionId: req.user!.institutionId,
        title: 'Meeting request',
        message: `${meeting.parentName} requested ${meeting.date} ${meeting.time}`,
        type: 'info',
      })
    }

    res.status(201).json({ meeting })
  })
)

const statusSchema = z.object({
  status: z.enum(['confirmed', 'declined', 'cancelled', 'completed']),
  notes: z.string().optional(),
})

router.patch(
  '/:id/status',
  requireAuth,
  validateBody(statusSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof statusSchema>
    const meeting = assertFound(
      await Meeting.findOne({
        _id: param(req, 'id'),
        institutionId: req.user!.institutionId,
      }),
      'Meeting not found'
    )

    meeting.status = body.status
    if (body.notes !== undefined) meeting.notes = body.notes
    await meeting.save()

    const notifyId =
      req.user!.role === 'teacher' ? meeting.parentUserId : meeting.teacherUserId
    if (notifyId) {
      await notifyUser({
        userId: String(notifyId),
        institutionId: req.user!.institutionId,
        title: `Meeting ${body.status}`,
        message: `${meeting.date} ${meeting.time} · ${meeting.studentName}`,
        type: body.status === 'confirmed' ? 'success' : 'warning',
      })
    }

    res.json({ meeting })
  })
)

export default router
