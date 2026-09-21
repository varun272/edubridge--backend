import { Router } from 'express'
import { Notification } from '../../models/index.js'
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
    const notifications = await Notification.find({ userId: req.user!.sub })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ notifications })
  })
)

router.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    await Notification.updateMany(
      { userId: req.user!.sub, read: false },
      { $set: { read: true } }
    )
    res.json({ ok: true })
  })
)

export default router
