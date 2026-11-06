const cors = require('cors')
const express = require('express')

const { getDBStatus } = require('./config/db')

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

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

module.exports = app
