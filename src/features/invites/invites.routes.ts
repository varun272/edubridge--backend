import { Router } from 'express'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { Invite, User, Membership, Teacher, Parent, Institution } from '../../models/index.js'
import { AppError, assertFound } from '../../lib/errors.js'
import { hashOtp, hashPassword, signToken, verifyOtp } from '../../lib/auth.js'
import { generateOtp, inviteAcceptUrl, sendMail } from '../../lib/mail.js'
import { env } from '../../config/env.js'
import { pushActivity, notifyUser } from '../../lib/activity.js'
import { param } from '../../lib/params.js'
import {
  asyncHandler,
  requireAuth,
  requireRoles,
  validateBody,
  type AuthedRequest,
} from '../../middleware/index.js'

const router = Router()

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['parent', 'teacher']),
})

const bulkSchema = z.object({
  invites: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(['parent', 'teacher']),
      })
    )
    .min(1)
    .max(500),
})

router.get(
  '/',
  requireAuth,
  requireRoles('admin'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const invites = await Invite.find({ institutionId: req.user!.institutionId }).sort({
      createdAt: -1,
    })
    res.json({
      invites: invites.map((i) => ({
        ...i.toJSON(),
        acceptUrl: inviteAcceptUrl(i.token),
      })),
    })
  })
)

router.post(
  '/',
  requireAuth,
  requireRoles('admin'),
  validateBody(inviteSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof inviteSchema>
    const institutionId = req.user!.institutionId
    const email = body.email.toLowerCase()

    const pending = await Invite.findOne({ institutionId, email, status: 'pending' })
    if (pending) throw new AppError(409, 'A pending invite already exists for this email')

    const token = nanoid(24)
    const invite = await Invite.create({
      token,
      institutionId,
      email,
      name: body.name.trim(),
      role: body.role,
      status: 'pending',
    })

    await pushActivity(institutionId, {
      title: 'Invite sent',
      description: `${invite.name} invited as ${invite.role} · ${invite.email}`,
      type: 'invite',
    })

    const url = inviteAcceptUrl(token)
    await sendMail({
      to: email,
      subject: `You're invited to EduBridge as ${body.role}`,
      text: `Hi ${body.name},\n\nYou've been invited as a ${body.role}.\nAccept: ${url}\n\nAfter OTP verification you'll land on your ${body.role} dashboard.`,
    })

    res.status(201).json({
      invite: { ...invite.toJSON(), acceptUrl: url },
    })
  })
)

router.post(
  '/bulk',
  requireAuth,
  requireRoles('admin'),
  validateBody(bulkSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { invites: rows } = req.body as z.infer<typeof bulkSchema>
    const institutionId = req.user!.institutionId

    const created = []
    for (const row of rows) {
      const email = row.email.toLowerCase()
      const existing = await Invite.findOne({ institutionId, email, status: 'pending' })
      if (existing) continue

      const token = nanoid(24)
      const invite = await Invite.create({
        token,
        institutionId,
        email,
        name: row.name.trim(),
        role: row.role,
        status: 'pending',
      })
      created.push(invite)
      await sendMail({
        to: email,
        subject: `You're invited to EduBridge as ${row.role}`,
        text: `Hi ${row.name},\n\nAccept your invite: ${inviteAcceptUrl(token)}`,
      })
    }

    const teachers = created.filter((i) => i.role === 'teacher').length
    const parents = created.filter((i) => i.role === 'parent').length
    await pushActivity(institutionId, {
      title: 'Bulk invites sent',
      description: `${created.length} invites · ${teachers} teachers · ${parents} parents`,
      type: 'invite',
    })

    res.status(201).json({
      count: created.length,
      invites: created.map((i) => ({ ...i.toJSON(), acceptUrl: inviteAcceptUrl(i.token) })),
    })
  })
)

router.get(
  '/token/:token',
  asyncHandler(async (req, res) => {
    const token = param(req, 'token')
    const invite = await Invite.findOne({ token })
    if (!invite || invite.status === 'revoked') throw new AppError(404, 'Invite not found')
    const institution = await Institution.findById(invite.institutionId).select('name city')
    res.json({
      invite: {
        id: invite.id,
        name: invite.name,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        institution: institution
          ? { id: institution.id, name: institution.name, city: institution.city }
          : null,
      },
    })
  })
)

