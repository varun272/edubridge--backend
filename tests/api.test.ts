import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import {
  FeePayment,
  Fee,
  Attendance,
  Mark,
  Homework,
  Assignment,
  Feed,
  Meeting,
  MeetingSlot,
  Notification,
  Student,
  Teacher,
  Parent,
  ClassModel,
  Invite,
  Activity,
  Membership,
  PasswordReset,
  Institution,
  User,
} from '../src/models/index.js'

const app = createApp()

describe('EduBridge API — core production flows', () => {
  let adminToken = ''
  let institutionId = ''
  let inviteToken = ''
  let teacherToken = ''
  let studentId = ''
  let feeId = ''

  beforeAll(async () => {
    await FeePayment.deleteMany({})
    await Fee.deleteMany({})
    await Attendance.deleteMany({})
    await Mark.deleteMany({})
    await Homework.deleteMany({})
    await Assignment.deleteMany({})
    await Feed.deleteMany({})
    await Meeting.deleteMany({})
    await MeetingSlot.deleteMany({})
    await Notification.deleteMany({})
    await Student.deleteMany({})
    await Teacher.deleteMany({})
    await Parent.deleteMany({})
    await ClassModel.deleteMany({})
    await Invite.deleteMany({})
    await Activity.deleteMany({})
    await Membership.deleteMany({})
    await PasswordReset.deleteMany({})
    await Institution.deleteMany({})
    await User.deleteMany({})
  })

  it('GET /health', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('creates institution workspace on trial with empty roster', async () => {
    const res = await request(app).post('/api/institutions').send({
      name: 'Test Academy',
      city: 'Mumbai',
      adminName: 'Admin User',
      adminEmail: 'admin@testacademy.edu',
      adminPassword: 'password123',
      plan: 'trial',
    })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.institution.plan).toBe('trial')
    expect(res.body.institution.feesCollectedInr).toBe(0)
    adminToken = res.body.token
    institutionId = res.body.institution.id

    const stats = await request(app)
      .get(`/api/institutions/${institutionId}/stats`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(stats.status).toBe(200)
    expect(stats.body.students).toBe(0)
    expect(stats.body.teachers).toBe(0)
  })

  it('logs in admin', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@testacademy.edu',
      password: 'password123',
      institutionId,
    })
    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('admin')
    adminToken = res.body.token
  })

  it('sends invite and accepts via OTP as teacher', async () => {
    const inviteRes = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Meera Kapoor',
        email: 'meera@testacademy.edu',
        role: 'teacher',
      })
    expect(inviteRes.status).toBe(201)
    inviteToken = inviteRes.body.invite.token

    const otpRes = await request(app).post(`/api/invites/token/${inviteToken}/request-otp`)
    expect(otpRes.status).toBe(200)
    expect(otpRes.body.devOtp).toBe('123456')

    const accept = await request(app)
      .post(`/api/invites/token/${inviteToken}/accept`)
      .send({ otp: '123456', password: 'teacher123' })
    expect(accept.status).toBe(200)
    expect(accept.body.user.role).toBe('teacher')
    expect(accept.body.homePath).toBe('/teacher')
    teacherToken = accept.body.token

    const stats = await request(app)
      .get(`/api/institutions/${institutionId}/stats`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(stats.body.teachers).toBe(1)
  })

  it('bulk invites parents', async () => {
    const res = await request(app)
      .post('/api/invites/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invites: [
          { name: 'Varun Mehta', email: 'varun@gmail.com', role: 'parent' },
          { name: 'Priya Shah', email: 'priya@gmail.com', role: 'parent' },
        ],
      })
    expect(res.status).toBe(201)
    expect(res.body.count).toBe(2)
  })

  it('enrolls students and stats increase live', async () => {
    const s1 = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Aarav Mehta',
        grade: '8',
        section: 'A',
        rollNumber: '12',
        parentName: 'Varun Mehta',
        parentEmail: 'varun@gmail.com',
      })
    expect(s1.status).toBe(201)
    studentId = s1.body.student.id

    await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ananya Shah',
        grade: '8',
        section: 'A',
        rollNumber: '13',
        parentName: 'Priya Shah',
        parentEmail: 'priya@gmail.com',
      })

    const stats = await request(app)
      .get(`/api/institutions/${institutionId}/stats`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(stats.body.students).toBe(2)
  })

  it('teacher marks attendance', async () => {
    const list = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${teacherToken}`)
    expect(list.body.students.length).toBe(2)

    const res = await request(app)
      .post('/api/attendance/bulk')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        className: '8A',
        subject: 'Math',
        marks: list.body.students.map((s: { id: string; name: string }, i: number) => ({
          studentId: s.id,
          studentName: s.name,
          status: i === 0 ? 'present' : 'absent',
        })),
      })
    expect(res.status).toBe(201)
    expect(res.body.count).toBe(2)
  })

  it('creates homework, assignment, marks, feed', async () => {
    const hw = await request(app)
      .post('/api/homework')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Algebra worksheet',
        subject: 'Math',
        description: 'Complete exercises 1-10',
        className: '8A',
        dueDate: '2026-07-30',
      })
    expect(hw.status).toBe(201)

    const asg = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Science project',
        subject: 'Science',
        className: '8A',
        dueDate: '2026-08-05',
        totalMarks: 50,
      })
    expect(asg.status).toBe(201)

    const mark = await request(app)
      .post('/api/marks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        studentId,
        studentName: 'Aarav Mehta',
        subject: 'Math',
        exam: 'Unit Test 1',
        score: 42,
        maxScore: 50,
        grade: 'A',
        date: '2026-07-20',
      })
    expect(mark.status).toBe(201)

    const feed = await request(app)
      .post('/api/feed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'announcement',
        title: 'Welcome week',
        body: 'Campus orientation starts Monday.',
      })
    expect(feed.status).toBe(201)
  })

  it('creates fee and records payment — fees collected increases', async () => {
    const fee = await request(app)
      .post('/api/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        studentName: 'Aarav Mehta',
        title: 'Term 2 tuition',
        category: 'Tuition',
        amount: 10000,
        dueDate: '2026-07-31',
        term: '2025-26 T2',
      })
    expect(fee.status).toBe(201)
    feeId = fee.body.fee.id

    const pay = await request(app)
      .post('/api/fees/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ feeId, amount: 10000, method: 'upi' })
    expect(pay.status).toBe(201)

    const stats = await request(app)
      .get(`/api/institutions/${institutionId}/stats`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(stats.body.feesCollectedInr).toBe(10000)
  })

  it('creates meeting request', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        teacherName: 'Meera Kapoor',
        studentName: 'Aarav Mehta',
        studentId,
        className: '8A',
        date: '2026-07-28',
        time: '10:00 AM',
        topic: 'academics',
        reason: 'Discuss progress',
        mode: 'in-person',
      })
    expect(res.status).toBe(201)
    expect(res.body.meeting.status).toBe('pending')
  })

  it('rejects unauthorized student create for teacher', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: 'Hack Kid',
        grade: '9',
        section: 'B',
        rollNumber: '1',
      })
    expect(res.status).toBe(403)
  })
})
