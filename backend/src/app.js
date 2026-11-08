import cors from 'cors'
import express from 'express'

import { getDBStatus } from './config/db.js'
import authRoutes from './routes/authRoutes.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/auth', authRoutes)

app.get('/api/health', (req, res) => {
  const database = getDBStatus()

  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    server: 'running',
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

export default app
