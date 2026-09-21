import { env } from '../config/env.js'

export function generateOtp(): string {
  if (env.NODE_ENV !== 'production' && env.DEV_OTP) {
    return env.DEV_OTP
  }
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Dev/console mailer — swap for Resend/SES in production */
export async function sendMail(input: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  // Production: plug Resend / SES / SendGrid here
  console.log('\n========== EMAIL ==========')
  console.log(`To: ${input.to}`)
  console.log(`Subject: ${input.subject}`)
  console.log(input.text)
  console.log('===========================\n')
  return { ok: true as const }
}

export function inviteAcceptUrl(token: string) {
  return `${env.APP_URL}/invite/${token}`
}
