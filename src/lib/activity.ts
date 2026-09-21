import { Activity, Notification } from '../models/index.js'

export async function pushActivity(
  institutionId: string,
  input: { title: string; description: string; type: string }
) {
  return Activity.create({
    institutionId,
    title: input.title,
    description: input.description,
    type: input.type,
  })
}

export async function notifyUser(input: {
  userId: string
  institutionId?: string
  title: string
  message: string
  type?: string
}) {
  return Notification.create({
    userId: input.userId,
    institutionId: input.institutionId ?? null,
    title: input.title,
    message: input.message,
    type: input.type ?? 'info',
  })
}
