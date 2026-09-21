import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'

async function main() {
  try {
    await connectDatabase()

    const app = createApp()

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`EduBridge API running on port ${env.PORT}`)
    })
  } catch (error) {
    console.error('Failed to start EduBridge API:', error)
    process.exit(1)
  }
}

main()