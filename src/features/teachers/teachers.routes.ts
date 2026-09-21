import { Router } from 'express'
import { Teacher, User } from '../../models/index.js'
import {
  asyncHandler,
  requireAuth,
  type AuthedRequest,
} from '../../middleware/index.js'

const router = Router()

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const profiles = await Teacher.find({ institutionId: req.user!.institutionId })
    const userIds = profiles.map((p) => p.userId)
    const users = await User.find({ _id: { $in: userIds } })
    const byId = new Map(users.map((u) => [u.id, u]))

    res.json({
      teachers: profiles.map((p) => {
        const u = byId.get(String(p.userId))
        return {
          id: p.id,
          userId: String(p.userId),
          name: u?.name ?? 'Teacher',
          email: u?.email ?? '',
          subject: p.subject,
          phone: p.phone || u?.phone || '',
          classes: [],
          classIds: (p.classIds ?? []).map(String),
          experienceYears: p.experienceYears,
        }
      }),
    })
  })
)

export default router
