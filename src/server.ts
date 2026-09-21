import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'

async function main() {
  await connectDatabase()

  const app = createApp()
  app.listen(env.PORT, () => {
    console.log(`EduBridge API listening on http://localhost:${env.PORT}`)
    console.log(`Health: http://localhost:${env.PORT}/health`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
