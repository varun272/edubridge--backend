import { Router } from 'express'
import { z } from 'zod'
import {
  User,
  Institution,
  Membership,
  Student,
  Invite,
  Activity,
} from '../../models/index.js'
import { AppError } from '../../lib/errors.js'
import { hashPassword, signToken } from '../../lib/auth.js'
import { env } from '../../config/env.js'
import { slugify, formatInr, average } from '../../lib/utils.js'
import { param } from '../../lib/params.js'
import {
  asyncHandler,
  requireAuth,
  validateBody,
  type AuthedRequest,
} from '../../middleware/index.js'

const router = Router()

const personName = z.string().trim().min(2).max(80).regex(/^[\p{L}][\p{L}\s.'-]*$/u)
const properEmail = z.string().trim().email().max(254).regex(/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i)
const createSchema = z.object({
  name: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{N}][\p{L}\p{N}\s&.'-]*$/u),
  city: z.string().trim().min(2).max(60).regex(/^[\p{L}][\p{L}\s.'-]*$/u),
  adminName: personName,
  adminEmail: properEmail,
  adminPassword: z.string().min(8).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  plan: z.enum(['trial', 'yearly']),
})

router.post(
  '/',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const email = body.adminEmail.toLowerCase()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError(409, 'An account with this admin email already exists')
    }

    let slug = slugify(body.name)
    const slugTaken = await Institution.findOne({ slug })
    if (slugTaken) slug = `${slug}-${Date.now().toString(36)}`

    const trialEndsAt =
      body.plan === 'trial'
        ? new Date(Date.now() + env.TRIAL_DAYS * 24 * 60 * 60 * 1000)
        : null

    const passwordHash = await hashPassword(body.adminPassword)

    const user = await User.create({
      email,
      name: body.adminName,
      passwordHash,
      bio: `Administrator · ${body.name}`,
    })

    const institution = await Institution.create({
      name: body.name.trim(),
      city: body.city.trim(),
      slug,
      adminName: body.adminName.trim(),
      adminEmail: email,
      plan: body.plan,
      trialEndsAt,
      yearlyPriceInr: env.YEARLY_PRICE_INR,
      feesCollectedInr: 0,
    })

    await Membership.create({
      userId: user._id,
      institutionId: institution._id,
      role: 'admin',
      status: 'active',
    })

    await Activity.create({
      institutionId: institution._id,
      title: 'Workspace created',
      description: `${institution.name} is live · roster starts at 0`,
      type: 'system',
    })

    const token = signToken({
      sub: user.id,
      email: user.email,
      institutionId: institution.id,
      role: 'admin',
    })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        bio: user.bio,
      },
      institution,
      message:
        body.plan === 'trial'
          ? `${env.TRIAL_DAYS}-day trial started`
          : `Yearly plan · ${formatInr(env.YEARLY_PRICE_INR)}`,
    })
  })
)

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const list = await Institution.find()
      .sort({ createdAt: -1 })
      .select('name city slug plan createdAt')
    res.json({
      institutions: list.map((i) => ({
        ...i.toJSON(),
        emoji: '🏫',
        live: true,
      })),
    })
  })
)

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = param(req, 'id')
    if (req.user!.institutionId !== id) {
      throw new AppError(403, 'Forbidden')
    }
    const institution = await Institution.findById(id)
    if (!institution) throw new AppError(404, 'Institution not found')
    res.json({ institution })
  })
)

router.get(
  '/:id/stats',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const institutionId = param(req, 'id')
    if (req.user!.institutionId !== institutionId) throw new AppError(403, 'Forbidden')

    const [students, teacherCount, parentCount, pendingInvites, activity, institution] =
      await Promise.all([
        Student.find({ institutionId }),
        Membership.countDocuments({ institutionId, role: 'teacher', status: 'active' }),
        Membership.countDocuments({ institutionId, role: 'parent', status: 'active' }),
        Invite.countDocuments({ institutionId, status: 'pending' }),
        Activity.find({ institutionId }).sort({ createdAt: -1 }).limit(20),
        Institution.findById(institutionId).orFail(),
      ])

    const enrollmentSeries = buildEnrollmentSeries(institution.createdAt, students)

    res.json({
      students: students.length,
      teachers: teacherCount,
      parents: parentCount,
      pendingInvites,
      attendanceToday: average(students.map((s) => s.attendanceRate)),
      feesCollectedInr: institution.feesCollectedInr,
      feesLabel: formatInr(institution.feesCollectedInr),
      enrollmentSeries,
      activity,
    })
  })
)

router.get(
  '/:id/activity',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const institutionId = param(req, 'id')
    if (req.user!.institutionId !== institutionId) throw new AppError(403, 'Forbidden')
    const activity = await Activity.find({ institutionId }).sort({ createdAt: -1 }).limit(40)
    res.json({ activity })
  })
)

function buildEnrollmentSeries(
  createdAt: Date,
  students: { enrolledAt: Date }[]
) {
  const now = new Date()
  const months: { label: string; end: Date }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    months.push({
      label: d.toLocaleString('en-IN', { month: 'short' }),
      end: d,
    })
  }
  const created = createdAt.getTime()
  return months.map(({ label, end }) => {
    if (end.getTime() < created) return { month: label, students: 0 }
    const count = students.filter((s) => s.enrolledAt.getTime() <= end.getTime()).length
    return { month: label, students: count }
  })
}

export default router
