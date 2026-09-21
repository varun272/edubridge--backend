import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { corsOrigins } from './config/env.js'
import { errorHandler } from './middleware/index.js'
import authRoutes from './features/auth/auth.routes.js'
import institutionRoutes from './features/institutions/institutions.routes.js'
import inviteRoutes from './features/invites/invites.routes.js'
import studentRoutes from './features/students/students.routes.js'
import attendanceRoutes from './features/attendance/attendance.routes.js'
import homeworkRoutes from './features/homework/homework.routes.js'
import assignmentRoutes from './features/assignments/assignments.routes.js'
import marksRoutes from './features/marks/marks.routes.js'
import feesRoutes from './features/fees/fees.routes.js'
import feedRoutes from './features/feed/feed.routes.js'
import meetingRoutes from './features/meetings/meetings.routes.js'
import notificationRoutes from './features/notifications/notifications.routes.js'
import teacherRoutes from './features/teachers/teachers.routes.js'
import classRoutes from './features/classes/classes.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'edubridge-api', version: '1.0.0', stack: 'mern' })
  })

  app.get('/api', (_req, res) => {
    res.json({
      name: 'EduBridge API',
      database: 'MongoDB Atlas',
      docs: [
        'POST /api/institutions — create workspace (trial|yearly)',
        'POST /api/auth/login',
        'POST /api/invites · /bulk · /token/:token/accept',
        'GET|POST /api/students · /api/classes',
        'POST /api/attendance/bulk',
        'Homework · assignments · marks · fees · feed · meetings · notifications',
      ],
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/institutions', institutionRoutes)
  app.use('/api/invites', inviteRoutes)
  app.use('/api/students', studentRoutes)
  app.use('/api/classes', classRoutes)
  app.use('/api/attendance', attendanceRoutes)
  app.use('/api/homework', homeworkRoutes)
  app.use('/api/assignments', assignmentRoutes)
  app.use('/api/marks', marksRoutes)
  app.use('/api/fees', feesRoutes)
  app.use('/api/feed', feedRoutes)
  app.use('/api/meetings', meetingRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/teachers', teacherRoutes)

  app.use(errorHandler)
  return app
}
