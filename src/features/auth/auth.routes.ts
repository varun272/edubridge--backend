import { Router } from 'express'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { User, Membership, PasswordReset, Institution } from '../../models/index.js'
import { AppError, assertFound } from '../../lib/errors.js'
import { hashPassword, signToken, verifyPassword } from '../../lib/auth.js'
import { asyncHandler, requireAuth, validateBody, type AuthedRequest } from '../../middleware/index.js'
import { env } from '../../config/env.js'
import { sendMail } from '../../lib/mail.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  institutionId: z.string().min(1),
})

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password, institutionId } = req.body as z.infer<typeof loginSchema>
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) throw new AppError(401, 'Invalid email or password')

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) throw new AppError(401, 'Invalid email or password')

    const membership = await Membership.findOne({
      userId: user._id,
      institutionId,
      status: 'active',
    })
    if (!membership) {
      throw new AppError(403, 'No access to this institution workspace')
    }

    const institution = assertFound(
      await Institution.findById(institutionId),
      'Institution not found'
    )

    const token = signToken({
      sub: user.id,
      email: user.email,
      institutionId: institution.id,
      role: membership.role as 'admin' | 'teacher' | 'parent',
    })

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        phone: user.phone,
        bio: user.bio,
      },
      institution: {
        id: institution.id,
        name: institution.name,
        city: institution.city,
        slug: institution.slug,
        plan: institution.plan,
        trialEndsAt: institution.trialEndsAt,
        yearlyPriceInr: institution.yearlyPriceInr,
      },
    })
  })
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = assertFound(await User.findById(req.user!.sub), 'User not found')
    const membership = assertFound(
      await Membership.findOne({
        userId: user._id,
        institutionId: req.user!.institutionId,
      }),
      'Membership not found'
    )
    const institution = assertFound(
      await Institution.findById(req.user!.institutionId),
      'Institution not found'
    )

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        phone: user.phone,
        bio: user.bio,
      },
      institution,
    })
  })
)

const forgotSchema = z.object({ email: z.string().email() })

router.post(
  '/forgot-password',
  validateBody(forgotSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof forgotSchema>
    const user = await User.findOne({ email: email.toLowerCase() })
    if (user) {
      const token = nanoid(32)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      await PasswordReset.create({ userId: user._id, token, expiresAt })
      await sendMail({
        to: user.email,
        subject: 'EduBridge password reset',
        text: `Reset your password: ${env.APP_URL}/reset-password?token=${token}`,
      })
    }
    res.json({ ok: true, message: 'If that email exists, a reset link was sent.' })
  })
)

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
})

router.post(
  '/reset-password',
  validateBody(resetSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as z.infer<typeof resetSchema>
    const row = await PasswordReset.findOne({ token })
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token')
    }
    const passwordHash = await hashPassword(password)
    await User.findByIdAndUpdate(row.userId, { passwordHash })
    row.usedAt = new Date()
    await row.save()
    res.json({ ok: true })
  })
)

export default router