router.post(
  '/token/:token/request-otp',
  asyncHandler(async (req, res) => {
    const invite = assertFound(
      await Invite.findOne({ token: param(req, 'token') }),
      'Invite not found'
    )
    if (invite.status !== 'pending') throw new AppError(400, 'Invite is no longer pending')

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    invite.otpHash = otpHash
    invite.otpExpiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000)
    invite.otpVerifiedAt = null
    await invite.save()

    await sendMail({
      to: invite.email,
      subject: 'EduBridge invite OTP',
      text: `Your OTP is ${otp}. It expires in ${env.OTP_TTL_MINUTES} minutes.`,
    })

    res.json({
      ok: true,
      message: 'OTP sent to invite email',
      ...(env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    })
  })
)

const otpSchema = z.object({ otp: z.string().length(6) })

router.post(
  '/token/:token/verify-otp',
  validateBody(otpSchema),
  asyncHandler(async (req, res) => {
    const { otp } = req.body as z.infer<typeof otpSchema>
    const invite = assertFound(
      await Invite.findOne({ token: param(req, 'token') }),
      'Invite not found'
    )
    if (invite.status !== 'pending') throw new AppError(400, 'Invite is no longer pending')
    if (!invite.otpHash || !invite.otpExpiresAt || invite.otpExpiresAt < new Date()) {
      throw new AppError(400, 'OTP expired — request a new one')
    }
    const ok = await verifyOtp(otp, invite.otpHash)
    if (!ok) throw new AppError(400, 'Invalid OTP')

    invite.otpVerifiedAt = new Date()
    await invite.save()
    res.json({ ok: true, verified: true })
  })
)

const acceptSchema = z.object({
  otp: z.string().length(6),
  password: z.string().min(6),
})

router.post(
  '/token/:token/accept',
  validateBody(acceptSchema),
  asyncHandler(async (req, res) => {
    const { otp, password } = req.body as z.infer<typeof acceptSchema>
    const invite = assertFound(
      await Invite.findOne({ token: param(req, 'token') }),
      'Invite not found'
    )
    if (invite.status !== 'pending') throw new AppError(400, 'Invite already used or revoked')
    if (!invite.otpHash || !invite.otpExpiresAt || invite.otpExpiresAt < new Date()) {
      throw new AppError(400, 'OTP expired — request a new one')
    }
    const otpOk = await verifyOtp(otp, invite.otpHash)
    if (!otpOk) throw new AppError(400, 'Invalid OTP')

    const institution = assertFound(
      await Institution.findById(invite.institutionId),
      'Institution not found'
    )

    const email = invite.email.toLowerCase()
    let user = await User.findOne({ email })
    const passwordHash = await hashPassword(password)

    if (!user) {
      user = await User.create({
        email,
        name: invite.name,
        passwordHash,
        bio:
          invite.role === 'teacher'
            ? `Teacher · ${institution.name}`
            : `Parent · ${institution.name}`,
      })
    } else {
      user.passwordHash = passwordHash
      await user.save()
    }

    await Membership.findOneAndUpdate(
      { userId: user._id, institutionId: invite.institutionId },
      {
        userId: user._id,
        institutionId: invite.institutionId,
        role: invite.role,
        status: 'active',
      },
      { upsert: true, new: true }
    )

    if (invite.role === 'teacher') {
      await Teacher.findOneAndUpdate(
        { institutionId: invite.institutionId, userId: user._id },
        {
          institutionId: invite.institutionId,
          userId: user._id,
          subject: 'General',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    } else {
      await Parent.findOneAndUpdate(
        { institutionId: invite.institutionId, userId: user._id },
        {
          institutionId: invite.institutionId,
          userId: user._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    }

    invite.status = 'accepted'
    invite.acceptedAt = new Date()
    invite.otpVerifiedAt = new Date()
    invite.otpHash = null
    await invite.save()

    await pushActivity(String(invite.institutionId), {
      title: `${invite.role === 'teacher' ? 'Teacher' : 'Parent'} joined`,
      description: `${invite.name} accepted invite · ${invite.email}`,
      type: invite.role,
    })

    await notifyUser({
      userId: user.id,
      institutionId: institution.id,
      title: 'Welcome to EduBridge',
      message: `You're in as ${invite.role} at ${institution.name}.`,
      type: 'success',
    })

    const jwt = signToken({
      sub: user.id,
      email: user.email,
      institutionId: institution.id,
      role: invite.role as 'parent' | 'teacher',
    })

    res.json({
      token: jwt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: invite.role,
        bio: user.bio,
      },
      institution: {
        id: institution.id,
        name: institution.name,
        city: institution.city,
        plan: institution.plan,
        trialEndsAt: institution.trialEndsAt,
      },
      homePath: invite.role === 'teacher' ? '/teacher' : '/parent',
    })
  })
)

export default router
