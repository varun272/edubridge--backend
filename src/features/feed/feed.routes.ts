import { Router } from 'express'
import { z } from 'zod'
import { Feed, User } from '../../models/index.js'
import { assertFound } from '../../lib/errors.js'
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
    const posts = await Feed.find({ institutionId: req.user!.institutionId })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({
      posts: posts.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.body,
        mediaUrl: p.mediaUrl,
        author: p.authorName,
        createdAt: p.createdAt.toISOString(),
        reactions: { like: p.likeCount, celebrate: p.celebrateCount },
      })),
    })
  })
)

const createSchema = z.object({
  type: z.enum(['image', 'video', 'event', 'announcement', 'achievement']),
  title: z.string().min(2),
  body: z.string().min(1),
  mediaUrl: z.string().url().optional().or(z.literal('')),
})

router.post(
  '/',
  requireAuth,
  requireRoles('admin', 'teacher'),
  validateBody(createSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof createSchema>
    const user = await User.findById(req.user!.sub).orFail()
    const post = await Feed.create({
      institutionId: req.user!.institutionId,
      type: body.type,
      title: body.title,
      body: body.body,
      mediaUrl: body.mediaUrl || null,
      authorId: user._id,
      authorName: user.name,
    })
    res.status(201).json({ post })
  })
)

const reactSchema = z.object({
  reaction: z.enum(['like', 'celebrate']),
})

router.post(
  '/:id/react',
  requireAuth,
  validateBody(reactSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { reaction } = req.body as z.infer<typeof reactSchema>
    const post = assertFound(
      await Feed.findOne({
        _id: param(req, 'id'),
        institutionId: req.user!.institutionId,
      }),
      'Post not found'
    )
    const updated = await Feed.findByIdAndUpdate(
      post._id,
      { $inc: reaction === 'like' ? { likeCount: 1 } : { celebrateCount: 1 } },
      { new: true }
    )
    res.json({ post: updated })
  })
)

export default router
