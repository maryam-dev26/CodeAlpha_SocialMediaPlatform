const cors = require('cors')
const express = require('express')

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

module.exports = app
